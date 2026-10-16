/**
 * Theme-token handling for the client half.
 *
 * This file exists because of a real bug: the dark theme sets
 * `--dsw-alias-brand-primary` to `#f9fafb` (a near-white accent), and two rules
 * painted a brand fill while hardcoding `color:#fff` — so the 开房 button and the
 * selected strength chip rendered white-on-white. Exactly 1.05:1 contrast, i.e.
 * an empty box. The unit suite was green throughout, because a mini-DOM has no
 * CSS engine and the browser harness had no DSH tokens at all.
 *
 * So the guard here is structural: text on a brand fill must come from a theme
 * token, and the token we rely on must actually be legible on that fill in both
 * themes of the installed app.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { parseThemeCss, resolveValue, pluginTokens, PLUGIN_TOKENS, readInstalledTokens } from '../scripts/dsh-theme.mjs'

const require = createRequire(import.meta.url)
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const CSS = require(join(ROOT, 'src', 'client-css.cjs'))

const FIXTURE = `
:root{--dsw-static-neutral-bluish-00:#fff;--dsw-static-neutral-bluish-950:#151517;--dsw-static-neutral-bluish-1000:#0f1115}
body{--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-00);--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-1000);--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-00)}
body[data-ds-dark-theme]{--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-950);--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-00);--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-1000)}
`

/** Split the plugin's stylesheet into `selector { declarations }` rules. */
function rules(css) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let match = re.exec(css); match; match = re.exec(css)) {
    out.push({ selector: match[1].trim(), body: match[2].trim() })
  }
  return out
}

const declaration = (body, name) => {
  const match = new RegExp(`(?:^|;)\\s*${name}\\s*:([^;]+)`, 'i').exec(body)
  return match ? match[1].trim() : ''
}

/**
 * Text painted on a brand fill must come from a theme token. Anything literal is
 * fine for an accent on a fixed dark surface, but fatal on a fill that flips to
 * near-white in dark mode — which is exactly what happened here.
 */
function auditBrandFillText(css) {
  const fills = ['--dsw-alias-brand-primary', '--dsw-alias-button-primary-fill']
  const offenders = []
  for (const rule of rules(css)) {
    const background = declaration(rule.body, 'background') + declaration(rule.body, 'background-color')
    if (!fills.some((token) => background.includes(token))) continue
    const color = declaration(rule.body, 'color')
    if (!color) continue
    if (!color.includes('var(')) offenders.push(`${rule.selector} -> color:${color}`)
  }
  return offenders
}

test('parseThemeCss lifts the palette, the light block and the dark block', () => {
  const parsed = parseThemeCss(FIXTURE)
  assert.equal(parsed.statics['neutral-bluish-00'], '#fff')
  assert.equal(parsed.light['--dsw-alias-brand-primary'], 'var(--dsw-static-neutral-bluish-1000)')
  assert.equal(parsed.dark['--dsw-alias-brand-primary'], 'var(--dsw-static-neutral-bluish-00)')
})

test('resolveValue follows var() chains and honours a fallback', () => {
  const parsed = parseThemeCss(FIXTURE)
  assert.equal(resolveValue('var(--dsw-static-neutral-bluish-1000)', parsed.light, parsed.statics), '#0f1115')
  assert.equal(resolveValue('var(--dsw-alias-brand-primary)', parsed.dark, parsed.statics), '#fff')
  assert.equal(resolveValue('var(--dsw-alias-nope,#123456)', parsed.dark, parsed.statics), '#123456')
  assert.equal(resolveValue('var(--dsw-alias-nope)', parsed.dark, parsed.statics), '')
})

