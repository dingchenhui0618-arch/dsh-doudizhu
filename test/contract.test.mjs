/**
 * The contract between the two halves.
 *
 * The floating window and the plugin host are separate bundles in separate
 * realms, so nothing connects them: the client writes JSON, the host reads
 * properties, and one renamed field breaks a feature silently while every other
 * test stays green. That is exactly what happened to 加入 — the window posted
 * `baseUrl` while the host read `url`, so the button always answered
 * 「请填写房主地址」 and never took a seat.
 *
 * This test reads the client's own source, extracts every request body it sends,
 * and checks the keys against the route table in `src/ui-logic.js`. Its pair is
 * in `test/host.test.mjs`, which posts the same shapes at a real plugin instance
 * — a table can be wrong in the same direction as the client, an instance cannot.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { ROUTE_BODIES } from '../src/ui-logic.js'

const CLIENT_SOURCE = readFileSync(new URL('../src/client.cjs', import.meta.url), 'utf8')

/** Split an object literal's top level on commas, ignoring nested brackets. */
function topLevelPieces(inner) {
  const pieces = []
  let piece = ''
  let depth = 0
  for (const char of inner) {
    if ('{[('.includes(char)) depth += 1
    else if ('}])'.includes(char)) depth -= 1
    if (char === ',' && depth === 0) {
      pieces.push(piece)
      piece = ''
      continue
    }
    piece += char
  }
  pieces.push(piece)
  return pieces
}

/** The top-level key of each comma-separated piece: `k: v`, `k` and `k() ` all give k. */
function keysOf(inner) {
  return topLevelPieces(inner)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const named = /^([A-Za-z_$][\w$]*)\s*:/.exec(piece)
      if (named) return named[1]
      const shorthand = /^([A-Za-z_$][\w$]*)$/.exec(piece)
      return shorthand ? shorthand[1] : piece
    })
}

/** Every `post('<route>', { ... })` call, with the keys of its body. */
function postedBodies(source) {
  const out = []
  const re = /post\(\s*'([a-z]+)'\s*,\s*\{/g
  let match
  while ((match = re.exec(source))) {
    const open = re.lastIndex - 1
    let depth = 0
    let end = open
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    out.push({ route: match[1], keys: keysOf(source.slice(open + 1, end)) })
    re.lastIndex = end
  }
  return out
}

test('the floating window only sends body fields its routes accept', () => {
  const bodies = postedBodies(CLIENT_SOURCE)
  // A scanner that finds nothing must fail, not pass vacuously.
  assert.ok(bodies.length >= 4, `只解析出 ${bodies.length} 个请求体，是扫描器坏了而不是代码对了`)

  const routes = bodies.map((body) => body.route)
  for (const expected of ['host', 'join', 'probe', 'leave']) {
    assert.ok(routes.includes(expected), `客户端不再请求 /${expected} 了？`)
  }
  // The one that broke: this must stay `url`.
  const join = bodies.find((body) => body.route === 'join')
  assert.ok(join.keys.includes('url'), `加入 必须发 url 字段，实际发的是 ${join.keys.join(', ')}`)

  for (const body of bodies) {
    const allowed = ROUTE_BODIES[body.route]
    assert.ok(allowed, `客户端打了未知路由 /${body.route}`)
    for (const key of body.keys) {
      assert.ok(
        allowed.includes(key),
        `客户端往 /${body.route} 发了宿主不认的字段 ${key}；宿主认的是 ${allowed.join(', ')}`,
      )
    }
  }
})

test('the action request uses the field /act reads', () => {
  // act() has its own fetch instead of going through post(), so its literal body
  // is checked separately.
  const literal = /JSON\.stringify\(\{([^}]*)\}\)/.exec(CLIENT_SOURCE)
  assert.ok(literal, '没找到 act() 的请求体字面量')
  const keys = keysOf(literal[1])
  assert.ok(keys.includes('action'), `act() 必须发 action 字段，实际是 ${keys.join(', ')}`)
  for (const key of keys) {
    assert.ok(ROUTE_BODIES.act.includes(key), `act() 发了 /act 不认的字段 ${key}`)
  }
})

test('every route has a declared body shape', () => {
  for (const route of ['host', 'join', 'probe', 'act', 'leave']) {
    assert.ok(Array.isArray(ROUTE_BODIES[route]), `ROUTE_BODIES 缺少 ${route}`)
  }
})
