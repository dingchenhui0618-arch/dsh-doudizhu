/**
 * Guards for the browser half's dependency surface.
 *
 * This is a regression test for a real bug: the pure rules module imported
 * `node:crypto` to default `shuffleDeck`'s rng argument. That was invisible
 * while only the host half consumed the module, and became fatal the moment the
 * floating window started pulling it in — esbuild could not resolve `node:crypto`
 * for the web build. Had it been marked external instead, the browser would have
 * thrown while loading the plugin.
 *
 * The rule is therefore: the client half's module graph is Node-free.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createRoom, joinSeat, snapshotFor } from '../src/room.js'
import { deckIds, shuffleDeck } from '../src/rules.js'

/** Every module the client build pulls in, in dependency order. */
const CLIENT_GRAPH = ['src/client.cjs', 'src/client-css.cjs', 'src/ui-logic.js', 'src/rules.js']

function source(relative) {
  return readFileSync(new URL('../' + relative, import.meta.url), 'utf8')
}

test('the browser half never imports a Node built-in', () => {
  for (const file of CLIENT_GRAPH) {
    const text = source(file)
    const hit = text.match(/(?:require\(\s*|from\s+)['"]node:[^'"]+['"]/)
    assert.equal(hit, null, `${file} 不能依赖 Node 内建，浏览器里加载就会失败：${hit ? hit[0] : ''}`)
  }
})

test('the browser half never imports the Node-only modules', () => {
  for (const file of CLIENT_GRAPH) {
    const text = source(file)
    // room.js reaches node:crypto, net.js opens sockets, host.js is the cordis
    // half: none of them belong in a browser bundle.
    for (const forbidden of ['./room.js', './net.js', './host.js']) {
      const pattern = new RegExp('(?:require\\(\\s*|from\\s+)[\'"]' + forbidden.replace('.', '\\.') + '[\'"]')
      assert.equal(pattern.test(text), false, `${file} 不能引用 ${forbidden}`)
    }
  }
})

test('the pure rules module still shuffles without an injected rng', () => {
  const shuffled = shuffleDeck()
  const ids = shuffled.map((card) => card.id)
  assert.equal(shuffled.length, 54)
  assert.equal(new Set(ids).size, 54, '洗牌不能丢牌或重复')
  assert.deepEqual([...ids].sort(), [...deckIds()].sort(), '洗完还是那 54 张')

  // The default source is Math.random now, so two shuffles must differ. Twenty
  // draws of the same permutation is not a realistic failure.
  const again = shuffleDeck().map((card) => card.id).join(',')
  const rounds = [ids.join(','), again]
  for (let i = 0; i < 18; i += 1) rounds.push(shuffleDeck().map((card) => card.id).join(','))
  assert.ok(new Set(rounds).size > 1, '默认随机源确实在洗牌')
})

test('a room with no injected rng still deals through the crypto default', () => {
  // Every other test injects seedRandom, so this is the only coverage of the
  // authority's real default path.
  const room = createRoom({ code: 'ABC234' })
  for (const name of ['甲', '乙', '丙']) joinSeat(room, { name })
  const snapshot = snapshotFor(room, 0)

  assert.equal(snapshot.phase, 'bidding', '三人到齐就发牌')
  assert.equal(snapshot.you.hand.length, 17)
  const all = new Set()
  for (let seat = 0; seat < 3; seat += 1) {
    const view = snapshotFor(room, seat)
    assert.equal(view.you.hand.length, 17)
    for (const id of view.you.hand) all.add(id)
  }
  assert.equal(all.size, 51, '三家手里的牌互不重叠')

  // The bottom stays hidden until the landlord takes it.
  assert.equal(snapshot.bottomRevealed, false)
  assert.deepEqual(snapshot.bottom, [])
})
