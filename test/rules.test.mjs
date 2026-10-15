/**
 * Rules engine tests: deck integrity, all eleven legal shapes, beat relations,
 * and the boundary cases where implementations usually diverge.
 *
 * Every expectation here is a pinned decision. Cases marked PINNED record a
 * choice this plugin makes where the public rules are ambiguous.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BID_LABELS,
  MAX_SEQUENCE_VALUE,
  MOVE_LABELS,
  RANKS,
  SEAT_COUNT,
  SUITS,
  canBeat,
  cardsBelongToHand,
  cardFromId,
  cardPublicView,
  classifyMove,
  countBombs,
  createDeck,
  deckIds,
  handStrength,
  hasRocket,
  labelsForCards,
  nextSeat,
  removeCards,
  rolesFor,
  seatOrderFrom,
  shuffleDeck,
  smallestLead,
  sortCardIds,
  winnerSide,
} from '../src/rules.js'
import { randomCode, seedRandom } from '../src/rng.js'

/** `classifyMove(['S3', 'H3'])` -> shorthand. */
const kind = (ids) => classifyMove(ids)?.type ?? null

/** Build `count` copies of one rank across distinct suits. */
function sameRank(rank, count) {
  return SUITS.slice(0, count).map((suit) => `${suit}${rank}`)
}

function straightFrom(values) {
  return values.map((value) => {
    const rank = RANKS[value - 3]
    return `S${rank}`
  })
}

test('deck has exactly 54 unique cards: 13 ranks x 4 suits plus two jokers', () => {
  const ids = deckIds()
  assert.equal(ids.length, 54)
  assert.equal(new Set(ids).size, 54)

  const jokers = ids.filter((id) => id === 'LJ' || id === 'BJ')
  assert.deepEqual(jokers.sort(), ['BJ', 'LJ'])

  const suited = ids.filter((id) => id !== 'LJ' && id !== 'BJ')
  assert.equal(suited.length, 52)
  // Regression: the small joker must not be id 'SJ' — that is the jack of spades,
  // and reusing it silently costs the deck one card.
  assert.ok(suited.includes('SJ'), 'the jack of spades keeps its suited id')
  assert.equal(cardFromId('SJ').value, 11)
  assert.equal(cardFromId('SJ').joker, false)
  assert.equal(cardFromId('LJ').value, 16)
  assert.equal(cardFromId('LJ').joker, true)
  for (const rank of RANKS) {
    assert.equal(suited.filter((id) => cardFromId(id).rank === rank).length, 4, `rank ${rank} needs 4 suits`)
  }
  for (const suit of SUITS) {
    assert.equal(suited.filter((id) => cardFromId(id).suit === suit).length, 13, `suit ${suit} needs 13 ranks`)
  }

  assert.equal(createDeck().length, 54)
  assert.ok(createDeck().every((card) => card && card.id))
})

test('unknown card ids are rejected', () => {
  assert.equal(cardFromId('X9'), null)
  assert.equal(cardFromId('S1'), null)
  assert.equal(cardFromId(''), null)
  assert.equal(cardFromId('S3X'), null)
  assert.equal(cardFromId('s3'), null)
})

test('rank order is 大王 > 小王 > 2 > A > K > ... > 3, and suits never matter', () => {
  const chain = ['BJ', 'LJ', 'S2', 'SA', 'SK', 'SQ', 'SJ', 'S10', 'S9', 'S8', 'S7', 'S6', 'S5', 'S4', 'S3']
  const values = chain.map((id) => cardFromId(id).value)
  for (let index = 1; index < values.length; index += 1) {
    assert.ok(values[index] < values[index - 1], `${chain[index]} must rank below ${chain[index - 1]}`)
  }
  assert.equal(cardFromId('S10').value, 10)
  assert.equal(cardFromId('SA').value, MAX_SEQUENCE_VALUE)

  for (const suit of SUITS) {
    assert.equal(cardFromId(`${suit}7`).value, cardFromId('S7').value)
  }
})

