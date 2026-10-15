/**
 * Room tests. The load-bearing one is the leak invariant: for every viewer, at
 * every point in a hand, the snapshot must not contain a single card id that
 * belongs to somebody else's hand and has not been made public.
 *
 * The check is structural (every string in the JSON tree is collected), not a
 * substring search, so it cannot be fooled by an id appearing inside other text.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { PHASES, bidSeat, checkPlay } from '../src/game.js'
import { SEAT_COUNT, deckIds } from '../src/rules.js'
import { seedRandom } from '../src/rng.js'
import {
  act,
  closeRoom,
  createRoom,
  joinSeat,
  roomInfo,
  seatForToken,
  setConnected,
  snapshotFor,
  waitForChange,
} from '../src/room.js'
import { assertSnapshotHasNoForeignCards, everyString } from './helpers/leak.mjs'

const NAMES = ['甲', '乙', '丙']

function freshRoom(seed = 20261015) {
  return createRoom({ code: 'ABC234', rng: seedRandom(seed) })
}

/** Seat all three players; the third join deals automatically. */
function seatThree(room) {
  const tokens = []
  for (const name of NAMES) {
    const result = joinSeat(room, { name })
    assert.ok(result.ok, result.error)
    tokens.push(result.token)
  }
  return tokens
}

function assertNoLeak(room, label) {
  for (let viewer = 0; viewer < SEAT_COUNT; viewer += 1) {
    assertSnapshotHasNoForeignCards(snapshotFor(room, viewer), room.game, viewer, label)
  }
}

/** Drive a whole hand through the room API, checking the invariant every step. */
function playOut(room, tokens, { seedBid = 1 } = {}) {
  let guard = 0
  let checks = 0
  while (room.game.phase !== PHASES.FINISHED && guard < 400) {
    guard += 1
    const game = room.game

    if (game.phase === PHASES.BIDDING) {
      const seat = bidSeat(game)
      const score = game.bids.length === 0 ? seedBid : 0
      const result = act(room, tokens[seat], { type: 'bid', score })
      assert.ok(result.ok, result.error)
    } else if (game.phase === PHASES.PLAYING) {
      const seat = game.toAct
      const hand = [...game.players[seat].hand]
      const legal = hand.map((id) => [id]).filter((cards) => checkPlay(game, seat, cards).ok)
      const action = legal.length ? { type: 'play', cards: legal[legal.length - 1] } : { type: 'pass' }
      const result = act(room, tokens[seat], action)
      assert.ok(result.ok, `${result.error} (seat ${seat}, ${action.type})`)
    } else {
      break
    }

    checks += 1
    assertNoLeak(room, `第 ${checks} 步`)
  }
  assert.equal(room.game.phase, PHASES.FINISHED, '整局应当打完')
  return checks
}

test('a fresh room is an empty lobby with an uppercase code', () => {
  const room = freshRoom()
  assert.equal(room.code, 'ABC234')
  assert.equal(room.phase, undefined)
  assert.equal(room.game.phase, PHASES.LOBBY)
  assert.equal(room.seq, 1)
  assert.equal(room.redeals, 0)
  assert.deepEqual(room.seats, [null, null, null])

  const info = roomInfo(room)
  assert.equal(info.seatsTaken, 0)
  assert.equal(info.free, 3)
  assert.equal(info.seats.length, 3)
  assert.ok(info.seats.every((seat) => seat.occupied === false && seat.name === null))
  // Structural, not textual: room info must carry no hand-shaped field at all,
  // and no card id from the deck.
  assert.equal('hand' in info, false)
  assert.equal(info.seats.some((seat) => 'hand' in seat), false)
  assert.equal(info.seats.some((seat) => 'cards' in seat), false)
  const strings = everyString(info)
  for (const id of deckIds()) {
    assert.equal(strings.has(id), false, `room info leaked a card id: ${id}`)
  }
})

test('joining fills seats clockwise and issues one token per seat', () => {
  const room = freshRoom()
  const first = joinSeat(room, { name: '甲' })
  assert.ok(first.ok)
  assert.equal(first.seat, 0)
  assert.equal(typeof first.token, 'string')
  assert.ok(first.token.length >= 32)
  assert.equal(first.started, false)
  assert.equal(room.game.phase, PHASES.LOBBY)

  const second = joinSeat(room, { name: '乙' })
  assert.equal(second.seat, 1)
  assert.equal(room.game.phase, PHASES.LOBBY)

  const third = joinSeat(room, { name: '丙' })
  assert.equal(third.seat, 2)
  assert.equal(third.started, true, 'the third seat deals automatically')
  assert.equal(room.game.phase, PHASES.BIDDING)
  assert.deepEqual(room.game.players.map((player) => player.hand.length), [17, 17, 17])
  assert.equal(room.game.bottom.length, 3)

  const fourth = joinSeat(room, { name: '丁' })
  assert.equal(fourth.ok, false)
  assert.equal(fourth.reason, 'full')
  assert.match(fourth.error, /已满/)

  const tokens = [first.token, second.token, third.token]
  assert.equal(new Set(tokens).size, 3, 'each seat gets its own token')
  assert.deepEqual(tokens.map((token) => seatForToken(room, token)), [0, 1, 2])
  assert.equal(seatForToken(room, 'nonsense'), null)
  assert.equal(seatForToken(room, undefined), null)
})

