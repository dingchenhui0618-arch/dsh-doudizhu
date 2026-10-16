/**
 * Host-half tests: the cordis plugin surface, exercised over real HTTP.
 *
 * `apply` is called with a stub ctx that records the effects and the route, and
 * that route is then mounted on a real server. So what is under test is the same
 * handler DSH would invoke, reached the same way the floating window will reach
 * it — no mocks of the transport, only of cordis itself.
 *
 * The leak check here is fully observational: it needs no access to the room.
 * Each seat's own snapshot tells us its own hand, so the cards belonging to the
 * other two are known — and must not appear anywhere in this seat's snapshot.
 */

import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import { apply, normaliseConfig } from '../src/host.js'
import { TOKEN_HEADER as LAN_TOKEN_HEADER } from '../src/net.js'
import { cardFromId, deckIds } from '../src/rules.js'

const ROUTE = '/dsh-doudizhu'
const TOKEN_HEADER = 'x-dsh-doudizhu-token'
const SEATS = ['甲', '乙', '丙']

/** Records what the plugin registers, so the route can be mounted for real. */
function stubCtx() {
  const teardowns = []
  const routes = []
  return {
    routes,
    teardowns,
    ctx: {
      effect(fn) {
        teardowns.push(fn())
      },
      webServer: {
        register(route) {
          routes.push(route)
          return () => {
            route.disposed = true
          }
        },
      },
    },
  }
}

async function mount(t, config) {
  const stub = stubCtx()
  const plugin = apply(stub.ctx, config)

  assert.equal(stub.routes.length, 1, 'the plugin registers exactly one route')
  const route = stub.routes[0]
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, ROUTE)

  const server = createServer((req, res) => route.handler(req, res))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  t.after(async () => {
    await plugin.shutdown()
    await new Promise((resolve) => server.close(resolve))
  })

  return { plugin, route, stub, baseUrl }
}

/** The floating window's future client: GET once for the token, then POST with it. */
function localClient(baseUrl) {
  let token = null
  async function get(path = 'state') {
    const response = await fetch(`${baseUrl}${ROUTE}/${path}`)
    const header = response.headers.get(TOKEN_HEADER)
    if (header) token = header
    return { status: response.status, data: await response.json() }
  }
  async function post(path, body, { withToken = true, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${ROUTE}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(withToken ? { [TOKEN_HEADER]: token ?? '' } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
    })
    return { status: response.status, data: await response.json() }
  }
  return { get, post, token: () => token }
}