test('single, pair, triple, bomb, and rocket', () => {
  assert.equal(kind(['S3']), 'single')
  assert.equal(kind(['S5', 'H5']), 'pair')
  assert.equal(kind(sameRank('7', 3)), 'triple')
  assert.equal(kind(sameRank('A', 4)), 'bomb')
  assert.equal(kind(['LJ', 'BJ']), 'rocket')

  assert.equal(classifyMove(sameRank('A', 4)).isBomb, true)
  assert.equal(classifyMove(['LJ', 'BJ']).isRocket, true)
  assert.equal(classifyMove(['S3']).isBomb, false)

  // Two jokers are a rocket, never a pair; two different ranks are not a pair.
  assert.equal(kind(['S3', 'H4']), null)
  assert.equal(kind(['S3', 'H3', 'D4', 'C4']), null, 'two pairs is not a shape')
})

test('triple with a single and triple with a pair', () => {
  const three = sameRank('7', 3)
  assert.equal(kind([...three, 'S9']), 'triple_single')
  assert.equal(kind([...three, 'S9', 'H9']), 'triple_pair')
  assert.equal(classifyMove([...three, 'S9']).mainValue, 7)
  assert.equal(classifyMove([...three, 'S9']).wingType, 'single')
  assert.equal(classifyMove([...three, 'S9', 'H9']).wingType, 'pair')

  // A joker may be the attached single; a second triple is not a wing.
  assert.equal(kind([...three, 'BJ']), 'triple_single')
  assert.equal(kind([...sameRank('7', 3), ...sameRank('8', 3)]), 'plane')
})

test('straights need five or more consecutive ranks and never include 2 or jokers', () => {
  assert.equal(kind(straightFrom([3, 4, 5, 6, 7])), 'straight')
  assert.equal(kind(straightFrom([10, 11, 12, 13, 14])), 'straight', '10JQKA is legal')
  assert.equal(kind(straightFrom([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])), 'straight', '3..A is 12 cards')

  assert.equal(kind(straightFrom([11, 12, 13, 14, 15])), null, 'JQKA2 is illegal')
  assert.equal(kind(['SA', 'S2', 'S3', 'S4', 'S5']), null, 'A2345 is illegal')
  assert.equal(kind(straightFrom([3, 4, 5, 6])), null, 'four cards is too short')
  assert.equal(kind(['S3', 'S4', 'S5', 'S6', 'LJ']), null, 'a joker breaks the sequence')
  assert.equal(kind(['S3', 'S4', 'S5', 'S6', 'BJ']), null, 'the big joker breaks the sequence')
  assert.equal(kind([...straightFrom([3, 4, 5, 6]), 'S6']), null, 'a duplicated rank is not a straight')

  const straight = classifyMove(straightFrom([3, 4, 5, 6, 7]))
  assert.equal(straight.sequenceLength, 5)
  assert.equal(straight.mainValue, 7, 'the straight is ranked by its top card')
})

test('pair straights need three or more consecutive pairs and never include 2 or jokers', () => {
  const pairs = (...values) => values.flatMap((value) => sameRank(RANKS[value - 3], 2))
  assert.equal(kind(pairs(3, 4, 5)), 'pair_straight')
  assert.equal(kind(pairs(12, 13, 14)), 'pair_straight', 'QQKKAA is legal')
  assert.equal(kind(pairs(3, 4)), null, 'two pairs is too short')
  assert.equal(kind(pairs(13, 14, 15)), null, 'KKAA22 is illegal')
  assert.equal(kind(pairs(3, 4, 6)), null, 'a gap breaks the run')

  const run = classifyMove(pairs(3, 4, 5))
  assert.equal(run.sequenceLength, 3)
  assert.equal(run.size, 6)
})