test('the room code is checked and a stale token is refused rather than reseated', () => {
  const room = freshRoom()
  joinSeat(room, { name: '甲' })

  const wrongCode = joinSeat(room, { name: '乙', code: 'ZZZZZZ' })
  assert.equal(wrongCode.ok, false)
  assert.equal(wrongCode.reason, 'bad-code')

  const lowerCase = joinSeat(room, { name: '乙', code: 'abc234' })
  assert.ok(lowerCase.ok, 'codes are compared case-insensitively')

  const stale = joinSeat(room, { name: '丙', token: 'deadbeef' })
  assert.equal(stale.ok, false)
  assert.equal(stale.reason, 'stale-token')
  assert.equal(room.seats.filter(Boolean).length, 2, 'a stale token must not take a new seat')
})

test('rejoining with a token restores the same seat and keeps the hand', () => {
  const room = freshRoom()
  const tokens = seatThree(room)
  const before = [...room.game.players[1].hand]

  setConnected(room, tokens[1], false)
  assert.equal(room.seats[1].connected, false)
  assert.deepEqual(room.game.players[1].hand, before, 'a disconnect never touches the hand')

  const rejoin = joinSeat(room, { name: '乙', token: tokens[1] })
  assert.ok(rejoin.ok, rejoin.error)
  assert.equal(rejoin.seat, 1)
  assert.equal(rejoin.rejoin, true)
  assert.equal(rejoin.token, tokens[1], 'the same token stays valid')
  assert.equal(room.seats[1].connected, true)
  assert.deepEqual(room.game.players[1].hand, before)
  assert.equal(room.game.phase, PHASES.BIDDING, 'reconnecting mid-hand does not re-deal')
})

test('names are tidied and capped', () => {
  const room = freshRoom()
  const blank = joinSeat(room, { name: '   ' })
  assert.equal(room.seats[blank.seat].name, '玩家1')

  const noisy = joinSeat(room, { name: 'Ａ\u0000\u0007乙\u001b[31m丙丁戊己庚辛壬癸子丑' })
  const name = room.seats[noisy.seat].name
  assert.equal([...name].length <= 12, true)
  assert.equal(/[\u0000-\u001f\u007f]/.test(name), false)
})

test('actions are refused without a seat token', () => {
  const room = freshRoom()
  seatThree(room)

  assert.equal(act(room, null, { type: 'bid', score: 1 }).ok, false)
  assert.equal(act(room, 'bogus', { type: 'bid', score: 1 }).reason, 'unauthorized')
  assert.equal(act(room, '', { type: 'play', cards: ['S3'] }).reason, 'unauthorized')
})

test('out-of-turn and illegal actions are refused by the engine, not the room', () => {
  const room = freshRoom()
  const tokens = seatThree(room)

  // Bidding opens at seat 0.
  const wrongSeat = act(room, tokens[1], { type: 'bid', score: 1 })
  assert.equal(wrongSeat.ok, false)
  assert.match(wrongSeat.error, /叫分/)

  assert.ok(act(room, tokens[0], { type: 'bid', score: 2 }).ok)
  const tooLow = act(room, tokens[1], { type: 'bid', score: 1 })
  assert.equal(tooLow.ok, false)
  assert.match(tooLow.error, /更高/)
  const zero = act(room, tokens[1], { type: 'bid', score: 0 })
  assert.ok(zero.ok)
  assert.ok(act(room, tokens[2], { type: 'bid', score: 0 }).ok)

  assert.equal(room.game.phase, PHASES.PLAYING)
  assert.equal(room.game.landlordSeat, 0)

  // Only the landlord leads, and only with cards it holds.
  const notMine = act(room, tokens[0], { type: 'play', cards: ['S3'] })
  if (!room.game.players[0].hand.includes('S3')) {
    assert.equal(notMine.ok, false, 'a card the landlord does not hold is refused')
  } else {
    assert.ok(notMine.ok)
  }

  const wrongOrder = act(room, tokens[1], { type: 'pass' })
  assert.equal(wrongOrder.ok, false)
  assert.match(wrongOrder.error, /出牌/)

  assert.equal(act(room, tokens[0], { type: 'nonsense' }).ok, false)
  assert.equal(act(room, tokens[0], {}).ok, false)
})

