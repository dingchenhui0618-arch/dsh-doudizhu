/**
 * Computer-player tests.
 *
 * Three things are being pinned here, in order of how much they matter:
 *
 * 1. **Fairness is structural.** A computer runs inside the authority process and
 *    could physically read any hand, so "it does not cheat" cannot rest on good
 *    behaviour: it rests on the object it is handed. `botView` is that object and
 *    its key set is pinned, so adding a hand to it fails this file.
 * 2. **A hand always finishes.** Every level plays whole hands with zero illegal
 *    moves — `applyBotAction` reports a `fallback` when the policy proposed
 *    something the engine refused, and the count must stay zero across every
 *    table. A table of one person plus two computers is a first-class case, not an
 *    afterthought.
 * 3. **Strength is measured, not asserted in prose.** The league table in
 *    `scripts/bot-league.mjs` runs the same deals for every level; the numbers
 *    below are the thresholds that table clears.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { BID_TABLES, BOT_VIEW_KEYS, bidPower, chooseAction, describeLevel, outstandingFor, runOutLine } from '../src/bot.js'
import { PHASES } from '../src/game.js'
import { createAuthorityServer } from '../src/net.js'
import {
  act,
  applyAction,
  applyBotAction,
  botTurnSeat,
  botView,
  createRoom,
  joinSeat,
  roomInfo,
  snapshotFor,
} from '../src/room.js'
import { beatableFromOutstanding, cardFromId, classifyMove, deckIds, removeCards } from '../src/rules.js'
import { seedRandom } from '../src/rng.js'
import { BOT_LABELS, BOT_LEVELS, DEFAULT_BOT_LEVEL, botCapacity, botSeatLabel, isBotLevel } from '../src/ui-logic.js'
import { createBotRoom, makeRng, playOut, runLeague, seededFloat } from './helpers/league.mjs'
import { everyString } from './helpers/leak.mjs'

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Cards of one rank value, as real deck ids. */
function cardsOfValue(value, count) {
  return deckIds()
    .filter((id) => cardFromId(id)?.value === value)
    .slice(0, count)
}

/** A play-phase view with a full table, so one rule can be driven on its own. */
function playView(overrides = {}) {
  const hand = overrides.hand ?? []
  return {
    difficulty: 'hard',
    seat: 0,
    phase: PHASES.PLAYING,
    role: 'landlord',
    hand: [...hand],
    playedIds: [],
    handCounts: [
      { seat: 0, count: hand.length, role: 'landlord', isBot: true },
      { seat: 1, count: 17, role: 'farmer', isBot: true },
      { seat: 2, count: 17, role: 'farmer', isBot: true },
    ],
    landlordSeat: 0,
    dealerSeat: 0,
    toAct: 0,
    target: null,
    targetSeat: null,
    passes: 0,
    canPass: false,
    bidTurnSeat: null,
    highestBid: { score: 3, seat: 0 },
    ...overrides,
  }
}

/* ------------------------------------------------------------- the view -- */

test('a computer is handed its own hand and the public record, and nothing else', () => {
  const { room } = createBotRoom(['hard', 'hard', 'hard'], 11)
  const view = botView(room, 0)

  assert.deepEqual(Object.keys(view).sort(), [...BOT_VIEW_KEYS].sort(), '电脑能看到的字段变了')
  assert.ok(BOT_VIEW_KEYS.length >= 16, '这条断言本身不能变成空转')

  // The deal is public knowledge: three hands of 17.
  assert.deepEqual(
    view.handCounts.map((entry) => entry.count),
    [17, 17, 17],
  )
  assert.equal(view.hand.length, 17)

  // Not one card of the other two hands appears anywhere in the object, including
  // inside labelled text — the check is over every string in the tree.
  const visible = everyString(view)
  const others = room.game.players.filter((player) => player.seat !== 0).flatMap((player) => player.hand)
  assert.equal(others.length, 34)
  for (const id of others) assert.equal(visible.has(id), false, `${id} 泄露给了电脑 0 号`)

  // And the fields that would be a leak by name are simply absent.
  for (const key of ['bottom', 'bottomRevealed', 'players', 'hands', 'deck', 'log', 'secrets']) {
    assert.equal(key in view, false, `电脑视图里不该有 ${key}`)
  }
})

