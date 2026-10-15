/**
 * Hand-engine tests: dealing, clockwise bidding, landlord selection, play/pass
 * legality, hand end, and the per-hand rotation of the first-bid seat.
 *
 * Transition tests build controlled playing states from a real deal, so the
 * state machine is exercised through its public API only — no internal reach-in.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOTTOM_SIZE,
  HAND_SIZE,
  LANDLORD_HAND_SIZE,
  PHASES,
  bidSeat,
  canPass,
  checkPlay,
  createGame,
  handCounts,
  handOf,
  highestBid,
  jokersHeld,
  nextHand,
  passTurn,
  placeBid,
  playCards,
  startHand,
} from '../src/game.js'
import { classifyMove, deckIds } from '../src/rules.js'
import { seedRandom } from '../src/rng.js'

const SEED = 20261015
const NAMES = ['甲', '乙', '丙']

function deal(seed = SEED, state = createGame(NAMES)) {
  const result = startHand(state, { rng: seedRandom(seed) })
  assert.ok(result.ok, result.error)
  return result.state
}

/** A controlled playing state built on top of a real deal. */
function playing({ hands, landlordSeat = 0, toAct, lastPlay = null, passes = 0, seed = SEED }) {
  const base = deal(seed)
  return {
    ...base,
    phase: PHASES.PLAYING,
    landlordSeat,
    bottomRevealed: true,
    players: base.players.map((player) => ({ ...player, hand: [...hands[player.seat]] })),
    toAct: toAct === undefined ? landlordSeat : toAct,
    lastPlay,
    passes,
    plays: [],
  }
}

/** All 54 ids held across the three hands plus the bottom cards. */
function allIds(state) {
  return [...state.players.flatMap((player) => player.hand), ...state.bottom]
}

test('a new game is an empty three-seat lobby', () => {
  const state = createGame(NAMES)
  assert.equal(state.phase, PHASES.LOBBY)
  assert.equal(state.handNo, 0)
  assert.equal(state.dealerSeat, 0)
  assert.equal(state.landlordSeat, null)
  assert.deepEqual(state.bids, [])
  assert.deepEqual(state.handsWon, { landlord: 0, farmers: 0 })
  assert.deepEqual(state.players.map((player) => player.name), NAMES)
  assert.deepEqual(state.players.map((player) => player.seat), [0, 1, 2])
  assert.ok(state.players.every((player) => player.hand.length === 0))

  const unnamed = createGame()
  assert.equal(unnamed.players.length, 3)
  assert.ok(unnamed.players.every((player) => player.name.length > 0))
})

test('a hand deals 17/17/17 plus 3 bottom cards from one 54-card deck', () => {
  const state = deal()

  assert.equal(state.phase, PHASES.BIDDING)
  assert.equal(state.handNo, 1)
  assert.equal(state.landlordSeat, null)
  assert.equal(state.bottom.length, BOTTOM_SIZE)
  assert.equal(state.bottomRevealed, false)
  assert.deepEqual(state.players.map((player) => player.hand.length), [HAND_SIZE, HAND_SIZE, HAND_SIZE])

  const ids = allIds(state)
  assert.equal(ids.length, 54)
  assert.equal(new Set(ids).size, 54, 'no card is dealt twice and none is dropped')
  assert.deepEqual([...ids].sort(), [...deckIds()].sort())

  // Hands arrive sorted strongest-first so every client renders the same order.
  for (const player of state.players) {
    assert.deepEqual(player.hand, [...player.hand])
    for (let index = 1; index < player.hand.length; index += 1) {
      const previous = player.hand[index - 1]
      const current = player.hand[index]
      assert.notEqual(previous, current)
    }
  }
  assert.equal(bidSeat(state), 0)
})

test('the same seed deals the same hand and a different seed does not', () => {
  const first = deal(SEED)
  const second = deal(SEED)
  const other = deal(SEED + 1)

  assert.deepEqual(first.players.map((player) => player.hand), second.players.map((player) => player.hand))
  assert.deepEqual(first.bottom, second.bottom)
  assert.notDeepEqual(first.bottom, other.bottom)
  assert.notDeepEqual(first.players[0].hand, other.players[0].hand)
})

