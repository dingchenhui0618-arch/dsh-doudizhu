/**
 * Room model: seats, identities, and the per-seat snapshot.
 *
 * This module is the security boundary. Everything a peer is allowed to learn
 * passes through `snapshotFor`, and that function is the only place that decides
 * which cards leave the authority. It is deliberately free of I/O so the leak
 * rules can be tested directly.
 *
 * A room is mutable server-side state (it holds an rng function and waiter
 * callbacks, so it is not JSON). Snapshots are plain JSON. `seq` counts room
 * changes; the long poll uses it to decide whether to answer immediately.
 */

import { randomBytes, randomInt } from 'node:crypto'

import {
  PHASES,
  bidSeat,
  canPass,
  createGame,
  nextHand,
  passTurn,
  placeBid,
  playCards,
  startHand,
} from './game.js'
import { SEAT_COUNT } from './rules.js'
import { randomCode } from './rng.js'

export const PROTOCOL = 1

/** Longest accepted display name, in code points. */
export const MAX_NAME = 12

/** How many log lines a snapshot carries. */
const LOG_TAIL = 20

function cleanName(name, seat) {
  const text = String(name ?? '')
    // Strip control characters so a name cannot smuggle terminal or markup noise.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
  const capped = [...text].slice(0, MAX_NAME).join('')
  return capped || `玩家${seat + 1}`
}

function notify(room) {
  if (!room.waiters.size) return
  const waiters = [...room.waiters]
  room.waiters.clear()
  for (const waiter of waiters) {
    try {
      waiter()
    } catch {
      // One broken waiter must not stop the others from being released.
    }
  }
}

/** One room change: bump the counter, optionally log it, and wake the polls. */
function bump(room, note) {
  room.seq += 1
  if (note) {
    room.log.push({ seq: room.seq, at: Date.now(), note })
    if (room.log.length > 200) room.log.splice(0, room.log.length - 200)
  }
  notify(room)
}

function seatNames(room) {
  return room.seats.map((seat, index) => seat?.name ?? `玩家${index + 1}`)
}

/**
 * Display name for one seat. The seat roster owns the name; the copy inside the
 * game state is only a placeholder until the next deal syncs it, so reading the
 * game copy directly would show "玩家一" to a host who had already named itself.
 */
function displayName(room, seat) {
  return room.seats[seat]?.name ?? room.game.players[seat]?.name ?? `玩家${seat + 1}`
}

function syncNames(room) {
  const names = seatNames(room)
  room.game = { ...room.game, players: room.game.players.map((p) => ({ ...p, name: names[p.seat] })) }
}

/** Deal without touching `seq`; the caller decides how to announce it. */
function deal(room, { countHand = true } = {}) {
  const result = startHand(room.game, { rng: room.rng, countHand })
  if (!result.ok) return false
  room.game = result.state
  return true
}

function maybeStart(room) {
  if (room.game.phase !== PHASES.LOBBY) return false
  if (room.seats.some((seat) => seat === null)) return false
  syncNames(room)
  return deal(room)
}

/**
 * The deal's randomness, kept in this Node-only module rather than in the pure
 * rules module that the browser half bundles. `rules.js` used to import
 * `node:crypto` for a default argument, which broke the client build the moment
 * the floating window started pulling the rules in.
 */
function cryptoRng(max) {
  return randomInt(max)
}

export function createRoom({ code = randomCode(6), name = '斗地主房间', rng = cryptoRng } = {}) {
  return {
    code: String(code).toUpperCase(),
    name: String(name),
    protocol: PROTOCOL,
    seats: Array.from({ length: SEAT_COUNT }, () => null),
    game: createGame(),
    seq: 1,
    redeals: 0,
    log: [],
    rng,
    waiters: new Set(),
    createdAt: Date.now(),
  }
}

export function seatForToken(room, token) {
  if (!token) return null
  const index = room.seats.findIndex((seat) => seat && seat.token === token)
  return index === -1 ? null : index
}

/** Public room facts: who is here, never what they hold. */
export function roomInfo(room) {
  return {
    ok: true,
    protocol: PROTOCOL,
    code: room.code,
    name: room.name,
    phase: room.game.phase,
    handNo: room.game.handNo,
    seatsTaken: room.seats.filter(Boolean).length,
    free: room.seats.filter((seat) => seat === null).length,
    seats: room.seats.map((seat, index) => ({
      seat: index,
      occupied: Boolean(seat),
      connected: Boolean(seat?.connected),
      name: seat?.name ?? null,
    })),
  }
}