test('the view tracks the board as the hand is played, and never the deck order', () => {
  const { room, rand } = createBotRoom(['hell', 'hell', 'hell'], 3)
  for (let step = 0; step < 12; step += 1) {
    const seat = botTurnSeat(room)
    if (seat === null) break
    const before = botView(room, seat)
    // `toAct` is only filled in while playing; during the auction the turn lives in
    // `bidTurnSeat`, and either way the computer is being asked about its own turn.
    assert.equal(before.toAct === seat || before.bidTurnSeat === seat, true, '轮到它了，视图却说不是')
    assert.deepEqual(Object.keys(before).sort(), [...BOT_VIEW_KEYS].sort())
    const result = applyBotAction(room, seat, { rand })
    assert.ok(result.ok, result.error)
  }
  const played = room.game.plays.flatMap((play) => play.cards)
  assert.ok(played.length > 0, '这局应该已经有人出过牌')
  const view = botView(room, 0)
  // Everything on the table is public, and it is reported as such.
  for (const id of played) assert.equal(view.playedIds.includes(id), true, `${id} 出过牌但电脑不知道`)
  // Somebody's hand is still private.
  const visible = everyString(view)
  const secret = room.game.players
    .filter((player) => player.seat !== 0)
    .flatMap((player) => player.hand)
    .filter((id) => !played.includes(id))
  for (const id of secret) assert.equal(visible.has(id), false, `${id} 泄露了`)
})

/* ------------------------------------------------------- whole hands ----- */

test('every level plays whole hands with no illegal move and no deadlock', () => {
  for (const level of BOT_LEVELS) {
    for (let seed = 1; seed <= 5; seed += 1) {
      const { room, rand } = createBotRoom([level, level, level], seed)
      const outcome = playOut(room, { rand })
      assert.ok(outcome.ok, `${BOT_LABELS[level]} seed ${seed}: ${outcome.error}`)
      assert.equal(outcome.fallbacks, 0, `${BOT_LABELS[level]} 提出了非法出法，靠保底才走完`)
      assert.ok(outcome.actions > 4 && outcome.actions < 400, `动作数 ${outcome.actions} 不合理`)
      assert.equal(room.game.phase, PHASES.FINISHED)
      assert.equal(room.log.some((entry) => /出手失败/.test(entry.note)), false, '日志里出现了出手失败')

      // Nothing is lost or duplicated: the hands that are left plus everything
      // played is exactly the 54-card deck.
      const held = room.game.players.reduce((total, player) => total + player.hand.length, 0)
      const table = room.game.plays.reduce((total, play) => total + play.cards.length, 0)
      assert.equal(held + table, 54, `${held} 张在手 + ${table} 张打出 != 54`)
    }
  }
})

test('one person plus two computers plays a whole hand', () => {
  const room = createRoom({ code: 'ONE234', rng: seedRandom(21) })
  const me = joinSeat(room, { name: '我' })
  assert.ok(me.ok)

  const filled = applyAction(room, me.seat, { type: 'bots', level: 'hard', count: 2 })
  assert.ok(filled.ok, filled.error)
  assert.equal(filled.started, true, '坐满三个人就该立刻开局')
  assert.equal(room.game.phase, PHASES.BIDDING)
  assert.deepEqual(
    room.seats.map((seat) => Boolean(seat?.bot)),
    [false, true, true],
  )
  assert.equal(roomInfo(room).humans, 1)
  assert.equal(roomInfo(room).bots, 2)

  const outcome = playOut(room, { rand: seededFloat(makeRng(21)) })
  assert.ok(outcome.ok, outcome.error)
  assert.equal(outcome.fallbacks, 0)
  assert.equal(room.game.phase, PHASES.FINISHED)
  assert.ok(room.game.players[me.seat].hand.length + room.game.plays.length > 0)
})

