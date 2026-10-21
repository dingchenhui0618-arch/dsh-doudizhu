/**
 * The client half, exercised head-lessly.
 *
 * Loads the *built* `lib/client.js` in a fresh V8 context with a small React and
 * a small DOM, then runs the real plugin face against a recording `ctx`. The
 * snapshots fed to it come from the real room, so the fields the UI reads are the
 * fields the authority actually sends.
 *
 * This exists because the browser half is the one part `node --test` cannot
 * simply import, and because a client plugin whose slot ids are wrong fails
 * silently in the app: nothing appears, and nothing errors.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import { PHASES, placeBid } from '../src/game.js'
import { act, applyAction, createRoom, joinSeat, snapshotFor } from '../src/room.js'
import { seedRandom } from '../src/rng.js'
import { canBeat, cardFromId, classifyMove } from '../src/rules.js'
import { PREFS_KEY } from '../src/ui-logic.js'

const BUNDLE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const TOKEN_HEADER = 'x-dsh-doudizhu-token'
const LOCAL_TOKEN = 'tok-abc123'

/* --------------------------------------------------------- a small React --- */

/**
 * Hooks live per component *type*, which is faithful enough here: every
 * component in this UI is mounted once, and only the top-level surfaces and the
 * lobby use hooks at all.
 */
function createReact(onChange) {
  const frames = new Map()
  let current = null

  function frameFor(type) {
    if (!frames.has(type)) frames.set(type, { state: [], refs: [], effects: [], disposers: [], cursor: 0, mounted: false })
    return frames.get(type)
  }

  /**
   * Render one component. `runEffects` is true only for a genuine mount: on a
   * re-render React would not re-subscribe, and neither do we.
   */
  function withComponent(type, props, runEffects) {
    const previous = current
    const frame = frameFor(type)
    current = frame
    frame.cursor = 0
    frame.effects = []
    let tree
    try {
      tree = type(props)
    } finally {
      current = previous
    }
    if (runEffects && !frame.mounted) {
      frame.mounted = true
      for (const fn of frame.effects) {
        const dispose = fn()
        if (typeof dispose === 'function') frame.disposers.push(dispose)
      }
    }
    return tree
  }

  const React = {
    createElement(type, props, ...children) {
      const flat = children.length === 0 ? undefined : children.length === 1 ? children[0] : children
      const next = Object.assign({}, props || {})
      if (flat !== undefined) next.children = flat
      return { type, props: next }
    },
    useState(initial) {
      const frame = current
      const index = frame.cursor
      frame.cursor += 1
      if (!(index in frame.state)) frame.state[index] = typeof initial === 'function' ? initial() : initial
      return [frame.state[index], function (next) {
        frame.state[index] = typeof next === 'function' ? next(frame.state[index]) : next
        if (onChange) onChange()
      }]
    },
    useEffect(fn) {
      const frame = current
      frame.cursor += 1
      frame.effects.push(fn)
    },
    useLayoutEffect(fn) {
      const frame = current
      frame.cursor += 1
      frame.effects.push(fn)
    },
    useRef(initial) {
      const frame = current
      const index = frame.cursor
      frame.cursor += 1
      if (!(index in frame.refs)) frame.refs[index] = { current: initial === undefined ? null : initial }
      return frame.refs[index]
    },
    useCallback(fn) {
      current.cursor += 1
      return fn
    },
    useMemo(fn) {
      current.cursor += 1
      return fn()
    },
  }

  return { React, withComponent, frameFor }
}

/* ----------------------------------------------------------- the harness --- */

