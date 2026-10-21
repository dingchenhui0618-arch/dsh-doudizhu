/**
 * Floating-window logic tests. Everything here is pure: no React, no DOM.
 *
 * The snapshots come from a real room, so the shapes the UI reads are the shapes
 * the authority actually produces.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { PHASES, placeBid, playCards } from '../src/game.js'
import { act, createRoom, joinSeat, snapshotFor, MAX_NAME } from '../src/room.js'
import { seedRandom } from '../src/rng.js'
import { classifyMove } from '../src/rules.js'
import {
  MAX_NICK,
  MINI_H,
  MINI_W,
  activeSeat,
  bidOptions,
  canSubmitPlay,
  cardText,
  cardTone,
  clampPosition,
  controlsFor,
  handForDisplay,
  hintMoves,
  historySummary,
  logEntries,
  nicknameNote,
  normaliseAddress,
  normaliseNickname,
  phaseLabel,
  playEntries,
  playError,
  prefsFrom,
  relativeSeat,
  roleLabel,
  seatName,
  selectionSummary,
  shareText,
  lanChips,
  hiddenLanCandidates,
  statusLine,
  suitSymbol,
  toggleSelection,
  turnGroups,
} from '../src/ui-logic.js'

function liveRoom(seed = 4242) {
  const room = createRoom({ code: 'UI2345', rng: seedRandom(seed) })
  for (const name of ['甲', '乙', '丙']) joinSeat(room, { name })
  return room
}

/** The engine is pure, so every mutation has to be taken from the result. */
function bid(room, seat, score) {
  const result = placeBid(room.game, seat, score)
  assert.ok(result.ok, result.error)
  room.game = result.state
}

function play(room, seat, cards) {
  const result = playCards(room.game, seat, cards)
  assert.ok(result.ok, result.error)
  room.game = result.state
}

test('card rendering: labels, tones, and suit pips', () => {
  assert.equal(cardText('S3'), '♠3')
  assert.equal(cardText('HK'), '♥K')
  assert.equal(cardText('D10'), '♦10')
  assert.equal(cardText('CA'), '♣A')
  assert.equal(cardText('LJ'), '小王')
  assert.equal(cardText('BJ'), '大王')
  assert.equal(cardText('nonsense'), 'nonsense')

  assert.equal(cardTone('S3'), 'black')
  assert.equal(cardTone('C3'), 'black')
  assert.equal(cardTone('HK'), 'red')
  assert.equal(cardTone('D3'), 'red')
  assert.equal(cardTone('LJ'), 'joker')
  assert.equal(cardTone('BJ'), 'joker')
  assert.equal(cardTone('nonsense'), 'plain')

  assert.equal(suitSymbol('S3'), '♠')
  assert.equal(suitSymbol('D10'), '♦')
  assert.equal(suitSymbol('LJ'), '', 'jokers have no suit pip')
})

test('the hand is fanned biggest-first and never mutated', () => {
  const input = ['S3', 'BJ', 'H5', 'LJ', 'S2', 'DA']
  assert.deepEqual(handForDisplay(input), ['BJ', 'LJ', 'S2', 'DA', 'H5', 'S3'])
  assert.deepEqual(input, ['S3', 'BJ', 'H5', 'LJ', 'S2', 'DA'], 'the input array is left alone')
  assert.deepEqual(handForDisplay([]), [])
  assert.equal(handForDisplay(['S3', 'bogus']).includes('S3'), true, 'an unknown id never throws')
})

test('selection toggles on and off without mutating', () => {
  const first = toggleSelection([], 'S3')
  assert.deepEqual(first, ['S3'])
  const second = toggleSelection(first, 'H4')
  assert.deepEqual(second, ['S3', 'H4'])
  assert.deepEqual(toggleSelection(second, 'S3'), ['H4'])
  assert.deepEqual(first, ['S3'], 'the previous selection is left alone')
})