test('two people plus one computer plays a whole hand', () => {
  const room = createRoom({ code: 'TWO234', rng: seedRandom(22) })
  const first = joinSeat(room, { name: '甲' })
  const second = joinSeat(room, { name: '乙' })
  assert.ok(first.ok && second.ok)
  assert.equal(room.hostSeat, first.seat, '先坐下的那一个是房主')

  const filled = applyAction(room, first.seat, { type: 'bots', level: 'hell', count: 1 })
  assert.ok(filled.ok, filled.error)
  assert.equal(filled.started, true)
  assert.deepEqual(
    room.seats.map((seat) => Boolean(seat?.bot)),
    [false, false, true],
  )

  const outcome = playOut(room, { rand: seededFloat(makeRng(22)) })
  assert.ok(outcome.ok, outcome.error)
  assert.equal(outcome.fallbacks, 0)
  assert.equal(room.game.phase, PHASES.FINISHED)
})

test('a hand of nothing but computers also finishes, for every level', () => {
  // Three people who all install DSH and all sit out is the degenerate case; the
  // room must not care that no human is watching.
  for (const level of BOT_LEVELS) {
    const { room, rand } = createBotRoom([level, level, level], 31)
    assert.equal(room.seats.every((seat) => Boolean(seat?.bot)), true)
    const outcome = playOut(room, { rand })
    assert.ok(outcome.ok, `${level}: ${outcome.error}`)
    assert.equal(room.game.phase, PHASES.FINISHED)
  }
})

/* --------------------------------------------------------- bot seats ----- */

test('a computer seat has no token, so nobody can end up in it by accident', () => {
  const room = createRoom({ code: 'NOTOKN', rng: seedRandom(5) })
  const host = joinSeat(room, { name: '房主' })
  const filled = applyAction(room, host.seat, { type: 'bots', level: 'hell', count: 2 })
  assert.ok(filled.ok, filled.error)

  const botSeats = room.seats.filter((seat) => seat?.bot)
  assert.equal(botSeats.length, 2)
  for (const seat of botSeats) {
    assert.equal(seat.token, null, '电脑座位不该有令牌')
    assert.equal(seat.name, botSeatLabel('hell'))
    assert.equal(seat.connected, true)
  }
  // No token means no identity: neither a missing nor an empty one resolves.
  assert.equal(act(room, null, { type: 'next' }).ok, false)
  assert.equal(act(room, '', { type: 'next' }).ok, false)
  // The host's own token still resolves to the host's seat — a level change is the
  // one action the host can always take, mid-hand included.
  assert.equal(act(room, host.token, { type: 'bots', level: 'hard' }).ok, true)
  // And a computer cannot be the one arranging computers.
  const botSeat = room.seats.findIndex((seat) => seat?.bot)
  assert.equal(applyAction(room, botSeat, { type: 'bots', level: 'easy', count: 0 }).ok, false)
})

test('the host owns the computers; their strength is free, their number is not', () => {
  const room = createRoom({ code: 'OWNER1', rng: seedRandom(6) })
  const host = joinSeat(room, { name: '房主' })
  const guest = joinSeat(room, { name: '朋友' })
  const filled = applyAction(room, host.seat, { type: 'bots', level: 'medium', count: 1 })
  assert.ok(filled.ok && filled.started, filled.error)

  // A guest cannot add, remove or retune them.
  assert.equal(applyAction(room, guest.seat, { type: 'bots', level: 'hell', count: 0 }).ok, false)
  assert.match(applyAction(room, guest.seat, { type: 'bots', level: 'hell' }).error, /只有房主/)

  // Strength is a mid-hand switch: the seat is renamed and the room remembers.
  const retuned = applyAction(room, host.seat, { type: 'bots', level: 'hell' })
  assert.ok(retuned.ok, retuned.error)
  assert.equal(room.botLevel, 'hell')
  assert.equal(room.seats.find((seat) => seat?.bot).bot, 'hell')
  assert.equal(room.seats.find((seat) => seat?.bot).name, '电脑·地狱')

  // Adding or removing one mid-hand is refused, with a reason that says so.
  const refused = applyAction(room, host.seat, { type: 'bots', level: 'hell', count: 0 })
  assert.equal(refused.ok, false)
  assert.match(refused.error, /牌局进行中/)
  assert.equal(room.seats.filter((seat) => seat?.bot).length, 1, '被拒之后座位不该悄悄变了')
})