test('planes: bare, with singles, and with pairs', () => {
  const triple = (rank) => sameRank(rank, 3)
  assert.equal(kind([...triple('7'), ...triple('8')]), 'plane')
  assert.equal(kind([...triple('7'), ...triple('8'), ...triple('9')]), 'plane')
  assert.equal(kind([...triple('7'), ...triple('8'), 'S3', 'H5']), 'plane_single')
  assert.equal(kind([...triple('7'), ...triple('8'), 'S3', 'H3', 'S5', 'H5']), 'plane_pair')

  const bare = classifyMove([...triple('7'), ...triple('8')])
  assert.equal(bare.sequenceLength, 2)
  assert.equal(bare.mainValue, 8, 'the plane is ranked by its top triple')
  assert.equal(bare.isBomb, false)

  assert.equal(kind([...triple('7'), ...triple('9')]), null, '8 is missing so the core is not consecutive')
  assert.equal(kind([...triple('2'), ...triple('3')]), null, 'a plane may not contain 2')
  assert.equal(kind([...triple('K'), ...triple('A'), ...triple('2')]), null, 'a plane may not end on 2')
})

test('plane wings must exactly match the core length', () => {
  const triple = (rank) => sameRank(rank, 3)
  const core = [...triple('7'), ...triple('8')]

  assert.equal(kind([...core, 'S3']), null, '7 cards: one wing for a two-triple core')
  assert.equal(kind([...core, 'S3', 'H4', 'D5']), null, '9 cards: three wings for a two-triple core')
  assert.equal(kind([...core, 'S3', 'H3']), 'plane_single', 'PINNED: a wing pair counts as two singles')
  assert.equal(kind([...core, 'S3', 'H4']), 'plane_single', 'exactly two wings for a two-triple core')
  assert.equal(kind([...core, 'S3', 'H4', 'D5', 'C6']), null, 'four wings for a two-triple core')

  const three = [...triple('7'), ...triple('8'), ...triple('9')]
  assert.equal(kind([...three, 'S3', 'H4', 'D5']), 'plane_single', 'three wings for a three-triple core')
  assert.equal(kind([...three, 'S3', 'H4']), null, 'two wings for a three-triple core')
})

test('a rank holding four cards cannot be split to supply a plane core', () => {
  // PINNED: the core triple must be a rank with exactly three cards.
  assert.equal(kind(['S7', 'H7', 'D7', 'C7', ...sameRank('8', 3)]), null, '7 cards of 7777+888')
  assert.equal(kind(['S7', 'H7', 'D7', 'C7', ...sameRank('8', 3), ...sameRank('9', 3)]), null)
})

test('four with two: two singles or two pairs, and it is never a bomb', () => {
  const four = sameRank('8', 4)
  const singles = classifyMove([...four, 'S3', 'H5'])
  assert.equal(singles.type, 'four_two')
  assert.equal(singles.isBomb, false, '四带二 is not a bomb')
  assert.equal(singles.mainValue, 8)

  assert.equal(kind([...four, 'S3', 'H3']), 'four_two', 'PINNED: the two attached cards may be a pair')

  const pairs = classifyMove([...four, 'S3', 'H3', 'S5', 'H5'])
  assert.equal(pairs.type, 'four_two_pairs')
  assert.equal(pairs.isBomb, false)

  assert.equal(kind([...four, 'S3']), null, 'five cards is not a shape')
  assert.equal(kind([...sameRank('8', 4), ...sameRank('9', 4)]), null, 'four with four is not a shape')
})

