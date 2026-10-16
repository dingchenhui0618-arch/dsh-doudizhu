/**
 * Pure presentation logic for the floating window.
 *
 * It lives outside `client.cjs` so it can be unit tested with `node --test`:
 * no React, no DOM, no fetch. The client half requires this file and esbuild
 * bundles it into `lib/client.js` (same shape as dsh-holdem's `src/bets.js`).
 *
 * The legality helpers here exist to give instant feedback while picking cards.
 * They are NOT the authority: the room re-checks every move, and the client
 * shows whatever the room refuses.
 */

import { BID_LABELS, SUIT_SYMBOLS, canBeat, cardFromId, classifyMove } from './rules.js'

export const PREFS_KEY = 'dsh-doudizhu.prefs'

/** Window metrics, shared by the CSS-free layout maths and the drag clamp. */
export const MINI_W = 344
export const MINI_H = 468
export const EDGE = 8

const SUIT_ORDER = ['S', 'H', 'D', 'C']
const PHASE_TEXT = {
  lobby: '等人',
  bidding: '叫分',
  playing: '出牌',
  finished: '本局结束',
  redeal: '流局重发',
}

/** Display label for one card id, falling back to the raw id. */
export function cardText(id) {
  return cardFromId(id)?.label ?? String(id ?? '')
}

/** Colour class: hearts and diamonds red, jokers marked, everything else black. */
export function cardTone(id) {
  const card = cardFromId(id)
  if (!card) return 'plain'
  if (card.joker) return 'joker'
  return card.suit === 'H' || card.suit === 'D' ? 'red' : 'black'
}

/**
 * Hand order for display: biggest on the left, which is how the cards are
 * fanned in hand. Jokers have no suit, so equal values fall back to suit order.
 */
export function handForDisplay(ids = []) {
  return [...ids].sort((left, right) => {
    const a = cardFromId(left)
    const b = cardFromId(right)
    if (!a || !b) return 0
    return b.value - a.value || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit)
  })
}

export function toggleSelection(selection = [], id) {
  return selection.includes(id) ? selection.filter((card) => card !== id) : [...selection, id]
}

/** Why this selection cannot be played. Empty string means it can. */
export function playError(snapshot, selection = []) {
  if (!snapshot) return '还没进桌'
  if (snapshot.phase !== 'playing') return '现在不是出牌阶段'
  if (!snapshot.canAct) return '还没轮到你'
  if (!selection.length) return '先选牌'
  const hand = new Set(snapshot.you?.hand ?? [])
  if (selection.some((id) => !hand.has(id))) return '选了不在手里的牌'
  if (new Set(selection).size !== selection.length) return '同一张牌选了两次'
  const move = classifyMove(selection)
  if (!move) return '这不是合法牌型'
  const last = snapshot.lastPlay
  if (last && last.move && !canBeat(move, last.move)) return `压不过上家的${last.move.label}`
  return ''
}

export function canSubmitPlay(snapshot, selection = []) {
  return playError(snapshot, selection) === ''
}

/** One summary line for the current selection. */
export function selectionSummary(selection = []) {
  if (!selection.length) return ''
  const move = classifyMove(selection)
  return move ? `${move.label} · ${selection.length} 张` : `已选 ${selection.length} 张 · 不成牌型`
}

export function phaseLabel(phase) {
  return PHASE_TEXT[phase] ?? '—'
}

export function roleLabel(role) {
  if (role === 'landlord') return '地主'
  if (role === 'farmer') return '农民'
  return ''
}

export function seatName(snapshot, seat) {
  return snapshot?.seats?.[seat]?.name ?? `座位${Number(seat) + 1}`
}

/**
 * Where a seat sits relative to you. Play runs clockwise, so the seat that acts
 * after you is on your right and the one before you is on your left.
 */
export function relativeSeat(seat, youSeat, seats = 3) {
  const delta = (((seat - youSeat) % seats) + seats) % seats
  if (delta === 0) return 'you'
  return delta === 1 ? 'right' : 'left'
}