test('a friend arriving takes the computer seat — but never mid-hand', () => {
  const room = createRoom({ code: 'TAKE12', rng: seedRandom(8) })
  const host = joinSeat(room, { name: '房主' })
  assert.ok(applyAction(room, host.seat, { type: 'bots', level: 'hard', count: 2 }).started)

  const early = joinSeat(room, { name: '迟到的' })
  assert.equal(early.ok, false)
  assert.match(early.error, /牌局进行中/)

  // Between hands the highest computer seat is given up, and the host keeps its own.
  room.game = { ...room.game, phase: PHASES.FINISHED }
  const late = joinSeat(room, { name: '迟到的' })
  assert.ok(late.ok, late.error)
  assert.equal(late.seat, 2)
  assert.equal(Boolean(room.seats[late.seat].bot), false)
  assert.equal(room.seats.filter((seat) => seat?.bot).length, 1)
  assert.equal(Boolean(room.seats[host.seat].bot), false, '房主自己的位子不能被顶掉')
})

test('a computer refuses a turn that is not its own, and refuses a human seat', () => {
  const { room, rand } = createBotRoom(['medium', 'medium', 'medium'], 12)
  const view = botView(room, 0)
  // The deal leaves the first bid with one seat; only that seat gets an answer.
  if (view.bidTurnSeat === 0) {
    const action = chooseAction(view, { rand })
    assert.equal(action.type, 'bid')
  } else {
    assert.equal(chooseAction(view, { rand }), null, '不是自己的回合就该闭嘴')
  }
  // Moving the turn away from this seat silences it, whatever the hand looks like.
  const notMyTurn = { ...view, toAct: 2, bidTurnSeat: 2, phase: PHASES.PLAYING }
  assert.equal(chooseAction(notMyTurn, { rand }), null)

  // A human seat is not a computer seat, whatever it is asked to do.
  const room2 = createRoom({ code: 'HUMAN1', rng: seedRandom(13) })
  const human = joinSeat(room2, { name: '人' })
  assert.equal(applyBotAction(room2, human.seat, { rand }).ok, false)
  assert.equal(botTurnSeat(room2), null)
})

test('the level list the window renders is the list the room accepts', () => {
  assert.deepEqual(BOT_LEVELS, ['easy', 'medium', 'hard', 'hell'])
  for (const level of BOT_LEVELS) {
    assert.equal(isBotLevel(level), true)
    assert.equal(typeof BOT_LABELS[level], 'string')
    assert.ok(describeLevel(level).length > 8, `${level} 缺说明`)
  }
  assert.equal(isBotLevel('IMPOSIBLE'), false)
  assert.equal(isBotLevel(null), false)
  assert.equal(botSeatLabel('nope'), '电脑')
  assert.equal(isBotLevel(DEFAULT_BOT_LEVEL), true)

  // An unknown level is ignored rather than stored, on the way in and on the way out.
  const room = createRoom({ code: 'LEVEL1', rng: seedRandom(14) })
  const host = joinSeat(room, { name: '房主' })
  const before = room.botLevel
  assert.ok(applyAction(room, host.seat, { type: 'bots', level: 'impossible', count: 1 }).ok)
  assert.equal(room.botLevel, before, '非法强度应该被忽略，而不是存进去')
  assert.equal(room.seats.filter((seat) => seat?.bot).every((seat) => isBotLevel(seat.bot)), true)
})

/* --------------------------------------------------------- strength ------ */