test('pluginTokens returns only the whitelist, fully resolved', () => {
  const themes = pluginTokens(parseThemeCss(FIXTURE))
  for (const theme of ['light', 'dark']) {
    for (const [name, value] of Object.entries(themes[theme])) {
      assert.ok(PLUGIN_TOKENS.includes(name.replace('--dsw-alias-', '')), `${name} 不在白名单里`)
      assert.ok(!value.includes('var('), `${theme} 的 ${name} 没解析干净：${value}`)
    }
  }
  assert.equal(themes.light['--dsw-alias-brand-primary'], '#0f1115')
  assert.equal(themes.dark['--dsw-alias-brand-primary'], '#fff')
})

// The bug this file was written for.
test('the guard flags the exact rule that shipped the white-on-white button', () => {
  // Verbatim from src/client-css.cjs as of v0.1.3, plus the selected chip.
  const historical = `
.ddz-btn.primary{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;color:#fff}
.ddz-chips button.on{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;color:#fff}
.ddz-tabs button.on{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08));color:inherit}
`
  const offenders = auditBrandFillText(historical)
  assert.equal(offenders.length, 2, `应该正好抓到两条，实际 ${JSON.stringify(offenders)}`)
  assert.match(offenders[0], /ddz-btn\.primary/)
  assert.match(offenders[1], /ddz-chips button\.on/)
})

test('no rule paints a brand fill with a hardcoded text colour', () => {
  const offenders = auditBrandFillText(CSS)
  assert.deepEqual(offenders, [], `品牌色底上的文字必须用主题 token：\n${offenders.join('\n')}`)
})

test('the on-brand text token is the one DSH itself uses, on both brand fills', () => {
  const found = rules(CSS).filter((rule) => {
    const background = declaration(rule.body, 'background')
    return background.includes('--dsw-alias-brand-primary')
  })
  assert.ok(found.length >= 2, `应该至少有两处品牌色底（按钮 + 选中项），实际 ${found.length}`)
  for (const rule of found) {
    assert.match(
      declaration(rule.body, 'color'),
      /--dsw-alias-label-primary-foreground/,
      `${rule.selector} 的文字色不是 label-primary-foreground`,
    )
  }
})

test('the plugin only reads tokens the Theme provider documents', () => {
  const documented = [
    'bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-overlay', 'border-l1', 'border-l2',
    'brand-primary', 'label-primary', 'label-primary-foreground', 'label-secondary',
    'state-error-primary', 'state-idle-primary', 'state-success-primary', 'state-warn-primary',
  ]
  for (const name of PLUGIN_TOKENS) {
    assert.ok(documented.includes(name), `${name} 不在 Theme 提供者的 token 列表里`)
  }
})

test('every --dsw- token the stylesheet reads is in the whitelist', () => {
  const used = new Set([...CSS.matchAll(/var\((--dsw-alias-[a-z0-9-]+)/g)].map((match) => match[1].replace('--dsw-alias-', '')))
  for (const name of used) {
    assert.ok(PLUGIN_TOKENS.includes(name), `styles 用了 ${name}，但它不在 PLUGIN_TOKENS 里（harness 就注不进去）`)
  }
})

// Assumption behind the fix, checked against the app that is actually installed.
test('in the installed DSH, the on-brand label contrasts with the brand fill', (t) => {
  let themes
  try {
    themes = readInstalledTokens().themes
  } catch (error) {
    t.skip(`读不到已安装的 DSH（${error.message}）`)
    return
  }
  const luminance = (hex) => {
    const value = hex.replace('#', '')
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value.slice(0, 6)
    const parts = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]
  }
  for (const theme of ['light', 'dark']) {
    const fill = themes[theme]['--dsw-alias-brand-primary']
    const text = themes[theme]['--dsw-alias-label-primary-foreground']
    assert.ok(fill && text, `${theme} 缺少 brand-primary 或 label-primary-foreground`)
    const [hi, lo] = [luminance(fill), luminance(text)].sort((a, b) => b - a)
    const ratio = (hi + 0.05) / (lo + 0.05)
    assert.ok(ratio >= 4.5, `${theme}：品牌色底的对比度只有 ${ratio.toFixed(2)}:1`)
  }
})
