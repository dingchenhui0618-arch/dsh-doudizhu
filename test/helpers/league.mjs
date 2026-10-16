/**
 * Shared harness for the computer-player tests: a deterministic rng, a room
 * builder, a driver that plays a whole hand to the end, and a league that
 * measures the four strengths against each other.
 *
 * Everything is seeded, so every number these functions produce is reproducible
 * — a strength assertion can be a real threshold instead of a coin flip that
 * fails one CI run in ten.
 */

import { chooseAction } from '../../src/bot.js'
import { PHASES, bidSeat } from '../../src/game.js'
import { applyAction, applyBotAction, botTurnSeat, botView, createRoom } from '../../src/room.js'
import { botSeatLabel } from '../../src/ui-logic.js'

/** Deterministic integer rng in the shape the room expects: `(max) => [0, max)`. */
export function makeRng(seed) {
  let state = (seed >>> 0) || 1
  return (max) => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state % max
  }
}

/** The same stream as a float in [0,1), which is what the policies take. */
export function seededFloat(intRng) {
  return () => intRng(0x100000000) / 0x100000000
}

/** A room with three computer seats at the given levels, dealt and ready. */
export function createBotRoom(levels, seed) {
  const int = makeRng(seed)
  const room = createRoom({ code: 'LEAGUE', rng: int })
  levels.forEach((level, seat) => {
    room.seats[seat] = {
      seat,
      name: botSeatLabel(level),
      token: null,
      connected: true,
      joinedAt: Date.now(),
      bot: level,
    }
  })
  const started = applyAction(room, 0, { type: 'start' })
  return { room, started, rand: seededFloat(int) }
}

/** Whose turn it is, whoever they are. */
export function currentTurnSeat(room) {
  const game = room.game
  if (game.phase === PHASES.BIDDING) return bidSeat(game)
  if (game.phase === PHASES.PLAYING) return game.toAct
  return null
}

/**
 * Play until the hand is finished. Computer seats use their own level; a seat
 * without a level stands in for a person and is driven at `humanLevel`, which is
 * exactly how a human's clicks reach the room.
 *
 * `fallbacks` counts moves where the policy's own choice was refused by the
 * engine and the保底 move had to be used. That number must stay zero: a non-zero
 * one means the computer proposed an illegal move and something else covered for
 * it, which is the failure this harness exists to catch.
 */
export function playOut(room, { rand, humanLevel = 'medium', maxActions = 400 } = {}) {
  let actions = 0
  let fallbacks = 0
  while (room.game.phase !== PHASES.FINISHED && actions < maxActions) {
    const turn = currentTurnSeat(room)
    if (turn === null) break
    if (room.seats[turn]?.bot) {
      const result = applyBotAction(room, turn, { rand })
      if (!result.ok) return { ok: false, error: `电脑 ${turn} 号出手失败：${result.error}`, actions, fallbacks }
      if (result.fallback) fallbacks += 1
      actions += 1
      continue
    }
    const view = { ...botView(room, turn), difficulty: humanLevel }
    const action = chooseAction(view, { rand })
    if (!action) return { ok: false, error: `座位 ${turn} 想不出动作`, actions, fallbacks }
    const result = applyAction(room, turn, action)
    if (!result.ok) return { ok: false, error: `座位 ${turn} 动作被拒：${result.error}`, actions, fallbacks }
    actions += 1
  }
  if (room.game.phase !== PHASES.FINISHED) {
    return { ok: false, error: `打了 ${actions} 手还没结束`, actions, fallbacks }
  }
  return { ok: true, actions, fallbacks, room }
}

/**
 * Measure one seat's strength against a fixed table.
 *
 * For each deal and each seat position, the three seats are all `baseline`
 * except one, which takes the level under test; every level is then measured on
 * *the same deals in the same seat*. That pairing is the whole point: comparing
 * levels that played different cards measures the deal, not the level, and the
 * difference between the two strongest levels is far smaller than deal-to-deal
 * variance.
 *
 * The `medium` row is the control — it is the baseline table playing itself, so
 * every other level is read as a delta against it rather than against the naive
 * 50% (a seat wins its side in only about 40% of hands when all three seats are
 * equal, because the landlord's one seat wins most hands).
 */
export function runLeague({ levels = ['easy', 'medium', 'hard', 'hell'], baseline = 'medium', seeds = 40 } = {}) {
  const stats = {}
  for (const level of levels) stats[level] = { level, hands: 0, wins: 0, landlordHands: 0, landlordWins: 0 }

  for (let seed = 1; seed <= seeds; seed += 1) {
    for (let rotation = 0; rotation < 3; rotation += 1) {
      for (const level of levels) {
        const assigned = [baseline, baseline, baseline]
        assigned[rotation] = level
        const { room, started, rand } = createBotRoom(assigned, seed * 7919 + rotation)
        if (!started.ok) throw new Error(`开局失败：${started.error}`)
        const outcome = playOut(room, { rand })
        if (!outcome.ok) throw new Error(`seed ${seed} rotation ${rotation} ${level}: ${outcome.error}`)
        if (outcome.fallbacks > 0) {
          throw new Error(`${level} 在 seed ${seed} 提出非法出法 ${outcome.fallbacks} 次（不该发生）`)
        }
        const entry = stats[level]
        entry.hands += 1
        const isLandlord = room.game.landlordSeat === rotation
        if (isLandlord) entry.landlordHands += 1
        const onWinningSide = isLandlord
          ? room.game.winnerSide === 'landlord'
          : room.game.winnerSide === 'farmers'
        if (onWinningSide) {
          entry.wins += 1
          if (isLandlord) entry.landlordWins += 1
        }
      }
    }
  }

  return levels.map((level) => {
    const entry = stats[level]
    return {
      ...entry,
      rate: entry.hands ? entry.wins / entry.hands : 0,
      landlordRate: entry.landlordHands ? entry.landlordWins / entry.landlordHands : 0,
      becameLandlord: entry.hands ? entry.landlordHands / entry.hands : 0,
    }
  })
}