test('the four levels are ordered, measured on the same deals', () => {
  const rows = runLeague({ seeds: 24 })
  const rate = (level) => {
    const row = rows.find((entry) => entry.level === level)
    assert.ok(row && row.hands > 0, `${level} 一手都没打`)
    return row.rate
  }
  // Measured after the 0.1.5 bot work — 24 seeds (this test): 简单 34.7%, 中等 43.1%,
  // 困难 62.5%, 地狱 66.7%; 60 seeds (`scripts/bot-league.mjs`): 31.1 / 43.9 / 63.3 / 66.7.
  // The gaps below are half of what was measured, so a real regression trips this
  // and noise does not (the whole run is seeded, so it cannot drift on its own).
  assert.ok(rate('easy') < rate('medium') - 0.05, `简单 ${rate('easy')} 没有明显弱于中等 ${rate('medium')}`)
  assert.ok(rate('medium') < rate('hard') - 0.05, `中等 ${rate('medium')} 没有明显弱于困难 ${rate('hard')}`)
  assert.ok(rate('hell') > rate('hard'), `地狱 ${rate('hell')} 没有强于困难 ${rate('hard')}`)
  assert.ok(rate('hell') > rate('medium'), `地狱 ${rate('hell')} 不该弱于中等 ${rate('medium')}`)
})

test('hell counts cards where hard does not: the bomb that actually stops the run', () => {
  // A farmer on its last chance: the landlord is down to one card and has just led
  // a 5. The farmer holds a 7 and a bomb of 8s. Every card 9 and up is already on
  // the table, so the 8-bomb cannot be answered by anything — but a 7 can be
  // answered by any bomb of 3s through 6s, which are all still out there. 困难
  // plays the 7 and hopes; 地狱 can see that only the bomb ends the hand.
  const eight = cardsOfValue(8, 4)
  const seven = cardsOfValue(7, 1)
  const hand = [...seven, ...eight]
  const playedIds = deckIds().filter((id) => (cardFromId(id)?.value ?? 0) >= 9)
  // Built through the real classifier rather than typed out: `canBeat` compares
  // `sequenceLength`, and a hand-written shape that says 0 where the engine says 1
  // silently matches nothing.
  const target = classifyMove(cardsOfValue(5, 1))

  const view = (difficulty) => ({
    difficulty,
    seat: 0,
    phase: PHASES.PLAYING,
    role: 'farmer',
    hand: [...hand],
    playedIds,
    handCounts: [
      { seat: 0, count: hand.length, role: 'farmer', isBot: true },
      { seat: 1, count: 1, role: 'landlord', isBot: true },
      { seat: 2, count: 6, role: 'farmer', isBot: true },
    ],
    landlordSeat: 1,
    dealerSeat: 2,
    toAct: 0,
    target,
    targetSeat: 1,
    passes: 0,
    canPass: true,
    bidTurnSeat: null,
    highestBid: { score: 3, seat: 1 },
  })

  const outstanding = outstandingFor(view('hell'))
  assert.equal(outstanding.has(9), false, '这张牌应该已经出过')
  assert.equal(outstanding.has(16), false, '大小王应该已经出过')
  assert.equal(beatableFromOutstanding(classifyMove(seven), outstanding), true, '一张 7 挡不住（小三小四的炸弹还压得住）')
  assert.equal(beatableFromOutstanding(classifyMove(eight), outstanding), false, '四张 8 已经没人压得住')

  const hard = chooseAction(view('hard'))
  const hell = chooseAction(view('hell'))
  assert.equal(hard.type, 'play')
  assert.equal(hard.cards.length, 1, '困难只会上最小的一手压过去')
  assert.equal(cardFromId(hard.cards[0]).value, 7)
  assert.equal(hell.type, 'play')
  assert.equal(hell.cards.length, 4, '地狱算得出只有炸弹才拦得住，于是上炸弹')
  assert.equal(cardFromId(hell.cards[0]).value, 8)
})