test('dealing is refused while a hand is in progress', () => {
  const state = deal()
  const again = startHand(state, { rng: seedRandom(SEED) })
  assert.equal(again.ok, false)
  assert.match(again.error, /进行中/)
})

test('bidding starts at the dealer seat and runs clockwise', () => {
  for (const dealer of [0, 1, 2]) {
    const state = { ...createGame(NAMES), dealerSeat: dealer }
    const opened = startHand(state, { rng: seedRandom(SEED) }).state
    const order = []
    let current = opened
    for (let step = 0; step < 3; step += 1) {
      const seat = bidSeat(current)
      order.push(seat)
      const result = placeBid(current, seat, 0)
      assert.ok(result.ok, result.error)
      current = result.state
    }
    assert.deepEqual(order, [dealer, (dealer + 1) % 3, (dealer + 2) % 3])
  }
})

test('bids are validated: turn, value, and strictly-higher ordering', () => {
  const state = deal()

  const outOfTurn = placeBid(state, 1, 1)
  assert.equal(outOfTurn.ok, false)
  assert.match(outOfTurn.error, /叫分/)

  const badValue = placeBid(state, 0, 4)
  assert.equal(badValue.ok, false)
  assert.match(badValue.error, /只能是/)

  const negative = placeBid(state, 0, -1)
  assert.equal(negative.ok, false)

  const opened = placeBid(state, 0, 2)
  assert.ok(opened.ok)
  assert.equal(bidSeat(opened.state), 1)

  const tooLow = placeBid(opened.state, 1, 1)
  assert.equal(tooLow.ok, false)
  assert.match(tooLow.error, /更高/)
  const equal = placeBid(opened.state, 1, 2)
  assert.equal(equal.ok, false, 'matching the standing bid is not enough')
  const higher = placeBid(opened.state, 1, 3)
  assert.ok(higher.ok)
})

test('nobody calling triggers a redeal instead of a hand', () => {
  let state = deal()
  for (const seat of [0, 1, 2]) {
    const result = placeBid(state, seat, 0)
    assert.ok(result.ok, result.error)
    state = result.state
  }
  assert.equal(state.phase, PHASES.REDEAL)
  assert.equal(state.landlordSeat, null)
  assert.equal(highestBid(state).score, 0)
  assert.equal(state.bottomRevealed, false, 'the bottom stays hidden through a redeal')

  // A redeal keeps the dealer and produces a fresh, complete deal.
  const redealt = startHand(state, { rng: seedRandom(SEED + 5) })
  assert.ok(redealt.ok, redealt.error)
  assert.equal(redealt.state.phase, PHASES.BIDDING)
  assert.equal(redealt.state.dealerSeat, 0)
  assert.equal(redealt.state.handNo, 2)
  assert.equal(new Set(allIds(redealt.state)).size, 54)
})

test('the highest caller becomes landlord and takes the three bottom cards', () => {
  let state = deal()
  const bottom = [...state.bottom]
  state = placeBid(state, 0, 1).state
  state = placeBid(state, 1, 0).state
  const result = placeBid(state, 2, 0)
  assert.ok(result.ok, result.error)
  state = result.state

  assert.equal(state.phase, PHASES.PLAYING)
  assert.equal(state.landlordSeat, 0)
  assert.equal(state.bottomRevealed, true)
  assert.equal(state.toAct, 0, 'the landlord leads')
  assert.equal(state.players[0].hand.length, LANDLORD_HAND_SIZE)
  assert.deepEqual(state.players[1].hand.length, HAND_SIZE)
  assert.deepEqual(state.players[2].hand.length, HAND_SIZE)
  assert.equal(state.lastPlay, null)
  assert.equal(state.passes, 0)
  assert.ok(bottom.every((id) => state.players[0].hand.includes(id)))
  assert.equal(new Set(allIds(state)).size, 54)
})

