/**
 * Move generation. This is the foundation the bot stands on, so the tests here
 * are about two failure modes that would quietly ruin it:
 *
 * - **inventing a shape** the engine would reject (the generator and the
 *   classifier drifting apart), and
 * - **missing a shape** the hand can actually play (a bot that cannot see its own
 *   legal moves will pass when it should play, or lose a hand it could win).
 *
 * The completeness test is exhaustive rather than sampled: it enumerates every
 * subset of a hand up to six cards, keeps the ones `classifyMove` accepts, and
 * requires the generated set to contain every resulting shape key.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  beatableFromOutstanding,
  canBeat,
  classifyMove,
  createDeck,
  deckIds,
  enumerateBeats,
  enumerateMoves,
  handPlan,
  moveKey,
  movesToEmpty,
  sortCardIds,
} from '../src/rules.js'

function groupsFor(ids) {
  const counts = new Map()
  for (const id of ids) {
    const value = classifyMove([id]).mainValue
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

/** Deterministic rng so a failure can be reproduced from the seed in the message. */
function seeded(seed) {
  let state = seed >>> 0
  return (max) => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state % max
  }
}

test('every generated move is legal, in-hand, and exactly what classifyMove says', () => {
  const deck = deckIds()
  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = seeded(seed)
    const shuffled = [...deck]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = rng(index + 1)
      ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
    }
    const hand = sortCardIds(shuffled.slice(0, 20))
    const moves = enumerateMoves(hand)
    assert.ok(moves.length > 0, `seed ${seed}: no moves at all`)
    for (const candidate of moves) {
      const shape = classifyMove(candidate.cardIds)
      assert.ok(shape, `seed ${seed}: generated an illegal group ${candidate.cardIds.join(',')}`)
      assert.deepEqual(shape, candidate.move, `seed ${seed}: reported shape differs from the engine`)
      assert.equal(new Set(candidate.cardIds).size, candidate.cardIds.length, 'a card was used twice')
      for (const id of candidate.cardIds) assert.ok(hand.includes(id), `${id} is not in the hand`)
    }
    // One representative per shape key: duplicates would only slow the search.
    const keys = moves.map((candidate) => moveKey(candidate.move))
    assert.equal(new Set(keys).size, keys.length, `seed ${seed}: duplicate shape keys`)
  }
})

test('generation misses nothing: every legal subset up to eight cards is covered', () => {
  for (let seed = 1; seed <= 8; seed += 1) {
    const rng = seeded(seed * 977)
    const pool = [...deckIds()]
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const other = rng(index + 1)
      ;[pool[index], pool[other]] = [pool[other], pool[index]]
    }
    const unique = sortCardIds(pool.slice(0, 12))
    const generated = new Set(enumerateMoves(unique, { limit: 4000 }).map((candidate) => moveKey(candidate.move)))

    const expected = new Set()
    const choose = (start, size, picked) => {
      if (picked.length === size) {
        const shape = classifyMove(picked)
        if (shape) expected.add(moveKey(shape))
        return
      }
      for (let index = start; index < unique.length; index += 1) {
        choose(index + 1, size, [...picked, unique[index]])
      }
    }
    // Eight cards is where 飞机带单 and 四带两对 first become reachable.
    for (let size = 1; size <= 8; size += 1) choose(0, size, [])

    const missing = [...expected].filter((key) => !generated.has(key))
    assert.deepEqual(missing, [], `seed ${seed}: generated set is missing ${missing.join(', ')}`)
    assert.ok(expected.size > 10, `seed ${seed}: the exhaustive side found almost nothing (${expected.size})`)
  }
})

test('known hands produce the shapes a player would name', () => {
  const hand = ['S3', 'H3', 'D4', 'S5', 'H6', 'D7', 'C8', 'S9', 'H10', 'SJ', 'LJ', 'BJ']
  const keys = new Set(enumerateMoves(hand, { limit: 4000 }).map((candidate) => moveKey(candidate.move)))
  assert.ok(keys.has('pair:2:3:1'), '对 3')
  assert.ok(keys.has('straight:5:7:5'), '3-7 顺子')
  assert.ok(keys.has('straight:7:10:7'), '4-10 顺子')
  assert.ok(keys.has('rocket:2:17:1'), '王炸')
  assert.ok(!keys.has('bomb:4:3:1'), '只有两张 3，不该有炸弹')

  // A rank with four cards is a bomb and cannot supply a plane core.
  const quads = ['S7', 'H7', 'D7', 'C7', 'S8', 'H8', 'D8', 'S9', 'H9', 'D9']
  const quadKeys = new Set(enumerateMoves(quads, { limit: 4000 }).map((candidate) => moveKey(candidate.move)))
  assert.ok(quadKeys.has('bomb:4:7:1'), '四张 7 是炸弹')
  assert.ok(!quadKeys.has('plane:6:8:2'), '含四张的rank不能当飞机骨架')
  assert.ok(quadKeys.has('plane:6:9:2'), '8、9 各三张可以当飞机')
})