test('hell closes a hand out on a line nothing can answer', () => {
  // 大王 + 小王 + 一张 3, and every card left outside this hand is another 3. The
  // rocket cannot be answered and neither can a single 3, so the hand can be played
  // out without ever losing the lead — the run-out line 地狱 is the only level to
  // look for.
  const hand = [...cardsOfValue(17, 1), ...cardsOfValue(16, 1), ...cardsOfValue(3, 1)]
  const playedIds = deckIds().filter((id) => !hand.includes(id) && cardFromId(id)?.value !== 3)
  const outstanding = new Map([[3, 2]])

  const line = runOutLine(hand, outstanding)
  assert.equal(line.out, true, '这条线应该能一路走完')
  assert.equal(line.cards, hand.length)
  assert.equal(line.moves.length, 2, '王炸一手 + 一张 3')

  const view = {
    difficulty: 'hell',
    seat: 0,
    phase: PHASES.PLAYING,
    role: 'landlord',
    hand: [...hand],
    playedIds,
    handCounts: [
      { seat: 0, count: 3, role: 'landlord', isBot: true },
      { seat: 1, count: 1, role: 'farmer', isBot: true },
      { seat: 2, count: 1, role: 'farmer', isBot: true },
    ],
    landlordSeat: 0,
    dealerSeat: 0,
    toAct: 0,
    target: null,
    targetSeat: null,
    passes: 0,
    canPass: false,
    bidTurnSeat: null,
    highestBid: { score: 3, seat: 0 },
  }

  const action = chooseAction(view)
  assert.equal(action.type, 'play')
  // Whichever unanswerable card it picks, the rest of the hand must still run out
  // with nobody able to answer: that is the property, not a particular first card
  // (leading the 3 first wins just as surely as the rocket does).
  const after = removeCards(view.hand, action.cards)
  assert.equal(beatableFromOutstanding(classifyMove(action.cards), outstanding), false, '第一手就被人压得住，就不叫必杀')
  assert.equal(runOutLine(after, outstanding).out, true, '剩下的牌也应该能一路走完')
})

test('困难/地狱领出时不把 2 和王一把打光，中等照旧', () => {
  // 四张 2 在手里：旧规则为了少一个回合，会把它们当「四带两对」直接领出去，等于
  // 把最大的控制牌一次扔掉。困难/地狱改成先走 3-7 的顺子，中等仍然只挑最小的一手。
  const hand = ['C2', 'C9', 'BJ', 'C4', 'DA', 'S9', 'C3', 'H7', 'D10', 'S5', 'S6', 'C6', 'D8', 'H2', 'D2', 'S2', 'H6']
  for (const level of ['hard', 'hell']) {
    const action = chooseAction(playView({ hand, difficulty: level }))
    assert.equal(action.type, 'play')
    const move = classifyMove(action.cards)
    assert.ok(move, '领出的牌必须是合法牌型')
    assert.deepEqual(
      [move.type, move.mainValue],
      ['straight', 10],
      `${level} 应该先走 3-7，而不是兑现四张 2`,
    )
    for (const id of action.cards) assert.ok(cardFromId(id).value < 15, `${id} 是 2 或王，不该领出`)
  }
  const medium = chooseAction(playView({ hand, difficulty: 'medium' }))
  assert.equal(classifyMove(medium.cards).type, 'single', '中等没有这条规则，只会出最小的一张')
})

test('困难/地狱跟牌时不拆自己的对子，中等只挑最便宜的', () => {
  // 手上有 JJ 和一张 Q，上家出单 9。中等用一张 J 压，拆掉 JJ 让剩下的手牌多出
  // 一个回合；困难/地狱改用 Q，保住对子。
  const hand = ['S3', 'D3', 'S6', 'DJ', 'D4', 'SJ', 'H3', 'CK', 'D5', 'C2', 'SA', 'SQ', 'C4', 'SK']
  const nine = cardsOfValue(9, 1)[0]
  const view = (level) =>
    playView({
      difficulty: level,
      hand,
      playedIds: deckIds().filter((id) => !hand.includes(id) && id !== nine),
      target: classifyMove([nine]),
      targetSeat: 1,
      canPass: true,
    })
  assert.equal(classifyMove(chooseAction(view('medium')).cards).mainValue, 11, '中等应该用最便宜的 J')
  assert.equal(classifyMove(chooseAction(view('hard')).cards).mainValue, 12, '困难应该用 Q，不拆 JJ')
  assert.equal(classifyMove(chooseAction(view('hell')).cards).mainValue, 12, '地狱应该用 Q，不拆 JJ')
})