test('same shape compares by main value only when size and length match', () => {
  const single = (rank) => classifyMove([`S${rank}`])
  assert.ok(canBeat(single('5'), single('3')))
  assert.equal(canBeat(single('3'), single('5')), false)
  assert.equal(canBeat(single('5'), single('5')), false, 'equal value never beats')

  const short = classifyMove(straightFrom([3, 4, 5, 6, 7]))
  const long = classifyMove(straightFrom([4, 5, 6, 7, 8, 9]))
  assert.equal(canBeat(long, short), false, 'a six-card straight cannot beat a five-card straight')
  assert.equal(canBeat(short, long), false)

  const lowRun = classifyMove(straightFrom([3, 4, 5, 6, 7]))
  const highRun = classifyMove(straightFrom([4, 5, 6, 7, 8]))
  assert.ok(canBeat(highRun, lowRun))

  const lowPairs = classifyMove([...sameRank('3', 2), ...sameRank('4', 2), ...sameRank('5', 2)])
  const highPairs = classifyMove([...sameRank('4', 2), ...sameRank('5', 2), ...sameRank('6', 2)])
  assert.ok(canBeat(highPairs, lowPairs))

  const shortPlane = classifyMove([...sameRank('7', 3), ...sameRank('8', 3)])
  const longPlane = classifyMove([...sameRank('7', 3), ...sameRank('8', 3), ...sameRank('9', 3)])
  assert.equal(canBeat(longPlane, shortPlane), false, 'a three-triple plane cannot beat a two-triple plane')

  // A pair never beats a single and a triple never beats a pair.
  assert.equal(canBeat(classifyMove(['S5', 'H5']), classifyMove(['S3'])), false)
  assert.equal(canBeat(classifyMove(sameRank('5', 3)), classifyMove(['S3', 'H3'])), false)

  // 三带一 and 三带一对 are separate shapes with separate sizes.
  const tripleSingle = classifyMove([...sameRank('7', 3), 'S9'])
  const triplePair = classifyMove([...sameRank('7', 3), 'S9', 'H9'])
  assert.equal(canBeat(triplePair, tripleSingle), false)
  assert.ok(canBeat(classifyMove([...sameRank('8', 3), 'S4']), tripleSingle))
})

test('bombs beat ordinary shapes, the rocket beats bombs, and 四带二 does not', () => {
  const bomb = classifyMove(sameRank('A', 4))
  const biggerBomb = classifyMove(sameRank('2', 4))
  const rocket = classifyMove(['LJ', 'BJ'])
  const straight = classifyMove(straightFrom([3, 4, 5, 6, 7]))
  const fourTwo = classifyMove([...sameRank('8', 4), 'S3', 'H5'])
  const biggerFourTwo = classifyMove([...sameRank('9', 4), 'S3', 'H5'])

  assert.ok(canBeat(bomb, straight), 'a bomb beats any ordinary shape')
  assert.ok(canBeat(bomb, classifyMove(['SA'])))
  assert.equal(canBeat(straight, bomb), false)
  assert.ok(canBeat(biggerBomb, bomb), 'a higher bomb wins')
  assert.equal(canBeat(bomb, biggerBomb), false)
  assert.ok(canBeat(rocket, biggerBomb), 'the rocket beats every bomb')
  assert.ok(canBeat(rocket, straight))
  assert.equal(canBeat(biggerBomb, rocket), false, 'nothing beats the rocket')
  assert.equal(canBeat(rocket, rocket), false)

  assert.equal(canBeat(fourTwo, bomb), false, '四带二 is not a bomb')
  assert.equal(canBeat(fourTwo, straight), false, '四带二 only answers 四带二')
  assert.ok(canBeat(biggerFourTwo, fourTwo))

  // Three 2s plus a joker is 三带一, not a bomb; four 2s is.
  assert.equal(kind([...sameRank('2', 3), 'BJ']), 'triple_single')
  assert.equal(kind(sameRank('2', 4)), 'bomb')

  assert.equal(canBeat(null, straight), false)
  assert.equal(canBeat(bomb, null), false)
})

test('malformed selections are rejected', () => {
  assert.equal(classifyMove([]), null)
  assert.equal(classifyMove(null), null)
  assert.equal(classifyMove('S3'), null)
  assert.equal(classifyMove(['S3', 'S3']), null, 'the same card cannot be played twice')
  assert.equal(classifyMove(['S3', 'X3']), null, 'an unknown card poisons the play')
  assert.equal(classifyMove([3]), null)
})

