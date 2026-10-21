/**
 * Doudizhu hand engine: a pure, serializable state machine.
 *
 * Design rules for this module:
 * - Every public mutator takes a state and returns `{ ok, state, error? }`.
 *   Nothing is mutated in place, so a state can be snapshotted, sent to a
 *   client, or persisted without defensive copying.
 * - State is plain JSON: no Map/Set/class instances. The authority ships it.
 * - No I/O, no timers, no randomness except an injected `rng`, so a full hand
 *   is reproducible from a seed.
 *
 * Rules implemented here are exactly the ones agreed for this plugin:
 *   17/17/17 + 3 bottom cards; clockwise bidding for 1/2/3 or pass, 3 wins
 *   immediately, highest bid takes the bottom cards; the landlord leads and
 *   play moves clockwise; a player may pass only when following; the hand ends
 *   the moment any seat empties; the first-bid seat rotates clockwise per hand.
 */

import {
  BIG_JOKER,
  BID_LABELS,
  SEAT_COUNT,
  SMALL_JOKER,
  canBeat,
  cardsBelongToHand,
  classifyMove,
  createDeck,
  nextSeat,
  removeCards,
  seatOrderFrom,
  shuffleDeck,
  sortCardIds,
  winnerSide,
} from './rules.js'

export const PHASES = {
  LOBBY: 'lobby',
  BIDDING: 'bidding',
  REDEAL: 'redeal',
  PLAYING: 'playing',
  FINISHED: 'finished',
}

export const HAND_SIZE = 17
export const BOTTOM_SIZE = 3
export const LANDLORD_HAND_SIZE = HAND_SIZE + BOTTOM_SIZE
export const BID_SCORES = [0, 1, 2, 3]

function ok(state, extra = {}) {
  return { ok: true, state, ...extra }
}

function fail(error) {
  return { ok: false, state: null, error }
}

/** A fresh lobby with three named seats and no cards dealt. */
export function createGame(names = ['玩家一', '玩家二', '玩家三']) {
  return {
    phase: PHASES.LOBBY,
    handNo: 0,
    dealerSeat: 0,
    landlordSeat: null,
    bottom: [],
    bottomRevealed: false,
    players: Array.from({ length: SEAT_COUNT }, (_, seat) => ({
      seat,
      name: String(names[seat] ?? `座位 ${seat + 1}`),
      hand: [],
    })),
    bids: [],
    bidTurn: 0,
    toAct: null,
    lastPlay: null,
    passes: 0,
    plays: [],
    turns: [],
    finishedSeat: null,
    winnerSide: null,
    handsWon: { landlord: 0, farmers: 0 },
  }
}

/**
 * Deal a new hand. The dealer seat is left alone; `nextHand` is what rotates it.
 * Allowed from the lobby, after a redeal, or straight after a finished hand.
 * `countHand: false` is for the redeal case, where nobody bid and the table is
 * re-dealt as the same 局 rather than a new one.
 */
export function startHand(state, { rng, countHand = true } = {}) {
  if (![PHASES.LOBBY, PHASES.REDEAL, PHASES.FINISHED].includes(state.phase)) {
    return fail('牌局进行中，不能重新发牌')
  }
  const deck = shuffleDeck(createDeck(), rng)
  const ids = deck.map((card) => card.id)
  const hands = Array.from({ length: SEAT_COUNT }, (_, seat) =>
    sortCardIds(ids.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE)),
  )
  const bottom = sortCardIds(ids.slice(HAND_SIZE * SEAT_COUNT))

  return ok({
    ...state,
    phase: PHASES.BIDDING,
    handNo: state.handNo + (countHand ? 1 : 0),
    landlordSeat: null,
    bottom,
    bottomRevealed: false,
    players: state.players.map((player) => ({ ...player, hand: hands[player.seat] })),
    bids: [],
    bidTurn: 0,
    toAct: null,
    lastPlay: null,
    passes: 0,
    plays: [],
    turns: [],
    finishedSeat: null,
    winnerSide: null,
  })
}

/** The seat whose turn it is to bid, or null outside the bidding phase. */
export function bidSeat(state) {
  if (state.phase !== PHASES.BIDDING) return null
  const order = seatOrderFrom(state.dealerSeat)
  return state.bidTurn < order.length ? order[state.bidTurn] : null
}

/** The highest bid so far as `{ seat, score }`; score 0 means nobody called. */
export function highestBid(state) {
  let best = { seat: null, score: 0 }
  for (const bid of state.bids) {
    if (bid.score > best.score) best = { seat: bid.seat, score: bid.score }
  }
  return best
}

/** Hand the bottom cards to the landlord and open play. */
function beginPlay(state, landlordSeat) {
  return {
    ...state,
    phase: PHASES.PLAYING,
    landlordSeat,
    bottomRevealed: true,
    players: state.players.map((player) =>
      player.seat === landlordSeat
        ? { ...player, hand: sortCardIds([...player.hand, ...state.bottom]) }
        : player,
    ),
    toAct: landlordSeat,
    lastPlay: null,
    passes: 0,
    plays: [],
    turns: [],
  }
}

/**
 * Call a score. A later seat must call strictly higher than the current best or
 * pass. Calling 3 ends bidding at once; otherwise all three seats bid once and
 * the best caller takes the hand. Nobody calling moves to the redeal phase.
 */