test('同一手牌，越高的档位越敢叫地主', () => {
  // 叫分是这个引擎里最大的一档强度差（依据见 BID_TABLES 上的测量说明），所以门槛要
  // 在同一手牌上真的叫出不同的分数——只在表格里写数字不算。
  //   强度 8 的一手普通牌：简单/中等不叫，困难叫 1 分，地狱也叫 1 分；
  //   强度 13 的一手好牌：困难叫 2 分，地狱直接叫 3 分。
  const ordinary = ['CK', 'SQ', 'C3', 'S2', 'HA', 'HQ', 'CJ', 'D6', 'C4', 'D2', 'H9', 'C6', 'D4', 'D3', 'C7', 'C10', 'C5']
  const strong = ['BJ', 'C10', 'C5', 'C8', 'CK', 'D4', 'D5', 'DJ', 'DK', 'H2', 'H5', 'HJ', 'HK', 'S10', 'SA', 'SJ', 'SK']
  assert.equal(bidPower(ordinary), 8, '这个夹具的前提是手牌强度 8')
  assert.equal(bidPower(strong), 13, '这个夹具的前提是手牌强度 13')
  const bidView = (level, hand) => ({
    difficulty: level,
    seat: 0,
    phase: PHASES.BIDDING,
    role: null,
    hand: [...hand],
    handCounts: [
      { seat: 0, count: 17, role: null, isBot: true },
      { seat: 1, count: 17, role: null, isBot: true },
      { seat: 2, count: 17, role: null, isBot: true },
    ],
    playedIds: [],
    landlordSeat: null,
    dealerSeat: 0,
    toAct: null,
    target: null,
    targetSeat: null,
    passes: 0,
    canPass: false,
    bidTurnSeat: 0,
    highestBid: { score: 0, seat: null },
  })
  const bidOf = (level, hand) => chooseAction(bidView(level, hand), { rand: () => 0.9 }).score
  assert.equal(bidOf('easy', ordinary), 0)
  assert.equal(bidOf('medium', ordinary), 0)
  assert.equal(bidOf('hard', ordinary), 1)
  assert.equal(bidOf('hell', ordinary), 1)
  assert.equal(bidOf('hard', strong), 2, '好牌上困难只叫 2 分')
  assert.equal(bidOf('hell', strong), 3, '同一手好牌，地狱直接叫 3 分')

  // 地狱不许「每手都叫 3 分」：`[2,5,8]` 试过，联赛 70.7% 但它当上地主 84%，
  // 人再没机会坐庄，电脑还会拿烂牌乱叫。这条是产品口径，不是测量结论。
  assert.ok(BID_TABLES.hell[2] >= 12, `地狱的 3 分门槛 ${BID_TABLES.hell[2]} 太低，等于每手都抢地主`)
  // 门槛必须随难度单调放宽，否则「更敢叫」只是表格里的一串数字。
  for (const index of [0, 1, 2]) {
    assert.ok(BID_TABLES.hard[index] <= BID_TABLES.medium[index], `困难第 ${index} 个门槛不比中等低`)
    assert.ok(BID_TABLES.hell[index] <= BID_TABLES.hard[index], `地狱第 ${index} 个门槛不比困难低`)
  }
})