test('hand helpers: membership, removal, sorting, and hints', () => {
  const hand = ['S3', 'H3', 'D7', 'LJ', 'BJ']
  assert.ok(cardsBelongToHand(['S3', 'D7'], hand))
  assert.equal(cardsBelongToHand([], hand), false)
  assert.equal(cardsBelongToHand(['S3', 'S3'], hand), false)
  assert.equal(cardsBelongToHand(['S3', 'C9'], hand), false)

  assert.deepEqual(removeCards(hand, ['S3', 'BJ']).sort(), ['D7', 'H3', 'LJ'])
  assert.deepEqual([...removeCards(hand, ['C9'])].sort(), [...hand].sort(), 'removing an unheld card is a no-op')

  assert.deepEqual(sortCardIds(['S3', 'BJ', 'SA', 'S2']), ['BJ', 'S2', 'SA', 'S3'])
  assert.deepEqual(smallestLead(hand), ['S3'])
  assert.deepEqual(labelsForCards(['S3', 'BJ']), ['♠3', '大王'])
  assert.deepEqual(cardPublicView('LJ'), { id: 'LJ', rank: '小王', suit: 'J', value: 16, label: '小王' })
  assert.equal(cardPublicView('nope'), null)

  assert.equal(hasRocket(hand), true)
  assert.equal(hasRocket(['LJ']), false)
  assert.equal(countBombs([...sameRank('5', 4), ...sameRank('6', 4), 'S3']), 2)
  assert.ok(handStrength(hand) > handStrength(['S3']))
})

test('seating is clockwise and role/winner mapping is consistent', () => {
  assert.equal(SEAT_COUNT, 3)
  assert.deepEqual([0, 1, 2].map((seat) => nextSeat(seat)), [1, 2, 0])
  assert.deepEqual(seatOrderFrom(1), [1, 2, 0])
  assert.deepEqual(seatOrderFrom(0), [0, 1, 2])

  assert.deepEqual(rolesFor(1), ['farmer', 'landlord', 'farmer'])
  assert.deepEqual(rolesFor(0), ['landlord', 'farmer', 'farmer'])

  assert.equal(winnerSide(1, 1), 'landlord')
  assert.equal(winnerSide(1, 0), 'farmers')
  assert.equal(winnerSide(2, 0), 'farmers')
  assert.equal(winnerSide(0, 0), 'landlord')

  assert.equal(MOVE_LABELS.four_two, '四带二')
  assert.equal(BID_LABELS[0], '不叫')
  assert.equal(BID_LABELS[3], '3 分')
})

test('shuffling preserves the deck and is reproducible from a seed', () => {
  const original = deckIds()
  const shuffled = shuffleDeck(createDeck(), seedRandom(20261015))
  const ids = shuffled.map((card) => card.id)

  assert.equal(ids.length, 54)
  assert.deepEqual([...ids].sort(), [...original].sort(), 'a shuffle only reorders')
  assert.notDeepEqual(ids, original)

  const again = shuffleDeck(createDeck(), seedRandom(20261015)).map((card) => card.id)
  assert.deepEqual(again, ids, 'the same seed deals the same order')

  const other = shuffleDeck(createDeck(), seedRandom(20261016)).map((card) => card.id)
  assert.notDeepEqual(other, ids)

  // Every card object survives a shuffle intact.
  for (const card of shuffled) assert.ok(card && card.id && card.value)
})

test('seeded rng stays in range and randomCode uses an unambiguous alphabet', () => {
  const rng = seedRandom(7)
  for (let index = 0; index < 500; index += 1) {
    const value = rng(54)
    assert.ok(Number.isInteger(value) && value >= 0 && value < 54, `out of range: ${value}`)
  }
  assert.equal(rng(1), 0)
  assert.equal(rng(0), 0)
  assert.equal(rng('nonsense'), 0)

  const code = randomCode(6, seedRandom(3))
  assert.equal(code.length, 6)
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
  assert.equal(randomCode(6, seedRandom(3)), code, 'codes are reproducible from a seed')
})
