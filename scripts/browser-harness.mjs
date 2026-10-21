/**
 * Real-browser harness for the client half (M5 visual check).
 *
 * DSH's own web shell needs the session URL that `dsh web` prints, and the
 * desktop app's window is Electron, not a tab — so the plugin's floating window
 * cannot be reached from an ordinary browser. This harness stubs exactly the one
 * piece that is DSH's code and not ours: the slot layer.
 *
 * Everything else is real:
 *   - the browser is real Chrome, driven over Kimi WebBridge
 *   - React and ReactDOM are the real UMD builds
 *   - the bundle is the real `lib/client.js` (the same file DSH would serve)
 *   - `/dsh-doudizhu/*` is proxied to the live, running plugin, so the window
 *     polls real room state and posts real actions
 *   - the `--dsw-…` theme tokens are read out of the installed DSH (`--theme
 *     dark|light|none`), so the page shows the colours the real window gets
 *
 * The proxy drops `Origin` / `Referer` / `sec-fetch-site`, which is what a
 * browser cannot do and a local process can. That is the honest shape of the
 * plugin's origin check: it stops cross-site pages, not local callers.
 *
 *   node scripts/browser-harness.mjs [--port 8792] [--target http://127.0.0.1:19387] [--theme dark]
 *   node scripts/browser-harness.mjs --room        # in-process room, no DSH needed
 *
 * With `--room` the `/dsh-doudizhu/*` routes are answered by a real room from
 * `src/room.js` instead of a running plugin, so screenshots do not depend on
 * whether the app has been restarted since the host half last changed. The page
 * then takes `?room=lobby|table|history` and `?prefs=<json>`, both harness-only.
 *
 * The React UMD files are expected in `_tmp/` (see README); they are fetched
 * once so the browser itself never needs the network.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readInstalledTokens, PLUGIN_TOKENS } from './dsh-theme.mjs'
import { act, applyAction, createRoom, joinSeat, snapshotFor } from '../src/room.js'
import { seedRandom } from '../src/rng.js'
import { canBeat, cardFromId, classifyMove } from '../src/rules.js'
import { PREFS_KEY } from '../src/ui-logic.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const TMP = join(ROOT, '_tmp')

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const PORT = Number(flag('port', '8792'))
const TARGET = String(flag('target', 'http://127.0.0.1:19387')).replace(/\/+$/, '')
const THEME = String(flag('theme', 'dark'))
// `--room` swaps the proxy for an in-process room driven by the real engine.
// The proxy needs a running DSH whose host half already has the fields the new
// client reads; a screenshot run must not depend on when that app was restarted.
const LOCAL = process.argv.includes('--room')

/**
 * Inject the *real* DSH theme tokens, read out of the installed app.
 *
 * Without this the page has no `--dsw-…` variables at all, so every one of them
 * falls back to our own dark defaults — which is exactly how a white-on-white
 * primary button (the dark theme sets `--dsw-alias-brand-primary` to `#f9fafb`)
 * stayed invisible here while being obvious in the real window. The harness is
 * only worth running if it can show what the user sees.
 */
function themeStyle(theme) {
  if (theme === 'none') return { css: '', note: '主题 token：未注入（--theme none）' }
  try {
    const { themes } = readInstalledTokens()
    const tokens = themes[theme]
    if (!tokens || !Object.keys(tokens).length) throw new Error(`没有 ${theme} 的 token`)
    const body = Object.entries(tokens).map(([name, value]) => `${name}:${value}`).join(';')
    return {
      css: `body{${body}}`,
      note: `主题 token：${theme}（${Object.keys(tokens).length}/${PLUGIN_TOKENS.length} 个，读自已安装的 DSH）`,
    }
  } catch (error) {
    return { css: '', note: `主题 token：注入失败（${error.message}）—— 页面走插件自带的暗色兜底` }
  }
}

