#!/usr/bin/env node
/**
 * Measure the four computer strengths against each other.
 *
 * Every level is seated in every seat equally often and every deal is fixed by a
 * seed, so the table is reproducible and the numbers in README come from this
 * script rather than from a feeling about the code.
 *
 *   node scripts/bot-league.mjs [seeds]
 */

import { BOT_LABELS } from '../src/ui-logic.js'
import { runLeague } from '../test/helpers/league.mjs'

const seeds = Math.max(1, Number(process.argv[2] || 60) || 60)
const started = Date.now()
const table = runLeague({ seeds })
const elapsed = Date.now() - started
const control = table.find((row) => row.level === 'medium')

console.log(
  `每个难度 ${table[0]?.hands ?? 0} 手：同一副牌、同一座位，只换那一个座位的强度（${seeds} 个牌局 x 3 个座位）\n` +
    `用时 ${(elapsed / 1000).toFixed(1)}s\n`,
)
console.log('难度          所在方获胜      胜率     比对照   当地主时胜率  当上地主')
for (const row of table) {
  const label = `${BOT_LABELS[row.level]}（${row.level}）`
  const delta = control && row.level !== 'medium' ? (row.rate - control.rate) * 100 : null
  console.log(
    `${label.padEnd(16, ' ')} ${String(row.wins).padStart(3, ' ')}/${String(row.hands).padEnd(4, ' ')} ` +
      `${(row.rate * 100).toFixed(1).padStart(6, ' ')}% ` +
      `${(delta === null ? '  —  ' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp`).padStart(7, ' ')} ` +
      `${(row.landlordRate * 100).toFixed(1).padStart(9, ' ')}% ` +
      `${(row.becameLandlord * 100).toFixed(0).padStart(8, ' ')}%`,
  )
}
console.log('\n「比对照」= 与中等自战（对照组）的差；一个座位只占一边的一部分，所以数字不大是正常的。')

