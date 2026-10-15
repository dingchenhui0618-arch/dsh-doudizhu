/**
 * Shared leak assertions.
 *
 * The invariant under test: for a given viewer, the snapshot must never contain
 * a card id held by another player unless that card has been made public
 * (played to the table, or drawn from the bottom cards the landlord took).
 *
 * The check is structural — every string in the JSON tree is collected into a
 * set — so it cannot produce a false pass or a false alarm from an id appearing
 * inside unrelated text.
 */

import assert from 'node:assert/strict'

import { PHASES } from '../../src/game.js'

export function everyString(value, out = new Set()) {
  if (typeof value === 'string') {
    out.add(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) everyString(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) everyString(item, out)
  }
  return out
}

/** Card ids `viewer` must not be able to see right now. */
export function secretIds(game, viewer) {
  if (game.phase === PHASES.FINISHED) return new Set()
  const publicIds = new Set(game.bottomRevealed ? game.bottom : [])
  for (const play of game.plays) for (const id of play.cards) publicIds.add(id)
  if (game.lastPlay) for (const id of game.lastPlay.cards) publicIds.add(id)

  const secret = new Set()
  for (const player of game.players) {
    if (player.seat === viewer) continue
    for (const id of player.hand) if (!publicIds.has(id)) secret.add(id)
  }
  return secret
}

export function assertSnapshotHasNoForeignCards(snapshot, game, viewer, label) {
  const visible = everyString(snapshot)
  for (const id of secretIds(game, viewer)) {
    assert.equal(visible.has(id), false, `${label}: 座位 ${viewer} 的快照里出现了别人的手牌 ${id}（阶段 ${game.phase}）`)
  }
}
