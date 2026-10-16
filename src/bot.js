/**
 * Computer players.
 *
 * Every decision here is a pure function of `view`, and `view` is built by
 * `botView()` in room.js — the computer's egress, the counterpart of
 * `snapshotFor`. That is the whole fairness story: a computer sees its own hand,
 * the public play history, and everyone's card *count*; it cannot see another
 * hand because the object it is handed does not contain one, and it cannot see
 * the deck order because nothing ever dealt it. `test/bot.test.mjs` pins the key
 * set of that view, so "the bot does not cheat" is a property of the data rather
 * than a promise in a comment.
 *
 * The four levels are a ladder of *rules*, not one algorithm with different
 * noise. Each level is a strict superset of the one below it:
 *
 * | rule                                        | easy | medium | hard | hell |
 * |---------------------------------------------|------|--------|------|------|
 * | plays out a hand it can finish right now     |  –   |   ✓    |  ✓   |  ✓   |
 * | cheapest beat, keeps bombs back              |  –   |   ✓    |  ✓   |  ✓   |
 * | farmer never overtakes a nearly-out partner  |  –   |   ✓    |  ✓   |  ✓   |
 * | any beat (even a bomb) to stop someone going |  –   |   ✓    |  ✓   |  ✓   |
 * | leads by fewest remaining turns              |  –   |   –    |  ✓   |  ✓   |
 * | leads big to block a one-card opponent       |  –   |   –    |  ✓   |  ✓   |
 * | counts cards: unbeatable plays, run-out line |  –   |   –    |  –   |  ✓   |
 *
 * An earlier version scored every candidate on one linear scale with weights I
 * had guessed. It measured *worse* than the level below it, because the weights
 * were compared against the wrong scale and the result was a bot that refused to
 * play. Rules with names can be checked against the game; a magic number cannot.
 */

import { PHASES } from './game.js'
import {
  beatableFromOutstanding,
  cardFromId,
  countBombs,
  deckIds,
  enumerateBeats,
  enumerateMoves,
  hasRocket,
  moveKey,
  movesToEmpty,
  removeCards,
} from './rules.js'
import { BOT_BLURBS, DEFAULT_BOT_LEVEL, isBotLevel } from './ui-logic.js'

/** How long a computer waits before playing, so a human can follow the table. */
export const BOT_DELAY_MS = 700

/** The exact fields a computer is allowed to see. Pinned by test/bot.test.mjs. */
export const BOT_VIEW_KEYS = [
  'difficulty',
  'seat',
  'phase',
  'role',
  'hand',
  'handCounts',
  'playedIds',
  'landlordSeat',
  'dealerSeat',
  'toAct',
  'target',
  'targetSeat',
  'passes',
  'canPass',
  'bidTurnSeat',
  'highestBid',
]

const PASS = { type: 'pass' }

/** How few cards an opponent must hold before a level treats them as about to
 * win and stops saving anything. Counting one turn further ahead is nearly free
 * for a level that already counts cards, and it is the leak that matters most:
 * across these tables the landlord wins 75-90% of hands. */
export const DANGER_AT = {
  easy: 1,
  medium: 2,
  hard: 2,
  // Swept 2/3/4/5: 3 and 4 measured *worse* than 2 for 地狱, so this is not a
  // dial that makes the top level stronger — its edge is elsewhere.
  hell: 2,
}

/**
 * Bidding thresholds by level, as `[bid 1, bid 2, bid 3]` on `bidPower`.
 * A lower table is a more aggressive bidder. This is a real strength lever: in
 * this game the landlord wins most hands, so becoming the landlord with a hand
 * worth it is worth points, and it is the one decision a level makes before
 * seeing anybody play. The numbers here are what `scripts/bot-league.mjs`
 * measures; two fancier play rules were deleted for measuring worse.
 */
export const BID_TABLES = {
  easy: [18, 12, 12],
  medium: [9, 13, 18],
  hard: [8, 12, 16],
  hell: [7, 11, 15],
}

function play(cardIds) {
  return { type: 'play', cards: [...cardIds] }
}

/**
 * What this seat should do now, or null when it is not its turn.
 * Returns an action object ready for `room.applyAction()`.
 *
 * `toAct` is in the view on purpose: whose turn it is is public, and carrying it
 * means a computer refuses to act out of turn even if its caller asks it to,
 * rather than trusting the caller to get that right.
 */
export function chooseAction(view, { rand = Math.random } = {}) {
  if (!view || typeof view.seat !== 'number') return null
  const level = isBotLevel(view.difficulty) ? view.difficulty : DEFAULT_BOT_LEVEL
  const seatView = { ...view, difficulty: level }
  if (view.phase === PHASES.BIDDING && view.bidTurnSeat === view.seat) return chooseBid(seatView, rand)
  if (view.phase === PHASES.PLAYING && view.toAct === view.seat) return choosePlay(seatView, rand)
  return null
}

