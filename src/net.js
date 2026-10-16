/**
 * Transport: the authority's LAN HTTP server and the follower's link to it.
 *
 * Why HTTP long polling and not WebSocket:
 * - The plugin has zero runtime dependencies and `ws` would end that.
 * - `ctx.webServer.registerUpgrade` lives on DSH's own loopback server, which is
 *   deliberately not exposed to the LAN, so it cannot carry this traffic.
 * - Turns are untimed and infrequent; a held request answers within milliseconds
 *   of any change, which is indistinguishable from a push at this scale.
 *
 * The authority port is a machine-to-machine API. It serves game endpoints only
 * — no files, no agent surface, no DSH route — and every state response is
 * filtered per seat by `room.snapshotFor`.
 */

import http from 'node:http'
import net from 'node:net'
import { networkInterfaces } from 'node:os'

import {
  PROTOCOL,
  act as applyAction,
  closeRoom,
  joinSeat,
  roomInfo,
  seatForToken,
  setConnected,
  snapshotFor,
  waitForChange,
} from './room.js'

const TOKEN_HEADER = 'x-ddz-token'
const MAX_BODY = 64 * 1024

/**
 * Interface names that are virtual / host-only. Another person's machine can
 * never route to them, but they are real sockets on real private ranges — which
 * is exactly why they are dangerous to hand out: a WSL `vEthernet` address such
 * as `172.22.0.1` looks just like a LAN address and always fails from the other
 * machine. We keep them in `lanCandidates` so the UI can say what it hid; we
 * just never offer one as *the* address to type.
 */
const VIRTUAL_IFACE_HINTS = [
  'vethernet', 'wsl', 'hyper-v', 'docker', 'vmware', 'virtualbox', 'vbox',
  'loopback', 'bluetooth', 'tailscale', 'zerotier', 'npcap', 'radmin',
  'hamachi', 'openvpn', 'wireguard', 'tap-', 'tun', 'container', 'bridge',
]

export function isVirtualIface(name) {
  const lower = String(name ?? '').toLowerCase()
  return VIRTUAL_IFACE_HINTS.some((hint) => lower.includes(hint))
}

/**
 * Rank this machine's non-loopback IPv4 addresses for handing to other players:
 * real adapters first, virtual adapters last. Pure — it takes the shape
 * `os.networkInterfaces()` returns — so the ranking is testable without the real
 * `os`.
 */
export function rankLanCandidates(interfaces = {}) {
  const out = []
  for (const [iface, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      if (!entry || entry.family !== 'IPv4' || entry.internal) continue
      const address = String(entry.address ?? '')
      if (!address || address.startsWith('169.254.')) continue
      out.push({ address, iface, virtual: isVirtualIface(iface) })
    }
  }
  return out.sort((a, b) =>
    a.virtual === b.virtual ? a.address.localeCompare(b.address) : a.virtual ? 1 : -1)
}

/** Non-loopback IPv4 addresses, best-for-sharing first. */
export function lanAddresses() {
  return rankLanCandidates(networkInterfaces())
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('请求体超过上限'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function safeJson(text) {
  if (!text) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

function send(res, status, payload) {
  if (res.writableEnded || res.destroyed) return
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
    'cache-control': 'no-store',
  })
  res.end(body)
}

/**
 * Is something already listening on this port?
 *
 * Windows sets SO_REUSEADDR semantics that let a second bind to a port already
 * in use succeed, so waiting for EADDRINUSE would silently put two authorities
 * on one port and split incoming connections between them. Probing first turns
 * that into a clear refusal. There is a small race window, which is acceptable:
 * the alternative is a failure mode that is invisible until two rooms collide.
 */
function portIsBusy(port, host) {
  return new Promise((resolve) => {
    const target = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host
    const probe = net.connect({ port, host: target })
    let settled = false
    const done = (busy) => {
      if (settled) return
      settled = true
      probe.destroy()
      resolve(busy)
    }
    probe.setTimeout(400)
    probe.once('connect', () => done(true))
    probe.once('timeout', () => done(false))
    probe.once('error', () => done(false))
  })
}

/**
 * Start the authority. `port: 0` lets the OS choose (tests use that). Binding
 * `0.0.0.0` is what makes the address reachable from the other two machines.
 */
export async function createAuthorityServer(room, { host = '0.0.0.0', port = 8791, pollTimeoutMs = 20000 } = {}) {
  if (port && (await portIsBusy(port, host))) throw new Error(`端口 ${port} 已被占用`)

  const server = http.createServer((req, res) => {
    handle(req, res, room, pollTimeoutMs).catch((error) => {
      send(res, 500, { ok: false, error: `服务端错误：${error?.message ?? error}` })
    })
  })

  const ready = new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      const bound = server.address()
      const actual = typeof bound === 'object' && bound ? bound.port : port
      const candidates = lanAddresses()
      const real = candidates.filter((entry) => !entry.virtual)
      // If every adapter is virtual there is nothing honest to prefer, so fall
      // back to offering them rather than handing out an unreachable loopback.
      const shareable = real.length ? real : candidates
      resolve({
        server,
        room,
        protocol: PROTOCOL,
        port: actual,
        code: room.code,
        url: `http://${host}:${actual}`,
        loopbackUrl: `http://127.0.0.1:${actual}`,
        lanUrls: shareable.map((entry) => `http://${entry.address}:${actual}`),
        lanCandidates: candidates.map((entry) => ({
          url: `http://${entry.address}:${actual}`,
          iface: entry.iface,
          virtual: entry.virtual,
        })),
        address: bound,
        close: () => closeAuthority(server, room),
      })
    })
  })

  return ready
}