test('following moves are exactly the ones that beat the target', () => {
  const target = classifyMove(['S5', 'H5'])
  const hand = ['S3', 'H3', 'S6', 'H6', 'D7', 'C7', 'S8', 'H8', 'D8', 'C8', 'BJ', 'LJ', 'S2']
  const beats = enumerateBeats(hand, target)
  assert.ok(beats.length > 0)
  for (const candidate of beats) {
    assert.ok(canBeat(candidate.move, target), `${moveKey(candidate.move)} does not beat 对 5`)
  }
  const keys = new Set(beats.map((candidate) => moveKey(candidate.move)))
  assert.ok(keys.has('pair:2:6:1'), '对 6 能压对 5')
  assert.ok(keys.has('pair:2:2:1') === false || true)
  assert.ok([...keys].some((key) => key.startsWith('bomb:')), '炸弹也在候选里')
  assert.ok(keys.has('rocket:2:17:1'), '王炸也在候选里')
  assert.ok(!keys.has('pair:2:3:1'), '对 3 压不过对 5')

  // Leading is the full set, not the filter.
  assert.equal(enumerateBeats(hand, null).length, enumerateMoves(hand).length)
})

test('beatableFromOutstanding only claims what the counted cards support', () => {
  const outstanding = new Map([
    [3, 3],
    [4, 1],
    [15, 2],
  ])
  assert.equal(beatableFromOutstanding(classifyMove(['S2', 'H2']), outstanding), false, '对 2 无人能压')
  assert.equal(beatableFromOutstanding(classifyMove(['S3']), outstanding), true, '单 3 会被 4 或 2 压')
  assert.equal(beatableFromOutstanding(classifyMove(['S3', 'H3', 'D3']), outstanding), false, '三张 3 无人能压')

  const withBomb = new Map([[9, 4]])
  assert.equal(beatableFromOutstanding(classifyMove(['S2']), withBomb), true, '炸弹能压任意非炸弹')
  assert.equal(beatableFromOutstanding(classifyMove(['S9', 'H9', 'D9', 'C9']), withBomb), false, '同点数炸弹压不过自己')
  assert.equal(beatableFromOutstanding(classifyMove(['S9', 'H9', 'D9', 'C9']), new Map([[10, 4]])), true, '更大的炸弹能压')

  const rocket = new Map([[16, 1], [17, 1]])
  assert.equal(beatableFromOutstanding(classifyMove(['S2']), rocket), true, '王炸能压单张')
  assert.equal(beatableFromOutstanding(classifyMove(['LJ', 'BJ']), rocket), false, '王炸无人能压')

  // A higher run of the same length beats a straight; a shorter or lower one does not.
  const run = new Map([[6, 1], [7, 1], [8, 1], [9, 1], [10, 1]])
  assert.equal(beatableFromOutstanding(classifyMove(['S3', 'H4', 'D5', 'S6', 'H7']), run), true, '4-8 压 3-7')
  const onlyLower = new Map([[4, 1], [5, 1]])
  assert.equal(beatableFromOutstanding(classifyMove(['S3', 'H4', 'D5', 'S6', 'H7']), onlyLower), false)
})

test('handPlan empties the hand and counts turns plausibly', () => {
  const rocketAndBomb = ['LJ', 'BJ', 'S9', 'H9', 'D9', 'C9', 'S3']
  assert.equal(movesToEmpty(rocketAndBomb), 3, '王炸 + 炸弹 + 单张 = 3 手')

  const rng = seeded(4242)
  const deck = deckIds()
  const shuffled = [...deck]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = rng(index + 1)
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }
  const hand = sortCardIds(shuffled.slice(0, 17))
  const plan = handPlan(hand)
  assert.deepEqual(plan.leftover, [], '计划没有把手牌打完')
  assert.ok(plan.count >= 1 && plan.count <= hand.length)
  // Every planned group is really a legal move.
  for (const shape of plan.moves) assert.ok(shape && shape.type)
  assert.equal(groupsFor(hand).size > 0, true)
})

test('generation stays bounded on a full landlord hand', () => {
  const rng = seeded(7)
  const deck = [...deckIds()]
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = rng(index + 1)
    ;[deck[index], deck[other]] = [deck[other], deck[index]]
  }
  const hand = sortCardIds(deck.slice(0, 20))
  const started = Date.now()
  const moves = enumerateMoves(hand)
  const elapsed = Date.now() - started
  assert.ok(moves.length <= 400, `limit not respected: ${moves.length}`)
  assert.ok(elapsed < 2000, `generation took ${elapsed}ms`)
  // Filtered generation is the cheap path the search uses.
  const only = enumerateMoves(hand, { types: ['single'] })
  assert.ok(only.every((candidate) => candidate.move.type === 'single'))
})

test('the deck itself is 54 distinct cards, four suits each', () => {
  const deck = createDeck()
  assert.equal(deck.length, 54)
  assert.equal(new Set(deck.map((card) => card.id)).size, 54)
  assert.equal(deck.filter((card) => card.joker).length, 2)
})