/* --------------------------------------------------------------- bidding -- */

/**
 * A crude but honest strength reading: high cards, bombs, the rocket, and how few
 * turns the hand needs. Used to pick a bid and nothing else.
 */
export function bidPower(handIds = []) {
  let power = 0
  if (hasRocket(handIds)) power += 6
  power += countBombs(handIds) * 4
  for (const id of handIds) {
    const value = cardFromId(id)?.value ?? 0
    if (value >= 16) power += 3
    else if (value === 15) power += 2
    else if (value === 14) power += 1
  }
  power += Math.max(0, 10 - movesToEmpty(handIds))
  return power
}

/** A bid must be 0 or strictly higher than the standing one. */
export function legalBid(want, best = 0) {
  const target = Math.max(0, Math.min(3, Math.round(Number(want) || 0)))
  if (target <= best) return 0
  return target
}

function chooseBid(view, rand) {
  const power = bidPower(view.hand)
  const best = view.highestBid?.score ?? 0
  const table = BID_TABLES[view.difficulty] ?? BID_TABLES.medium
  if (view.difficulty === 'easy') {
    // Calls far too little, and sometimes folds a hand it should have taken.
    const want = power >= table[2] ? 2 : power >= table[0] ? 1 : 0
    return { type: 'bid', score: rand() < 0.25 ? 0 : legalBid(want, best) }
  }
  const want = power >= table[2] ? 3 : power >= table[1] ? 2 : power >= table[0] ? 1 : 0
  return { type: 'bid', score: legalBid(want, best) }
}

/* -------------------------------------------------------------- reading -- */

/** Every card none of the other seats can be holding, by rank value. */
export function outstandingFor(view) {
  const counts = new Map()
  for (const id of deckIds()) {
    const value = cardFromId(id)?.value
    if (value) counts.set(value, (counts.get(value) || 0) + 1)
  }
  for (const id of [...view.hand, ...view.playedIds]) {
    const value = cardFromId(id)?.value
    if (!value) continue
    counts.set(value, Math.max(0, (counts.get(value) || 0) - 1))
  }
  for (const [value, count] of [...counts.entries()]) if (count <= 0) counts.delete(value)
  return counts
}

function teammateOf(view) {
  if (view.role !== 'farmer') return null
  return view.handCounts.find((entry) => entry.seat !== view.seat && entry.role === 'farmer') ?? null
}

function opponentsOf(view) {
  return view.handCounts.filter((entry) => entry.seat !== view.seat && entry.role !== view.role)
}

/** Everyone still holding few enough cards to go out on their next turn. */
function inDanger(view) {
  const limit = DANGER_AT[view.difficulty] ?? DANGER_AT.medium
  return opponentsOf(view).filter((entry) => entry.count <= limit)
}

function isBomb(candidate) {
  return Boolean(candidate.move.isBomb || candidate.move.isRocket)
}

function legalMoves(view) {
  return view.target ? enumerateBeats(view.hand, view.target) : enumerateMoves(view.hand)
}

/** Smallest first: cheapest main value, and a bigger group when values tie. */
function byCheapest(left, right) {
  return left.move.mainValue - right.move.mainValue || right.move.size - left.move.size
}

function cheapest(moves) {
  return [...moves].sort(byCheapest)[0] ?? null
}

function pickIndex(list, rand) {
  return Math.min(list.length - 1, Math.floor(rand() * list.length))
}

/**
 * Cards this hand can shed without ever giving up the lead: repeatedly take the
 * biggest group that no outstanding card can beat. This is how a strong player
 * closes a hand out, and it is the one thing `hell` does that `hard` does not.
 */
export function runOutLine(handIds, outstanding) {
  let rest = [...handIds]
  const moves = []
  let guard = 0
  while (rest.length && guard < 20) {
    guard += 1
    const safe = enumerateMoves(rest).filter((candidate) => !beatableFromOutstanding(candidate.move, outstanding))
    if (!safe.length) break
    safe.sort((left, right) => right.move.size - left.move.size || left.move.mainValue - right.move.mainValue)
    const chosen = safe[0]
    moves.push(chosen.move)
    rest = removeCards(rest, chosen.cardIds)
  }
  return { moves, cards: handIds.length - rest.length, out: rest.length === 0 }
}

/* -------------------------------------------------------------- playing -- */