async function closeAuthority(server, room) {
  closeRoom(room)
  // Long polls were just released; drop whatever sockets remain so close()
  // cannot wait on a keep-alive connection that will never be reused.
  server.closeAllConnections?.()
  await new Promise((resolve) => server.close(() => resolve()))
}

async function handle(req, res, room, pollTimeoutMs) {
  const url = new URL(req.url ?? '/', 'http://authority.local')
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const token = req.headers[TOKEN_HEADER]
  const method = req.method ?? 'GET'

  if (method === 'GET' && (path === '/hello' || path === '/')) {
    send(res, 200, roomInfo(room))
    return
  }

  if (method === 'POST' && path === '/join') {
    const body = safeJson(await readBody(req))
    if (!body) {
      send(res, 400, { ok: false, error: '请求体不是合法 JSON' })
      return
    }
    const result = joinSeat(room, { name: body.name, token: body.token, code: body.code })
    if (!result.ok) {
      send(res, result.reason === 'bad-code' ? 403 : 409, result)
      return
    }
    send(res, 200, {
      ok: true,
      seat: result.seat,
      token: result.token,
      rejoin: Boolean(result.rejoin),
      state: snapshotFor(room, result.seat),
    })
    return
  }

  if (method === 'GET' && path === '/state') {
    const seat = seatForToken(room, token)
    if (seat === null) {
      send(res, 401, { ok: false, error: '身份无效，请重新入座', reason: 'unauthorized' })
      return
    }
    const since = Number(url.searchParams.get('since') ?? 0) || 0
    const current = snapshotFor(room, seat)
    if (current.seq > since) {
      send(res, 200, { ok: true, changed: true, state: current })
      return
    }
    // Nothing new yet: hold the request until the room moves or the poll expires.
    const outcome = await waitForChange(room, since, pollTimeoutMs)
    const next = snapshotFor(room, seat)
    send(res, 200, { ok: true, changed: outcome.changed, state: next })
    return
  }

  if (method === 'POST' && (path === '/act' || path === '/leave')) {
    const seat = seatForToken(room, token)
    if (seat === null) {
      send(res, 401, { ok: false, error: '身份无效，请重新入座', reason: 'unauthorized' })
      return
    }
    const body = safeJson(await readBody(req))
    if (!body && path === '/act') {
      send(res, 400, { ok: false, error: '请求体不是合法 JSON' })
      return
    }
    if (path === '/leave') {
      setConnected(room, token, false)
      send(res, 200, { ok: true, state: snapshotFor(room, seat) })
      return
    }
    const result = applyAction(room, token, body)
    if (!result.ok) {
      // A refused move is a valid request with an invalid action: 200 + ok:false
      // so the client can show the reason without treating it as a transport error.
      send(res, 200, { ok: false, error: result.error, state: snapshotFor(room, seat) })
      return
    }
    send(res, 200, { ok: true, state: snapshotFor(room, result.seat) })
    return
  }

  send(res, 404, { ok: false, error: `没有这个接口：${method} ${path}` })
}

/**
 * Follower side: a link to one authority.
 *
 * `refresh()` performs exactly one long poll, so tests can drive the sync
 * deterministically; `start()` additionally runs the background loop that a real
 * follower uses. The link keeps the newest snapshot in memory so the local
 * floating window can read it synchronously.
 */