test('playing is refused with a reason until the selection is legal', () => {
  const room = liveRoom()
  const opening = snapshotFor(room, 0)
  assert.equal(playError(opening, [opening.you.hand[0]]), '现在不是出牌阶段', '叫分阶段不能出牌')
  assert.equal(canSubmitPlay(opening, []), false)

  bid(room, 0, 3)
  const playing = snapshotFor(room, 0)
  assert.equal(playing.phase, PHASES.PLAYING)
  assert.equal(playing.canAct, true)
  assert.equal(playError(playing, []), '先选牌')
  assert.equal(playError(playing, ['H3']), '选了不在手里的牌')
  assert.equal(playError(playing, [playing.you.hand[0], playing.you.hand[0]]), '同一张牌选了两次')

  const hand = playing.you.hand
  assert.equal(playError(playing, [hand[0]]), '', 'any single is a legal lead')
  assert.equal(canSubmitPlay(playing, [hand[0]]), true)

  // Two mismatched singles are not a shape at all.
  const mismatched = hand.filter((id) => id !== hand[0]).slice(0, 2)
  const reason = playError(playing, mismatched)
  if (classifyMove(mismatched)) assert.equal(reason, '', 'only assert when the shape is real')
  else assert.match(reason, /不是合法牌型|压不过/)

  // A seat that is not on turn is told so, and cannot play someone else's card.
  play(room, 0, [hand[0]])
  const following = snapshotFor(room, 1)
  assert.equal(following.canAct, true)
  assert.equal(following.canPass, true)
  assert.equal(playError(following, [hand[0]]), '选了不在手里的牌')
  assert.equal(canSubmitPlay(snapshotFor(room, 2), [snapshotFor(room, 2).you.hand[0]]), false, '还没轮到')
})

test('a play that cannot beat the table says which shape it is up against', () => {
  const snapshot = {
    phase: PHASES.PLAYING,
    canAct: true,
    canPass: true,
    you: { seat: 1, hand: ['S4', 'H4', 'S5', 'S3', 'H3', 'D3', 'C3'] },
    lastPlay: { seat: 0, cards: ['S3', 'H3'], move: classifyMove(['S3', 'H3']) },
  }
  assert.equal(playError(snapshot, ['S3', 'H3']), '压不过上家的对子', '同点数的对子压不过')
  assert.equal(playError(snapshot, ['S4', 'H4']), '', 'a bigger pair is fine')
  assert.match(playError(snapshot, ['S5']), /压不过上家的对子/)
  assert.equal(playError(snapshot, ['S3', 'H3', 'D3', 'C3']), '', 'a bomb beats a pair')
  assert.equal(canSubmitPlay(snapshot, ['S4', 'H4']), true)
  assert.equal(canSubmitPlay(snapshot, ['S5']), false)
})

test('bid buttons follow the standing bid and only open on your turn', () => {
  const room = liveRoom()
  assert.equal(snapshotFor(room, 0).canBid, true, 'seat 0 opens the bidding')

  const options = bidOptions(snapshotFor(room, 0))
  assert.deepEqual(options.map((option) => option.label), ['不叫', '1 分', '2 分', '3 分'])
  assert.deepEqual(options.map((option) => option.enabled), [true, true, true, true])

  bid(room, 0, 2)
  assert.deepEqual(
    bidOptions(snapshotFor(room, 1)).map((option) => option.enabled),
    [true, false, false, true],
    '必须比 2 分更高，不叫永远可以',
  )
  assert.deepEqual(
    bidOptions(snapshotFor(room, 2)).map((option) => option.enabled),
    [false, false, false, false],
    '不是你的回合就一个都不能点',
  )
})

test('controls track the phase and name whose turn it is', () => {
  const room = liveRoom()
  const mine = controlsFor(snapshotFor(room, 0))
  assert.equal(mine.showBid, true)
  assert.equal(mine.note, '轮到你叫分')
  assert.equal(controlsFor(snapshotFor(room, 1)).note, '等 甲 叫分')

  bid(room, 0, 3)
  const leading = controlsFor(snapshotFor(room, 0))
  assert.equal(leading.showPlay, true)
  assert.equal(leading.showPass, true, '按钮始终在位，靠置灰表达')
  assert.equal(leading.playEnabled, true)
  assert.equal(leading.passEnabled, false, '先手不能不出')
  assert.match(leading.note, /先手必须出牌/)

  const waiting = controlsFor(snapshotFor(room, 1))
  assert.equal(waiting.showPlay, true)
  assert.equal(waiting.showPass, true)
  assert.equal(waiting.playEnabled, false, '还没轮到就不能点')
  assert.equal(waiting.passEnabled, false)
  assert.match(waiting.note, /^等 /)

  const hand = snapshotFor(room, 0).you.hand
  play(room, 0, [hand[0]])
  const beat = controlsFor(snapshotFor(room, 1))
  assert.equal(beat.showPass, true)
  assert.equal(beat.passEnabled, true)
  assert.match(beat.note, /压过/)

  const lobby = controlsFor({ you: { seat: 0 }, phase: PHASES.LOBBY, seatsTaken: 1 })
  assert.equal(lobby.showStart, false)
  assert.match(lobby.note, /已入座 1\/3/)
  assert.equal(controlsFor(null).showBid, false)
  assert.equal(controlsFor({}).showPlay, false, '一个没有 you 的快照不产生任何按钮')
})