function createHarness(payload) {
  const styles = []
  const removals = []
  const intervals = new Map()
  const storage = new Map()
  const calls = []
  const registrations = []
  const injections = []
  const effects = []
  let nextInterval = 1
  let loaded = null
  let tree = null
  let top = null

  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)) },
    removeItem: (key) => { storage.delete(key) },
  }

  const react = createReact(() => {
    if (top) tree = react.withComponent(top.component, top.props, false)
  })

  const context = vm.createContext({
    window: {
      __ModuleLoader__: { load: (entry) => { loaded = entry } },
      innerWidth: 1440,
      innerHeight: 900,
      localStorage,
      addEventListener() {},
      removeEventListener() {},
    },
    document: {
      createElement: (tag) => (tag === 'style'
        ? { dataset: {}, textContent: '', remove() { removals.push(this) } }
        : { dataset: {}, appendChild() {} }),
      head: { appendChild: (element) => styles.push(element) },
    },
    localStorage,
    console,
    navigator: {},
    setTimeout,
    clearTimeout,
    setInterval: (fn, ms) => { const id = nextInterval++; intervals.set(id, { fn, ms }); return id },
    clearInterval: (id) => { intervals.delete(id) },
    fetch: (url, init) => {
      calls.push({ url: String(url), init: init || {} })
      return Promise.resolve({
        headers: { get: (name) => (String(name).toLowerCase() === TOKEN_HEADER ? LOCAL_TOKEN : null) },
        json: async () => (typeof payload === 'function' ? payload() : payload),
      })
    },
  })

  vm.runInContext(BUNDLE, context, { filename: 'lib/client.js' })
  if (!loaded) throw new Error('the bundle must register itself with window.__ModuleLoader__')

  const face = loaded.factory((specifier) => {
    if (specifier === 'react') return react.React
    throw new Error('the client bundle required an unexpected module: ' + specifier)
  })

  const ctx = {
    effect(fn, label) {
      effects.push({ label, dispose: fn() })
    },
    slots: {
      inject(slot, fn) { injections.push({ slot, fn, dispose: undefined }) },
      register(meta, component) {
        registrations.push({ meta, component })
        return () => { registrations.push({ meta, disposed: true }) }
      },
    },
  }

  const harness = {
    face,
    ctx,
    registrations,
    injections,
    effects,
    styles,
    removals,
    storage,
    calls,
    intervals,
    react,
    apply() {
      face.apply(ctx)
      for (const injection of injections) injection.dispose = injection.fn()
    },
    registered(slot) {
      return registrations.find((entry) => entry.meta.name === slot && entry.component)
    },
    /** Mount one registered slot component as the tree root. */
    mount(slot) {
      const found = harness.registered(slot)
      if (!found) throw new Error(`nothing registered into ${slot}`)
      top = { component: found.component, props: {} }
      tree = react.withComponent(top.component, top.props, true)
      return tree
    },
    /** Flush the fetch -> store -> setState -> re-render chain. */
    async settle(rounds = 8) {
      for (let index = 0; index < rounds; index += 1) await new Promise((resolve) => setImmediate(resolve))
      return tree
    },
    tree() { return tree },
    /** Run the poll callback as if the interval had fired. */
    tick() { for (const entry of intervals.values()) entry.fn() },
    /** Dispose every effect the plugin registered, newest first. */
    disposeAll() { for (const effect of effects) effect.dispose() },
  }
  return harness
}

/* ------------------------------------------------------- tree inspection --- */

function walk(node, react, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out
  if (Array.isArray(node)) {
    for (const child of node) walk(child, react, out)
    return out
  }
  if (typeof node === 'string' || typeof node === 'number') {
    out.push({ kind: 'text', text: String(node) })
    return out
  }
  const type = node.type
  const props = node.props || {}
  if (typeof type === 'function') {
    walk(react.withComponent(type, props, false), react, out)
    return out
  }
  out.push({
    kind: 'element',
    type: type,
    props: props,
    className: String(props.className || ''),
    text: typeof props.children === 'string' ? props.children : '',
  })
  walk(props.children, react, out)
  return out
}

function textOf(nodes) {
  return nodes.filter((node) => node.kind === 'text').map((node) => node.text).join(' ')
}

/** A button whose own label contains `label`. */
function findButton(nodes, label) {
  return nodes.find((node) => node.kind === 'element' && node.type === 'button' && node.text.includes(label)) || null
}

function cardsIn(nodes) {
  return nodes.filter((node) => node.kind === 'element' && node.className.split(' ').includes('ddz-card'))
}

function clickableCards(nodes) {
  return cardsIn(nodes).filter((card) => typeof card.props.onClick === 'function')
}

function hasClass(nodes, name) {
  return nodes.some((node) => node.kind === 'element' && node.className.split(' ').includes(name))
}

/** The same text the UI paints on a card. */
function cardLabel(id) {
  return cardFromId(id).label
}

/** Every walk must use the *same* React the bundle got: its components call the
 *  hooks of that instance, so a second instance has no frame to hand them. */
function look(harness) {
  return walk(harness.tree(), harness.react)
}

/* ------------------------------------------------------------- fixtures --- */