export function placeBid(state, seat, score) {
  if (state.phase !== PHASES.BIDDING) return fail('当前不是叫分阶段')
  const expected = bidSeat(state)
  if (seat !== expected) return fail(`该 ${expected} 号座位叫分`)

  const value = Number(score)
  if (!BID_SCORES.includes(value)) return fail('叫分只能是 0、1、2、3')

  const best = highestBid(state)
  if (value > 0 && value <= best.score) return fail(`必须叫得比 ${best.score} 分更高，或者不叫`)

  const bids = [...state.bids, { seat, score: value, label: BID_LABELS[value] }]
  const bestAfter = value > best.score ? { seat, score: value } : best

  if (value === 3) return ok(beginPlay({ ...state, bids, bidTurn: state.bidTurn + 1 }, seat))

  const bidTurn = state.bidTurn + 1
  if (bidTurn < SEAT_COUNT) return ok({ ...state, bids, bidTurn })

  if (bestAfter.score === 0) {
    return ok({ ...state, bids, bidTurn, phase: PHASES.REDEAL }, { redeal: true })
  }
  return ok(beginPlay({ ...state, bids, bidTurn }, bestAfter.seat))
}

/** Can `seat` legally play `cardIds` right now? Returns the shape or a reason. */
export function checkPlay(state, seat, cardIds) {
  if (state.phase !== PHASES.PLAYING) return { ok: false, error: '当前不是出牌阶段' }
  if (seat !== state.toAct) return { ok: false, error: `该 ${state.toAct} 号座位出牌` }
  const player = state.players[seat]
  const ids = Array.isArray(cardIds) ? cardIds.map((id) => String(id)) : []
  if (!ids.length) return { ok: false, error: '请先选牌' }
  if (!cardsBelongToHand(ids, player.hand)) return { ok: false, error: '这些牌不在你手里' }
  const move = classifyMove(ids)
  if (!move) return { ok: false, error: '不是合法牌型' }
  if (state.lastPlay && !canBeat(move, state.lastPlay.move)) {
    return { ok: false, error: `压不过上家的${state.lastPlay.move.label}，只能选择不出`, move }
  }
  return { ok: true, move }
}

/**
 * The per-turn flow (`play` and `pass`, in order). `plays` stays the record of
 * played groups only — bots count cards from it — while `turns` is the history a
 * spectator wants to read. A state serialized before this field existed has no
 * `turns`, so reading it defensively keeps an old room loadable.
 */
function turnsOf(state) {
  return Array.isArray(state.turns) ? state.turns : []
}

function finish(state, seat) {
  const side = winnerSide(seat, state.landlordSeat)
  return {
    ...state,
    phase: PHASES.FINISHED,
    finishedSeat: seat,
    winnerSide: side,
    toAct: null,
    handsWon: { ...state.handsWon, [side]: state.handsWon[side] + 1 },
  }
}

/** Play a legal group. Emptying a hand ends the hand immediately. */
export function playCards(state, seat, cardIds) {
  const check = checkPlay(state, seat, cardIds)
  if (!check.ok) return fail(check.error)

  const ids = sortCardIds(cardIds.map((id) => String(id)))
  const players = state.players.map((player) =>
    player.seat === seat ? { ...player, hand: sortCardIds(removeCards(player.hand, ids)) } : player,
  )
  const play = { seat, cards: ids, move: check.move }
  const base = {
    ...state,
    players,
    plays: [...state.plays, play],
    // `plays` keeps only real plays; the turn log also carries each play so the
    // UI can interleave "出牌" and "不出" in one timeline.
    turns: [...turnsOf(state), { seat, kind: 'play', cards: [...ids], move: check.move }],
    lastPlay: { seat, cards: ids, move: check.move },
    passes: 0,
  }

  if (players[seat].hand.length === 0) return ok(finish(base, seat))
  return ok({ ...base, toAct: nextSeat(seat) })
}

/** A seat may pass only when following; leading forces a play. */
export function canPass(state, seat = state.toAct) {
  return state.phase === PHASES.PLAYING && seat === state.toAct && Boolean(state.lastPlay)
}

/**
 * Decline to beat the current play. Two passes in a row hand the lead back to
 * whoever played last, with a free choice of shape again.
 */
export function passTurn(state, seat) {
  if (state.phase !== PHASES.PLAYING) return fail('当前不是出牌阶段')
  if (seat !== state.toAct) return fail(`该 ${state.toAct} 号座位出牌`)
  if (!state.lastPlay) return fail('你是先手，必须出牌，不能不出')

  const turns = [...turnsOf(state), { seat, kind: 'pass', cards: [], move: null }]
  const passes = state.passes + 1
  if (passes >= SEAT_COUNT - 1) {
    return ok({ ...state, passes: 0, lastPlay: null, toAct: state.lastPlay.seat, turns })
  }
  return ok({ ...state, passes, toAct: nextSeat(seat), turns })
}

/** Rotate the first-bid seat clockwise and deal the next hand. */
export function nextHand(state, options = {}) {
  if (state.phase !== PHASES.FINISHED) return fail('本局还没结束')
  return startHand({ ...state, dealerSeat: nextSeat(state.dealerSeat) }, options)
}

/** Remaining card count per seat — the only hand information a peer may learn. */
export function handCounts(state) {
  return state.players.map((player) => ({ seat: player.seat, name: player.name, count: player.hand.length }))
}

export function handOf(state, seat) {
  return state.players[seat]?.hand ?? []
}

/** Which seats still hold both jokers / four of a kind, for post-hand review. */
export function jokersHeld(state, seat) {
  const hand = new Set(handOf(state, seat))
  return { small: hand.has(SMALL_JOKER), big: hand.has(BIG_JOKER) }
}
