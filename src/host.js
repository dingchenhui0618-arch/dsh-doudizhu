/**
 * Host half of dsh-doudizhu: the cordis plugin, and the loopback surface the
 * floating window talks to.
 *
 * Two roles, one local API:
 *
 *   authority (host)   owns the room and binds the LAN port; the local player is
 *                      seated in-process, so its token never crosses a socket.
 *   follower (guest)   holds one long-poll link to the host's LAN port and keeps
 *                      the newest snapshot in memory.
 *
 * The floating window only ever calls THIS machine's loopback route. It never
 * dials the other machines, which is what keeps the account of "who may see
 * which cards" in one place: the authority's `snapshotFor`.
 *
 * Deliberately NOT done here: exposing DSH's own webServer to the LAN. That
 * surface carries the whole agent API; the game gets its own port instead.
 */

import { timingSafeEqual } from 'node:crypto'

import { createAuthorityServer, createFollowerLink } from './net.js'
import { act as applyAction, createRoom, joinSeat, snapshotFor } from './room.js'
import { isBotLevel } from './ui-logic.js'

export const name = 'dsh-doudizhu'
export const inject = ['webServer']

/** Local route prefix. DSH's webServer binds loopback, so this is not a LAN surface. */
export const ROUTE = '/dsh-doudizhu'
export const TOKEN_HEADER = 'x-dsh-doudizhu-token'
export const DEFAULT_PORT = 8791

const MAX_BODY = 64 * 1024

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Config is read defensively: a bad value falls back rather than refusing to load. */
export function normaliseConfig(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const port = Number(raw.port)
  return {
    // 0 means "let the OS pick", which is what tests and port collisions want.
    port: Number.isInteger(port) && port >= 0 && port < 65536 ? port : DEFAULT_PORT,
    host: typeof raw.host === 'string' && raw.host.trim() ? raw.host.trim() : '0.0.0.0',
    playerName:
      typeof raw.playerName === 'string' && raw.playerName.trim()
        ? [...raw.playerName.trim()].slice(0, 12).join('')
        : '我',
  }
}

function normalisePort(value, fallback) {
  const port = Number(value)
  return Number.isInteger(port) && port >= 0 && port < 65536 ? port : fallback
}

function sameSecret(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function sendJson(res, status, body, headers = {}) {
  if (res.writableEnded || res.destroyed) return
  const payload = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': payload.length,
    'cache-control': 'no-store',
    ...headers,
  })
  res.end(payload)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY) {
        // Answer 413 instead of destroying the socket: a client that is still
        // writing its body must still be handed the reason.
        settled = true
        reject(new HttpError(413, '请求体超过上限'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) {
        resolve({})
        return
      }
      try {
        const value = JSON.parse(text)
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          reject(new HttpError(400, '请求体必须是 JSON 对象'))
          return
        }
        resolve(value)
      } catch {
        reject(new HttpError(400, '请求体不是合法 JSON'))
      }
    })
    req.on('error', () => reject(new HttpError(400, '读取请求体失败')))
  })
}

function header(req, key) {
  const value = req.headers?.[key]
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function requestOrigin(req) {
  const forwarded = header(req, 'x-forwarded-proto').split(',')[0].trim().toLowerCase()
  const protocol = forwarded === 'https' || forwarded === 'http' ? forwarded : req.socket?.encrypted ? 'https' : 'http'
  const host = header(req, 'host').trim()
  if (!host) return ''
  try {
    return new URL(`${protocol}://${host}`).origin
  } catch {
    return ''
  }
}

function httpOrigin(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : ''
  } catch {
    return ''
  }
}

/**
 * A cross-origin page cannot set a custom header, and it cannot hide its own
 * Origin or `sec-fetch-site`. The desktop shell proxies dsh-app:// traffic with
 * a referrer Node parses as "null", so a non-http(s) referrer is treated as
 * uninformative rather than as a rejection.
 */
function validateOrigin(req) {
  const expected = requestOrigin(req)
  const origin = header(req, 'origin').trim()
  if (origin) {
    const actual = origin === 'null' ? '' : httpOrigin(origin)
    if (actual !== expected) throw new HttpError(403, '拒绝跨来源请求')
  } else {
    const actual = httpOrigin(header(req, 'referer').trim())
    if (actual && actual !== expected) throw new HttpError(403, '拒绝跨来源请求')
  }
  if (header(req, 'sec-fetch-site').trim().toLowerCase() === 'cross-site') {
    throw new HttpError(403, '拒绝跨站请求')
  }
}