const THEME_INFO = themeStyle(THEME)

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>dsh-doudizhu 客户端半区 · 桩宿主</title>
<style>
  html, body { margin: 0; height: 100%; background: #14141a; color: #e9e9ef;
    font: 13px/1.55 system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; }
  /* The real overlay layer is frame-wide and click-through; occupants opt back
     into pointer events themselves. Mirrored here so the CSS is exercised. */
  #layer { position: fixed; inset: 0; pointer-events: none; }
  #view { padding: 14px; }
  #boot { padding: 14px; color: #9a9aa8; }
  #boot.failed { color: #ff6b6b; }
  .harness-tag { margin: 0 0 6px; color: #6f6f80; font-size: 11px;
    letter-spacing: .04em; text-transform: uppercase; }
  #theme-note { margin: 8px 0 0; color: #9a9aa8; font-size: 11px; }
</style>
<style id="dsh-tokens">/* THEME_CSS */</style>
</head>
<body>
<div id="boot">正在加载客户端半区…</div>
<p id="theme-note">/* THEME_NOTE */</p>
<div id="layer"></div>
<div id="view"></div>
<script>
  // Harness-only: a screenshot run picks a scenario and stored preferences through
  // the URL. The plugin still reads them from the real localStorage itself.
  (function () {
    var query = new URLSearchParams(location.search);
    var room = query.get('room');
    if (room) document.cookie = 'ddz-room=' + room + ';path=/';
    var prefs = query.get('prefs');
    if (prefs) { try { localStorage.setItem('/*PREFS_KEY*/', prefs) } catch (error) {} }
  })();
</script>
<script src="/react.js"></script>
<script src="/react-dom.js"></script>
<script>
  window.__ModuleLoader__ = {
    load: function (entry) { (window.__ENTRIES__ = window.__ENTRIES__ || []).push(entry); },
  };