/** The payload shape GET /dsh-doudizhu/state returns. */
function statePayload(role, snapshot, extra = {}) {
  return Object.assign({
    ok: true,
    protocol: 1,
    role,
    playerName: '我',
    defaults: { port: 8791, host: '0.0.0.0' },
    authority: null,
    guest: null,
    lastError: null,
    snapshot,
  }, extra)
}

function hosted(snapshot, extra = {}) {
  return statePayload('host', snapshot, Object.assign({
    authority: {
      code: 'AB12CD',
      port: 8791,
      loopbackUrl: 'http://127.0.0.1:8791',
      lanUrls: ['http://192.168.1.50:8791'],
    },
  }, extra))
}

function seatedRoom(seed = 90210) {
  const room = createRoom({ code: 'AB12CD', rng: seedRandom(seed) })
  const tokens = ['甲', '乙', '丙'].map((name) => joinSeat(room, { name }).token)
  return { room, tokens }
}

async function mountMini(payload) {
  const harness = createHarness(payload)
  harness.apply()
  harness.mount('shell.overlay')
  await harness.settle()
  return harness
}

/** Play a whole hand out through the room, always trying the weakest legal card. */
function playOutHand(room, tokens) {
  assert.ok(act(room, tokens[snapshotFor(room, 0).bidTurnSeat], { type: 'bid', score: 3 }).ok, '叫 3 分当地主')
  let steps = 0
  while (snapshotFor(room, 0).phase !== PHASES.FINISHED && steps < 500) {
    steps += 1
    const view = snapshotFor(room, 0)
    const seat = view.toAct
    const hand = snapshotFor(room, seat).you.hand
    const last = view.lastPlay
    let played = false
    if (last && last.move) {
      const weakestFirst = [...hand].sort((left, right) => cardFromId(left).value - cardFromId(right).value)
      for (const id of weakestFirst) {
        const move = classifyMove([id])
        if (move && canBeat(move, last.move) && act(room, tokens[seat], { type: 'play', cards: [id] }).ok) {
          played = true
          break
        }
      }
    } else {
      played = act(room, tokens[seat], { type: 'play', cards: [hand[0]] }).ok
    }
    if (!played) assert.ok(act(room, tokens[seat], { type: 'pass' }).ok, '出不了就必须能不出')
  }
  return steps
}

/** The actions the window actually posted to the host half, in order. */
function sentActions(harness) {
  return harness.calls
    .filter((call) => call.url === '/dsh-doudizhu/act')
    .map((call) => JSON.parse(call.init.body).action)
}

/* ---------------------------------------------------------------- tests --- */

test('the bundle registers the plugin face the host expects', () => {
  const harness = createHarness(statePayload('idle', null))
  assert.equal(harness.face.name, 'dsh-doudizhu')
  assert.equal(typeof harness.face.apply, 'function')
  assert.ok(Array.isArray(harness.face.inject), 'inject must be declared')
  assert.ok(harness.face.inject.includes('slots'), 'the client half needs the slots service')
})

test('apply registers both slots, with ids nobody else owns', () => {
  const harness = createHarness(statePayload('idle', null))
  harness.apply()

  assert.deepEqual(
    harness.injections.map((injection) => injection.slot),
    ['shell.overlay', 'conversation.view'],
    '浮窗与标签页各注册一次',
  )

  const mini = harness.registrations.find((entry) => entry.meta.id === 'doudizhu-mini')
  assert.ok(mini, '浮窗没注册')
  assert.equal(mini.meta.name, 'shell.overlay')
  assert.equal(mini.meta.order, 30)
  assert.equal(typeof mini.component, 'function')

  const view = harness.registrations.find((entry) => entry.meta.id === 'doudizhu')
  assert.ok(view, '标签页没注册')
  assert.equal(view.meta.name, 'conversation.view')
  assert.equal(view.meta.label, '斗地主', '标签页要有人看得懂的中文名')
  assert.equal(typeof view.component, 'function')

  assert.equal(typeof harness.injections[0].dispose, 'function', 'slot 注入要能撤销')
  assert.equal(typeof harness.injections[1].dispose, 'function')
})

