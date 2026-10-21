/**
 * The computer driver is attached to the ROOM, not to the authority's request
 * handler.
 *
 * This file exists because of a real table: the player sitting on the authority
 * machine acted through the plugin's loopback route, the seat whose turn came
 * next was a computer, and the table then waited forever. The bots were driven
 * from `net.js`'s `finally` hook, so only a request that arrived on the LAN port
 * could move them — a single-machine game with nobody else polling froze on the
 * first computer turn, and a LAN game looked like the computers were lagging by
 * one poll.
 *
 * The rule these tests pin: a room change is a room change, whoever made it and
 * however it arrived.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { chooseAction } from '../src/bot.js'
import { createAuthorityServer } from '../src/net.js'
import { mulberry32, seedRandom } from '../src/rng.js'
import {
  applyAction,
  botTurnSeat,
  botView,
  createRoom,
  joinSeat,
  snapshotFor,
  watchRoom,
} from '../src/room.js'

/** Seat one human, fill the rest with computers, deal the first hand. */
function tableWithBots(seed, { level = 'hard', bots = 2 } = {}) {
  const room = createRoom({ code: 'DRIVR' + (seed % 10), rng: seedRandom(seed) })
  const human = joinSeat(room, { name: '我' })
  const filled = applyAction(room, human.seat, { type: 'bots', level, count: bots })
  assert.equal(filled.ok, true, filled.error)
  return { room, humanSeat: human.seat, rand: mulberry32(seed + 1) }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('the computers keep playing after a move made through the room API alone', async () => {
  const { room, humanSeat, rand } = tableWithBots(31)
  // A port is picked by the OS, and the driver runs a few milliseconds behind.
  const authority = await createAuthorityServer(room, { host: '127.0.0.1', port: 0, botDelayMs: 5 })
  try {
    // Nobody talks to `authority` in this test on purpose: the human's moves go
    // straight into the room, which is exactly what the plugin's loopback route
    // does for the player on this machine.
    let humanMoves = 0
    const startedAt = Date.now()
    while (Date.now() - startedAt < 5000) {
      const snapshot = snapshotFor(room, humanSeat)
      if (snapshot.phase === 'finished') break
      if (botTurnSeat(room) === null) {
        const action = chooseAction(botView(room, humanSeat), { rand })
        if (action) {
          const result = applyAction(room, humanSeat, action)
          assert.equal(result.ok, true, `人类出牌失败：${result.error}`)
          humanMoves += 1
        }
      }
      await sleep(5)
    }

    assert.equal(room.game.phase, 'finished', '一局应该打完，而不是停在某个电脑的回合')
    assert.ok(humanMoves > 3, `人类应该出过好几次牌，实际 ${humanMoves} 次`)
    // Every computer seat took several turns; a driver that only ran on the first
    // deal would leave this at a handful.
    assert.ok(room.game.turns.length > 8, `电脑应该走了很多手，实际回合记录 ${room.game.turns.length} 条`)
  } finally {
    await authority.close()
  }
})

test('the same table also plays out when nothing listens on any port', async () => {
  // No authority server at all: with the driver on the room, a computer still
  // moves as long as something drives it. This covers the "table is hosted but
  // the port is blocked" and "tests want no sockets" cases.
  const { room, humanSeat, rand } = tableWithBots(32)
  const unwatch = watchRoom(room, () => {
    // A stand-in for the driver: answer one computer turn per change, inline.
    const seat = botTurnSeat(room)
    if (seat !== null) applyAction(room, seat, chooseAction(botView(room, seat), { rand }))
  })
  try {
    let humanMoves = 0
    while (room.game.phase !== 'finished' && humanMoves < 60) {
      if (botTurnSeat(room) === null) {
        const action = chooseAction(botView(room, humanSeat), { rand })
        if (!action) break
        const result = applyAction(room, humanSeat, action)
        assert.equal(result.ok, true, result.error)
        humanMoves += 1
      } else {
        break
      }
    }
    assert.equal(room.game.phase, 'finished', '同步驱动也应该把一局打完')
    assert.ok(room.game.turns.length > 8)
  } finally {
    unwatch()
  }
})

test('a watcher sees every change, and stops seeing them once it unsubscribes', () => {
  const room = createRoom({ code: 'WATCH1', rng: seedRandom(33) })
  const human = joinSeat(room, { name: '我' })

  let seen = 0
  const unwatch = watchRoom(room, () => {
    seen += 1
  })

  const filled = applyAction(room, human.seat, { type: 'bots', level: 'easy', count: 2 })
  assert.equal(filled.ok, true)
  const afterFill = seen
  assert.ok(afterFill > 0, '补电脑要能让监听者知道')

  const renamed = applyAction(room, human.seat, { type: 'rename', name: '老王' })
  assert.equal(renamed.ok, true)
  assert.ok(seen > afterFill, '改名也是一次房间变化')

  // A rename to the same name changes nothing, so it must not wake anyone.
  const before = seen
  applyAction(room, human.seat, { type: 'rename', name: '老王' })
  assert.equal(seen, before, '没有变化的变化不该惊动监听者')

  unwatch()
  const quiet = seen
  applyAction(room, human.seat, { type: 'bots', level: 'medium' })
  assert.equal(seen, quiet, '退订之后不该再收到通知')
})

test('a watcher that throws does not turn a legal move into a failed one', () => {
  const room = createRoom({ code: 'WATCH2', rng: seedRandom(34) })
  const human = joinSeat(room, { name: '我' })
  applyAction(room, human.seat, { type: 'bots', level: 'hard', count: 2 })

  const unwatch = watchRoom(room, () => {
    throw new Error('boom')
  })
  try {
    const seqBefore = room.seq
    let played = null
    // Find the human's turn and take it; a broken watcher must not block this.
    for (let guard = 0; guard < 200 && played === null; guard += 1) {
      const seat = botTurnSeat(room)
      if (seat !== null) {
        const botAction = chooseAction(botView(room, seat), { rand: mulberry32(guard + 1) })
        const botResult = applyAction(room, seat, botAction)
        assert.equal(botResult.ok, true, botResult.error)
        continue
      }
      const snapshot = snapshotFor(room, human.seat)
      if (snapshot.phase === 'finished') break
      const action = chooseAction(botView(room, human.seat), { rand: mulberry32(guard + 7) })
      played = applyAction(room, human.seat, action)
    }
    assert.ok(played && played.ok, '监听者抛错不该让人类的合法出牌失败')
    // A bid is an action too, and bidding does not add a turn record — the room
    // counter is the honest "something changed" signal here.
    assert.ok(room.seq > seqBefore, '这一步应该真的改变了房间')
  } finally {
    unwatch()
  }
})
