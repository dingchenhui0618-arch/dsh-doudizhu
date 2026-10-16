/**
 * Transport tests: real TCP, real HTTP, no mocks.
 *
 * The authority binds an ephemeral port on 127.0.0.1 for most tests so the suite
 * never trips a firewall prompt; one test binds 0.0.0.0 and reaches the server on
 * the machine's LAN address, which is the property the whole design depends on.
 *
 * The leak invariant is re-checked here against what actually crossed the wire.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { PHASES, bidSeat, checkPlay } from '../src/game.js'
import {
  createAuthorityServer,
  createFollowerLink,
  isVirtualIface,
  lanAddresses,
  rankLanCandidates,
} from '../src/net.js'
import { createRoom } from '../src/room.js'
import { SEAT_COUNT, deckIds } from '../src/rules.js'
import { seedRandom } from '../src/rng.js'
import { assertSnapshotHasNoForeignCards, everyString } from './helpers/leak.mjs'

const CODE = 'LAN234'

async function withAuthority(t, { seed = 7, host = '127.0.0.1', pollTimeoutMs = 150 } = {}) {
  const room = createRoom({ code: CODE, rng: seedRandom(seed) })
  const authority = await createAuthorityServer(room, { host, port: 0, pollTimeoutMs })
  t.after(() => authority.close())
  return { room, authority }
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: token ? { 'x-ddz-token': token } : {} })
  return { status: res.status, data: await res.json() }
}

async function postJson(url, body, token) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers['x-ddz-token'] = token
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: res.status, data: await res.json() }
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function runProbe(baseUrl, code, name) {
  const script = fileURLToPath(new URL('./fixtures/follower-probe.mjs', import.meta.url))
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, baseUrl, code, name], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('子进程超时'))
    }, 30000)
    child.stdout.on('data', (chunk) => {
      out += chunk
    })
    child.stderr.on('data', (chunk) => {
      err += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code_) => {
      clearTimeout(timer)
      if (code_ !== 0) {
        reject(new Error(`子进程退出码 ${code_}: ${err}`))
        return
      }
      try {
        resolve(JSON.parse(out))
      } catch {
        reject(new Error(`无法解析子进程输出: ${out}\n${err}`))
      }
    })
  })
}

test('the authority answers /hello with room facts and no card ids', async (t) => {
  const { authority } = await withAuthority(t)
  const { status, data } = await getJson(`${authority.loopbackUrl}/hello`)

  assert.equal(status, 200)
  assert.equal(data.ok, true)
  assert.equal(data.protocol, 1)
  assert.equal(data.code, CODE)
  assert.equal(data.seatsTaken, 0)
  assert.equal(data.free, 3)
  assert.ok(authority.port > 0)
  assert.equal(authority.url, `http://127.0.0.1:${authority.port}`)

  const strings = everyString(data)
  for (const id of deckIds()) assert.equal(strings.has(id), false, `/hello 泄露了牌面 ${id}`)
})

test('three players join over HTTP and the hand is dealt automatically', async (t) => {
  const { room, authority } = await withAuthority(t)
  const joined = []
  for (const name of ['甲', '乙', '丙']) {
    const { status, data } = await postJson(`${authority.loopbackUrl}/join`, { name, code: CODE })
    assert.equal(status, 200)
    assert.ok(data.ok, data.error)
    joined.push(data)
  }

  assert.deepEqual(joined.map((entry) => entry.seat), [0, 1, 2])
  assert.equal(new Set(joined.map((entry) => entry.token)).size, 3)
  assert.equal(room.game.phase, PHASES.BIDDING)
  assert.equal(room.game.players.reduce((sum, player) => sum + player.hand.length, 0) + 3, 54)

  const last = joined[2].state
  assert.equal(last.seatsTaken, 3)
  assert.equal(last.you.hand.length, 17)
  assert.equal(last.seats[0].hand, null, 'the third player cannot see the first one hand')
  assert.equal(last.seats[0].count, 17)

  const fourth = await postJson(`${authority.loopbackUrl}/join`, { name: '丁', code: CODE })
  assert.equal(fourth.status, 409)
  assert.equal(fourth.data.ok, false)

  const wrongCode = await postJson(`${authority.loopbackUrl}/join`, { name: '丁', code: 'NOPE23' })
  assert.equal(wrongCode.status, 403)
})

test('state and actions require a valid seat token', async (t) => {
  const { authority } = await withAuthority(t)
  await postJson(`${authority.loopbackUrl}/join`, { name: '甲', code: CODE })

  assert.equal((await getJson(`${authority.loopbackUrl}/state`)).status, 401)
  assert.equal((await getJson(`${authority.loopbackUrl}/state`, 'bogus')).status, 401)
  assert.equal((await postJson(`${authority.loopbackUrl}/act`, { type: 'bid', score: 1 })).status, 401)
  assert.equal((await postJson(`${authority.loopbackUrl}/act`, { type: 'bid', score: 1 }, 'bogus')).status, 401)
})

test('the long poll answers at once, holds on change, and gives up on timeout', async (t) => {
  const { room, authority } = await withAuthority(t, { pollTimeoutMs: 120 })
  const a = await postJson(`${authority.loopbackUrl}/join`, { name: '甲', code: CODE })
  await postJson(`${authority.loopbackUrl}/join`, { name: '乙', code: CODE })
  await postJson(`${authority.loopbackUrl}/join`, { name: '丙', code: CODE })

  const immediate = await getJson(`${authority.loopbackUrl}/state?since=0`, a.data.token)
  assert.equal(immediate.status, 200)
  assert.equal(immediate.data.changed, true)

  const since = room.seq
  const timedOut = await getJson(`${authority.loopbackUrl}/state?since=${since}`, a.data.token)
  assert.equal(timedOut.status, 200)
  assert.equal(timedOut.data.changed, false)
  assert.ok(timedOut.data.state, 'a timed-out poll still returns the current state')

  const pending = getJson(`${authority.loopbackUrl}/state?since=${since}`, a.data.token)
  await settle(40)
  const moved = await postJson(`${authority.loopbackUrl}/act`, { type: 'bid', score: 1 }, a.data.token)
  assert.ok(moved.data.ok, moved.data.error)

  const woke = await pending
  assert.equal(woke.data.changed, true)
  assert.ok(woke.data.state.seq > since)
  assert.equal(woke.data.state.phase, PHASES.BIDDING)
})

test('a refused action is a readable reason, not a transport failure', async (t) => {
  const { authority } = await withAuthority(t)
  const a = await postJson(`${authority.loopbackUrl}/join`, { name: '甲', code: CODE })
  const b = await postJson(`${authority.loopbackUrl}/join`, { name: '乙', code: CODE })
  await postJson(`${authority.loopbackUrl}/join`, { name: '丙', code: CODE })

  const outOfTurn = await postJson(`${authority.loopbackUrl}/act`, { type: 'bid', score: 1 }, b.data.token)
  assert.equal(outOfTurn.status, 200)
  assert.equal(outOfTurn.data.ok, false)
  assert.ok(outOfTurn.data.error.length > 0)
  assert.ok(outOfTurn.data.state, 'a refusal still carries the current state')

  const unknownAction = await postJson(`${authority.loopbackUrl}/act`, { type: 'dance' }, a.data.token)
  assert.equal(unknownAction.data.ok, false)
  assert.match(unknownAction.data.error, /未知操作/)

  const badJson = await fetch(`${authority.loopbackUrl}/act`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ddz-token': a.data.token },
    body: '{',
  })
  assert.equal(badJson.status, 400)

  const notFound = await postJson(`${authority.loopbackUrl}/nope`, {}, a.data.token)
  assert.equal(notFound.status, 404)
})

test('a follower link joins, long-polls, and reports refusals', async (t) => {
  const { authority } = await withAuthority(t, { pollTimeoutMs: 150 })
  const links = ['甲', '乙', '丙'].map((name) =>
    createFollowerLink({ baseUrl: authority.loopbackUrl, code: CODE, name, pollTimeoutMs: 150 }),
  )
  for (const link of links) await link.join()
  // The deal happens when the third seat fills, so everyone's first snapshot is
  // still the pre-deal lobby revision. Pull them all up before asserting.
  for (const link of links) await link.refresh()

  assert.deepEqual(links.map((link) => link.seat()), [0, 1, 2])
  assert.equal(links[0].snapshot().you.hand.length, 17)
  assert.equal(links[0].snapshot().seats[1].hand, null)

  const pending = links[1].refresh()
  await settle(30)
  const opened = await links[0].act({ type: 'bid', score: 3 })
  assert.ok(opened.ok, opened.error)
  assert.equal(opened.state.phase, PHASES.PLAYING)

  const polled = await pending
  assert.equal(polled.changed, true)
  assert.equal(polled.state.phase, PHASES.PLAYING)
  assert.equal(polled.state.landlordSeat, 0)

  const refused = await links[2].act({ type: 'play', cards: ['S3'] })
  assert.equal(refused.ok, false)
  assert.ok(refused.error.length > 0)

  const unauthorized = createFollowerLink({ baseUrl: authority.loopbackUrl, code: CODE, name: '丁', token: 'nope' })
  await assert.rejects(() => unauthorized.join(), /身份已失效/)
})

test('three followers play a whole hand over HTTP with no leak at any step', async (t) => {
  const { room, authority } = await withAuthority(t, { seed: 11, pollTimeoutMs: 150 })
  const links = ['甲', '乙', '丙'].map((name) =>
    createFollowerLink({ baseUrl: authority.loopbackUrl, code: CODE, name, pollTimeoutMs: 150 }),
  )
  for (const link of links) await link.join()
  assert.equal(room.game.phase, PHASES.BIDDING)

  let steps = 0
  while (room.game.phase !== PHASES.FINISHED && steps < 400) {
    steps += 1
    const game = room.game
    const seat = game.phase === PHASES.BIDDING ? bidSeat(game) : game.toAct
    let result
    if (game.phase === PHASES.BIDDING) {
      result = await links[seat].act({ type: 'bid', score: game.bids.length === 0 ? 1 : 0 })
    } else if (game.phase === PHASES.PLAYING) {
      const hand = [...game.players[seat].hand]
      const legal = hand.map((id) => [id]).filter((cards) => checkPlay(game, seat, cards).ok)
      result = await links[seat].act(legal.length ? { type: 'play', cards: legal[legal.length - 1] } : { type: 'pass' })
    } else {
      break
    }
    assert.ok(result.ok, `${result.error}（HTTP 第 ${steps} 步）`)

    // Pull every client up to the current revision, then assert on exactly what
    // each of them holds right now. The seat that just acted is already current,
    // so only the others need a round trip — that also keeps the suite quick.
    await Promise.all(links.filter((link) => link.seq() !== room.seq).map((link) => link.refresh()))
    for (let viewer = 0; viewer < SEAT_COUNT; viewer += 1) {
      const snapshot = links[viewer].snapshot()
      assert.equal(snapshot.seq, room.seq, `座位 ${viewer} 的快照没有跟上（第 ${steps} 步）`)
      assertSnapshotHasNoForeignCards(snapshot, room.game, viewer, `HTTP 第 ${steps} 步`)
    }
  }

  assert.equal(room.game.phase, PHASES.FINISHED)
  assert.ok(steps > 10, `一盘应该有很多步，实际 ${steps}`)

  // The end-of-hand reveal is deliberate and reaches every client.
  await Promise.all(links.filter((link) => link.seq() !== room.seq).map((link) => link.refresh()))
  for (const link of links) {
    assert.equal(link.snapshot().secretsRevealed, true)
    assert.ok(link.snapshot().seats.every((seat) => Array.isArray(seat.hand)))
  }
})

test('a follower reconnects with its token and keeps its hand', async (t) => {
  const { authority } = await withAuthority(t)
  const link = createFollowerLink({ baseUrl: authority.loopbackUrl, code: CODE, name: '甲' })
  await link.join()
  await link.refresh()
  const hand = [...link.snapshot().you.hand]
  const token = link.token()
  await link.leave()

  const revived = createFollowerLink({ baseUrl: authority.loopbackUrl, code: CODE, name: '甲', token })
  const again = await revived.join()
  assert.equal(again.seat, 0)
  assert.equal(again.rejoin, true)
  assert.deepEqual(revived.snapshot().you.hand, hand)
  assert.equal(revived.snapshot().seats[0].connected, true)
})

test('a separate OS process can join and still sees no foreign hand', async (t) => {
  const { room, authority } = await withAuthority(t, { seed: 5 })
  await postJson(`${authority.loopbackUrl}/join`, { name: '甲', code: CODE })
  await postJson(`${authority.loopbackUrl}/join`, { name: '乙', code: CODE })

  const probe = await runProbe(authority.loopbackUrl, CODE, '子进程')

  assert.equal(probe.seat, 2)
  assert.equal(probe.protocol, 1)
  assert.equal(probe.phase, PHASES.BIDDING)
  assert.equal(probe.handLength, 17)
  assert.equal(probe.myHand.length, 17)
  assert.deepEqual(probe.otherHands, [null, null], '另一个进程拿不到别人的手牌')
  assert.deepEqual(probe.otherCounts, [17, 17])
  assert.ok(probe.tokenLength >= 32)
  assert.equal(probe.seatsTaken, 3)

  assert.equal(room.seats.filter(Boolean).length, 3)
  assert.equal(room.game.phase, PHASES.BIDDING)
})

test('virtual adapters are ranked last and never offered as the address to type', () => {
  const interfaces = {
    WLAN: [{ family: 'IPv4', address: '192.168.1.50', internal: false }],
    'vEthernet (WSL (Hyper-V firewall))': [{ family: 'IPv4', address: '172.22.0.1', internal: false }],
    'Loopback Pseudo-Interface 1': [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    Ethernet: [
      { family: 'IPv4', address: '169.254.10.20', internal: false },
      { family: 'IPv6', address: 'fe80::1', internal: false },
    ],
  }
  assert.equal(isVirtualIface('WLAN'), false)
  assert.equal(isVirtualIface('Ethernet'), false)
  assert.equal(isVirtualIface('vEthernet (WSL (Hyper-V firewall))'), true)
  assert.equal(isVirtualIface('VirtualBox Host-Only Network'), true)
  assert.equal(isVirtualIface('Docker Desktop'), true)
  assert.equal(isVirtualIface(undefined), false)

  // 172.22.0.1 is real and looks like a LAN address, so it stays in the list —
  // but behind the real adapter, which is what stops the coin flip.
  assert.deepEqual(rankLanCandidates(interfaces), [
    { address: '192.168.1.50', iface: 'WLAN', virtual: false },
    { address: '172.22.0.1', iface: 'vEthernet (WSL (Hyper-V firewall))', virtual: true },
  ])
  // Loopback is internal and 169.254.x is link-local: neither is offered at all.
  assert.deepEqual(rankLanCandidates(interfaces).map((entry) => entry.address), ['192.168.1.50', '172.22.0.1'])
  assert.deepEqual(rankLanCandidates({}), [])
  assert.deepEqual(rankLanCandidates(), [])
})

test('binding 0.0.0.0 makes the authority reachable on the LAN address', async (t) => {
  const candidates = lanAddresses()
  const room = createRoom({ code: CODE, rng: seedRandom(3) })
  const authority = await createAuthorityServer(room, { host: '0.0.0.0', port: 0, pollTimeoutMs: 100 })
  t.after(() => authority.close())

  // Every candidate is reported so the UI can name what it hid; only the real
  // adapters become the address we ask a human to type.
  assert.deepEqual(
    authority.lanCandidates.map((entry) => entry.url),
    candidates.map((entry) => `http://${entry.address}:${authority.port}`),
  )
  assert.deepEqual(
    authority.lanUrls,
    candidates.filter((entry) => !entry.virtual).map((entry) => `http://${entry.address}:${authority.port}`),
  )
  const local = await getJson(`${authority.loopbackUrl}/hello`)
  assert.equal(local.data.ok, true)

  if (!candidates.length) {
    t.diagnostic('本机没有局域网 IPv4 地址，跳过程序化局域网访问')
    return
  }
  const remote = await getJson(`http://${candidates[0].address}:${authority.port}/hello`)
  assert.equal(remote.status, 200)
  assert.equal(remote.data.code, CODE)
})

test('closing the authority wakes parked polls and frees the port', async (t) => {
  const room = createRoom({ code: CODE, rng: seedRandom(4) })
  const authority = await createAuthorityServer(room, { host: '127.0.0.1', port: 0, pollTimeoutMs: 30000 })
  const a = await postJson(`${authority.loopbackUrl}/join`, { name: '甲', code: CODE })

  const parked = getJson(`${authority.loopbackUrl}/state?since=${room.seq}`, a.data.token).catch(() => ({
    status: 0,
    data: null,
  }))
  await settle(50)
  await authority.close()
  const outcome = await parked
  // Either the released response arrives or the socket is dropped; both are
  // acceptable. What matters is that close() returned instead of hanging.
  assert.ok(outcome.status === 200 || outcome.status === 0, `非预期状态 ${outcome.status}`)

  await assert.rejects(() => fetch(`${authority.loopbackUrl}/hello`), '端口应当已经释放')
})