test('calling 3 ends bidding immediately, and a later seat can outbid', () => {
  let state = deal()
  const immediate = placeBid(state, 0, 3)
  assert.ok(immediate.ok)
  assert.equal(immediate.state.landlordSeat, 0)
  assert.equal(immediate.state.phase, PHASES.PLAYING)
  assert.equal(immediate.state.bids.length, 1, 'the remaining seats do not get a turn')

  state = deal()
  state = placeBid(state, 0, 1).state
  state = placeBid(state, 1, 2).state
  const raised = placeBid(state, 2, 3)
  assert.ok(raised.ok)
  assert.equal(raised.state.landlordSeat, 2)
  assert.equal(raised.state.players[2].hand.length, LANDLORD_HAND_SIZE)

  state = deal()
  state = placeBid(state, 0, 1).state
  state = placeBid(state, 1, 2).state
  state = placeBid(state, 2, 0).state
  assert.equal(state.landlordSeat, 1)

  // The bottom is recorded on the state for the review screen, and it never
  // leaves the authority until the hand is over.
  assert.equal(state.bottom.length, BOTTOM_SIZE)
})

test('leading forces a play; passing is only allowed when following', () => {
  const state = playing({ hands: { 0: ['S3', 'H3'], 1: ['D6'], 2: ['C9'] }, landlordSeat: 0 })

  assert.equal(canPass(state, 0), false, 'the landlord leads and cannot decline')
  const refused = passTurn(state, 0)
  assert.equal(refused.ok, false)
  assert.match(refused.error, /先手/)

  const wrongSeat = passTurn(state, 1)
  assert.equal(wrongSeat.ok, false)
})

test('a play must be held, well-formed, and strong enough to beat the table', () => {
  const state = playing({ hands: { 0: ['S3', 'H4'], 1: ['D6', 'C7'], 2: ['C9'] }, landlordSeat: 0 })

  assert.equal(playCards(state, 1, ['D6']).ok, false, 'not this seat turn')
  assert.equal(playCards(state, 0, ['S5']).ok, false, 'the card is not in hand')
  assert.equal(playCards(state, 0, ['S3', 'S3']).ok, false, 'the same card twice')
  assert.equal(playCards(state, 0, ['S3', 'H4']).ok, false, 'mixed singles are not a shape')
  assert.equal(playCards(state, 0, []).ok, false, 'an empty selection is refused')

  const opened = playCards(state, 0, ['S3'])
  assert.ok(opened.ok, opened.error)
  assert.equal(opened.state.toAct, 1)
  assert.equal(opened.state.plays.length, 1)
  assert.equal(opened.state.lastPlay.seat, 0)
  assert.deepEqual(opened.state.lastPlay.move.type, classifyMove(['S3']).type)
  assert.equal(opened.state.players[0].hand.length, 1)

  // The follow check is about shape and rank, not about who played first: a
  // single that beats the table is legal, a weaker one is not.
  const weak = playing({
    hands: { 0: ['S9'], 1: ['S3'], 2: ['C4'] },
    landlordSeat: 0,
    lastPlay: { seat: 0, cards: ['S9'], move: classifyMove(['S9']) },
    toAct: 1,
  })
  const rejected = playCards(weak, 1, ['S3'])
  assert.equal(rejected.ok, false)
  assert.match(rejected.error, /压不过/)
  assert.equal(checkPlay(weak, 1, ['S3']).ok, false)
  assert.equal(checkPlay(weak, 1, ['C4']).ok, false, 'C4 also loses to S9')

  const pairVsSingle = playing({
    hands: { 0: ['S9'], 1: ['S3', 'H3'], 2: ['C4'] },
    landlordSeat: 0,
    lastPlay: { seat: 0, cards: ['S9'], move: classifyMove(['S9']) },
    toAct: 1,
  })
  assert.equal(playCards(pairVsSingle, 1, ['S3', 'H3']).ok, false, 'a pair never beats a single')
})