test('the window can tell how many computers a room would still take', () => {
  const room = createRoom({ code: 'CAP123', rng: seedRandom(15) })
  const host = joinSeat(room, { name: '房主' })
  assert.equal(botCapacity(snapshotFor(room, 0)), 2, '一个人在场，补满要两台电脑')
  applyAction(room, host.seat, { type: 'bots', level: 'medium', count: 1 })
  assert.equal(botCapacity(snapshotFor(room, 0)), 2, '已经坐了一台也还是两台才满')
  applyAction(room, host.seat, { type: 'bots', level: 'medium', count: 2 })
  assert.equal(botCapacity(snapshotFor(room, 0)), 2)

  const room2 = createRoom({ code: 'CAP456', rng: seedRandom(16) })
  joinSeat(room2, { name: '甲' })
  joinSeat(room2, { name: '乙' })
  assert.equal(botCapacity(snapshotFor(room2, 0)), 1, '两个人在场，只差一台')
  joinSeat(room2, { name: '丙' })
  assert.equal(botCapacity(snapshotFor(room2, 0)), 0, '三个真人就没有电脑的位置')
  assert.equal(botCapacity(null), 0)
})

/* --------------------------------------------------- over the real API --- */

test('the authority plays its own computers, over the real HTTP API', async (t) => {
  const room = createRoom({ code: 'AUTO22', rng: seedRandom(9) })
  // A 1 ms delay: this test is about who moves the computer, not about the pause.
  const authority = await createAuthorityServer(room, {
    host: '127.0.0.1',
    port: 0,
    pollTimeoutMs: 400,
    botDelayMs: 1,
  })
  t.after(() => authority.close())
  const base = authority.loopbackUrl

  async function call(path, { method = 'GET', body, token } = {}) {
    const headers = {}
    if (body) headers['content-type'] = 'application/json'
    if (token) headers['x-ddz-token'] = token
    const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    return { status: res.status, data: await res.json() }
  }

  const joined = await call('/join', { method: 'POST', body: { name: '我' } })
  assert.equal(joined.data.ok, true, JSON.stringify(joined.data))
  const token = joined.data.token

  // The authority's `/act` takes the action object itself as the body — that is
  // what the follower link sends, so the wire format is exercised here too.
  const filled = await call('/act', { method: 'POST', body: { type: 'bots', level: 'hard', count: 2 }, token })
  assert.equal(filled.data.ok, true, filled.data.error)

  // The person answers their own turns; every other move is made by the authority.
  let state = filled.data.state
  const deadline = Date.now() + 25000
  let mine = 0
  while (state.phase !== PHASES.FINISHED) {
    assert.ok(Date.now() < deadline, `25 秒还没打完（阶段 ${state.phase}，我出了 ${mine} 手）`)
    if (state.canBid) {
      state = (await call('/act', { method: 'POST', body: { type: 'bid', score: 0 }, token })).data.state
      mine += 1
      continue
    }
    if (state.canAct) {
      const action = state.canPass
        ? { type: 'pass' }
        : { type: 'play', cards: [state.you.hand[state.you.hand.length - 1]] }
      const answered = await call('/act', { method: 'POST', body: action, token })
      assert.equal(answered.data.ok, true, `我这一手被拒了：${answered.data.error}`)
      state = answered.data.state
      mine += 1
      continue
    }
    // Nothing for me to do: wait for a computer. The long poll answers as soon as
    // the room moves, and the room moves because the authority moved it.
    const waited = await call(`/state?since=${state.seq}`, { token })
    state = waited.data.state
  }

  assert.equal(state.phase, PHASES.FINISHED)
  assert.ok(state.plays.length > 0, '这局应该真出过牌')
  assert.equal(state.log.some((entry) => /出手失败/.test(entry.note)), false, '电脑出手失败过')
  assert.ok(mine > 0, '人至少该出一手，否则这个测试没测到两条路')
  // Three hands are empty and the table holds the rest of the deck.
  const held = (state.seats || []).reduce((total, seat) => total + seat.count, 0)
  const table = state.plays.reduce((total, play) => total + play.cards.length, 0)
  assert.equal(held + table, 54)
})