test('phase and role labels are Chinese and total', () => {
  assert.equal(phaseLabel('lobby'), '等人')
  assert.equal(phaseLabel('bidding'), '叫分')
  assert.equal(phaseLabel('playing'), '出牌')
  assert.equal(phaseLabel('finished'), '本局结束')
  assert.equal(phaseLabel('nonsense'), '—')
  assert.equal(roleLabel('landlord'), '地主')
  assert.equal(roleLabel('farmer'), '农民')
  assert.equal(roleLabel(null), '')
  assert.equal(roleLabel('spectator'), '')
})

test('the active seat follows bidding then play', () => {
  const room = liveRoom()
  assert.equal(activeSeat(snapshotFor(room, 0)), 0)
  bid(room, 0, 3)
  assert.equal(activeSeat(snapshotFor(room, 0)), 0, 'the landlord leads')
  assert.equal(activeSeat({ phase: 'finished' }), null)
  assert.equal(activeSeat(null), null)
})

test('seats are placed clockwise: next on your right, previous on your left', () => {
  assert.equal(relativeSeat(0, 0), 'you')
  assert.equal(relativeSeat(1, 0), 'right')
  assert.equal(relativeSeat(2, 0), 'left')
  assert.equal(relativeSeat(0, 1), 'left', 'wraps without a negative index')
  assert.equal(relativeSeat(1, 1), 'you')
  assert.equal(relativeSeat(2, 1), 'right')
})

test('selection summary names the shape, or says it is not one', () => {
  assert.equal(selectionSummary([]), '')
  assert.equal(selectionSummary(['S3']), '单张 · 1 张')
  assert.equal(selectionSummary(['S3', 'H3']), '对子 · 2 张')
  assert.equal(selectionSummary(['LJ', 'BJ']), '王炸 · 2 张')
  assert.equal(selectionSummary(['S3', 'H4']), '已选 2 张 · 不成牌型')
})

test('seat names fall back instead of rendering undefined', () => {  const room = liveRoom()
  const snapshot = snapshotFor(room, 0)
  assert.equal(seatName(snapshot, 0), '甲')
  assert.equal(seatName(snapshot, 1), '乙')
  assert.equal(seatName({ seats: [] }, 2), '座位3')
  assert.equal(seatName(null, 0), '座位1')
})

test('the share text carries the room code and every LAN address', () => {
  assert.equal(shareText(null), '')
  assert.equal(shareText({ code: 'ABC234', lanUrls: [] }), '房间码 ABC234')
  assert.equal(
    shareText({ code: 'ABC234', lanUrls: ['http://192.168.1.50:8791', 'http://192.168.1.7:8791'] }),
    '房间码 ABC234 · 地址 192.168.1.50:8791 或 192.168.1.7:8791',
  )
  assert.equal(
    shareText({ code: 'ABC234', lanUrls: [], loopbackUrl: 'http://127.0.0.1:8791' }),
    '房间码 ABC234 · 地址 127.0.0.1:8791',
  )
})