/** A raw client for the LAN port — the other two machines, in miniature. */
function lanClient() {
  return {
    async join(baseUrl, body) {
      const response = await fetch(`${baseUrl}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { status: response.status, data: await response.json() }
    },
    async view(baseUrl, token) {
      // The LAN port has its own header name; the local header belongs to DSH's
      // loopback route and means nothing here.
      const response = await fetch(`${baseUrl}/state?since=0`, { headers: { [LAN_TOKEN_HEADER]: token } })
      // `/state` is an envelope: { ok, changed, state }.
      return (await response.json()).state
    },
    async act(baseUrl, token, action) {
      const response = await fetch(`${baseUrl}/act`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [LAN_TOKEN_HEADER]: token },
        body: JSON.stringify(action),
      })
      return response.json()
    },
  }
}

function cardStrings(value, out = new Set()) {
  if (typeof value === 'string') {
    out.add(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) cardStrings(item, out)
    return out
  }
  if (value && typeof value === 'object') for (const item of Object.values(value)) cardStrings(item, out)
  return out
}

/**
 * Cards that belong to another seat and are not yet public, computed only from
 * what the seats themselves reported.
 */
function foreignCards(viewer, views) {
  // Once the hand is over every hand is revealed on purpose; that is a review
  // screen, not a leak.
  if (views[viewer].secretsRevealed) return new Set()
  const mine = new Set(views[viewer].you.hand)
  const publicIds = new Set()
  for (const play of views[viewer].plays ?? []) for (const id of play.cards) publicIds.add(id)
  if (views[viewer].bottomRevealed) for (const id of views[viewer].bottom) publicIds.add(id)

  const foreign = new Set()
  for (let other = 0; other < views.length; other += 1) {
    if (other === viewer) continue
    for (const id of views[other].you.hand) {
      if (!mine.has(id) && !publicIds.has(id)) foreign.add(id)
    }
  }
  return foreign
}

function assertNoForeignCards(views, label) {
  for (let viewer = 0; viewer < views.length; viewer += 1) {
    const seen = cardStrings(views[viewer])
    for (const id of foreignCards(viewer, views)) {
      assert.equal(seen.has(id), false, `${label}: 座位 ${viewer} 看到了别人的 ${id}`)
    }
  }
}

/** A legal-but-plain move: lead lowest, otherwise beat a single or pass. */
function pickAction(view) {
  const hand = [...view.you.hand].sort((a, b) => cardFromId(a).value - cardFromId(b).value)
  if (!view.lastPlay || view.canPass === false) return { type: 'play', cards: [hand[0]] }
  const move = view.lastPlay.move
  if (move && move.shape === 'single' && move.length === 1) {
    const beat = hand.find((id) => cardFromId(id).value > move.mainValue)
    if (beat) return { type: 'play', cards: [beat] }
  }
  return { type: 'pass' }
}

test('config is read defensively', () => {
  assert.deepEqual(normaliseConfig(undefined), { port: 8791, host: '0.0.0.0', playerName: '我' })
  assert.deepEqual(normaliseConfig(null), { port: 8791, host: '0.0.0.0', playerName: '我' })
  assert.deepEqual(normaliseConfig({ port: 0 }), { port: 0, host: '0.0.0.0', playerName: '我' })
  assert.equal(normaliseConfig({ port: 70000 }).port, 8791)
  assert.equal(normaliseConfig({ port: -1 }).port, 8791)
  assert.equal(normaliseConfig({ port: 'abc' }).port, 8791)
  assert.equal(normaliseConfig({ port: 1.5 }).port, 8791)
  assert.equal(normaliseConfig({ host: '  127.0.0.1  ' }).host, '127.0.0.1')
  assert.equal(normaliseConfig({ host: '' }).host, '0.0.0.0')
  assert.equal(normaliseConfig({ playerName: '  小明  ' }).playerName, '小明')
  assert.equal(normaliseConfig({ playerName: '一二三四五六七八九十十一十二十三' }).playerName.length, 12)
  assert.equal(normaliseConfig('nope').port, 8791)
})

test('an idle plugin reports its role, hands out a token, and reads without one', async (t) => {
  const { baseUrl } = await mount(t)
  const client = localClient(baseUrl)

  const { status, data } = await client.get()
  assert.equal(status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.role, 'idle')
  assert.equal(data.protocol, 1)
  assert.equal(data.snapshot, null)
  assert.equal(data.authority, null)
  assert.equal(data.guest, null)
  assert.deepEqual(data.defaults, { port: 8791, host: '0.0.0.0' })
  assert.ok(client.token().length >= 32)

  // A read must not leak any card id, even as a stray string.
  const strings = cardStrings(data)
  for (const id of deckIds()) assert.equal(strings.has(id), false)
})

test('every mutation is gated by the local token and by origin', async (t) => {
  const { baseUrl } = await mount(t)
  const client = localClient(baseUrl)
  await client.get()

  assert.equal((await client.post('host', {}, { withToken: false })).status, 403)
  assert.equal((await client.post('host', {}, { headers: { [TOKEN_HEADER]: 'wrong' } })).status, 403)
  assert.equal((await client.post('host', {}, { headers: { [TOKEN_HEADER]: '' } })).status, 403)

  // A cross-origin page is refused even when it somehow knows the token.
  const evil = await client.post('host', {}, { headers: { origin: 'http://evil.example' } })
  assert.equal(evil.status, 403)
  assert.match(evil.data.error, /跨来源/)

  const crossSite = await client.post('host', {}, { headers: { 'sec-fetch-site': 'cross-site' } })
  assert.equal(crossSite.status, 403)

  // A same-origin page with the token is allowed through to the handler.
  const good = await client.post('host', { port: 0 }, { headers: { origin: baseUrl } })
  assert.equal(good.status, 200)
  assert.equal(good.data.ok, true)

  // A bad referer is refused, but a non-http referer (the desktop shell) is not.
  await client.post('leave', {})
  const badReferer = await client.post('host', {}, { headers: { referer: 'http://evil.example/x' } })
  assert.equal(badReferer.status, 403)
  const shellReferer = await client.post('host', { port: 0 }, { headers: { referer: 'dsh-app://x' } })
  assert.equal(shellReferer.data.ok, true)
})

test('unroutable, malformed, and oversized requests are reported, not crashed', async (t) => {
  const { baseUrl } = await mount(t)
  const client = localClient(baseUrl)
  await client.get()

  assert.equal((await client.get('nope')).status, 404)
  assert.equal((await client.post('nope', {})).status, 404)

  const wrongMethod = await fetch(`${baseUrl}${ROUTE}/host`, { method: 'DELETE' })
  assert.equal(wrongMethod.status, 405)

  const brokenJson = await fetch(`${baseUrl}${ROUTE}/host`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [TOKEN_HEADER]: client.token() },
    body: 'not json',
  })
  assert.equal(brokenJson.status, 400)

  const arrayBody = await fetch(`${baseUrl}${ROUTE}/host`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [TOKEN_HEADER]: client.token() },
    body: '[]',
  })
  assert.equal(arrayBody.status, 400)

  const oversized = await fetch(`${baseUrl}${ROUTE}/host`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [TOKEN_HEADER]: client.token() },
    body: JSON.stringify({ pad: 'x'.repeat(70 * 1024) }),
  })
  assert.equal(oversized.status, 413)

  // The plugin is still healthy after all of that.
  assert.equal((await client.get()).data.ok, true)
})

test('hosting opens the LAN port and the local seat takes seat 0', async (t) => {
  const { plugin, baseUrl } = await mount(t)
  const client = localClient(baseUrl)
  await client.get()

  const { status, data } = await client.post('host', { port: 0, name: '房主' })
  assert.equal(status, 200)
  assert.ok(data.ok, data.error)
  assert.equal(data.role, 'host')
  assert.equal(data.authority.code.length, 6)
  assert.ok(data.authority.port > 0)
  assert.equal(data.authority.loopbackUrl, `http://127.0.0.1:${data.authority.port}`)
  assert.equal(data.snapshot.phase, 'lobby')
  assert.equal(data.snapshot.seatsTaken, 1)
  assert.equal(data.snapshot.you.seat, 0)
  assert.equal(data.snapshot.you.name, '房主')

  // The room code is the only thing the other two machines need besides the IP.
  assert.equal(plugin.localState().authority.code, data.authority.code)
})

test('three seats play a whole hand through the local API and the LAN port', async (t) => {
  const { baseUrl } = await mount(t, { port: 0, playerName: '房主' })
  const local = localClient(baseUrl)
  await local.get()

  const hosted = await local.post('host', { port: 0 })
  assert.ok(hosted.data.ok, hosted.data.error)
  const { code, loopbackUrl } = hosted.data.authority

  // Seats 1 and 2 are "the other two machines": they only touch the LAN port.
  const lan = lanClient()
  const second = await lan.join(loopbackUrl, { name: SEATS[1], code })
  const third = await lan.join(loopbackUrl, { name: SEATS[2], code })
  assert.ok(second.data.ok, second.data.error)
  assert.ok(third.data.ok, third.data.error)
  assert.equal(second.data.seat, 1)
  assert.equal(third.data.seat, 2)
  assert.equal(third.data.state.phase, 'bidding')

  const tokens = [null, second.data.token, third.data.token]

  async function views() {
    const first = (await local.get()).data.snapshot
    return [first, await lan.view(loopbackUrl, tokens[1]), await lan.view(loopbackUrl, tokens[2])]
  }

  async function send(seat, action) {
    if (seat === 0) {
      const result = await local.post('act', { action })
      assert.ok(result.data.ok, `${result.data.error}（座位 0 ${action.type}）`)
      return
    }
    const result = await lan.act(loopbackUrl, tokens[seat], action)
    assert.ok(result.ok, `${result.error}（座位 ${seat} ${action.type}）`)
  }

  let steps = 0
  let current = await views()
  assertNoForeignCards(current, '发牌后')
  assert.deepEqual(current.map((view) => view.you.hand.length), [17, 17, 17])
  assert.equal(new Set(current.flatMap((view) => view.you.hand)).size, 51, '三家各自看到的 17 张牌互不重叠')
  assert.ok(current.every((view) => view.seats.some((seat) => seat.hand === null)), '别人的手牌必须是 null')

  while (current[0].phase !== 'finished' && steps < 400) {
    steps += 1
    const reference = current[0]
    const seat = reference.phase === 'bidding' ? reference.bidTurnSeat : reference.toAct
    const action =
      reference.phase === 'bidding'
        ? { type: 'bid', score: (reference.bids?.length ?? 0) === 0 ? 1 : 0 }
        : pickAction(current[seat])
    await send(seat, action)
    current = await views()
    assertNoForeignCards(current, `第 ${steps} 步`)
  }

  assert.equal(current[0].phase, 'finished', `一盘应当打完（实际 ${steps} 步）`)
  assert.ok(steps > 10)

  // The reveal at the end is deliberate, and only at the end.
  assert.ok(current.every((view) => view.secretsRevealed === true))
  // Everything a seat can see, put back together, must be the whole deck exactly
  // once: hands still held, cards already played, and the three bottom cards.
  const all = new Set()
  for (const view of current) {
    for (const id of view.you.hand) all.add(id)
    for (const play of view.plays) for (const id of play.cards) all.add(id)
    for (const id of view.bottom) all.add(id)
  }
  assert.equal(all.size, 54, `手牌 + 出牌 + 底牌应当恰好凑齐 54 张（实际 ${all.size} 张）`)

  // And the loser side is visible through the local API too.
  const after = (await local.get()).data
  assert.equal(after.role, 'host')
  assert.equal(after.snapshot.phase, 'finished')

  // Next hand keeps the table alive.
  const next = await local.post('act', { action: { type: 'next' } })
  assert.ok(next.data.ok, next.data.error)
  assert.equal(next.data.snapshot.phase, 'bidding')
  assert.deepEqual(next.data.snapshot.you.hand.length, 17)
})

test('加入 accepts exactly the body the floating window sends', async (t) => {
  // Regression for the bug that kept the other two machines out of the room: the
  // window posted `baseUrl` while becomeGuest read `url`, so 加入 always came
  // back with 「请填写房主地址（例如 …）」 no matter what the player typed, and no
  // seat was ever taken. The only test of this route posted `{host, port}`, the
  // *other* accepted shape, so the suite stayed green.
  const hostMachine = await mount(t, { port: 0, playerName: '房主' })
  const hostClient = localClient(hostMachine.baseUrl)
  await hostClient.get() // GET once for the token, then POST with it
  const hosted = await hostClient.post('host', { port: 0 })
  assert.ok(hosted.data.ok, hosted.data.error)
  const { code, port } = hosted.data.authority

  // Literally what src/client.cjs onJoin() posts.
  const guestMachine = await mount(t, { port: 0, playerName: '客人' })
  const guestClient = localClient(guestMachine.baseUrl)
  await guestClient.get()
  const joined = await guestClient.post('join', { url: `http://127.0.0.1:${port}`, code, name: '客人' })
  assert.ok(joined.data.ok, joined.data.error)
  assert.equal(joined.data.role, 'guest')
  assert.equal(joined.data.guest.seat, 1)

  // The older `baseUrl` shape keeps working, so shipping the fix does not require
  // every machine to update on the same day.
  const thirdMachine = await mount(t, { port: 0, playerName: '第三人' })
  const thirdClient = localClient(thirdMachine.baseUrl)
  await thirdClient.get()
  const viaLegacy = await thirdClient.post('join', { baseUrl: `http://127.0.0.1:${port}`, code, name: '第三人' })
  assert.ok(viaLegacy.data.ok, viaLegacy.data.error)
  assert.equal(viaLegacy.data.guest.seat, 2)

  // And a genuinely empty address is still refused with the message the player saw.
  const emptyMachine = await mount(t, { port: 0, playerName: '空的' })
  const emptyClient = localClient(emptyMachine.baseUrl)
  await emptyClient.get()
  const empty = await emptyClient.post('join', { code, name: '空的' })
  assert.equal(empty.data.ok, false)
  assert.match(empty.data.error, /请填写房主地址/)
})

test('a second plugin instance joins as a guest and plays through its own local API', async (t) => {
  const hostMachine = await mount(t, { port: 0, playerName: '房主' })
  const guestMachine = await mount(t, { port: 0, playerName: '客人' })

  const hostClient = localClient(hostMachine.baseUrl)
  const guestClient = localClient(guestMachine.baseUrl)
  await hostClient.get()
  await guestClient.get()

  const hosted = await hostClient.post('host', { port: 0 })
  const { code, loopbackUrl, port } = hosted.data.authority

  // The guest only ever learns an address and a code — the same two facts a
  // person would read off the host's screen.
  const probed = await guestClient.post('probe', { host: '127.0.0.1', port })
  assert.equal(probed.data.ok, true, probed.data.error)
  assert.equal(probed.data.hello.code, code)
  assert.equal(probed.data.hello.seatsTaken, 1)

  const joined = await guestClient.post('join', { host: '127.0.0.1', port, code, name: '客人' })
  assert.ok(joined.data.ok, joined.data.error)
  assert.equal(joined.data.role, 'guest')
  assert.equal(joined.data.guest.seat, 1)
  assert.equal(joined.data.guest.baseUrl, `http://127.0.0.1:${port}`)
  assert.equal(joined.data.snapshot.you.seat, 1)
  assert.equal(joined.data.snapshot.you.name, '客人')

  // A wrong code must not hand out a seat.
  const wrongCode = await guestClient.post('join', { host: '127.0.0.1', port, code: 'ZZZZZZ' })
  assert.equal(wrongCode.status, 409)
  assert.match(wrongCode.data.error, /房间码/)

  const unreachable = await guestClient.post('probe', { host: '127.0.0.1', port: 1 })
  assert.equal(unreachable.data.ok, false)

  // Third seat over the LAN port, then the guest's local API drives its own play.
  const lan = lanClient()
  const third = await lan.join(loopbackUrl, { name: '丙', code })
  assert.equal(third.data.seat, 2)
  assert.equal(third.data.state.phase, 'bidding')

  const guestNow = (await guestClient.get()).data.snapshot
  assert.equal(guestNow.phase, 'bidding')
  assert.equal(guestNow.you.hand.length, 17)
  assert.equal(guestNow.seats[0].hand, null, '客人看不到房主的手牌')

  // The guest's own long poll carries the host's bid into its local snapshot,
  // without the floating window ever touching the LAN itself.
  const hostBid = await hostClient.post('act', { action: { type: 'bid', score: 1 } })
  assert.ok(hostBid.data.ok, hostBid.data.error)
  const caughtUp = await waitUntil(async () => {
    const snapshot = (await guestClient.get()).data.snapshot
    return snapshot && snapshot.bids.length >= 1 ? snapshot : null
  }, 5000)
  assert.equal(caughtUp.bids[0].seat, 0)
  assert.equal(caughtUp.bids[0].score, 1)

  // It can read the table and answer for itself; only its own turn is accepted.
  const outOfTurn = await guestClient.post('act', { action: { type: 'pass' } })
  assert.equal(outOfTurn.data.ok, false)
  assert.ok(outOfTurn.data.error.length > 0)

  const guestSeat = guestNow.you.seat
  assert.equal(guestSeat, 1)
  // Seat 1 is next to bid, and a bid of 0 ("不叫") is always legal here.
  const view = await waitForTurn(guestMachine.baseUrl, 1)
  const answered = await guestClient.post('act', { action: view.phase === 'bidding' ? { type: 'bid', score: 0 } : { type: 'pass' } })
  assert.ok(answered.data.ok, answered.data.error)
  assert.equal(answered.data.role, 'guest')
})

/** Poll `check` until it returns something truthy, or give up. */
async function waitUntil(check, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await check()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('等待超时')
}

/** Wait until it is `seat`'s turn according to the guest's own snapshot. */
async function waitForTurn(baseUrl, seat, timeoutMs = 4000) {
  const client = localClient(baseUrl)
  return waitUntil(async () => {
    const snapshot = (await client.get()).data.snapshot
    if (!snapshot) return null
    const turn = snapshot.phase === 'bidding' ? snapshot.bidTurnSeat : snapshot.toAct
    return turn === seat ? snapshot : null
  }, timeoutMs).catch(() => {
    throw new Error(`等不到座位 ${seat} 的回合`)
  })
}

test('leaving and unloading both release the LAN port', async (t) => {
  const { plugin, baseUrl, stub } = await mount(t, { port: 0 })
  const client = localClient(baseUrl)
  await client.get()

  const hosted = await client.post('host', { port: 0 })
  const { port, loopbackUrl } = hosted.data.authority
  assert.equal((await fetch(`${loopbackUrl}/hello`)).status, 200)

  const left = await client.post('leave', {})
  assert.equal(left.data.role, 'idle')
  assert.equal(left.data.snapshot, null)
  await assert.rejects(() => fetch(`${loopbackUrl}/hello`), '离开后局域网端口应当关闭')

  // Re-hosting on the freed port must work.
  const again = await client.post('host', { host: '127.0.0.1', port })
  assert.ok(again.data.ok, again.data.error)
  assert.equal(again.data.authority.port, port)

  // Unloading disposes the route and shuts the authority down.
  const disposer = stub.teardowns[0]
  assert.equal(typeof disposer, 'function')
  disposer()
  await plugin.shutdown()
  await assert.rejects(() => fetch(`${loopbackUrl}/hello`))
  assert.equal(plugin.localState().role, 'idle')
})

test('hosting while already hosting replaces the room instead of leaking a port', async (t) => {
  const { baseUrl } = await mount(t, { port: 0 })
  const client = localClient(baseUrl)
  await client.get()

  const first = await client.post('host', { port: 0 })
  const firstUrl = first.data.authority.loopbackUrl
  const second = await client.post('host', { port: 0 })
  assert.ok(second.data.ok, second.data.error)
  assert.notEqual(second.data.authority.port, first.data.authority.port)
  assert.notEqual(second.data.authority.code, first.data.authority.code)
  await assert.rejects(() => fetch(`${firstUrl}/hello`), '旧房间的端口应当已经释放')
  assert.equal((await fetch(`${second.data.authority.loopbackUrl}/hello`)).status, 200)
})

test('hosting on a port already in use fails cleanly and stays idle', async (t) => {
  const { baseUrl } = await mount(t, { port: 0 })
  const client = localClient(baseUrl)
  await client.get()

  const blocker = createServer(() => {})
  await new Promise((resolve) => blocker.listen(0, '0.0.0.0', resolve))
  const port = blocker.address().port
  t.after(() => new Promise((resolve) => blocker.close(resolve)))

  const failed = await client.post('host', { port })
  assert.equal(failed.status, 409)
  assert.equal(failed.data.ok, false)
  assert.match(failed.data.error, /开房失败/)
  assert.equal(failed.data.role, 'idle')
  assert.equal(failed.data.snapshot, null)

  // Still usable afterwards.
  const good = await client.post('host', { port: 0 })
  assert.ok(good.data.ok, good.data.error)
})

test('acting before entering a room is refused with a readable reason', async (t) => {
  const { baseUrl } = await mount(t)
  const client = localClient(baseUrl)
  await client.get()

  const result = await client.post('act', { action: { type: 'bid', score: 1 } })
  assert.equal(result.status, 200)
  assert.equal(result.data.ok, false)
  assert.match(result.data.error, /还没进桌/)
})