test('apply installs the stylesheet and a poller, and both are disposable', () => {
  const harness = createHarness(statePayload('idle', null))
  harness.apply()

  assert.deepEqual(harness.effects.map((effect) => effect.label), [
    'dsh-doudizhu: poller',
    'dsh-doudizhu: styles',
  ])
  assert.equal(harness.styles.length, 1, '样式只注入一次')
  const css = harness.styles[0].textContent
  assert.ok(css.includes('.ddz-mini'), '样式表里有浮窗的规则')
  // Surfaces and text both come from the host's tokens, never from literal
  // colours — the window must look native in either theme.
  assert.ok(css.includes('--dsw-alias-bg-layer-2'), '颜色走宿主主题令牌')
  assert.ok(css.includes('--dsw-alias-label-primary'), '文字色也走宿主令牌')
  assert.ok(css.includes('pointer-events:auto'), '浮窗层是点击穿透的，条目要自己收回指针事件')

  harness.effects[1].dispose()
  assert.equal(harness.removals.length, 1, 'dispose 要把 <style> 摘掉')
})

test('the floating window renders the lobby before you are in a table', async () => {
  const harness = await mountMini(statePayload('idle', null))
  const nodes = look(harness)
  const text = textOf(nodes)

  assert.ok(text.includes('斗地主'), '窗口标题是斗地主')
  assert.ok(text.includes('我开房'), '有开房入口')
  assert.ok(text.includes('我加入'), '有加入入口')
  assert.ok(text.includes('昵称'), '能填昵称')
  assert.ok(text.includes('端口'), '开房能看到端口')
  assert.ok(harness.calls.some((call) => call.url === '/dsh-doudizhu/state'), '挂上了轮询')
})

/* The slim pill is a <button> that expands on click *and* drags. A drag ends
 * with a click the browser still delivers, so dragging used to pop the window
 * open — the reported "拖动以后会自动打开". A 4px slop keeps the two gestures
 * apart; these two tests pin both directions. */
const PILL_BOX = { left: 900, top: 40, width: 148, height: 30 }

async function mountPill() {
  const harness = createHarness(statePayload('idle', null))
  harness.storage.set(PREFS_KEY, JSON.stringify({ collapsed: true, x: 800, y: 40 }))
  harness.apply()
  harness.mount('shell.overlay')
  await harness.settle()
  return harness
}

function pillOf(harness) {
  return look(harness).find((node) => node.kind === 'element' && node.className.split(' ').includes('ddz-pill')) || null
}

/** The walk has no DOM, so stand in for the node the drag code measures. */
function pillNode(harness) {
  const pill = pillOf(harness)
  assert.ok(pill, '收起状态应该只剩一颗药丸')
  pill.props.ref.current = { getBoundingClientRect: () => ({ ...PILL_BOX }) }
  return pill
}

const capture = { setPointerCapture() {} }

test('dragging the slim pill moves the window without expanding it', async () => {
  const harness = await mountPill()
  let pill = pillNode(harness)
  pill.props.onPointerDown({ button: 0, clientX: 1000, clientY: 50, pointerId: 7, currentTarget: capture })
  pill = pillNode(harness)
  pill.props.onPointerMove({ clientX: 1040, clientY: 72 })
  pill = pillNode(harness)
  pill.props.onPointerUp({ clientX: 1040, clientY: 72 })
  pill = pillNode(harness)

  // What the browser still delivers once the drag ends.
  const event = { prevented: 0, preventDefault() { this.prevented += 1 }, stopPropagation() {} }
  pill.props.onClick(event)

  const stored = JSON.parse(harness.storage.get(PREFS_KEY))
  assert.equal(stored.collapsed, true, '拖完还得是收起的，不能自己弹出窗口')
  assert.equal(stored.x, 940, '窗口要真的跟着指针走')
  assert.equal(stored.y, 62)
  assert.equal(event.prevented, 1, '拖着结束的那一次 click 要被吃掉')
  assert.ok(pillOf(harness), '浮窗还是药丸形态')
})

test('a press that never crosses the slop is still a click, so the window opens', async () => {
  const harness = await mountPill()
  let pill = pillNode(harness)
  pill.props.onPointerDown({ button: 0, clientX: 1000, clientY: 50, pointerId: 8, currentTarget: capture })
  pill = pillNode(harness)
  // 3px of wobble: every real click has some, and it must not count as a drag.
  pill.props.onPointerMove({ clientX: 1002, clientY: 51 })
  pill = pillNode(harness)
  pill.props.onPointerUp({})
  pill = pillNode(harness)
  pill.props.onClick({ preventDefault() {}, stopPropagation() {} })

  const stored = JSON.parse(harness.storage.get(PREFS_KEY))
  assert.equal(stored.collapsed, false, '没拖动就是单击，窗口要展开')
  assert.equal(stored.x, 800, '一点点抖动不能把窗口挪走')
  assert.equal(stored.y, 40)
  assert.equal(pillOf(harness), null, '展开后不再是药丸')
  assert.ok(hasClass(look(harness), 'ddz-mini'), '浮窗出来了')
})