test('start is guarded by occupancy and by phase', () => {
  const room = freshRoom()
  const first = joinSeat(room, { name: '甲' })
  assert.equal(act(room, first.token, { type: 'start' }).ok, false, 'one player cannot start')

  const tokens = [first.token, joinSeat(room, { name: '乙' }).token, joinSeat(room, { name: '丙' }).token]
  // The third join already dealt, so an explicit start now must be refused.
  assert.equal(room.game.phase, PHASES.BIDDING)
  const late = act(room, tokens[0], { type: 'start' })
  assert.equal(late.ok, false)
  assert.match(late.error, /已经开局/)
})

test('nobody bidding redeals as the same 局 and keeps the dealer', () => {
  const room = freshRoom()
  const tokens = seatThree(room)
  const handNo = room.game.handNo
  const dealer = room.game.dealerSeat
  const firstHand = room.game.players.map((player) => [...player.hand])

  for (const token of tokens) {
    const seat = seatForToken(room, token)
    assert.equal(bidSeat(room.game), seat)
    assert.ok(act(room, token, { type: 'bid', score: 0 }).ok)
  }

  assert.equal(room.redeals, 1)
  assert.equal(room.game.phase, PHASES.BIDDING, 'a redeal lands straight back in bidding')
  assert.equal(room.game.handNo, handNo, 'a redeal is the same 局, so the count does not jump')
  assert.equal(room.game.dealerSeat, dealer, 'the first-bid seat only rotates between 局')
  assert.notDeepEqual(room.game.players[0].hand, firstHand[0])
  assert.equal(room.game.players.reduce((sum, player) => sum + player.hand.length, 0) + 3, 54)
})

test('the leak invariant holds at every step of a whole hand', () => {
  const room = freshRoom()
  const tokens = seatThree(room)
  assertNoLeak(room, '发牌后')

  const steps = playOut(room, tokens)
  assert.ok(steps > 10, `一盘应该有很多步，实际 ${steps}`)
  assert.equal(room.game.phase, PHASES.FINISHED)

  // At the end the reveal is deliberate, so hands are visible — but the flag
  // must be set, and only then.
  const snapshot = snapshotFor(room, 0)
  assert.equal(snapshot.secretsRevealed, true)
  assert.ok(snapshot.seats.every((seat) => Array.isArray(seat.hand)))
})

test('the reveal only happens once the hand is over', () => {
  const room = freshRoom()
  seatThree(room)

  const bidding = snapshotFor(room, 1)
  assert.equal(bidding.secretsRevealed, false)
  assert.deepEqual(bidding.bottom, [], 'the bottom stays hidden through bidding')
  assert.equal(bidding.bottomRevealed, false)
  assert.equal(bidding.seats[1].hand.length, 17, 'you see your own hand')
  assert.equal(bidding.seats[0].hand, null, 'you do not see theirs')
  assert.equal(bidding.seats[2].hand, null)
  assert.equal(bidding.seats[0].count, 17, 'you do see how many they hold')
  assert.equal(bidding.seats[1].isYou, true)

  const tokens = room.seats.map((seat) => seat.token)
  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)
  assert.equal(room.game.phase, PHASES.PLAYING)

  const playing = snapshotFor(room, 1)
  assert.equal(playing.bottomRevealed, true)
  assert.deepEqual(playing.bottom, [...room.game.bottom])
  assert.equal(playing.seats[1].hand.length, 17)
  assert.equal(playing.seats[0].hand, null)
  assert.equal(playing.seats[0].count, 20)
  assert.equal(playing.landlordSeat, 0)
  assert.equal(playing.seats[0].role, 'landlord')
  assert.equal(playing.seats[1].role, 'farmer')
  assert.equal(playing.seats[2].role, 'farmer')

  const finished = snapshotFor({ ...room, game: { ...room.game, phase: PHASES.FINISHED } }, 1)
  assert.equal(finished.secretsRevealed, true)
  assert.ok(Array.isArray(finished.seats[0].hand))
})

test('snapshots carry the flags and hints the floating window needs', () => {
  const room = freshRoom()
  const tokens = seatThree(room)

  const waiting = snapshotFor(room, 1)
  assert.equal(waiting.canBid, false)
  assert.equal(waiting.canAct, false)
  assert.equal(waiting.canPass, false)
  assert.equal(waiting.bidTurnSeat, 0)
  assert.match(waiting.hint, /等待/)

  const toBid = snapshotFor(room, 0)
  assert.equal(toBid.canBid, true)
  assert.match(toBid.hint, /轮到你叫分/)
  assert.equal(toBid.you.seat, 0)
  assert.equal(toBid.you.name, '甲')

  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)

  const leading = snapshotFor(room, 0)
  assert.equal(leading.canAct, true)
  assert.equal(leading.canPass, false, 'the landlord leads and cannot decline')
  assert.match(leading.hint, /先手/)

  const following = snapshotFor(room, 1)
  assert.equal(following.canAct, false)
  assert.match(following.hint, /等待/)

  // A snapshot is plain JSON and survives a round trip unchanged.
  const clone = JSON.parse(JSON.stringify(snapshotFor(room, 2)))
  assert.deepEqual(clone, snapshotFor(room, 2))
})