test('only real adapters become copy chips, virtual ones are reported as hidden', () => {
  const authority = {
    code: 'ABC234',
    lanUrls: ['http://192.168.1.50:8791'],
    lanCandidates: [
      { url: 'http://192.168.1.50:8791', iface: 'WLAN', virtual: false },
      { url: 'http://172.22.0.1:8791', iface: 'vEthernet (WSL (Hyper-V firewall))', virtual: true },
    ],
  }
  assert.deepEqual(lanChips(authority), [
    { key: 'http://192.168.1.50:8791', url: 'http://192.168.1.50:8791', iface: 'WLAN' },
  ], 'the WSL address must not be offered next to the real one')
  assert.deepEqual(hiddenLanCandidates(authority), [
    { url: 'http://172.22.0.1:8791', iface: 'vEthernet (WSL (Hyper-V firewall))', virtual: true },
  ])

  // State from an older build carries lanUrls only; it must keep working.
  assert.deepEqual(lanChips({ lanUrls: ['http://192.168.1.7:8791'] }), [
    { key: 'http://192.168.1.7:8791', url: 'http://192.168.1.7:8791', iface: '' },
  ])
  assert.deepEqual(lanChips({}), [])
  assert.deepEqual(hiddenLanCandidates(null), [])

  // Every adapter virtual: net.js falls back to offering them, so the chips must
  // fall back too rather than showing an empty list.
  const allVirtual = {
    lanUrls: ['http://172.22.0.1:8791'],
    lanCandidates: [{ url: 'http://172.22.0.1:8791', iface: 'vEthernet (WSL)', virtual: true }],
  }
  assert.deepEqual(lanChips(allVirtual), [
    { key: 'http://172.22.0.1:8791', url: 'http://172.22.0.1:8791', iface: '' },
  ], 'nothing real to prefer: better the virtual one than nothing')
})

test('an address box value becomes something fetch accepts', () => {
  assert.equal(normaliseAddress('192.168.1.50:8791'), 'http://192.168.1.50:8791')
  assert.equal(normaliseAddress('  127.0.0.1:8791  '), 'http://127.0.0.1:8791')
  assert.equal(normaliseAddress('http://192.168.1.50:8791'), 'http://192.168.1.50:8791')
  assert.equal(normaliseAddress('https://game.local'), 'https://game.local')
  assert.equal(normaliseAddress('http://192.168.1.50:8791///'), 'http://192.168.1.50:8791', '末尾斜杠会被规整')
  assert.equal(normaliseAddress('HTTP://x'), 'HTTP://x')
  assert.equal(normaliseAddress(''), '')
  assert.equal(normaliseAddress(null), '')
  assert.equal(normaliseAddress('   '), '')
})

test('stored preferences survive nonsense and are capped', () => {
  const base = {
    x: null,
    y: null,
    collapsed: false,
    pane: 'table',
    name: '',
    botLevel: 'medium',
    lastAddress: '',
    lastCode: '',
    historyOpen: false,
  }
  assert.deepEqual(prefsFrom(null), base)
  assert.deepEqual(prefsFrom('nonsense'), base)
  assert.deepEqual(prefsFrom({ x: 10.6, y: -4, collapsed: true, pane: 'log', name: ' 小明 ' }), {
    x: 11,
    y: -4,
    collapsed: true,
    pane: 'log',
    name: '小明',
    botLevel: 'medium',
    lastAddress: '',
    lastCode: '',
    historyOpen: false,
  })

  // The LAN address and code are remembered so a guest does not retype them.
  // Both are capped and normalised: a pasted blob must not land in the box, and
  // a lowercase code should come back uppercase.
  assert.equal(prefsFrom({ lastAddress: ' 192.168.1.50:8791 ' }).lastAddress, '192.168.1.50:8791')
  assert.equal(prefsFrom({ lastAddress: 'x'.repeat(200) }).lastAddress.length, 64)
  assert.equal(prefsFrom({ lastCode: ' ab12cd ' }).lastCode, 'AB12CD')
  assert.equal(prefsFrom({ lastCode: 'A-B_12！！' }).lastCode, 'AB12', '非字母数字直接剥掉')
  assert.equal(prefsFrom({ lastCode: 'abcdefghijk' }).lastCode.length, 8)
  assert.equal(prefsFrom({ historyOpen: 'yes' }).historyOpen, false, 'historyOpen 只认真正的 true')
  assert.equal(prefsFrom({ historyOpen: true }).historyOpen, true)
  assert.equal(prefsFrom({ x: 'abc' }).x, null)
  assert.equal(prefsFrom({ pane: 'evil' }).pane, 'table')
  assert.equal(prefsFrom({ collapsed: 'yes' }).collapsed, false, 'only a real true counts')

  // The computer strength is a closed set: anything else falls back, so a stale
  // or hand-edited localStorage value can never send an unknown level to the room.
  assert.equal(prefsFrom({ botLevel: 'hell' }).botLevel, 'hell')
  assert.equal(prefsFrom({ botLevel: 'impossible' }).botLevel, 'medium')
  assert.equal(prefsFrom({ botLevel: null }).botLevel, 'medium')
  assert.equal(prefsFrom({ botLevel: 3 }).botLevel, 'medium')

  // A real browser found this one: a stored `{"x":null}` must stay "no stored
  // position". `Number(null)` is 0, so coercing quietly turned it into the
  // coordinate 0 and parked the window in the top-left corner.
  assert.equal(prefsFrom({ x: null, y: null }).x, null)
  assert.equal(prefsFrom({ x: null, y: null }).y, null)
  assert.equal(prefsFrom({ x: undefined, y: undefined }).x, null)
  assert.equal(prefsFrom({ x: '', y: '' }).x, null)
  assert.equal(prefsFrom({ x: true, y: false }).x, null, 'true 不是坐标')
  assert.equal(prefsFrom({ x: '300', y: '200' }).x, null, '字符串不是坐标')
  assert.equal([...prefsFrom({ name: '一二三四五六七八九十十一十二十三' }).name].length, 12)
})