test('a host in bidding shows the room code, the LAN address, and the bid buttons', async () => {
  const { room } = seatedRoom()
  const harness = await mountMini(hosted(snapshotFor(room, 0)))
  const nodes = look(harness)
  const text = textOf(nodes)

  assert.ok(text.includes('AB12CD'), '房间码要显示出来，别人才能手输')
  assert.ok(text.includes('192.168.1.50:8791'), '局域网地址要显示出来')
  assert.ok(text.includes('房主'), '自己知道自己是房主')
  assert.ok(text.includes('甲') && text.includes('乙') && text.includes('丙'), '三个座位都在')
  assert.ok(text.includes('不叫'), '有不叫')
  assert.ok(text.includes('1 分') && text.includes('3 分'), '有 1/2/3 分')
  assert.ok(text.includes('轮到你叫分'), '状态行说清轮到谁')

  // Every bid is available on the opening turn, and 3 分 would make you landlord.
  const three = findButton(nodes, '3 分')
  assert.ok(three, '找到 3 分按钮')
  assert.equal(Boolean(three.props.disabled), false)
  assert.equal(typeof three.props.onClick, 'function', '按钮真的能点')
})

test('the authority\'s own words reach the window', async () => {
  const { room } = seatedRoom()
  const harness = await mountMini(statePayload('idle', snapshotFor(room, 0), {
    lastError: '入座失败：房间码不对',
  }))
  const text = textOf(look(harness))
  assert.ok(text.includes('房间码不对'), '错误原因要照原话显示，不能只写“出错了”')
})

test('your own turn enables 出牌 only once a legal selection exists', async () => {
  const { room } = seatedRoom()
  room.game = placeBid(room.game, 0, 3).state
  const snapshot = snapshotFor(room, 0)
  assert.equal(snapshot.phase, PHASES.PLAYING)
  assert.equal(snapshot.canAct, true, '地主先出')

  const harness = await mountMini(hosted(snapshot))
  let nodes = look(harness)

  const play = findButton(nodes, '出牌')
  assert.ok(play, '有出牌按钮')
  assert.equal(play.props.disabled, true, '没选牌时出牌是灰的')

  const pass = findButton(nodes, '不出')
  assert.ok(pass, '有不出按钮')
  assert.equal(pass.props.disabled, true, '先手不能不出')

  const handSize = cardsIn(nodes).length
  const cards = clickableCards(nodes)
  assert.ok(cards.length >= 2, `手牌可点（找到 ${cards.length} 张）`)
  cards[0].props.onClick()

  nodes = look(harness)
  assert.equal(findButton(nodes, '出牌').props.disabled, false, '选了单张就能出')
  assert.ok(textOf(nodes).includes('单张 · 1 张'), '告诉你选的是什么牌型')

  // Clicking the same card again deselects it and the button goes grey.
  assert.equal(cardsIn(nodes).length, handSize, '手牌还是那些')
  clickableCards(nodes)[0].props.onClick()
  nodes = look(harness)
  assert.equal(findButton(nodes, '出牌').props.disabled, true, '取消选择后又不能出')
})

test('a hand you are only watching offers no bid and no play', async () => {
  const { room } = seatedRoom()
  room.game = placeBid(room.game, 0, 3).state
  const snapshot = snapshotFor(room, 1)
  assert.equal(snapshot.canAct, false)

  const harness = await mountMini(hosted(snapshot))
  const nodes = look(harness)

  assert.equal(findButton(nodes, '出牌').props.disabled, true, '不是你的回合，按钮是灰的')
  assert.equal(findButton(nodes, '不出').props.disabled, true)
  assert.ok(textOf(nodes).includes('等待 甲 出牌'), '说清在等谁')
  assert.equal(clickableCards(nodes).length, 0, '不能点牌')
})