</script>
<script src="/client.js"></script>
<script>
(function () {
  var boot = document.getElementById('boot');
  function fail(message) {
    boot.className = 'failed';
    boot.textContent = message;
    window.__HARNESS_ERROR__ = message;
  }
  try {
    var entries = window.__ENTRIES__ || [];
    if (!entries.length) { fail('客户端半区没有向 __ModuleLoader__ 注册任何东西'); return; }

    var registered = [];
    var effects = [];
    var injects = [];
    var ctx = {
      effect: function (fn, label) { effects.push({ label: label, dispose: fn() }); },
      slots: {
        inject: function (slot, fn) { injects.push({ slot: slot, run: fn }); },
        register: function (meta, component) { registered.push({ meta: meta, component: component }); return function () {}; },
      },
    };

    var entry = entries[entries.length - 1];
    var face = entry.factory(function (specifier) {
      if (specifier === 'react') return window.React;
      throw new Error('客户端 bundle 要求了一个没准备的模块: ' + specifier);
    });
    face.apply(ctx);
    injects.forEach(function (injection) { injection.run(); });

    var layer = document.getElementById('layer');
    var view = document.getElementById('view');
    // In the real UI the two slots live in different panes and never share pixels.
    // This page stacks them, so a screenshot of the floating window would show the
    // conversation tab ghosting underneath it. Mount the tab only when asked.
    var withTab = new URLSearchParams(location.search).get('tab') === '1';
    registered.forEach(function (item) {
      var overlay = item.meta.name === 'shell.overlay';
      if (!overlay && !withTab) return;
      var host = document.createElement('div');
      host.className = 'harness-host';
      host.dataset.slot = item.meta.name;
      host.dataset.pluginId = item.meta.id;
      var tag = document.createElement('p');
      tag.className = 'harness-tag';
      tag.textContent = item.meta.name + ' · ' + item.meta.id;
      (overlay ? layer : view).appendChild(host);
      if (!overlay) host.appendChild(tag);
      ReactDOM.createRoot(host).render(React.createElement(item.component, {}));
    });

    boot.remove();
    window.__HARNESS__ = {
      id: entry.id,
      face: { name: face.name, inject: face.inject },
      slots: registered.map(function (item) { return item.meta; }),
      effects: effects.map(function (item) { return item.label; }),
      ready: true,
    };
  } catch (error) {
    fail('客户端半区加载失败: ' + (error && error.message));
    throw error;
  }
})();
</script>
</body>
</html>
`

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

async function sendFile(res, path, type) {
  try {
    send(res, 200, type, await readFile(path))
  } catch (error) {
    send(res, 500, 'text/plain; charset=utf-8', `read ${path} failed: ${error.message}`)
  }
}

/**
 * Forward to the live plugin. The browser sees one origin, so the token the
 * plugin hands back on GET is readable and the client can echo it on POST.
 */
async function proxy(req, res, body) {
  const url = TARGET + req.url
  const headers = { 'content-type': req.headers['content-type'] || 'application/json' }
  const token = req.headers['x-dsh-doudizhu-token']
  if (token) headers['x-dsh-doudizhu-token'] = Array.isArray(token) ? token[0] : token
  // Deliberately absent: origin, referer, sec-fetch-site.
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      redirect: 'manual',
    })
    const buffer = Buffer.from(await upstream.arrayBuffer())
    const out = { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
    const issued = upstream.headers.get('x-dsh-doudizhu-token')
    if (issued) out['x-dsh-doudizhu-token'] = issued
    console.log(`[proxy] ${req.method} ${req.url} -> ${upstream.status} (${buffer.length}B)`)
    res.writeHead(upstream.status, out)
    res.end(buffer)
  } catch (error) {
    console.log(`[proxy] ${req.method} ${req.url} -> FAILED ${error.message}`)
    send(res, 502, 'application/json', JSON.stringify({ ok: false, error: `桩宿主无法连上插件：${error.message}` }))
  }
}

/**
 * In-process rooms for screenshot runs.
 *
 * These are the *real* engine and the *real* `snapshotFor`: only DSH's HTTP layer
 * is replaced. That keeps a screenshot honest — what the picture shows is what the
 * authority would send — while removing the dependency on a DSH that happens to
 * have been restarted since the host half changed.
 */
const WORLDS = new Map()

/**
 * Lead the cheapest single in the hand by *value*, not by the hand's own order:
 * the order sorts 2s after aces, so "first card" would lead a 2 and nobody could
 * answer it — which is exactly the dead end a screenshot run must not hit.
 */
function playLowest(room, tokens, seat) {
  const hand = snapshotFor(room, seat).you.hand
  const cheapest = [...hand].sort((left, right) => cardFromId(left).value - cardFromId(right).value)[0]
  return act(room, tokens[seat], { type: 'play', cards: [cheapest] })
}

/** Beat `target` with the cheapest single that can, or report failure. */
function followLowest(room, tokens, seat, target) {
  // The hand arrives sorted high-to-low, so sort by value first: otherwise the
  // "cheapest" follow would answer an ace with a two and leave the screenshot in
  // a position where nothing on the table can be beaten at all.
  const hand = [...snapshotFor(room, seat).you.hand]
    .sort((left, right) => cardFromId(left).value - cardFromId(right).value)
  for (const id of hand) {
    const move = classifyMove([id])
    if (move && canBeat(move, target)) {
      const result = act(room, tokens[seat], { type: 'play', cards: [id] })
      if (result.ok) return true
    }
  }
  return false
}

function buildWorld(kind) {
  const room = createRoom({ code: 'K7M2Q9', rng: seedRandom(kind === 'lobby' ? 7 : 2024) })
  const names = ['阿橘', '阿凯', '小北']
  const tokens = []
  const seats = kind === 'lobby' ? names.slice(0, 1) : names
  for (const name of seats) tokens.push(joinSeat(room, { name }).token)
  if (kind === 'lobby') return { room, seat: 0, tokens }

  const bid = act(room, tokens[0], { type: 'bid', score: 3 })
  if (!bid.ok) throw new Error('桩房间叫分失败：' + bid.error)
  const tricks = kind === 'history' ? 4 : 0
  for (let index = 0; index < tricks; index += 1) {
    playLowest(room, tokens, 0)
    act(room, tokens[1], { type: 'pass' })
    act(room, tokens[2], { type: 'pass' })
  }
  // Leave the table mid-trick with 小北 holding one single and it being my turn,
  // so the felt, the "要压过它" note and the hint buttons all have something to say.
  playLowest(room, tokens, 0)
  act(room, tokens[1], { type: 'pass' })
  followLowest(room, tokens, 2, snapshotFor(room, 0).lastPlay.move)
  return { room, seat: 0, tokens }
}

function worldFor(kind) {
  if (!WORLDS.has(kind)) WORLDS.set(kind, buildWorld(kind))
  return WORLDS.get(kind)
}

function kindOf(req) {
  const cookie = String(req.headers.cookie || '')
  const match = /(?:^|;\s*)ddz-room=([a-z]+)/.exec(cookie)
  return match && ['lobby', 'table', 'history'].includes(match[1]) ? match[1] : 'table'
}

function stateBody(world) {
  const snapshot = snapshotFor(world.room, world.seat)
  return {
    ok: true,
    protocol: 1,
    role: 'host',
    playerName: '阿橘',
    defaults: { port: 8791, host: '0.0.0.0' },
    authority: {
      code: world.room.code,
      port: 8791,
      loopbackUrl: 'http://127.0.0.1:8791',
      lanUrls: ['http://192.168.1.50:8791'],
    },
    guest: null,
    lastError: null,
    snapshot,
  }
}

async function handleLocal(req, res, body) {
  const path = String(req.url || '/').split('?')[0]
  const kind = kindOf(req)
  const world = worldFor(kind)
  const reply = (payload) => {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-dsh-doudizhu-token': 'harness-local',
    })
    res.end(JSON.stringify(payload))
  }
  const action = path.slice(path.lastIndexOf('/') + 1)
  if (action === 'state') {
    console.log(`[local] state ${kind}`)
    return reply(stateBody(world))
  }
  if (action === 'act') {
    let asked
    try {
      asked = JSON.parse(String(body || '{}')).action
    } catch (error) {
      return reply({ ok: false, error: 'body 不是 JSON' })
    }
    const result = applyAction(world.room, world.seat, asked)
    console.log(`[local] act ${asked && asked.type} -> ${result.ok ? 'ok' : result.error}`)
    return reply(result)
  }
  if (action === 'leave') WORLDS.clear()
  return reply({ ok: true })
}

const server = createServer(async (req, res) => {
  const path = String(req.url || '/').split('?')[0]
  try {
    if (path === '/' || path === '/index.html') {
      const page = PAGE
        .replace('/* THEME_CSS */', THEME_INFO.css)
        .replace('/* THEME_NOTE */', THEME_INFO.note)
        .replace('/*PREFS_KEY*/', PREFS_KEY)
      return send(res, 200, 'text/html; charset=utf-8', page)
    }
    if (path === '/react.js') return await sendFile(res, join(TMP, 'react.js'), 'application/javascript; charset=utf-8')
    if (path === '/react-dom.js') return await sendFile(res, join(TMP, 'react-dom.js'), 'application/javascript; charset=utf-8')
    if (path === '/client.js') return await sendFile(res, join(ROOT, 'lib', 'client.js'), 'application/javascript; charset=utf-8')
    if (path.startsWith('/dsh-doudizhu')) {
      const body = await readBody(req)
      return LOCAL ? await handleLocal(req, res, body) : await proxy(req, res, body)
    }
    if (path === '/favicon.ico') return send(res, 204, 'text/plain', '')
    send(res, 404, 'text/plain; charset=utf-8', 'not found')
  } catch (error) {
    send(res, 500, 'text/plain; charset=utf-8', String((error && error.message) || error))
  }
})

for (const required of ['react.js', 'react-dom.js']) {
  if (!existsSync(join(TMP, required))) {
    console.error(`missing _tmp/${required} — see README for the two curl commands`)
    process.exit(1)
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`harness  http://127.0.0.1:${PORT}/`)
  console.log(`target   ${LOCAL ? 'in-process room (--room)' : TARGET}`)
  console.log(`theme    ${THEME} — ${THEME_INFO.note}`)
})