/**
 * Take a seat. Passing a known `token` rejoins the same seat with its hand
 * intact; an unknown token is refused rather than silently reseated, so a stale
 * link cannot be mistaken for a new player. When the third seat fills, the first
 * hand is dealt automatically.
 */
export function joinSeat(room, { name, token, code } = {}) {
  if (code !== undefined && code !== null && String(code).toUpperCase() !== room.code) {
    return { ok: false, error: '房间码不对', reason: 'bad-code' }
  }

  if (token) {
    const existing = seatForToken(room, token)
    if (existing === null) return { ok: false, error: '身份已失效，请重新入座', reason: 'stale-token' }
    const seat = room.seats[existing]
    if (name) seat.name = cleanName(name, existing)
    seat.connected = true
    syncNames(room)
    bump(room, `${seat.name} 重新连接`)
    return { ok: true, seat: existing, token, rejoin: true }
  }

  const free = room.seats.findIndex((seat) => seat === null)
  if (free === -1) return { ok: false, error: '房间已满（三人）', reason: 'full' }

  const issued = randomBytes(24).toString('hex')
  room.seats[free] = { seat: free, name: cleanName(name, free), token: issued, connected: true, joinedAt: Date.now() }
  const started = maybeStart(room)
  bump(room, `${room.seats[free].name} 入座${started ? '，开局' : ''}`)
  return { ok: true, seat: free, token: issued, rejoin: false, started }
}

/** Keep the seat and its hand; only the presence flag changes. */
export function setConnected(room, token, connected) {
  const seat = seatForToken(room, token)
  if (seat === null) return { ok: false, error: '身份无效' }
  const current = room.seats[seat]
  if (current.connected === Boolean(connected)) return { ok: true, seat, unchanged: true }
  current.connected = Boolean(connected)
  bump(room, `${current.name} ${connected ? '已连接' : '断开连接'}`)
  return { ok: true, seat }
}

/**
 * Apply one player action. Returns `{ ok, seat }` on success; the caller then
 * asks for that seat's snapshot. Every rule decision is delegated to the engine,
 * so an out-of-turn or illegal action is refused there rather than here.
 */
export function act(room, token, action) {
  const seat = seatForToken(room, token)
  if (seat === null) return { ok: false, error: '身份无效，请重新入座', reason: 'unauthorized' }

  const type = String(action?.type ?? '')
  const game = room.game

  if (type === 'start') {
    if (game.phase !== PHASES.LOBBY) return { ok: false, error: '已经开局' }
    if (room.seats.some((s) => s === null)) return { ok: false, error: '要三个人都到齐才能开局' }
    syncNames(room)
    if (!deal(room)) return { ok: false, error: '发牌失败' }
    bump(room, '开局')
    return { ok: true, seat }
  }

  if (type === 'next') {
    const result = nextHand(game, { rng: room.rng })
    if (!result.ok) return { ok: false, error: result.error }
    room.game = result.state
    bump(room, `第 ${result.state.handNo} 局开始`)
    return { ok: true, seat }
  }

  if (type === 'bid') {
    const result = placeBid(game, seat, action.score)
    if (!result.ok) return { ok: false, error: result.error }
    room.game = result.state
    if (result.redeal) {
      room.redeals += 1
      deal(room, { countHand: false })
      bump(room, '三家都不叫，重新发牌')
    } else {
      bump(room, null)
    }
    return { ok: true, seat }
  }

  if (type === 'play') {
    const result = playCards(game, seat, action.cards)
    if (!result.ok) return { ok: false, error: result.error }
    room.game = result.state
    bump(room, null)
    return { ok: true, seat }
  }

  if (type === 'pass') {
    const result = passTurn(game, seat)
    if (!result.ok) return { ok: false, error: result.error }
    room.game = result.state
    bump(room, null)
    return { ok: true, seat }
  }

  return { ok: false, error: `未知操作：${type || '(空)'}` }
}

function roleOf(game, seat) {
  if (game.landlordSeat === null) return null
  return game.landlordSeat === seat ? 'landlord' : 'farmer'
}

function publicMove(move) {
  if (!move) return null
  return {
    type: move.type,
    label: move.label,
    size: move.size,
    mainValue: move.mainValue,
    sequenceLength: move.sequenceLength,
    isBomb: Boolean(move.isBomb),
    isRocket: Boolean(move.isRocket),
  }
}