test('a finished hand offers the next hand, names the winner, and reveals every hand', async () => {
  const { room, tokens } = seatedRoom(7)
  const steps = playOutHand(room, tokens)
  const finished = snapshotFor(room, 0)
  assert.equal(finished.phase, PHASES.FINISHED, `一盘要能打完（走了 ${steps} 步）`)
  assert.equal(finished.secretsRevealed, true)

  const harness = await mountMini(hosted(finished))
  const nodes = look(harness)
  const text = textOf(nodes)

  assert.ok(text.includes('下一局'), '结束后能给下一局')
  assert.ok(/获胜/.test(text), '说清谁赢了')
  assert.ok(text.includes('先出完'), '说清是谁先走完的')
  assert.equal(findButton(nodes, '不叫'), null, '结束后不再显示叫分按钮')

  // The authority reveals every hand at the end; the review screen has to
  // actually show them, which is the only reason to reveal them at all.
  assert.ok(text.includes('三家手牌'), '有复盘区')
  const foreign = finished.seats.filter((info) => info.seat !== finished.you.seat)
  assert.equal(foreign.length, 2)

  // A card paints its rank and its suit as two spans, so the label only exists
  // as the card's title. Collect titles, not text.
  const shown = new Set(cardsIn(nodes).map((card) => card.props.title))
  const onScreen = new Set()
  for (const info of finished.seats) {
    assert.ok(Array.isArray(info.hand), '结束后别人的手牌不再是 null')
    for (const id of info.hand) onScreen.add(id)
  }
  for (const id of finished.lastPlay.cards) onScreen.add(id)
  for (const id of onScreen) assert.ok(shown.has(cardLabel(id)), `${cardLabel(id)} 应该在画面上`)
  // The bottom cards are shown as compact text next to the felt's title rather
  // than as three more card faces — they are context, not something to beat.
  for (const id of finished.bottom) {
    assert.ok(text.includes(cardLabel(id)), `底牌 ${cardLabel(id)} 也要看得见`)
  }
})

test('the conversation tab renders the same table without the window chrome', async () => {
  const { room } = seatedRoom()
  const harness = createHarness(hosted(snapshotFor(room, 0)))
  harness.apply()
  harness.mount('conversation.view')
  await harness.settle()

  const nodes = look(harness)
  const text = textOf(nodes)
  assert.ok(text.includes('斗地主'))
  assert.ok(text.includes('AB12CD'))
  assert.ok(text.includes('出牌历史'), '标签页把记录一并显示')
  assert.ok(text.includes('房间事件'))
  assert.equal(hasClass(nodes, 'ddz-mini'), false, '标签页不是浮窗')
  assert.ok(hasClass(nodes, 'ddz-view'))
})

test('the poller echoes the local token and stops when disposed', async () => {
  const harness = await mountMini(statePayload('idle', null))
  assert.ok(harness.intervals.size >= 1, '挂了一个轮询定时器')

  // The first read is unauthenticated on purpose: that is where the token comes
  // from. Every later request must echo it.
  const first = harness.calls[0]
  assert.equal(Reflect.ownKeys(first.init.headers).length, 0, '首次 GET 不带令牌，令牌就是它下发的')

  const before = harness.calls.length
  harness.tick()
  await harness.settle()
  assert.ok(harness.calls.length > before, 'tick 会刷新')
  const latest = harness.calls[harness.calls.length - 1]
  assert.equal(latest.url, '/dsh-doudizhu/state')
  assert.equal(latest.init.headers[TOKEN_HEADER], LOCAL_TOKEN, '后续请求必须回带本地令牌')

  // The poller is the first effect the plugin registers.
  harness.effects[0].dispose()
  assert.equal(harness.intervals.size, 0, 'dispose 要把轮询停掉')
})