test('flags track the table once play starts', () => {
  const room = freshRoom()
  const tokens = seatThree(room)
  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)

  const game = room.game
  const landlord = game.toAct
  const weakest = [...game.players[landlord].hand].at(-1)
  assert.ok(act(room, tokens[landlord], { type: 'play', cards: [weakest] }).ok)

  const next = room.game.toAct
  const view = snapshotFor(room, next)
  assert.equal(view.canAct, true)
  assert.equal(view.canPass, true, 'following means passing is available')
  assert.equal(view.lastPlay.seat, landlord)
  assert.equal(view.lastPlay.cards[0], weakest)
  assert.ok(view.lastPlay.move.label.length > 0)
  assert.match(view.hint, /压过/)
  assert.equal(view.plays.length, 1)
  assert.equal(view.plays[0].seat, landlord)
  assert.equal(view.seats[landlord].count, 19)
})

test('the next hand rotates the first-bid seat and keeps the tally', () => {
  const room = freshRoom()
  const tokens = seatThree(room)
  playOut(room, tokens)

  const finished = snapshotFor(room, 0)
  assert.equal(finished.canNext, true)
  assert.match(finished.hint, /获胜/)
  const dealerBefore = room.game.dealerSeat
  const handNoBefore = room.game.handNo
  const won = { ...room.game.handsWon }

  assert.ok(act(room, tokens[2], { type: 'next' }).ok)
  assert.equal(room.game.dealerSeat, (dealerBefore + 1) % 3)
  assert.equal(room.game.handNo, handNoBefore + 1)
  assert.equal(room.game.phase, PHASES.BIDDING)
  assert.deepEqual(room.game.handsWon, won, 'the tally survives the next deal')
  assert.equal(room.game.landlordSeat, null)
  assert.equal(room.game.bottomRevealed, false)
  assert.equal(snapshotFor(room, 0).canNext, false)

  const early = act(room, tokens[0], { type: 'next' })
  assert.equal(early.ok, false)
  assert.match(early.error, /还没结束/)
})

test('waitForChange resolves on the next change and otherwise times out', async () => {
  const room = freshRoom()

  const changed = waitForChange(room, room.seq, 4000)
  joinSeat(room, { name: '甲' })
  const outcome = await changed
  assert.equal(outcome.changed, true)
  assert.ok(outcome.seq > 1)

  // A `since` behind the current seq answers immediately.
  const immediate = await waitForChange(room, 0, 4000)
  assert.equal(immediate.changed, true)

  const before = room.seq
  const timedOut = await waitForChange(room, before, 30)
  assert.equal(timedOut.changed, false)
  assert.equal(room.waiters.size, 0, 'a timed-out waiter is not left behind')

  const pending = waitForChange(room, room.seq, 4000)
  closeRoom(room)
  const released = await pending
  assert.equal(released.changed, true, 'shutdown releases a parked poll')
  assert.equal(room.waiters.size, 0)
})

test('the lobby already shows the name a player chose', () => {
  const room = freshRoom()
  const first = joinSeat(room, { name: '房主' })
  assert.ok(first.ok, first.error)

  const lobby = snapshotFor(room, 0)
  assert.equal(lobby.phase, PHASES.LOBBY)
  assert.equal(lobby.you.name, '房主', '大厅阶段必须显示真实名字，不能是占位名')
  assert.equal(lobby.seats[0].name, '房主')
  assert.equal(lobby.seats[1].name, '玩家二', '空座位仍然是占位名')

  joinSeat(room, { name: '客人' })
  assert.equal(snapshotFor(room, 1).you.name, '客人')
  joinSeat(room, { name: '丙' })
  assert.equal(room.game.phase, PHASES.BIDDING)
  assert.equal(snapshotFor(room, 0).you.name, '房主')
  assert.equal(snapshotFor(room, 1).you.name, '客人')
  assert.equal(snapshotFor(room, 2).you.name, '丙')
})

test('two seats can join with the same name without colliding', () => {
  const room = freshRoom()
  const a = joinSeat(room, { name: '小明' })
  const b = joinSeat(room, { name: '小明' })
  assert.equal(a.seat, 0)
  assert.equal(b.seat, 1)
  assert.notEqual(a.token, b.token)
  assert.equal(room.seats[0].name, room.seats[1].name)
  assert.equal(seatForToken(room, a.token), 0)
  assert.equal(seatForToken(room, b.token), 1)
})
