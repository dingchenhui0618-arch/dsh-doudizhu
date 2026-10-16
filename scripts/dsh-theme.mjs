/**
 * Read the *installed* DSH's theme token values.
 *
 * Why this exists: the browser harness page had no DSH tokens at all, so every
 * `var(--dsw-…)` in the plugin's CSS fell back to our own defaults — which are
 * dark. A real bug hid behind exactly that gap: in the dark theme DSH sets
 * `--dsw-alias-brand-primary` to a **near-white** accent, so a primary button
 * with a hardcoded `color:#fff` renders white-on-white and its label disappears.
 * The harness showed a blue button and called it fine; the user saw a blank box.
 *
 * So: parse the real values out of the installed app and let the harness inject
 * them. Parsing is a pure function (unit-tested in `test/theme.test.mjs`);
 * reading the archive is the thin impure wrapper.
 *
 *   node scripts/dsh-theme.mjs                      # print what we use
 *   node scripts/dsh-theme.mjs --out _tmp/t.json     # also write JSON
 *   node scripts/dsh-theme.mjs --asar <path.asar>
 */

import { statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Only the tokens the plugin's CSS actually reads. Keeps the output small. */
export const PLUGIN_TOKENS = [
  'bg-base',
  'bg-layer-1',
  'bg-layer-2',
  'bg-overlay',
  'border-l1',
  'border-l2',
  'brand-primary',
  'label-primary',
  'label-primary-foreground',
  'label-secondary',
  'state-error-primary',
  'state-idle-primary',
  'state-success-primary',
  'state-warn-primary',
]

const DEFAULT_ASAR = 'D:\\.deepseek\\resources\\app.asar'
const HEX = /#[0-9a-fA-F]{3,8}\b/

/**
 * Pull the three declaration blocks out of DSH's bundled CSS.
 *
 * The archive holds the same stylesheet twice — plain and `rgb()`/spaced — plus
 * a minified copy, so several candidates match; taking the first block that
 * carries `--dsw-alias-bg-base` is enough and does not depend on ordering.
 */
export function parseThemeCss(css) {
  const statics = {}
  const staticRe = /--dsw-static-([a-z0-9-]+)\s*:\s*([^;}]+)/g
  for (let match = staticRe.exec(css); match; match = staticRe.exec(css)) {
    const [, name, raw] = match
    const value = raw.trim()
    if (!value) continue
    // Prefer a hex literal: the same palette is also emitted as rgb()/rgba().
    if (statics[name] === undefined || (HEX.test(value) && !HEX.test(statics[name]))) statics[name] = value
  }

  const blockFor = (pattern) => {
    const re = new RegExp(pattern, 'g')
    for (let match = re.exec(css); match; match = re.exec(css)) {
      if (match[1].includes('--dsw-alias-bg-base:')) return declarations(match[1])
    }
    return null
  }

  return {
    statics,
    light: blockFor('body\\{([^}]*)\\}'),
    dark: blockFor('body\\[data-ds-dark-theme\\]\\{([^}]*)\\}'),
  }
}

function declarations(block) {
  const out = {}
  for (const piece of block.split(';')) {
    const index = piece.indexOf(':')
    if (index === -1) continue
    const name = piece.slice(0, index).trim()
    const value = piece.slice(index + 1).trim()
    if (name.startsWith('--')) out[name] = value
  }
  return out
}

/** Follow `var(--…)` chains until a literal, with the palette on the side. */
export function resolveValue(value, theme, statics, depth = 0) {
  const text = String(value ?? '').trim()
  if (!text || depth > 6) return text
  const ref = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)$/i.exec(text)
  if (!ref) return text
  const [, name, fallback] = ref
  const next = theme[name] ?? statics[name.replace(/^--dsw-static-/, '')]
  if (next === undefined) return fallback === undefined ? '' : resolveValue(fallback, theme, statics, depth + 1)
  return resolveValue(next, theme, statics, depth + 1)
}

/** Flat, resolved `--dsw-alias-x` maps for both themes. */
export function pluginTokens(parsed) {
  const pick = (theme) => {
    const out = {}
    if (!theme) return out
    for (const name of PLUGIN_TOKENS) {
      const raw = theme[`--dsw-alias-${name}`]
      if (raw === undefined) continue
      const value = resolveValue(raw, theme, parsed.statics)
      if (value) out[`--dsw-alias-${name}`] = value
    }
    return out
  }
  return { light: pick(parsed.light), dark: pick(parsed.dark) }
}

/** Read the archive in chunks; it is ~120 MB, so do not slurp it whole. */
export function readAsarText(path, chunkSize = 1 << 24) {
  const size = statSync(path).size
  const chunks = []
  const fd = openSync(path, 'r')
  try {
    for (let pos = 0; pos < size; pos += chunkSize) {
      const length = Math.min(chunkSize, size - pos)
      const buffer = Buffer.allocUnsafe(length)
      const read = readSync(fd, buffer, 0, length, pos)
      chunks.push(buffer.subarray(0, read))
    }
  } finally {
    closeSync(fd)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function readInstalledTokens(asarPath = DEFAULT_ASAR) {
  const css = readAsarText(asarPath)
  const parsed = parseThemeCss(css)
  const themes = pluginTokens(parsed)
  return { asar: asarPath, themes }
}

function main(argv) {
  const flag = (name, fallback) => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? fallback : argv[index + 1]
  }
  const asar = flag('asar', DEFAULT_ASAR)
  const out = flag('out', null)
  let result
  try {
    result = readInstalledTokens(asar)
  } catch (error) {
    console.error(`读不到 ${asar}：${error.message}`)
    process.exit(1)
  }
  const payload = { source: result.asar, themes: result.themes }
  if (out) {
    writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(`written ${out}`)
  }
  for (const theme of ['light', 'dark']) {
    const tokens = result.themes[theme]
    const count = Object.keys(tokens).length
    console.log(`\n[${theme}] ${count}/${PLUGIN_TOKENS.length} tokens`)
    for (const [name, value] of Object.entries(tokens)) console.log(`  ${name}: ${value}`)
  }
  return payload
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
}