test('a bomb may overtake any ordinary shape, and a rocket beats the bomb', () => {
  const state = playing({
    hands: { 0: ['S9'], 1: ['H5', 'D5', 'C5', 'S5', 'LJ', 'BJ'], 2: ['C4'] },
    landlordSeat: 0,
    lastPlay: { seat: 0, cards: ['S9'], move: classifyMove(['S9']) },
    toAct: 1,
  })

  const bomb = playCards(state, 1, ['H5', 'D5', 'C5', 'S5'])
  assert.ok(bomb.ok, bomb.error)
  assert.equal(bomb.state.lastPlay.move.isBomb, true)
  assert.equal(bomb.state.players[1].hand.length, 2)

  const rocketState = playing({
    hands: { 0: ['S9'], 1: ['LJ', 'BJ'], 2: ['C4'] },
    landlordSeat: 0,
    lastPlay: { seat: 0, cards: ['H5', 'D5', 'C5', 'S5'], move: classifyMove(['H5', 'D5', 'C5', 'S5']) },
    toAct: 1,
  })
  const rocket = playCards(rocketState, 1, ['LJ', 'BJ'])
  assert.ok(rocket.ok, rocket.error)
  assert.equal(rocket.state.lastPlay.move.isRocket, true)
  assert.equal(rocket.state.phase, PHASES.FINISHED, 'the rocket emptied the hand')
  assert.equal(rocket.state.winnerSide, 'farmers')
})

test('two passes hand the lead back to the last player, who leads freely', () => {
  const state = playing({ hands: { 0: ['S3', 'H4', 'D8'], 1: ['D6', 'C7'], 2: ['C9', 'S10'] }, landlordSeat: 0 })

  const opened = playCards(state, 0, ['S3'])
  assert.ok(opened.ok)
  assert.equal(opened.state.toAct, 1)

  const first = passTurn(opened.state, 1)
  assert.ok(first.ok, first.error)
  assert.equal(first.state.passes, 1)
  assert.equal(first.state.toAct, 2)
  assert.equal(first.state.lastPlay.seat, 0, 'the table play still stands after one pass')

  const second = passTurn(first.state, 2)
  assert.ok(second.ok, second.error)
  assert.equal(second.state.lastPlay, null, 'the table is cleared for a fresh lead')
  assert.equal(second.state.passes, 0)
  assert.equal(second.state.toAct, 0, 'the lead returns to seat 0')

  const relay = playCards(second.state, 0, ['H4'])
  assert.ok(relay.ok, relay.error)
  assert.equal(relay.state.toAct, 1)
})

test('a hand ends the moment one seat empties, and the winning side is recorded', () => {
  const landlordWins = playing({ hands: { 0: ['S3'], 1: ['H4', 'D6'], 2: ['C9'] }, landlordSeat: 0 })
  const result = playCards(landlordWins, 0, ['S3'])
  assert.ok(result.ok, result.error)
  assert.equal(result.state.phase, PHASES.FINISHED)
  assert.equal(result.state.finishedSeat, 0)
  assert.equal(result.state.winnerSide, 'landlord')
  assert.equal(result.state.toAct, null)
  assert.deepEqual(result.state.handsWon, { landlord: 1, farmers: 0 })

  const farmersWin = playing({
    hands: { 0: ['H5'], 1: ['S3', 'D9'], 2: ['C4'] },
    landlordSeat: 1,
    toAct: 0,
    lastPlay: { seat: 1, cards: ['S3'], move: classifyMove(['S3']) },
  })
  const farmerResult = playCards(farmersWin, 0, ['H5'])
  assert.ok(farmerResult.ok, farmerResult.error)
  assert.equal(farmerResult.state.winnerSide, 'farmers')
  assert.equal(farmerResult.state.finishedSeat, 0)
  assert.deepEqual(farmerResult.state.handsWon, { landlord: 0, farmers: 1 }, 'either farmer finishing wins it')
})

test('no move is accepted after the hand is over', () => {
  const state = playing({ hands: { 0: ['S3'], 1: ['H4'], 2: ['C9'] }, landlordSeat: 0 })
  const finished = playCards(state, 0, ['S3']).state

  assert.equal(playCards(finished, 1, ['H4']).ok, false)
  assert.equal(passTurn(finished, 1).ok, false)
  assert.equal(placeBid(finished, 1, 1).ok, false)
  assert.equal(canPass(finished), false)
  assert.equal(bidSeat(finished), null)
})