function subPath(url) {
  const path = String(url ?? '/').split('?')[0]
  const rest = path.startsWith(ROUTE) ? path.slice(ROUTE.length) : ''
  return rest.replace(/^\/+|\/+$/g, '') || 'state'
}

function messageOf(error) {
  return String((error && error.message) || error)
}

export function apply(ctx, config) {
  const settings = normaliseConfig(config)
  const localToken = Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256)),
  ).toString('base64url')

  /** The single piece of role state. Replaced wholesale on every transition. */
  let current = idle()

  function idle(lastError = null) {
    return { role: 'idle', room: null, authority: null, link: null, seat: null, token: null, lastError }
  }

  function localSnapshot() {
    if (current.role === 'host' && current.room) return snapshotFor(current.room, current.seat)
    if (current.role === 'guest' && current.link) return current.link.snapshot()
    return null
  }

  function localState() {
    const snapshot = localSnapshot()
    return {
      protocol: 1,
      role: current.role,
      playerName: settings.playerName,
      defaults: { port: settings.port, host: settings.host },
      authority:
        current.role === 'host' && current.authority
          ? {
              code: current.authority.code,
              port: current.authority.port,
              loopbackUrl: current.authority.loopbackUrl,
              lanUrls: [...current.authority.lanUrls],
              lanCandidates: (current.authority.lanCandidates || []).map((entry) => ({ ...entry })),
            }
          : null,
      guest:
        current.role === 'guest' && current.link
          ? { baseUrl: current.link.baseUrl, seat: current.link.seat(), connected: true }
          : null,
      lastError: current.lastError,
      snapshot,
    }
  }

  async function shutdown() {
    const previous = current
    current = idle(previous.lastError)
    if (previous.link) {
      previous.link.stop()
      try {
        await previous.link.leave()
      } catch {
        // Leaving is best effort: the authority also drops the seat when the
        // link stops polling.
      }
    }
    if (previous.authority) {
      try {
        await previous.authority.close()
      } catch {
        // Nothing useful to do; the port will be released on process exit.
      }
    }
    return previous
  }

  async function becomeHost(input = {}) {
    const port = normalisePort(input.port, settings.port)
    const playerName = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : settings.playerName

    // Re-hosting on the port we already own is a restart, not a conflict: our own
    // listener would otherwise be reported back to us as "port already in use".
    if (port && current.role === 'host' && current.authority?.port === port) await shutdown()

    // Everything that can fail happens before the running table is touched, so a
    // refused attempt never costs the player the game they were already in.
    const room = createRoom({ name: '斗地主房间' })
    // The strength chosen before the room existed; the seat controls can change it
    // again at any time, so a stale or hostile value is simply ignored.
    if (isBotLevel(input.botLevel)) room.botLevel = String(input.botLevel)
    let authority
    try {
      authority = await createAuthorityServer(room, { host: settings.host, port })
    } catch (error) {
      current.lastError = `开房失败：${messageOf(error)}`
      return { ok: false, error: current.lastError }
    }

    const joined = joinSeat(room, { name: playerName })
    if (!joined.ok) {
      await authority.close()
      current.lastError = `入座失败：${joined.error}`
      return { ok: false, error: current.lastError }
    }

    await shutdown()
    current = { role: 'host', room, authority, link: null, seat: joined.seat, token: joined.token, lastError: null }
    return { ok: true }
  }

  async function becomeGuest(input = {}) {
    const host = String(input.host ?? '').trim()
    const port = String(input.port ?? '').trim()
    const code = String(input.code ?? '').trim().toUpperCase()
    const playerName = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : settings.playerName
    // `url` is the canonical field. `baseUrl` is what an already-installed client
    // used to send — read it too, so shipping the fix does not require everyone to
    // update on the same day. `host` + `port` is what the tests and the older
    // hand-written flows use.
    const baseUrl =
      String(input.url ?? '').trim() ||
      String(input.baseUrl ?? '').trim() ||
      (host ? `http://${host}${port ? `:${port}` : ''}` : '')

    if (!baseUrl) return { ok: false, error: '请填写房主地址（例如 192.168.1.50:8791）' }
    if (!code) return { ok: false, error: '请填写房间码' }

    // Re-joining the room we are already in must reuse the seat token, otherwise
    // it would claim a second seat and leave the first one occupied by a ghost.
    const sameRoom = current.role === 'guest' && current.link?.baseUrl === baseUrl
    const link = createFollowerLink({
      baseUrl,
      code,
      name: playerName,
      token: sameRoom ? current.token : undefined,
      pollTimeoutMs: 20000,
    })
    try {
      await link.join()
    } catch (error) {
      current.lastError = `入座失败：${messageOf(error)}`
      return { ok: false, error: current.lastError }
    }

    await shutdown()
    current = { role: 'guest', room: null, authority: null, link, seat: link.seat(), token: link.token(), lastError: null }
    // The background loop holds one long poll, so the local snapshot is current
    // without the floating window ever touching the network itself.
    link.start()
    return { ok: true }
  }

  async function probe(input = {}) {
    const host = String(input.host ?? '').trim()
    const port = String(input.port ?? '').trim()
    const baseUrl =
      String(input.url ?? '').trim() ||
      String(input.baseUrl ?? '').trim() ||
      (host ? `http://${host}${port ? `:${port}` : ''}` : '')
    if (!baseUrl) return { ok: false, error: '请填写房主地址' }
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/hello`)
      const data = await response.json()
      return { ok: true, hello: data }
    } catch (error) {
      return { ok: false, error: `连不上 ${baseUrl}：${messageOf(error)}` }
    }
  }

  async function localAction(action) {
    if (current.role === 'host' && current.room) {
      const result = applyAction(current.room, current.token, action)
      const snapshot = snapshotFor(current.room, current.seat)
      if (!result.ok) return { ok: false, error: result.error, snapshot }
      return { ok: true, snapshot: snapshotFor(current.room, result.seat) }
    }
    if (current.role === 'guest' && current.link) {
      const result = await current.link.act(action)
      return { ok: result.ok, error: result.error ?? null, snapshot: localSnapshot() }
    }
    return { ok: false, error: '还没进桌：先开房或加入房间' }
  }

  async function route(req, res) {
    try {
      const method = String(req.method ?? 'GET').toUpperCase()
      const action = subPath(req.url)

      if (method === 'GET') {
        if (action !== 'state') throw new HttpError(404, `没有这个接口：GET ${action}`)
        // The token rides back on the first read; every mutation must echo it.
        sendJson(res, 200, { ok: true, ...localState() }, { [TOKEN_HEADER]: localToken })
        return
      }

      if (method !== 'POST') throw new HttpError(405, `不支持的方法：${method}`)

      validateOrigin(req)
      if (!sameSecret(header(req, TOKEN_HEADER), localToken)) throw new HttpError(403, '本地令牌校验失败')
      const body = await readJson(req)

      if (action === 'host') {
        const result = await becomeHost(body)
        // `localState()` never carries `ok`, so a refusal cannot be spread into
        // an affirmative answer — that bug shipped a 409 body reading ok: true.
        sendJson(res, result.ok ? 200 : 409, { ...localState(), ok: result.ok, error: result.error ?? null })
        return
      }
      if (action === 'join') {
        const result = await becomeGuest(body)
        sendJson(res, result.ok ? 200 : 409, { ...localState(), ok: result.ok, error: result.error ?? null })
        return
      }
      if (action === 'probe') {
        sendJson(res, 200, await probe(body))
        return
      }
      if (action === 'act') {
        const action_ = body.action && typeof body.action === 'object' ? body.action : body
        sendJson(res, 200, { ...(await localAction(action_)), role: current.role })
        return
      }
      if (action === 'leave') {
        await shutdown()
        sendJson(res, 200, { ok: true, ...localState() })
        return
      }
      throw new HttpError(404, `没有这个接口：POST ${action}`)
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      // An unread body would corrupt the next request on a kept-alive socket.
      const headers = status === 413 ? { connection: 'close' } : {}
      sendJson(res, status, { ok: false, error: messageOf(error) }, headers)
    }
  }

  ctx.effect(function () {
    return ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: route })
  })

  ctx.effect(function () {
    return function () {
      // Disposal must not leave a listening socket or a held poll behind.
      void shutdown()
    }
  })

  return { localState, becomeHost, becomeGuest, localAction, shutdown, settings }
}