test('a host alone in the room can fill the table with computers', async () => {
  // This is the whole point of the feature: one person, one click, a real hand.
  // The click is asserted on the wire, because a button that posts the wrong
  // field names is exactly how 「加入」 was broken for three releases.
  const room = createRoom({ code: 'SOLO01', rng: seedRandom(31) })
  const host = joinSeat(room, { name: '我' })
  const snapshot = snapshotFor(room, host.seat)
  assert.equal(snapshot.isHost, true)
  assert.equal(snapshot.botsSeated, 0)
  assert.equal(snapshot.canSetBotCount, true, '还没开局，数量可以调')

  const harness = await mountMini(hosted(snapshot))
  let nodes = look(harness)
  assert.ok(textOf(nodes).includes('电脑'), '房主看得到电脑那一栏')
  assert.equal(findButton(nodes, '撤下'), null, '一个电脑都没上，就没有撤下一说')

  const fill = findButton(nodes, '用电脑补齐')
  assert.ok(fill, '找到补齐按钮')
  assert.equal(fill.props.disabled, false, '一个人在场时补齐按钮能点')

  // 补齐 asks for the number that fills the table, at the room's current strength.
  // That request is what starts the deal, so the field names matter.
  fill.props.onClick()
  await harness.settle()
  assert.deepEqual(sentActions(harness).at(-1), { type: 'bots', level: 'medium', count: 2 })

  // Picking a strength is its own click, and it must not change how many are seated
  // — the window echoes the count the room already has.
  nodes = look(harness)
  const hell = findButton(nodes, '地狱')
  assert.ok(hell, '四个强度都在')
  assert.equal(findButton(nodes, '撤下'), null, '一个电脑都没上，就没有撤下一说')
  hell.props.onClick()
  await harness.settle()
  assert.deepEqual(sentActions(harness).at(-1), { type: 'bots', level: 'hell', count: 0 })
})

test('only the host sees the computer controls, and the count is frozen mid-hand', async () => {
  const room = createRoom({ code: 'GUEST1', rng: seedRandom(32) })
  joinSeat(room, { name: '甲' })
  const guest = joinSeat(room, { name: '乙' })
  const asGuest = await mountMini(hosted(snapshotFor(room, guest.seat)))
  assert.equal(findButton(look(asGuest), '用电脑补齐'), null, '客人不该看到房主的电脑按钮')
  assert.equal(findButton(look(asGuest), '简单'), null, '连强度也不给客人看')

  // Mid-hand: the strength stays switchable, the number does not.
  const mid = createRoom({ code: 'MIDHAN', rng: seedRandom(33) })
  const host = joinSeat(mid, { name: '我' })
  assert.ok(applyAction(mid, host.seat, { type: 'bots', level: 'medium', count: 2 }).started)
  const snapshot = snapshotFor(mid, host.seat)
  assert.equal(snapshot.phase, PHASES.BIDDING)
  assert.equal(snapshot.botsSeated, 2)
  assert.equal(snapshot.canSetBotLevel, true, '局中也能换强度')
  assert.equal(snapshot.canSetBotCount, false, '局中不能改数量')
  assert.ok(snapshot.seats.some((info) => info.name === '电脑·中等'), '座位上是电脑的名字')

  const harness = await mountMini(hosted(snapshot))
  let nodes = look(harness)
  assert.ok(textOf(nodes).includes('电脑·中等'), '牌桌上看得出哪两个是电脑')
  // 开局后房间设置先收起来：牌桌比邀请码更常看，但一下就能展开。
  assert.equal(findButton(nodes, '地狱'), null, '局中房间设置默认收起')
  const strip = nodes.find((node) => node.kind === 'element' && node.className.split(' ').includes('ddz-room-head'))
  assert.ok(strip, '房间条要能展开')
  strip.props.onClick()
  nodes = look(harness)

  assert.ok(textOf(nodes).includes('在场 2 个'))
  assert.equal(findButton(nodes, '撤下').props.disabled, true, '局中撤不下电脑')
  assert.equal(findButton(nodes, '补齐').props.disabled, true, '已经坐满了，也不用再补')

  const hell = findButton(nodes, '地狱')
  assert.equal(hell.props.disabled, false, '局中换强度仍可点')
  hell.props.onClick()
  await harness.settle()
  assert.deepEqual(sentActions(harness).at(-1), { type: 'bots', level: 'hell', count: 2 })
})