test('stored nulls keep the window bottom-right instead of in the corner', () => {
  // The whole path as the browser walks it: read prefs, measure the box, clamp.
  const prefs = prefsFrom({ x: null, y: null, collapsed: false, pane: 'table', name: '我' })
  const viewportSize = { width: 1920, height: 945 }
  const measured = { width: MINI_W, height: 651 }
  const placed = clampPosition(prefs.x, prefs.y, viewportSize, measured)

  assert.equal(placed.x, viewportSize.width - measured.width - 8)
  assert.equal(placed.y, viewportSize.height - measured.height - 8)
  assert.notEqual(placed.x, 8, '左上角正是浏览器里看到的现象')
  assert.ok(placed.y + measured.height + 8 <= viewportSize.height, '整体在屏幕内')
})

test('position is clamped so the window can never leave the viewport', () => {
  assert.deepEqual(clampPosition(-50, -50, { width: 1200, height: 800 }), { x: 8, y: 8 })
  assert.deepEqual(clampPosition(9999, 9999, { width: 1200, height: 800 }), {
    x: 1200 - MINI_W - 8,
    y: 800 - MINI_H - 8,
  })
  assert.deepEqual(clampPosition(300, 200, { width: 1200, height: 800 }), { x: 300, y: 200 })
  // A viewport smaller than the window must not produce a negative position.
  assert.deepEqual(clampPosition(100, 100, { width: 200, height: 200 }), { x: 8, y: 8 })
  // No stored position means bottom-right.
  assert.deepEqual(clampPosition(null, null, { width: 1200, height: 800 }), {
    x: 1200 - MINI_W - 8,
    y: 800 - MINI_H - 8,
  })
})

test('a window taller than the declared constant still lands fully on screen', () => {
  // The floating window's height is whatever its content needs, capped at 78vh by
  // the stylesheet — a landlord holding 20 cards is a lot taller than MINI_H.
  // Clamping against the constant is what parked the window half off the bottom
  // of the screen in the real browser; the fix measures the box first.
  const viewport = { width: 1920, height: 945 }
  const measured = { width: MINI_W, height: Math.round(945 * 0.78) }

  const placed = clampPosition(null, null, viewport, measured)
  assert.ok(placed.y >= 8, `顶边越界: ${placed.y}`)
  assert.ok(
    placed.y + measured.height + 8 <= viewport.height,
    `底边越界: ${placed.y} + ${measured.height} > ${viewport.height}`,
  )

  // The old behaviour, asserted so the regression cannot come back quietly.
  const constant = clampPosition(null, null, viewport, { width: MINI_W, height: MINI_H })
  assert.ok(
    constant.y + measured.height > viewport.height,
    '用常量算出来的位置确实会把 20 张牌的窗口顶出屏幕',
  )
})

test("the status line prefers the room's own hint over the computed note", () => {
  const room = liveRoom()
  const snapshot = snapshotFor(room, 0)
  assert.equal(typeof snapshot.hint, 'string')
  assert.equal(statusLine(snapshot, controlsFor(snapshot)), snapshot.hint, '权威的提示优先')
  assert.equal(statusLine({ hint: '轮到你叫分' }, { note: 'x' }), '轮到你叫分')
  assert.equal(statusLine({ hint: '' }, { note: 'fallback' }), 'fallback', '空提示不是提示')
  assert.equal(statusLine(null, { note: 'fallback' }), 'fallback')
  assert.equal(statusLine(null, null), '')
})