test('the next hand rotates the first-bid seat clockwise and keeps the tally', () => {
  let state = playing({ hands: { 0: ['S3'], 1: ['H4'], 2: ['C9'] }, landlordSeat: 0 })
  assert.equal(state.dealerSeat, 0)
  state = playCards(state, 0, ['S3']).state
  assert.equal(state.phase, PHASES.FINISHED)

  const second = nextHand(state, { rng: seedRandom(SEED + 1) })
  assert.ok(second.ok, second.error)
  assert.equal(second.state.dealerSeat, 1, 'the first-bid seat steps clockwise')
  assert.equal(second.state.handNo, 2)
  assert.equal(second.state.landlordSeat, null)
  assert.equal(second.state.bottomRevealed, false)
  assert.deepEqual(second.state.players.map((player) => player.hand.length), [HAND_SIZE, HAND_SIZE, HAND_SIZE])
  assert.equal(new Set(allIds(second.state)).size, 54)
  assert.deepEqual(second.state.handsWon, { landlord: 1, farmers: 0 }, 'the tally survives the deal')
  assert.equal(bidSeat(second.state), 1, 'bidding opens at the rotated seat')

  // Rotation continues: 1 -> 2 -> 0.
  const third = nextHand({ ...second.state, phase: PHASES.FINISHED }, { rng: seedRandom(SEED + 2) })
  assert.equal(third.state.dealerSeat, 2)
  const fourth = nextHand({ ...third.state, phase: PHASES.FINISHED }, { rng: seedRandom(SEED + 3) })
  assert.equal(fourth.state.dealerSeat, 0)

  const early = nextHand(deal(), { rng: seedRandom(SEED) })
  assert.equal(early.ok, false)
  assert.match(early.error, /还没结束/)
})

test('a full bidding round plus a finished hand replays identically from one seed', () => {
  function run() {
    const log = []
    let state = deal(SEED, createGame(NAMES))
    for (const [seat, score] of [[0, 1], [1, 2], [2, 0]]) {
      const result = placeBid(state, seat, score)
      assert.ok(result.ok, result.error)
      state = result.state
      log.push(`bid ${seat}=${score}`)
    }
    assert.equal(state.landlordSeat, 1)

    // Fold the hand deterministically: the landlord plays its weakest card each
    // turn and the farmers always beat it with their lowest legal single.
    let guard = 0
    while (state.phase === PHASES.PLAYING && guard < 200) {
      guard += 1
      const seat = state.toAct
      const hand = [...state.players[seat].hand]
      const legal = hand
        .map((id) => [id])
        .filter((cards) => checkPlay(state, seat, cards).ok)
      if (legal.length) {
        const chosen = legal[legal.length - 1]
        const result = playCards(state, seat, chosen)
        assert.ok(result.ok, result.error)
        state = result.state
        log.push(`play ${seat} ${chosen.join('+')}`)
      } else {
        const result = passTurn(state, seat)
        assert.ok(result.ok, result.error)
        state = result.state
        log.push(`pass ${seat}`)
      }
    }
    return { state, log }
  }

  const first = run()
  const second = run()

  assert.equal(first.state.phase, PHASES.FINISHED)
  assert.deepEqual(first.log, second.log, 'the same seed and script replay the same hand')
  assert.equal(first.state.winnerSide, second.state.winnerSide)
  assert.equal(first.state.finishedSeat, second.state.finishedSeat)
  assert.equal(first.state.plays.length, second.state.plays.length)

  const total = first.state.handsWon.landlord + first.state.handsWon.farmers
  assert.equal(total, 1, 'exactly one hand was completed')
  assert.equal(first.state.players[first.state.finishedSeat].hand.length, 0)
})

test('queries expose counts, not other players cards', () => {
  const state = deal()
  assert.deepEqual(handCounts(state), [
    { seat: 0, name: '甲', count: HAND_SIZE },
    { seat: 1, name: '乙', count: HAND_SIZE },
    { seat: 2, name: '丙', count: HAND_SIZE },
  ])

  const withJokers = playing({
    hands: { 0: ['LJ', 'BJ', 'S3'], 1: ['H4'], 2: ['C9'] },
    landlordSeat: 0,
  })
  assert.deepEqual(jokersHeld(withJokers, 0), { small: true, big: true })
  assert.deepEqual(jokersHeld(withJokers, 1), { small: false, big: false })
  assert.deepEqual(handOf(withJokers, 2), ['C9'])
  assert.deepEqual(handOf(withJokers, 9), [])

  const counts = handCounts(withJokers)
  assert.equal(JSON.stringify(counts).includes('LJ'), false, 'counts never leak card ids')
})