test('提示 and 帮我出 turn the legal-move engine into two buttons', async () => {
  const { room } = seatedRoom()
  room.game = placeBid(room.game, 0, 3).state
  const harness = await mountMini(hosted(snapshotFor(room, 0)))
  let nodes = look(harness)

  const hint = findButton(nodes, '提示')
  assert.ok(hint, '轮到自己出牌时要有提示按钮')
  assert.equal(hint.props.disabled, false, '有牌可出时提示可用')
  const help = findButton(nodes, '帮我出')
  assert.ok(help, '还要有帮我出')
  assert.equal(help.props.disabled, false, '有建议时帮我出可用')

  // 提示 selects a suggestion. Which cards it picks is the engine's business;
  // what matters here is that a legal selection lands in the hand.
  assert.equal(findButton(nodes, '出牌').props.disabled, true, '没选牌时出牌还是灰的')
  hint.props.onClick()
  nodes = look(harness)
  const selected = cardsIn(nodes).filter((card) => card.props['aria-pressed'] === 'true')
  assert.ok(selected.length >= 1, `提示要选中一手牌，实际选了 ${selected.length} 张`)
  assert.equal(findButton(nodes, '出牌').props.disabled, false, '选中后就能出')

  // 帮我出 posts the suggested play straight to the authority.
  const help2 = findButton(nodes, '帮我出')
  help2.props.onClick()
  await harness.settle(2)
  const sent = sentActions(harness).at(-1)
  assert.equal(sent.type, 'play', '帮我出要真的发出 play')
  assert.ok(Array.isArray(sent.cards) && sent.cards.length >= 1, '带上了具体的牌')
  for (const id of sent.cards) {
    assert.ok(snapshotFor(room, 0).you.hand.includes(id), `${id} 必须在自己手上`)
  }
})

test('改名 opens a box and posts the rename the room validates', async () => {
  const { room } = seatedRoom()
  const harness = await mountMini(hosted(snapshotFor(room, 0)))
  let nodes = look(harness)

  const open = findButton(nodes, '改名')
  assert.ok(open, '座位上有改名入口')
  open.props.onClick()
  nodes = look(harness)

  const input = nodes.find((node) => node.kind === 'element' && node.type === 'input'
    && String(node.props.placeholder || '').includes('另外两家'))
  assert.ok(input, '改名输入框出现了')

  // Leading/trailing spaces are dropped by the shared normaliser, not by the room.
  input.props.onChange({ target: { value: '  老王  ' } })
  nodes = look(harness)
  const save = findButton(nodes, '保存')
  assert.ok(save, '有保存')
  save.props.onClick()
  await harness.settle(2)

  assert.deepEqual(sentActions(harness).at(-1), { type: 'rename', name: '老王' })
})

test('出牌历史 is a folded strip on the table, and 不出 is part of the record', async () => {
  const { room, tokens } = seatedRoom()
  assert.ok(act(room, tokens[0], { type: 'bid', score: 3 }).ok)
  const hand = snapshotFor(room, 0).you.hand
  assert.ok(act(room, tokens[0], { type: 'play', cards: [hand[0]] }).ok)
  assert.ok(act(room, tokens[1], { type: 'pass' }).ok)
  assert.ok(act(room, tokens[2], { type: 'pass' }).ok)

  const harness = await mountMini(hosted(snapshotFor(room, 0)))
  let nodes = look(harness)

  // Folded by default, but the summary still says how busy the hand has been.
  assert.ok(textOf(nodes).includes('出牌历史'))
  assert.ok(textOf(nodes).includes('本局 1 轮 · 3 手'), '收起时也要看得到打了多少手')
  assert.equal(hasClass(nodes, 'ddz-history-body'), false, '默认不展开')

  const head = nodes.find((node) => node.kind === 'element' && node.className.split(' ').includes('ddz-history-head'))
  assert.ok(head, '折叠条要点得开')
  head.props.onClick()
  nodes = look(harness)

  assert.ok(hasClass(nodes, 'ddz-history-body'), '展开后出现明细')
  assert.ok(textOf(nodes).includes('不出'), '两家不出要留在历史里，不能只看见最后出的那手')
  assert.ok(textOf(nodes).includes('乙'), '历史里要有出牌的人')
})

test('a snapshot that has not arrived yet still renders', async () => {
  // The window must survive the very first poll: no data, no crash.
  const harness = createHarness({ ok: true, protocol: 1, role: 'idle', playerName: '我', defaults: {}, authority: null, guest: null, lastError: null, snapshot: null })
  harness.apply()
  harness.mount('shell.overlay')
  const nodes = look(harness)
  assert.ok(nodes.length > 0, '首屏要画得出来')
  assert.ok(textOf(nodes).includes('斗地主'))

  // A transport failure must be reported, not thrown away.
  const broken = createHarness(null)
  broken.apply()
  broken.mount('shell.overlay')
  await broken.settle()
  const brokenNodes = look(broken)
  assert.equal(brokenNodes.length > 0, true, '连不上也要画得出界面')
})