/** Which seat the "正在行动" marker belongs on. */
export function activeSeat(snapshot) {
  if (!snapshot) return null
  if (snapshot.phase === 'bidding') return snapshot.bidTurnSeat ?? null
  if (snapshot.phase === 'playing') return snapshot.toAct ?? null
  return null
}

/**
 * Bid buttons. "不叫" is always available on your turn; a score must be
 * strictly higher than the standing bid.
 */
export function bidOptions(snapshot) {
  const highest = (snapshot?.bids ?? []).reduce((max, bid) => Math.max(max, Number(bid.score) || 0), 0)
  const myTurn = Boolean(snapshot?.canBid)
  return [0, 1, 2, 3].map((score) => ({
    score,
    label: BID_LABELS[String(score)],
    enabled: myTurn && (score === 0 || score > highest),
  }))
}

/** Which controls the current phase wants, and what the status line says. */
export function controlsFor(snapshot) {
  const controls = {
    phase: snapshot?.phase ?? null,
    showBid: false,
    showPlay: false,
    showPass: false,
    showNext: false,
    showStart: false,
    bidOptions: [],
    playEnabled: false,
    passEnabled: false,
    note: '',
  }
  if (!snapshot || !snapshot.you) return controls

  if (snapshot.phase === 'lobby') {
    controls.showStart = (snapshot.seatsTaken ?? 0) >= 3
    controls.note = `已入座 ${snapshot.seatsTaken ?? 0}/3，三人到齐自动开局`
    return controls
  }
  if (snapshot.phase === 'bidding') {
    controls.showBid = true
    controls.bidOptions = bidOptions(snapshot)
    controls.note = snapshot.canBid ? '轮到你叫分' : `等 ${seatName(snapshot, snapshot.bidTurnSeat)} 叫分`
    return controls
  }
  if (snapshot.phase === 'playing') {
    // Both buttons stay on screen for the whole playing phase; the enabled flags
    // carry the meaning. Hiding one would make the action row jump around
    // between turns, which is worse than a greyed-out button.
    controls.showPlay = true
    controls.showPass = true
    controls.playEnabled = Boolean(snapshot.canAct)
    controls.passEnabled = Boolean(snapshot.canPass)
    const last = snapshot.lastPlay
    if (!snapshot.canAct) controls.note = `等 ${seatName(snapshot, snapshot.toAct)} 出牌`
    else if (snapshot.canPass) controls.note = last ? `轮到你：压过${last.move?.label ?? '上家'}，或不出` : '轮到你出牌'
    else controls.note = '轮到你：先手必须出牌'
    return controls
  }
  if (snapshot.phase === 'finished') {
    controls.showNext = true
    const won = snapshot.winnerSide === 'landlord' ? '地主赢了' : '农民赢了'
    controls.note = `${won} · 地主 ${snapshot.landlordSeat === null ? '—' : seatName(snapshot, snapshot.landlordSeat)}`
    return controls
  }
  return controls
}

/**
 * The status line. The room sends its own `hint`, already in Chinese and aware
 * of who is waiting on whom, so that wins; the computed note is the fallback for
 * synthetic snapshots (and for a room that has not started yet).
 */
export function statusLine(snapshot, controls) {
  const hint = snapshot?.hint
  if (typeof hint === 'string' && hint) return hint
  return controls?.note ?? ''
}

/** The room's own event log, newest last, as render-ready rows. */
export function logEntries(snapshot) {
  const entries = Array.isArray(snapshot?.log) ? snapshot.log : []
  return entries
    .map((entry, index) => ({ key: String(entry?.seq ?? index), text: String(entry?.note ?? '') }))
    .filter((entry) => entry.text)
}

/**
 * The card-by-card history. The room's log only records seats and phases, so
 * this is the other half of the record pane: one row per play that actually put
 * cards on the table. A pass is not a play and never appears here.
 */