function hintFor(room, seat) {
  const game = room.game
  if (game.phase === PHASES.BIDDING) {
    return bidSeat(game) === seat ? '轮到你叫分' : '等待其他玩家叫分'
  }
  if (game.phase === PHASES.PLAYING) {
    if (game.toAct !== seat) return `等待 ${game.players[game.toAct]?.name ?? ''} 出牌`
    if (!game.lastPlay) return '你先手，必须出牌'
    return `出能压过「${game.lastPlay.move.label}」的牌，或选择不出`
  }
  if (game.phase === PHASES.FINISHED) {
    const seatName = game.finishedSeat === null ? '' : game.players[game.finishedSeat].name
    return `${game.winnerSide === 'landlord' ? '地主' : '农民'}获胜（${seatName} 先出完）`
  }
  if (game.phase === PHASES.REDEAL) return '三家都不叫，正在重新发牌'
  return room.seats.filter(Boolean).length < SEAT_COUNT ? '等待其他玩家入座' : '准备开始'
}

/**
 * The one and only place a card id is allowed to cross to a peer.
 *
 * - Your own hand is always sent in full.
 * - Everybody else's hand is replaced by a count, with one exception: once the
 *   hand is over (`finished`) every hand is revealed for the review screen.
 * - The three bottom cards are sent only after the landlord has taken them.
 * - Played cards and the current table play are public by definition.
 */
export function snapshotFor(room, seat) {
  const game = room.game
  const revealAll = game.phase === PHASES.FINISHED
  const me = game.players[seat]

  const seats = game.players.map((player) => ({
    seat: player.seat,
    name: displayName(room, player.seat),
    occupied: Boolean(room.seats[player.seat]),
    connected: Boolean(room.seats[player.seat]?.connected),
    role: roleOf(game, player.seat),
    count: player.hand.length,
    isTurn: game.toAct === player.seat,
    isYou: player.seat === seat,
    bid: game.bids.find((bid) => bid.seat === player.seat)?.score ?? null,
    hasBid: game.bids.some((bid) => bid.seat === player.seat),
    // Null means "unknown to you"; the reveal at the end is deliberate.
    hand: player.seat === seat || revealAll ? [...player.hand] : null,
  }))

  return {
    protocol: PROTOCOL,
    seq: room.seq,
    code: room.code,
    roomName: room.name,
    phase: game.phase,
    handNo: game.handNo,
    redeals: room.redeals,
    dealerSeat: game.dealerSeat,
    landlordSeat: game.landlordSeat,
    bottomRevealed: game.bottomRevealed,
    bottom: game.bottomRevealed ? [...game.bottom] : [],
    you: {
      seat,
      name: displayName(room, seat),
      role: roleOf(game, seat),
      hand: [...me.hand],
    },
    seats,
    bids: game.bids.map((bid) => ({ ...bid })),
    bidTurnSeat: bidSeat(game),
    toAct: game.toAct,
    lastPlay: game.lastPlay
      ? { seat: game.lastPlay.seat, cards: [...game.lastPlay.cards], move: publicMove(game.lastPlay.move) }
      : null,
    passes: game.passes,
    plays: game.plays.map((play) => ({
      seat: play.seat,
      cards: [...play.cards],
      move: publicMove(play.move),
    })),
    finishedSeat: game.finishedSeat,
    winnerSide: game.winnerSide,
    handsWon: { ...game.handsWon },
    secretsRevealed: revealAll,
    seatsTaken: room.seats.filter(Boolean).length,
    canAct: game.phase === PHASES.PLAYING && game.toAct === seat,
    canBid: game.phase === PHASES.BIDDING && bidSeat(game) === seat,
    canPass: canPass(game, seat),
    canStart: game.phase === PHASES.LOBBY && room.seats.every(Boolean),
    canNext: game.phase === PHASES.FINISHED,
    hint: hintFor(room, seat),
    log: room.log.slice(-LOG_TAIL).map((entry) => ({ seq: entry.seq, note: entry.note })),
  }
}

/**
 * Resolve once the room changes past `since`, or on timeout. Used by the
 * authority's long poll so a peer is answered the moment anything moves.
 */
export function waitForChange(room, since, timeoutMs = 20000) {
  if (room.seq > since) return Promise.resolve({ changed: true, seq: room.seq })
  return new Promise((resolve) => {
    let settled = false
    let timer = null
    function settle(changed) {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      room.waiters.delete(waiter)
      resolve({ changed, seq: room.seq })
    }
    const waiter = () => settle(true)
    room.waiters.add(waiter)
    timer = setTimeout(() => settle(false), Math.max(0, Number(timeoutMs) || 0))
  })
}

/** Release every pending long poll so shutdown cannot hang. */
export function closeRoom(room) {
  notify(room)
  room.waiters.clear()
}