function choosePlay(view, rand) {
  if (!view.hand.length) return null
  const moves = legalMoves(view)
  if (!moves.length) return view.canPass ? PASS : null
  if (view.difficulty === 'easy') return easyPlay(view, moves, rand)

  const outstanding = outstandingFor(view)
  const mate = teammateOf(view)
  const danger = inDanger(view)
  const plain = moves.filter((candidate) => !isBomb(candidate))

  // 1. A move that empties the hand wins the game on the spot. Nothing else on
  //    this list is worth considering first, and 简单 is the level that misses it.
  const winning = moves.filter((candidate) => removeCards(view.hand, candidate.cardIds).length === 0)
  if (winning.length) return play(cheapest(winning).cardIds)

  // 2. Somebody is about to go out. Stopping that is worth a bomb; it is not worth
  //    saving one.
  if (danger.length) {
    const stopper = cheapest(plain.length ? plain : moves)
    if (view.difficulty === 'hell') {
      // 地狱 checks whether the cheap beat *actually* stops them. If a card
      // somebody still holds can beat it, the landlord simply plays again next
      // turn and wins, so a beat that cannot be answered — a bomb included — is
      // the only move that counts. This is the one place card counting measured
      // as a real gain: across these tables the landlord wins 75-90% of hands,
      // and a farmer that answers with the smallest card it has is how that
      // happens.
      if (stopper && !beatableFromOutstanding(stopper.move, outstanding)) return play(stopper.cardIds)
      const unanswerable = moves.filter((candidate) => !beatableFromOutstanding(candidate.move, outstanding))
      if (unanswerable.length) return play(cheapest(unanswerable).cardIds)
    }
    if (stopper) return play(stopper.cardIds)
  }

  // 3. Farmer partnership. Two farmers win together, so a farmer does not race its
  //    own partner: it stays out of the way entirely when that partner is nearly
  //    out, and mostly otherwise unless it is nearly out itself.
  if (mate && view.targetSeat === mate.seat) {
    if (mate.count <= 3) return view.canPass ? PASS : play(cheapest(moves).cardIds)
    if (movesToEmpty(view.hand) > 2) return view.canPass ? PASS : play(cheapest(moves).cardIds)
  }

  if (view.target) {
    // The cheapest card that beats the table, and never a bomb while a plain beat
    // exists — a rule of its own above is what spends one when it has to.
    if (plain.length) return play(cheapest(plain).cardIds)
    return view.canPass ? PASS : play(cheapest(moves).cardIds)
  }

  // 4. Leading. 中等 just plays its lowest card; 困难 and 地狱 pick the lead that
  //    leaves the fewest turns behind.
  if (view.difficulty === 'medium') return play(cheapest(moves).cardIds)
  return play(chooseLead(view, moves, outstanding).cardIds)
}

function easyPlay(view, moves, rand) {
  // A weak player: folds too often, and often plays something pointless.
  if (view.canPass && rand() < 0.15) return PASS
  if (rand() < 0.4) return play(moves[pickIndex(moves, rand)].cardIds)
  return play(cheapest(moves).cardIds)
}

/**
 * Which group to lead. `困难` and `地狱` pick the lead that leaves the fewest
 * turns behind; `地狱` first looks for a lead that starts a line it can play all
 * the way out.
 *
 * (A "block a one-card opponent with the biggest card" branch used to live here.
 * It was dead code: rule 2 in `choosePlay` already answers every danger spot, so
 * the branch could never be reached — and 地狱's version of that answer, above,
 * is the one that counts cards.)
 */
function chooseLead(view, moves, outstanding) {
  const remaining = moves.map((candidate) => ({
    candidate,
    after: removeCards(view.hand, candidate.cardIds),
  }))
  const planOf = (entry) => movesToEmpty(entry.after)

  if (view.difficulty === 'hell') {
    // A lead that runs the whole hand out is a win, not an improvement.
    const finishing = remaining.filter(
      (entry) => entry.after.length <= 10 && runOutLine(entry.after, outstanding).out,
    )
    if (finishing.length) {
      return [...finishing].sort(
        (left, right) => movesToEmpty(left.after) - movesToEmpty(right.after) || right.candidate.move.size - left.candidate.move.size,
      )[0].candidate
    }
  }

  return [...remaining].sort(
    (left, right) => planOf(left) - planOf(right) || right.candidate.move.size - left.candidate.move.size || left.candidate.move.mainValue - right.candidate.move.mainValue,
  )[0].candidate
}

/**
 * What a level is actually doing, for the floating window's tooltip. The text
 * lives in ui-logic.js because the client half renders it too and this module is
 * the server-side policy: it imports `node`-free code only, but it is not part
 * of the browser bundle.
 */
export function describeLevel(level) {
  return BOT_BLURBS[level] ?? ''
}

/** Kept for callers that want to name a shape in a log line. */
export { moveKey }
