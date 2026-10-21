/**
 * Room model: seats, identities, computer seats, and the per-seat snapshot.
 *
 * This module is the security boundary. Two functions decide what any non-human
 * mind learns:
 *
 * - `snapshotFor(room, seat)` — everything a peer is allowed to know. The only
 *   place a card id may cross to another machine.
 * - `botView(room, seat)` — everything a computer player is allowed to know. A
 *   computer runs *inside* this process and could physically read any hand, so
 *   the boundary cannot be a network filter; it is this object. It holds the
 *   computer's own hand, the public play history, and card counts — never another
 *   hand, never the deck order. `test/bot.test.mjs` pins its key set.
 *
 * It is deliberately free of I/O so the leak rules can be tested directly. A room
 * is mutable server-side state (it holds an rng function and waiter callbacks, so
 * it is not JSON). Snapshots are plain JSON. `seq` counts room changes; the long
 * poll uses it to decide whether to answer immediately.
 */

import { randomBytes, randomInt } from 'node:crypto'

import { chooseAction } from './bot.js'
import {
  PHASES,
  bidSeat,
  canPass,
  createGame,
  highestBid,
  nextHand,
  passTurn,
  placeBid,
  playCards,
  startHand,
} from './game.js'
import { SEAT_COUNT, enumerateBeats, enumerateMoves, smallestLead } from './rules.js'
import { randomCode } from './rng.js'
import { DEFAULT_BOT_LEVEL, botSeatLabel, isBotLevel } from './ui-logic.js'

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

/**
 * `name`, or `name 2` / `name 3` … when another occupied seat already uses it,
 * so two people who both call themselves 张飞 stay distinguishable on screen.
 * The suffix eats into the base rather than the cap: the result never exceeds
 * MAX_NAME and never ends up empty, and the loop always terminates because each
 * candidate it tries is different and only a handful of names are taken.
 */
function uniqueName(room, name, seat) {
  const taken = new Set()
  room.seats.forEach((entry, index) => {
    if (entry && index !== seat) taken.add(entry.name)
  })
  let candidate = name
  let suffixNo = 2
  while (taken.has(candidate)) {
    const suffix = ` ${suffixNo}`
    const baseLength = Math.max(1, MAX_NAME - [...suffix].length)
    candidate = `${[...name].slice(0, baseLength).join('')}${suffix}`
    suffixNo += 1
  }
  return candidate
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

/** A hand is in progress: the deal has happened and seats are frozen. */
function midHand(room) {
  return room.game.phase === PHASES.BIDDING || room.game.phase === PHASES.PLAYING
}

function botSeats(room) {
  return room.seats.filter((seat) => Boolean(seat?.bot))
}

function makeBotSeat(seat, level) {
  return {
    seat,
    name: botSeatLabel(level),
    // No token: `seatForToken` never matches a bot, so a computer can never be
    // addressed as a human and a human can never inherit a computer's seat.
    token: null,
    connected: true,
    joinedAt: Date.now(),
    bot: level,
  }
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
    /** The seat that owns the room's setup; the first human to sit down. */
    hostSeat: null,
    /** Strength applied to new and existing computer seats. */
    botLevel: DEFAULT_BOT_LEVEL,
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
    humans: room.seats.filter((seat) => seat && !seat.bot).length,
    bots: botSeats(room).length,
    botLevel: room.botLevel,
    seats: room.seats.map((seat, index) => ({
      seat: index,
      occupied: Boolean(seat),
      connected: Boolean(seat?.connected),
      name: seat?.name ?? null,
      bot: seat?.bot ?? null,
    })),
  }
}

/**
 * Take a seat. Passing a known `token` rejoins the same seat with its hand
 * intact; an unknown token is refused rather than silently reseated, so a stale
 * link cannot be mistaken for a new player. When the third seat fills, the first
 * hand is dealt automatically — computers occupy seats, so "third seat" simply
 * means the last one, human or not.
 */