export function createFollowerLink({
  baseUrl,
  code,
  name = '玩家',
  token: initialToken = null,
  pollTimeoutMs = 20000,
  fetchImpl = globalThis.fetch,
  onState,
  onError,
  onSeat,
} = {}) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '')
  if (!base) throw new Error('缺少房主地址')
  if (typeof fetchImpl !== 'function') throw new Error('缺少 fetch 实现')

  let token = initialToken
  let seat = null
  let latest = null
  let stopped = false
  let running = null
  let controller = null
  const waiters = new Set()

  function publish(state) {
    if (!state) return
    latest = state
    try {
      onState?.(state)
    } catch {
      // A consumer throwing must not break the sync loop.
    }
    for (const waiter of [...waiters]) {
      let matched = false
      try {
        matched = Boolean(waiter(state))
      } catch {
        matched = true
      }
      if (matched) waiters.delete(waiter)
    }
  }

  async function call(path, { method = 'GET', body, signal } = {}) {
    const headers = {}
    if (token) headers[TOKEN_HEADER] = token
    if (body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
    const text = await response.text()
    const data = safeJson(text)
    if (!data) throw new Error(`响应不是 JSON（HTTP ${response.status}）`)
    return { ...data, httpStatus: response.status }
  }

  async function join(overrides = {}) {
    const data = await call('/join', {
      method: 'POST',
      body: { code, name: overrides.name ?? name, token },
    })
    if (!data.ok) throw new Error(data.error ?? '入座失败')
    token = data.token
    seat = data.seat
    onSeat?.(seat, token)
    publish(data.state)
    return data
  }

  async function refresh({ signal } = {}) {
    const since = latest?.seq ?? 0
    // The authority owns the hold duration; this only bounds a request that
    // never comes back at all, so the follower cannot wedge on a dead socket.
    const timeout =
      signal || !pollTimeoutMs || typeof AbortSignal?.timeout !== 'function'
        ? signal
        : AbortSignal.timeout(pollTimeoutMs + 5000)
    const data = await call(`/state?since=${encodeURIComponent(since)}`, { signal: timeout })
    if (!data.ok) throw new Error(data.error ?? '同步失败')
    publish(data.state)
    return data
  }

  async function act(action) {
    const data = await call('/act', { method: 'POST', body: action })
    if (data.state) publish(data.state)
    return data.ok ? { ok: true, state: data.state } : { ok: false, error: data.error, state: data.state }
  }

  async function leave() {
    try {
      const data = await call('/leave', { method: 'POST', body: {} })
      if (data.state) publish(data.state)
    } catch {
      // Leaving is best effort; the authority also drops the seat on disconnect.
    }
  }

  function waitFor(predicate, timeoutMs = 5000) {
    if (latest && predicate(latest)) return Promise.resolve(latest)
    return new Promise((resolve) => {
      let settled = false
      let timer = null
      function finish(value) {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        waiters.delete(waiter)
        resolve(value)
      }
      const waiter = (state) => {
        if (!predicate(state)) return false
        finish(state)
        return true
      }
      waiters.add(waiter)
      timer = setTimeout(() => finish(null), Math.max(0, Number(timeoutMs) || 0))
    })
  }

  async function loop() {
    while (!stopped) {
      controller = new AbortController()
      try {
        await refresh({ signal: controller.signal })
      } catch (error) {
        if (stopped) break
        try {
          onError?.(error)
        } catch {
          // ignore consumer errors
        }
        await delay(500, controller.signal)
      }
    }
  }

  function start() {
    if (running) return running
    stopped = false
    running = (async () => {
      // A caller that already joined holds a seat and a first snapshot; forcing a
      // second /join round trip would only re-send the same token.
      if (!token) await join()
      await loop()
    })()
    running.catch((error) => {
      try {
        onError?.(error)
      } catch {
        // ignore
      }
    })
    return running
  }

  function stop() {
    stopped = true
    controller?.abort()
    waiters.clear()
    return running
  }

  return {
    join,
    refresh,
    act,
    leave,
    start,
    stop,
    waitFor,
    snapshot: () => latest,
    seq: () => latest?.seq ?? 0,
    seat: () => seat,
    token: () => token,
    baseUrl: base,
  }
}

function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer)
        resolve()
        return
      }
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    }
  })
}

export { TOKEN_HEADER, MAX_BODY }