test('the room log carries seat and phase events, not every card', () => {
  const room = createRoom({ code: 'UI2345', rng: seedRandom(4242) })
  const tokens = ['甲', '乙', '丙'].map((name) => joinSeat(room, { name }).token)

  // 入座就已经写进日志了，而且是中文，浮窗直接显示权威的记录。
  assert.deepEqual(
    logEntries(snapshotFor(room, 0)).map((entry) => entry.text),
    ['甲 入座', '乙 入座', '丙 入座，开局'],
  )

  // The room log is about seats and phases; a bid adds no line, because the card
  // history lives in `plays`. Pinned so nobody "fixes" it into a duplicate of
  // the play list.
  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)
  assert.deepEqual(
    logEntries(snapshotFor(room, 0)).map((entry) => entry.text),
    ['甲 入座', '乙 入座', '丙 入座，开局'],
  )

  assert.deepEqual(logEntries(null), [])
  assert.deepEqual(logEntries({ log: 'nonsense' }), [])
  assert.deepEqual(logEntries({ log: [{ seq: 1, note: '' }, { seq: 2, note: '开房' }] }), [
    { key: '2', text: '开房' },
  ])
})

test('the play history names the player, the shape, and the cards', () => {
  const room = createRoom({ code: 'UI2345', rng: seedRandom(4242) })
  const tokens = ['甲', '乙', '丙'].map((name) => joinSeat(room, { name }).token)
  assert.deepEqual(playEntries(snapshotFor(room, 0)), [], '还没出牌就没有记录')

  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)
  const hand = snapshotFor(room, 0).you.hand
  assert.ok(act(room, tokens[0], { type: 'play', cards: [hand[0]] }).ok)

  const entries = playEntries(snapshotFor(room, 0))
  assert.equal(entries.length, 1)
  assert.equal(entries[0].who, '甲')
  assert.equal(entries[0].text, `甲 单张 ${cardText(hand[0])}`)

  // 不出不是出牌，不占一行。
  assert.ok(act(room, tokens[1], { type: 'pass' }).ok)
  assert.equal(playEntries(snapshotFor(room, 0)).length, 1, '不出不记入出牌历史')

  // Every seat reads the same history, because the authority owns it.
  assert.deepEqual(playEntries(snapshotFor(room, 2)), entries)

  assert.deepEqual(playEntries(null), [])
  assert.deepEqual(playEntries({ plays: [{ seat: 9, cards: [] }], seats: [] }), [
    { key: 'p0', who: '座位10', cards: '', shape: '', text: '座位10 不出' },
  ])
})

test('nickname: the box and the room agree on the cap, and the note tells the truth', () => {
  // The room keeps MAX_NAME code points. If the box accepted more, the name
  // would silently shrink on the other two machines and nobody would know why.
  assert.equal(MAX_NICK, MAX_NAME, '输入框上限必须等于房间上限')

  assert.equal(normaliseNickname('  张飞  '), '张飞')
  assert.equal(normaliseNickname('张\u0000飞\u007f'), '张飞', '控制字符要剥掉')
  assert.equal(normaliseNickname(null), '')
  assert.equal([...normaliseNickname('张'.repeat(30))].length, MAX_NICK, '按码点截断')

  // A surrogate pair is two UTF-16 units but one character: the cap counts the
  // character, otherwise a rocket emoji would eat two of the twelve slots.
  const emoji = '🚀'.repeat(20)
  assert.equal([...normaliseNickname(emoji)].length, MAX_NICK)
  assert.equal(normaliseNickname(emoji).length, MAX_NICK * 2)

  assert.equal(nicknameNote('', { seat: 2 }), '留空就叫「玩家3」')
  assert.equal(nicknameNote('   ', { seat: 0 }), '留空就叫「玩家1」')
  assert.match(nicknameNote('张飞'), /「张飞」/)
  assert.match(nicknameNote('张飞', { taken: ['张飞'] }), /同名/)
})