export function playEntries(snapshot) {
  const plays = Array.isArray(snapshot?.plays) ? snapshot.plays : []
  const seats = Array.isArray(snapshot?.seats) ? snapshot.seats : []
  return plays.map((play, index) => {
    const who = seats[play?.seat]?.name ?? `座位${Number(play?.seat) + 1}`
    const cards = Array.isArray(play?.cards) ? play.cards.map(cardText).join(' ') : ''
    const shape = play?.move?.label ?? ''
    return { key: `p${index}`, who, cards, shape, text: cards ? `${who} ${shape} ${cards}`.trim() : `${who} 不出` }
  })
}

/** The text to hand to the other two players, so nothing has to be retyped. */export function shareText(authority) {
  if (!authority || !authority.code) return ''
  const urls = Array.isArray(authority.lanUrls) ? authority.lanUrls : []
  const where = (urls.length ? urls : [authority.loopbackUrl ?? ''])
    .map((url) => String(url).replace(/^https?:\/\//, ''))
    .filter(Boolean)
  if (!where.length) return `房间码 ${authority.code}`
  return `房间码 ${authority.code} · 地址 ${where.join(' 或 ')}`
}

/**
 * Which addresses to show as one-tap copy chips. Real adapters only: a virtual
 * adapter listed next to a real one turns "which address do I send?" into a coin
 * flip, and the virtual one always loses.
 */
export function lanChips(authority) {
  const candidates = Array.isArray(authority?.lanCandidates) ? authority.lanCandidates : []
  const real = candidates.filter((entry) => entry && entry.url && !entry.virtual)
  if (real.length) return real.map((entry) => ({ key: entry.url, url: entry.url, iface: entry.iface || '' }))
  const urls = Array.isArray(authority?.lanUrls) ? authority.lanUrls : []
  return urls.map((url) => ({ key: url, url, iface: '' }))
}

/** The virtual adapters deliberately kept out of `lanChips`, for the "hid these" note. */
export function hiddenLanCandidates(authority) {
  const candidates = Array.isArray(authority?.lanCandidates) ? authority.lanCandidates : []
  return candidates.filter((entry) => entry && entry.url && entry.virtual)
}

/**
 * What a person types into the address box, turned into something fetch accepts.
 * Nobody should have to remember the scheme, and a trailing slash makes the
 * authority's own routing think it got an empty path.
 */
export function normaliseAddress(text) {
  const value = String(text ?? '').trim().replace(/\/+$/, '')
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `http://${value}`
}

/** Sanitise whatever came out of localStorage; never throw on a broken value. */
export function prefsFrom(raw) {
  const value = raw && typeof raw === 'object' ? raw : {}
  // Must be a real number. `Number(null)` is 0, so coercing would turn a stored
  // `{"x":null}` into the position 0 and park the window in the corner.
  const x = typeof value.x === 'number' && Number.isFinite(value.x) ? Math.round(value.x) : null
  const y = typeof value.y === 'number' && Number.isFinite(value.y) ? Math.round(value.y) : null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  return {
    x,
    y,
    collapsed: value.collapsed === true,
    // Only the table pane is shipped so far; anything else falls back to it.
    pane: value.pane === 'log' ? 'log' : 'table',
    name: [...name].slice(0, 12).join(''),
  }
}

/** Keep the window fully on screen, with a margin, at any viewport size. */
export function clampPosition(x, y, viewport = {}, size = {}) {
  const width = Number(viewport.width) || 0
  const height = Number(viewport.height) || 0
  const boxW = Number(size.width) || MINI_W
  const boxH = Number(size.height) || MINI_H
  const maxX = Math.max(EDGE, width - boxW - EDGE)
  const maxY = Math.max(EDGE, height - boxH - EDGE)
  const rawX = Number.isFinite(x) ? x : maxX
  const rawY = Number.isFinite(y) ? y : maxY
  return {
    x: Math.min(Math.max(EDGE, Math.round(rawX)), maxX),
    y: Math.min(Math.max(EDGE, Math.round(rawY)), maxY),
  }
}

/** Suit symbol for a card, exposed so the UI can render a coloured pip. */
export function suitSymbol(id) {
  const card = cardFromId(id)
  if (!card || card.joker) return ''
  return SUIT_SYMBOLS[card.suit] ?? ''
}