export function joinSeat(room, { name, token, code } = {}) {
  if (code !== undefined && code !== null && String(code).toUpperCase() !== room.code) {
    return { ok: false, error: '房间码不对', reason: 'bad-code' }
  }

  if (token) {
    const existing = seatForToken(room, token)
    if (existing === null) return { ok: false, error: '身份已失效，请重新入座', reason: 'stale-token' }
    const seat = room.seats[existing]
    if (name) seat.name = uniqueName(room, cleanName(name, existing), existing)
    seat.connected = true
    syncNames(room)
    bump(room, `${seat.name} 重新连接`)
    return { ok: true, seat: existing, token, rejoin: true }
  }

  let free = room.seats.findIndex((seat) => seat === null)
  if (free === -1) {
    // A friend arriving beats a computer. Giving up the highest computer seat is
    // only safe between hands: mid-hand the cards are already dealt.
    const botAt = room.seats.reduce((found, seat, index) => (seat?.bot ? index : found), -1)
    if (botAt >= 0 && !midHand(room)) {
      room.seats[botAt] = null
      bump(room, '电脑让位')
      free = botAt
    }
    if (free === -1) {
      return {
        ok: false,
        error: midHand(room) ? '房间已满，牌局进行中不能换人' : '房间已满（三人）',
        reason: 'full',
      }
    }
  }

  const issued = randomBytes(24).toString('hex')
  room.seats[free] = {
    seat: free,
    name: uniqueName(room, cleanName(name, free), free),
    token: issued,
    connected: true,
    joinedAt: Date.now(),
  }
  if (room.hostSeat === null) room.hostSeat = free
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
 * Arrange the computer seats. Host-only, because the computers belong to the
 * room and not to whoever happens to be sitting in it.
 *
 * Two separate knobs share one action:
 * - `level` alone changes the strength of the computers already seated, and is
 *   allowed at any time — that is the "switchable strength" control.
 * - `count` adds or removes seats, and is only allowed between hands, because
 *   adding a seat mid-hand would create a player with no cards.
 */
function setBots(room, seat, action) {
  if (room.hostSeat !== null && seat !== room.hostSeat) return { ok: false, error: '只有房主能安排电脑' }
  const level = isBotLevel(action.level) ? String(action.level) : room.botLevel
  const current = botSeats(room).length
  const humans = room.seats.filter((entry) => entry && !entry.bot).length
  const wantsCount = action.count !== undefined && action.count !== null
  const wanted = wantsCount
    ? Math.max(0, Math.min(SEAT_COUNT - humans, Math.round(Number(action.count) || 0)))
    : current

  if (wanted !== current && midHand(room)) {
    return { ok: false, error: '牌局进行中，等这局结束再改电脑数量（强度可以随时换）' }
  }

  room.botLevel = level
  for (const entry of room.seats) {
    if (!entry?.bot) continue
    entry.bot = level
    entry.name = botSeatLabel(level)
  }

  let added = 0
  let removed = 0
  if (wanted > current) {
    for (let index = SEAT_COUNT - 1; index >= 0 && added < wanted - current; index -= 1) {
      if (room.seats[index] === null) {
        room.seats[index] = makeBotSeat(index, level)
        added += 1
      }
    }
  } else if (wanted < current) {
    for (let index = SEAT_COUNT - 1; index >= 0 && removed < current - wanted; index -= 1) {
      if (room.seats[index]?.bot) {
        room.seats[index] = null
        removed += 1
      }
    }
  }

  syncNames(room)
  const started = maybeStart(room)
  const bots = botSeats(room).length
  const note = [
    added ? `加入 ${added} 个电脑` : '',
    removed ? `撤下 ${removed} 个电脑` : '',
    !added && !removed && wantsCount ? `电脑数量已是 ${bots}` : '',
    !wantsCount ? `电脑强度改为${botSeatLabel(level).replace('电脑·', '')}` : '',
    started ? '，开局' : '',
  ]
    .filter(Boolean)
    .join('')
  bump(room, note ? `${note}` : null)
  return { ok: true, seat, level, bots, added, removed, started }
}

/** Adopt a new display name, deduplicated against the other seats. */
function renameSeat(room, seat, rawName) {
  const current = room.seats[seat]
  if (!current) return { ok: false, error: '这个座位还没有人' }
  const before = current.name
  const name = uniqueName(room, cleanName(rawName, seat), seat)
  // A rename that changes nothing is not a room change: no log line, no wakeup.
  if (name === before) return { ok: true, seat, name }
  current.name = name
  syncNames(room)
  bump(room, `${before} 改名为 ${name}`)
  return { ok: true, seat, name }
}

/**
 * Apply one player action for a seat. Every rule decision is delegated to the
 * engine, so an out-of-turn or illegal action is refused there rather than here.
 */
export function applyAction(room, seat, action) {
  const type = String(action?.type ?? '')
  const game = room.game

  if (type === 'rename') return renameSeat(room, seat, action.name)

  if (type === 'start') {
    if (game.phase !== PHASES.LOBBY) return { ok: false, error: '已经开局' }
    if (room.seats.some((s) => s === null)) return { ok: false, error: '要三个人都到齐才能开局（可以用电脑补齐）' }
    syncNames(room)
    if (!deal(room)) return { ok: false, error: '发牌失败' }
    bump(room, '开局')
    return { ok: true, seat }
  }

  if (type === 'bots') return setBots(room, seat, action)

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

/**
 * Apply one action on behalf of whoever holds `token`. Kept as a thin wrapper so
 * the authority's route and the local host half share one entry point, while
 * computers — who have no token by construction — go through `applyAction`.
 */
export function act(room, token, action) {
  const seat = seatForToken(room, token)
  if (seat === null) return { ok: false, error: '身份无效，请重新入座', reason: 'unauthorized' }
  return applyAction(room, seat, action)
}

/* ------------------------------------------------------------ computers -- */

/**
 * Everything a computer is allowed to know. This is the fairness boundary: it is
 * built field by field, so a hand it must not see cannot leak in by accident, and
 * `BOT_VIEW_KEYS` in bot.js pins the shape so a later "just add the hands, it is
 * faster" cannot pass unnoticed.
 */
export function botView(room, seat) {
  const game = room.game
  const player = game.players[seat]
  if (!player) return null
  return {
    difficulty: room.seats[seat]?.bot ?? room.botLevel,
    seat,
    phase: game.phase,
    role: roleOf(game, seat),
    hand: [...player.hand],
    handCounts: game.players.map((entry) => ({
      seat: entry.seat,
      count: entry.hand.length,
      role: roleOf(game, entry.seat),
      isBot: Boolean(room.seats[entry.seat]?.bot),
    })),
    playedIds: game.plays.flatMap((play) => play.cards),
    landlordSeat: game.landlordSeat,
    dealerSeat: game.dealerSeat,
    toAct: game.toAct,
    target: game.lastPlay ? { ...game.lastPlay.move } : null,
    targetSeat: game.lastPlay?.seat ?? null,
    passes: game.passes,
    canPass: canPass(game, seat),
    bidTurnSeat: bidSeat(game),
    highestBid: highestBid(game),
  }
}

/** The computer whose turn it is, or null when a human should act. */
export function botTurnSeat(room) {
  const game = room.game
  let seat = null
  if (game.phase === PHASES.BIDDING) seat = bidSeat(game)
  else if (game.phase === PHASES.PLAYING) seat = game.toAct
  if (seat === null || seat === undefined) return null
  return room.seats[seat]?.bot ? seat : null
}

/** A legal move that ignores strategy: the cheapest thing that beats the table. */
function fallbackAction(view) {
  const moves = view.target ? enumerateBeats(view.hand, view.target) : enumerateMoves(view.hand)
  if (moves.length) {
    const cheapest = [...moves].sort((left, right) => left.move.mainValue - right.move.mainValue)[0]
    return { type: 'play', cards: cheapest.cardIds }
  }
  if (view.canPass) return { type: 'pass' }
  const lead = smallestLead(view.hand)
  return lead.length ? { type: 'play', cards: lead } : null
}

/** The move that is legal by construction: pass when following, else a single. */
function forcedAction(view) {
  if (view.canPass) return { type: 'pass' }
  const lead = smallestLead(view.hand)
  return lead.length ? { type: 'play', cards: lead } : null
}

/**
 * Let one computer take its turn.
 *
 * Strategy is allowed to be wrong; a table that stops is not. Every attempt is
 * therefore checked against the real engine, and a fallback chain guarantees a
 * legal action as long as one exists. If even that fails, the failure is written
 * into the room log instead of leaving three people staring at a frozen table.
 */
export function applyBotAction(room, seat, { rand = Math.random } = {}) {
  if (!room.seats[seat]?.bot) return { ok: false, error: '这个座位不是电脑', action: null }
  const view = botView(room, seat)
  const chosen = chooseAction(view, { rand })
  let lastError = ''
  for (const action of [chosen, fallbackAction(view), forcedAction(view)]) {
    if (!action) continue
    const result = applyAction(room, seat, action)
    if (result.ok) {
      if (action !== chosen) bump(room, `${room.seats[seat].name} 走了保底出法`)
      return { ok: true, seat, action, fallback: action !== chosen }
    }
    lastError = result.error
  }
  bump(room, `${displayName(room, seat)} 出手失败：${lastError || '没有合法出法'}`)
  return { ok: false, error: lastError || '没有合法出法', action: null }
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
    return `要出比「${game.lastPlay.move.label}」更大的牌，或者不出`
  }
  if (game.phase === PHASES.FINISHED) {
    const seatName = game.finishedSeat === null ? '' : game.players[game.finishedSeat].name
    return `${game.winnerSide === 'landlord' ? '地主' : '农民'}获胜（${seatName} 先出完）`
  }
  if (game.phase === PHASES.REDEAL) return '三家都不叫，正在重新发牌'
  const free = room.seats.filter((entry) => entry === null).length
  if (free > 0) {
    return room.hostSeat === seat ? `还差 ${free} 人；也可以让电脑补齐` : `还差 ${free} 人，等房主安排`
  }
  return '准备开始'
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
    bot: room.seats[player.seat]?.bot ?? null,
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
    // The whole turn flow, including "不出", so a spectator can read the table
    // in order. Cards here are already public by definition (they were played).
    turns: game.turns.map((turn) => ({
      seat: turn.seat,
      kind: turn.kind,
      cards: [...turn.cards],
      move: turn.move ? publicMove(turn.move) : null,
    })),
    finishedSeat: game.finishedSeat,
    winnerSide: game.winnerSide,
    handsWon: { ...game.handsWon },
    secretsRevealed: revealAll,
    seatsTaken: room.seats.filter(Boolean).length,
    botLevel: room.botLevel,
    botsSeated: botSeats(room).length,
    hostSeat: room.hostSeat,
    // Strength is switchable at any time; the number of computers is not.
    isHost: room.hostSeat === seat,
    canSetBotLevel: room.hostSeat === seat,
    canSetBotCount: room.hostSeat === seat && !midHand(room),
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