test('hint: every suggestion is a legal move the authority would accept', () => {
  const room = liveRoom()
  bid(room, 0, 3)
  const snapshot = snapshotFor(room, 0)
  const hand = snapshot.you.hand
  const hints = hintMoves(snapshot)

  assert.ok(hints.length > 0, '先手必须给得出建议')
  for (const hint of hints) {
    for (const id of hint.cards) assert.ok(hand.includes(id), `建议里有不在手上的牌 ${id}`)
    assert.ok(classifyMove(hint.cards), `建议不是合法牌型: ${hint.cards.join(' ')}`)
  }
  // No duplicates: two entries with the same cards would make 提示 look broken.
  const seen = new Set(hints.map((hint) => [...hint.cards].sort().join('|')))
  assert.equal(seen.size, hints.length, '同一手牌只出现一次')

  assert.deepEqual(hintMoves({ you: { hand: [] } }), [], '没牌就没建议')
  assert.deepEqual(hintMoves(null), [])
})

test('hint: finishing the hand comes first, spending a bomb comes last', () => {
  // Synthetic snapshots keep the assertion about the ranking, not about luck.
  const finish = hintMoves({ you: { hand: ['S3'] }, lastPlay: null })
  assert.equal(finish[0].finishing, true, '能一把走完就必须排第一')
  assert.deepEqual(finish[0].cards, ['S3'])
  assert.equal(finish[0].note, '一把走完')

  const bombHand = ['S5', 'H5', 'D5', 'C5', 'S7', 'H8']
  const lead = hintMoves({ you: { hand: bombHand }, lastPlay: null }, { limit: 20 })
  assert.ok(lead.length > 0)
  assert.notEqual(lead[0].label, '炸弹', '有普通牌可出时，第一建议不该是炸弹')
  const bombAt = lead.findIndex((hint) => hint.label === '炸弹')
  const plainAt = lead.findIndex((hint) => hint.label === '单张')
  assert.ok(plainAt >= 0 && (bombAt === -1 || plainAt < bombAt), '炸弹排在普通牌之后')

  // Following: only cards that actually beat the table may appear.
  const target = { move: classifyMove(['D5']) }
  const followHand = ['S3', 'H4', 'S9', 'H9']
  const follow = hintMoves({ you: { hand: followHand }, lastPlay: target })
  assert.ok(follow.length > 0, '手里有 9 就压得过 5')
  for (const hint of follow) {
    for (const id of hint.cards) assert.notEqual(id, 'S3', '压不过 5 的牌不该被建议')
    for (const id of hint.cards) assert.notEqual(id, 'H4', '压不过 5 的牌不该被建议')
  }
})

test('history: grouped by trick, and a pass is part of the record', () => {
  const seats = [{ seat: 0, name: '甲' }, { seat: 1, name: '乙' }, { seat: 2, name: '丙' }]
  const single = { type: 'single', size: 1, mainValue: 5, label: '单张' }
  const snapshot = {
    seats,
    turns: [
      { seat: 0, kind: 'play', cards: ['D5'], move: single },
      { seat: 1, kind: 'pass', cards: [], move: null },
      { seat: 2, kind: 'pass', cards: [], move: null },
      { seat: 0, kind: 'play', cards: ['D9'], move: { ...single, mainValue: 9 } },
      { seat: 1, kind: 'play', cards: ['DJ'], move: { ...single, mainValue: 11 } },
    ],
  }
  const groups = turnGroups(snapshot)

  // Two passes in a row hand the lead back, so the fourth turn opens a new trick.
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].items.map((item) => item.kind), ['play', 'pass', 'pass'])
  assert.equal(groups[0].items[0].lead, true, '第一手是本轮领出')
  assert.equal(groups[0].items[1].lead, false)
  assert.equal(groups[0].items[1].text, '不出')
  assert.deepEqual(groups[1].items.map((item) => item.name), ['甲', '乙'])
  assert.equal(groups[1].index, 2)
  assert.match(groups[0].items[0].text, /5/, '历史里要看得见牌面')

  assert.equal(historySummary(snapshot), '本局 2 轮 · 5 手')
  assert.equal(historySummary({ seats, turns: [] }), '本局还没有人出牌')

  // A 0.1.x authority only ships `plays`: render what it has instead of nothing.
  const old = turnGroups({ seats, plays: [{ seat: 1, cards: ['S3'], move: single }] })
  assert.equal(old.length, 1)
  assert.equal(old[0].items[0].name, '乙')
  assert.deepEqual(turnGroups(null), [])
})

