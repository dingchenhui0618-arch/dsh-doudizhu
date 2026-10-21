/**
 * The client half: the floating window and the conversation tab.
 *
 * Loaded by the host's module loader as a CommonJS module. It talks only to the
 * plugin's own loopback route (`/dsh-doudizhu/*`) — never to the authority port
 * directly — so this one file is identical on the host machine and on both
 * guests, and the browser never needs cross-origin access to a peer.
 *
 * Pure presentation logic lives in `ui-logic.js` so it can be unit tested.
 */

const React = require('react')
const h = React.createElement

const CSS = require('./client-css.cjs')
const UI = require('./ui-logic.js')

const API = '/dsh-doudizhu'
const TOKEN_HEADER = 'x-dsh-doudizhu-token'
const POLL_MS = 900
const POLL_MS_QUIET = 2600
/** A computer answers in a few hundred milliseconds; ask again in the same league. */
const POLL_MS_BOT = 260
const PILL_W = 148
// Pointer slop that separates a click from a drag, in CSS pixels. A press that
// never exceeds it keeps its click; anything beyond is a drag and loses it.
const DRAG_SLOP = 4

/* ------------------------------------------------------------------ store -- */

let localToken = ''
let store = { data: null, error: '', actionError: '', busy: false, at: 0 }
let selection = []
let lastPhase
let period = POLL_MS
let timer = null
let inflight = false
const listeners = new Set()

function emit() {
  const view = store
  for (const fn of Array.from(listeners)) fn(view)
}

function messageOf(error) {
  return String((error && error.message) || error || '未知错误')
}

function headers(extra) {
  return Object.assign({}, extra || {}, localToken ? { [TOKEN_HEADER]: localToken } : {})
}

/** Selection belongs to the hand on screen: drop anything no longer playable. */
function pruneSelection(data) {
  const snapshot = data && data.snapshot
  const phase = snapshot ? snapshot.phase : null
  if (phase !== lastPhase) {
    selection = []
    lastPhase = phase
  }
  if (!snapshot || !snapshot.you || !Array.isArray(snapshot.you.hand)) {
    selection = []
    return
  }
  const hand = new Set(snapshot.you.hand)
  selection = selection.filter(function (id) { return hand.has(id) })
}

function load() {
  if (inflight) return Promise.resolve(null)
  inflight = true
  return fetch(API + '/state', { headers: headers() })
    .then(function (res) {
      const token = res.headers.get(TOKEN_HEADER)
      if (token) localToken = token
      return res.json()
    })
    .then(function (data) {
      store = Object.assign({}, store, { data: data, error: '', at: Date.now() })
      pruneSelection(data)
      emit()
      return data
    })
    .catch(function (error) {
      store = Object.assign({}, store, { error: messageOf(error), at: Date.now() })
      emit()
      return null
    })
    .then(function (value) {
      inflight = false
      return value
    })
}

function tick() {
  load()
}

function subscribe(fn) {
  listeners.add(fn)
  if (timer === null) {
    load()
    timer = setInterval(tick, period)
  }
  fn(store)
  return function () {
    listeners.delete(fn)
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }
}

function setPeriod(ms) {
  if (ms === period) return
  period = ms
  if (timer !== null) {
    clearInterval(timer)
    timer = setInterval(tick, period)
  }
}

function useStore() {
  const [view, setView] = React.useState(store)
  React.useEffect(function () {
    return subscribe(setView)
  }, [])
  return view
}

/* --------------------------------------------------------------- requests -- */

function post(path, body) {
  if (store.busy) return Promise.resolve(null)
  store = Object.assign({}, store, { busy: true, actionError: '' })
  emit()
  return fetch(API + '/' + path, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body || {}),
  })
    .then(function (res) { return res.json() })
    .then(function (result) {
      const ok = Boolean(result) && result.ok !== false
      store = Object.assign({}, store, {
        busy: false,
        actionError: ok ? '' : String((result && result.error) || '请求被拒绝'),
      })
      emit()
      return load()
    })
    .catch(function (error) {
      store = Object.assign({}, store, { busy: false, actionError: messageOf(error) })
      emit()
      return null
    })
}

function act(action) {
  if (store.busy) return Promise.resolve(null)
  store = Object.assign({}, store, { busy: true, actionError: '' })
  emit()
  return fetch(API + '/act', {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ action: action }),
  })
    .then(function (res) { return res.json() })
    .then(function (result) {
      const ok = Boolean(result) && result.ok !== false
      store = Object.assign({}, store, {
        busy: false,
        actionError: ok ? '' : String((result && result.error) || '这一手没被接受'),
      })
      if (ok) selection = []
      emit()
      return load()
    })
    .catch(function (error) {
      store = Object.assign({}, store, { busy: false, actionError: messageOf(error) })
      emit()
      return null
    })
}

/* ----------------------------------------------------------------- prefs -- */

function readPrefs() {
  try {
    return UI.prefsFrom(JSON.parse(window.localStorage.getItem(UI.PREFS_KEY) || 'null'))
  } catch (error) {
    return UI.prefsFrom(null)
  }
}

function usePrefs() {
  const [prefs, setPrefsState] = React.useState(readPrefs)
  const setPrefs = React.useCallback(function (patch) {
    setPrefsState(function (previous) {
      const next = typeof patch === 'function' ? patch(previous) : Object.assign({}, previous, patch)
      try {
        window.localStorage.setItem(UI.PREFS_KEY, JSON.stringify(next))
      } catch (error) {
        /* a full or blocked localStorage must not break the window */
      }
      return next
    })
  }, [])
  return [prefs, setPrefs]
}

function viewport() {
  return { width: window.innerWidth || 1200, height: window.innerHeight || 800 }
}

function copy(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text)
  } catch (error) {
    /* clipboard needs a permission we may not have; the text is on screen anyway */
  }
}

/* ------------------------------------------------------------ components -- */

function Card(props) {
  const id = props.id
  const tone = UI.cardTone(id)
  const text = UI.cardText(id)
  const joker = tone === 'joker'
  const className =
    'ddz-card ' + tone +
    (props.selected ? ' sel' : '') +
    (props.mini ? ' mini' : '') +
    (id === 'BJ' ? ' big' : '')
  const children = [
    h('span', { key: 'r', className: 'ddz-rank' }, joker ? text : text.replace(/^[^\dAKQJ10]+/, '') || text),
    joker ? null : h('span', { key: 's', className: 'ddz-suit' }, UI.suitSymbol(id)),
  ]
  if (!props.onToggle) {
    return h('div', { className: className, title: text }, children)
  }
  return h('button', {
    type: 'button',
    className: className,
    title: text,
    'aria-pressed': props.selected ? 'true' : 'false',
    onClick: function () { props.onToggle(id) },
  }, children)
}

function Hand(props) {
  const ids = UI.handForDisplay(props.ids || [])
  if (!ids.length) return h('div', { className: 'ddz-empty' }, props.empty || '没有手牌')
  return h('div', { className: 'ddz-hand' }, ids.map(function (id) {
    return h(Card, {
      key: id,
      id: id,
      mini: props.mini,
      selected: (props.selection || []).indexOf(id) >= 0,
      onToggle: props.onToggle,
    })
  }))
}

/** First character of a name, for the seat avatar. */
function initial(name) {
  const chars = [...String(name ?? '').trim()]
  return chars.length ? chars[0] : '?'
}

/**
 * One seat, as a compact card: who it is, what they are, how many cards they
 * hold, and whether the table is waiting on them.
 *
 * Three of these sit side by side in play order, because the question at a glance
 * is "how is each of us doing", not "read three paragraphs". The count is also a
 * bar: "17 张" is a fact, a bar running out is the feeling that someone is nearly
 * home — and that feeling is what changes how you play.
 */
function SeatCard(props) {
  const info = (props.snapshot.seats || [])[props.seat]
  if (!info) return null
  const you = props.seat === props.youSeat
  const active = UI.activeSeat(props.snapshot) === props.seat
  const role = UI.roleLabel(info.role)
  const count = info.hand ? info.hand.length : info.count
  // In the lobby nobody holds cards yet, so "0 张" would read as "he is out".
  const dealt = props.snapshot.phase !== 'lobby'
  // A landlord starts at 20 and a farmer at 17; the bar is of the fuller hand so a
  // farmer with 17 is not drawn at 85% on their first turn.
  const ratio = Math.max(0, Math.min(1, count / 20))
  const order = you ? '我' : (UI.relativeSeat(props.seat, props.youSeat) === 'right' ? '下' : '上')
  const className = 'ddz-seat-card' + (active ? ' active' : '') + (you ? ' me' : '') + (info.bot ? ' bot' : '')
  const title = [
    you ? '你' : info.name,
    order === '下' ? '你的下家' : order === '上' ? '你的上家' : '',
    info.bot ? (UI.BOT_BLURBS[info.bot] || '电脑') : '',
    info.occupied && !info.connected ? '掉线' : '',
  ].filter(Boolean).join(' · ')
  return h('div', { className: className, title: title },
    h('div', { className: 'ddz-seat-top' },
      h('span', { className: 'ddz-ava' }, info.bot ? '🤖' : initial(info.name)),
      h('span', { className: 'ddz-seat-name' }, info.name),
      h('span', { className: 'ddz-seat-order' }, order),
    ),
    h('div', { className: 'ddz-seat-line' },
      role ? h('span', { className: 'ddz-badge ' + info.role }, role) : null,
      !info.occupied ? h('span', { className: 'ddz-badge' }, '空位') : null,
      !info.occupied
        ? null
        : dealt
          ? h('span', { className: 'ddz-seat-count' }, h('b', {}, String(count)), ' 张')
          : h('span', { className: 'ddz-seat-count ddz-seat-idle' }, '未发牌'),
      info.bid ? h('span', { className: 'ddz-seat-note' }, '叫 ' + info.bid) : null,
    ),
    dealt
      ? h('span', { className: 'ddz-meter' },
          h('span', {
            className: 'ddz-meter-fill' + (count <= 5 ? ' low' : ''),
            style: { width: Math.round(ratio * 100) + '%' },
          }))
      : null,
  )
}

/**
 * The three seats side by side in play order starting from you: 我 → 下家 → 上家.
 * Clockwise is the rule the table actually follows; laying them out by raw seat
 * index made everyone translate "seat 2" into "my left" on the fly.
 */
function SeatList(props) {
  const s = props.snapshot
  const you = s.you ? s.you.seat : 0
  const order = [you, (you + 1) % 3, (you + 2) % 3]
  return h('div', { className: 'ddz-seats' }, order.map(function (seat) {
    return h(SeatCard, { key: seat, seat: seat, snapshot: s, youSeat: you })
  }))
}

/**
 * The middle of the table: the hand that is currently winning the trick, who
 * played it, the shape it counts as, and the bottom cards once the landlord has
 * picked them up. This is the one block that answers "what am I beating?".
 */
function Felt(props) {
  const s = props.snapshot
  const last = s.lastPlay
  const seats = s.seats || []
  const youSeat = s.you ? s.you.seat : -1
  const who = last ? (seats[last.seat]?.name ?? '') : ''
  // In the lobby there is no hand to beat, so the block is one quiet line instead
  // of a labelled empty table.
  if (s.phase === 'lobby') {
    return h('div', { className: 'ddz-felt empty' },
      h('span', { className: 'ddz-empty' }, '三家坐满就开局'))
  }
  const label = last
    ? last.seat === youSeat ? '你出的' : who + ' 出的'
    : s.phase === 'finished' ? '本局结束' : '台面空着'
  return h('div', { className: 'ddz-felt' },
    h('div', { className: 'ddz-felt-head' },
      h('span', { className: 'ddz-felt-label' }, label),
      last && last.move ? h('span', { className: 'ddz-badge' }, last.move.label) : null,
      s.passes ? h('span', { className: 'ddz-felt-pass' }, s.passes + ' 家不出') : null,
      h('span', { className: 'ddz-grow' }),
      // The bottom cards as text: they are context, not something to beat, and
      // three more card faces would make the felt the tallest block on screen.
      s.bottomRevealed && Array.isArray(s.bottom) && s.bottom.length
        ? h('span', { className: 'ddz-felt-bottom', title: '地主捡到的三张底牌' }, '底牌 ' + s.bottom.map(UI.cardText).join(' '))
        : null,
    ),
    h('div', { className: 'ddz-felt-cards' },
      last
        ? (last.cards || []).map(function (id) { return h(Card, { key: id, id: id, mini: true }) })
        : h('span', { className: 'ddz-empty' }, s.phase === 'lobby' ? '等三家坐满' : '等这一手'),
    ),
  )
}

function ActionRow(props) {
  const s = props.snapshot
  const c = props.controls
  const busy = props.busy
  const error = UI.playError(s, props.selection)
  const rows = []

  if (c.showBid) {
    rows.push(h('div', { key: 'bid', className: 'ddz-row' }, c.bidOptions.map(function (option) {
      return h('button', {
        key: option.score,
        type: 'button',
        className: 'ddz-btn' + (option.score === 0 ? '' : ' primary'),
        disabled: !option.enabled || busy,
        onClick: function () { act({ type: 'bid', score: option.score }) },
      }, option.label)
    })))
  }
  if (c.showStart) {
    rows.push(h('button', {
      key: 'start',
      type: 'button',
      className: 'ddz-btn primary',
      disabled: busy,
      onClick: function () { act({ type: 'start' }) },
    }, '开始这一局'))
  }
  if (c.showPlay) {
    const hints = props.hints || []
    const at = props.hintAt || 0
    const hint = hints.length ? hints[at % hints.length] : null
    // One row: 出牌 / 不出 / 提示 / 帮我出. Four short buttons fit the window, and
    // keeping them on one line is what leaves the hand visible without scrolling.
    rows.push(h('div', { key: 'play', className: 'ddz-row' },
      h('button', {
        type: 'button',
        className: 'ddz-btn primary',
        disabled: !c.playEnabled || busy || Boolean(error),
        title: error,
        onClick: function () { act({ type: 'play', cards: props.selection.slice() }) },
      }, '出牌'),
      h('button', {
        type: 'button',
        className: 'ddz-btn',
        disabled: !c.passEnabled || busy,
        title: '不出',
        onClick: function () { act({ type: 'pass' }) },
      }, '不出'),
      h('button', {
        type: 'button',
        className: 'ddz-btn sm hint',
        disabled: busy || !hints.length,
        title: hints.length
          ? '从最省牌力的一手开始选中，再点换下一个建议'
          : '这手牌压不过台面，只能不出',
        onClick: function () { if (props.onHint) props.onHint(hints) },
      }, hint && hints.length > 1 ? '提示 ' + ((at % hints.length) + 1) + '/' + hints.length : '提示'),
      h('button', {
        type: 'button',
        className: 'ddz-btn sm hint-play',
        disabled: busy || !hint,
        title: hint ? '直接打这一手：' + hint.cards.map(UI.cardText).join(' ') : '没有可出的牌',
        onClick: function () { if (props.onHintPlay) props.onHintPlay(hint) },
      }, '帮我出'),
    ))
    // What you picked beats what we would suggest: once a selection exists the
    // player is asking "is this legal, and what is it?", not "what should I play?".
    // An empty selection is a prompt rather than a mistake, so it never goes red.
    const picked = Array.isArray(props.selection) ? props.selection.length : 0
    const warn = picked ? error : ''
    const advice = warn
      ? ''
      : picked
        ? UI.selectionSummary(props.selection)
        : hint
          ? '建议 ' + hint.label + ' · ' + hint.cards.map(UI.cardText).join(' ') + (hint.note ? '（' + hint.note + '）' : '')
          : c.playEnabled
            ? '没有能压过台面的牌，只能不出'
            : ''
    if (warn) rows.push(h('div', { key: 'warn', className: 'ddz-advice ddz-warn' }, warn))
    if (advice) rows.push(h('div', { key: 'advice', className: 'ddz-advice' }, advice))
  }
  if (c.showNext) {
    rows.push(h('button', {
      key: 'next',
      type: 'button',
      className: 'ddz-btn primary',
      disabled: busy,
      onClick: function () { act({ type: 'next' }) },
    }, '下一局'))
  }
  return h('div', { className: 'ddz-col' }, rows)
}

/**
 * The invite line, cut down to the two things a friend needs: a code and an
 * address. Which virtual adapters were filtered out is a tooltip, not a
 * paragraph — it matters once, at setup, not on every glance at the table.
 */
function ShareBlock(props) {
  const authority = props.state.authority
  if (!authority) return null
  const text = UI.shareText(authority)
  const chips = UI.lanChips(authority)
  const hidden = UI.hiddenLanCandidates(authority)
  const wide = !props.compact
  const where = chips.map(function (chip) { return String(chip.url).replace(/^https?:\/\//, '') })
  const loopback = String(authority.loopbackUrl || '').replace(/^https?:\/\//, '')
  const hiddenNote = hidden.length
    ? '已过滤 ' + hidden.length + ' 个虚拟网卡地址（' + hidden.map(function (entry) { return entry.iface }).join('、') +
      '）—— 那是 WSL / 虚拟机 / VPN 的网卡，别的电脑连不上。'
    : ''
  return h('div', { className: 'ddz-share-block' },
    h('div', { className: 'ddz-row' },
      h('span', { className: 'ddz-label' }, '房间码'),
      h('span', { className: 'ddz-code' }, authority.code),
      h('button', {
        type: 'button',
        className: 'ddz-btn sm ghost',
        title: '复制「' + text + '」',
        onClick: function () { copy(text) },
      }, '复制邀请'),
      h('span', { className: 'ddz-grow' }),
      hidden.length ? h('span', { className: 'ddz-note', title: hiddenNote }, '已过滤 ' + hidden.length + ' 个虚拟网卡') : null,
    ),
    h('div', { className: 'ddz-row ddz-where' },
      h('span', { className: 'ddz-label' }, '地址'),
      where.length
        ? h('code', {
            className: 'ddz-url',
            title: '点击复制这个地址',
            onClick: function () { copy(where[0]) },
          }, where[0])
        : h('span', { className: 'ddz-note' }, '还没有局域网地址'),
      where.length > 1 ? h('span', { className: 'ddz-note', title: where.slice(1).join('、') }, '+' + (where.length - 1)) : null,
      // Handing 127.0.0.1 to someone else points at *their* machine, so the
      // loopback address is only ever shown in the roomy tab, and labelled.
      wide && loopback
        ? h('code', {
            className: 'ddz-url',
            title: '本机回环地址，只有这台电脑能用',
            onClick: function () { copy(loopback) },
          }, loopback + '（本机）')
        : null,
    ),
    wide ? h('div', { className: 'ddz-note' }, '另外两家在自己浮窗里填这个地址和房间码；地址点一下就复制。') : null,
  )
}

/**
 * The computer controls. Host only: the computers belong to the room rather than
 * to the seat, and a guest quietly adding one would be a surprise to everybody
 * else at the table.
 *
 * Strength is one click at any time; the *number* of computers only changes
 * between hands, so those buttons disable themselves mid-hand instead of letting
 * the click come back as a red error.
 */
function BotPanel(props) {
  const s = props.snapshot
  if (!s || !s.isHost) return null
  const seated = Number(s.botsSeated || 0)
  const capacity = UI.botCapacity(s)
  const level = UI.isBotLevel(s.botLevel) ? s.botLevel : UI.DEFAULT_BOT_LEVEL
  const countLocked = Boolean(props.busy) || !s.canSetBotCount
  const wide = !props.compact

  function setCount(next) {
    act({ type: 'bots', level: level, count: next })
  }

  const chips = h('div', { className: 'ddz-chips ddz-grow' }, UI.BOT_LEVELS.map(function (value) {
    return h('button', {
      key: value,
      type: 'button',
      className: value === level ? 'on' : '',
      disabled: Boolean(props.busy) || !s.canSetBotLevel,
      title: UI.BOT_BLURBS[value],
      // Sending the count that is already there changes only the strength.
      onClick: function () { act({ type: 'bots', level: value, count: seated }) },
    }, UI.BOT_LABELS[value])
  }))

  return h('div', { className: 'ddz-col' },
    h('div', { className: 'ddz-row' },
      h('span', { className: 'ddz-label' }, '电脑'),
      chips,
    ),
    h('div', { className: 'ddz-row' },
      h('button', {
        type: 'button',
        className: 'ddz-btn sm primary',
        disabled: countLocked || seated >= capacity || capacity === 0,
        title: capacity === 0 ? '三个人都是真人了' : '把空位交给电脑，坐满就立刻开局',
        onClick: function () { setCount(capacity) },
      }, capacity === 0 ? '已满员' : seated > 0 ? '补齐' : '用电脑补齐'),
      seated > 0
        ? h('button', {
            type: 'button',
            className: 'ddz-btn sm ghost',
            disabled: countLocked,
            title: s.canSetBotCount ? '把电脑撤下，空位留给朋友' : '牌局进行中，等这局结束',
            onClick: function () { setCount(0) },
          }, '撤下')
        : null,
      h('span', { className: 'ddz-grow' }),
      h('span', { className: 'ddz-note', title: UI.BOT_BLURBS[level] },
        seated > 0 ? '在场 ' + seated + ' 个' : '一个都没上'),
    ),
    wide ? h('div', { className: 'ddz-note' }, UI.BOT_BLURBS[level]) : null,
  )
}

/**
 * Room setup, folded into one strip: the invite line and the computers are
 * needed when a room is being filled, not while a hand is being played. In the
 * lobby it starts open; once cards are out it starts folded, one click away.
 */
function RoomStrip(props) {
  const s = props.snapshot
  const wide = !props.compact
  // Anything past the lobby means cards are (about to be) on the table.
  const inHand = Boolean(s) && s.phase !== 'lobby'
  const [override, setOverride] = React.useState(null)
  const open = override === null ? (wide || !inHand) : override
  const first = props.state.authority ? UI.lanChips(props.state.authority)[0] : null
  if (!props.state.authority && !(s && s.isHost)) return null
  return h('div', { className: 'ddz-room' + (open ? ' open' : '') },
    h('button', {
      type: 'button',
      className: 'ddz-room-head',
      'aria-expanded': open ? 'true' : 'false',
      onClick: function () { setOverride(!open) },
    },
    h('span', { className: 'ddz-chev' }, open ? '▾' : '▸'),
    h('span', { className: 'ddz-room-title' }, '房间'),
    props.state.authority ? h('span', { className: 'ddz-room-code' }, props.state.authority.code) : null,
    first ? h('span', { className: 'ddz-room-addr' }, String(first.url).replace(/^https?:\/\//, '')) : null,
    h('span', { className: 'ddz-grow' }),
    h('span', { className: 'ddz-note' }, s && s.isHost ? '你是房主' : '客机'),
    ),
    open
      ? h('div', { className: 'ddz-room-body' },
          h(ShareBlock, { state: props.state, compact: props.compact }),
          s && s.isHost ? h(BotPanel, { snapshot: s, busy: props.busy, compact: props.compact }) : null,
        )
      : null,
  )
}

function Lobby(props) {
  const state = props.state
  const [mode, setMode] = React.useState('host')
  const [name, setName] = React.useState(props.prefs.name || state.playerName || '')
  const [port, setPort] = React.useState(String((state.defaults && state.defaults.port) || 8791))
  // A friend on the same network joins the same room over and over. Remembering
  // the address and the code is the difference between "open it and go" and
  // typing a dotted IPv4 and a six-letter code off a chat message.
  const [address, setAddress] = React.useState(props.prefs.lastAddress || '')
  const [code, setCode] = React.useState(props.prefs.lastCode || '')
  const [note, setNote] = React.useState('')
  const [local, setLocal] = React.useState('')

  function remember(next) {
    props.setPrefs({ name: UI.normaliseNickname(next) })
  }

  function onHost() {
    props.setPrefs({ name: UI.normaliseNickname(name) })
    post('host', {
      port: Number(port) || 0,
      name: String(name || '').trim(),
      botLevel: props.prefs.botLevel,
    })
  }

  function onJoin() {
    const base = UI.normaliseAddress(address)
    if (!base) { setLocal('先填房主地址'); return }
    const roomCode = String(code).trim().toUpperCase()
    if (!/^[A-Za-z0-9]{4,8}$/.test(roomCode)) { setLocal('房间码是 6 位字母数字'); return }
    props.setPrefs({
      name: UI.normaliseNickname(name),
      lastAddress: String(address).trim().slice(0, 64),
      lastCode: roomCode,
    })
    setLocal('')
    post('join', { url: base, code: roomCode, name: String(name || '').trim() })
  }

  function onProbe() {
    const base = UI.normaliseAddress(address)
    if (!base) { setLocal('先填房主地址'); return }
    setLocal('')
    post('probe', { url: base }).then(function (result) {
      const data = result && result.data
      setNote(data && data.ok ? `连上了，房间 ${data.hello && data.hello.code ? data.hello.code : ''}` : '连不上，检查地址和防火墙')
    })
  }

  const tabs = h('div', { className: 'ddz-tabs' },
    h('button', { type: 'button', className: mode === 'host' ? 'on' : '', onClick: function () { setMode('host') } }, '我开房'),
    h('button', { type: 'button', className: mode === 'join' ? 'on' : '', onClick: function () { setMode('join') } }, '我加入'),
  )

  const nameRow = h('div', { className: 'ddz-col' },
    h('div', { className: 'ddz-row' },
      h('span', { className: 'ddz-label' }, '昵称'),
      h('input', {
        className: 'ddz-input ddz-grow',
        value: name,
        maxLength: UI.MAX_NICK,
        placeholder: '留空也行',
        onChange: function (event) { setName(UI.normaliseNickname(event.target.value)) },
        onBlur: function () { remember(name) },
      }),
      h('span', { className: 'ddz-note ddz-count-note' }, [...name].length + '/' + UI.MAX_NICK),
    ),
    h('div', { className: 'ddz-note' }, UI.nicknameNote(name, { seat: state.role === 'guest' && state.guest ? state.guest.seat : 0 })),
  )

  const hostRow = mode === 'host'
    ? h('div', { className: 'ddz-col' },
        h('div', { className: 'ddz-row' },
          h('span', { className: 'ddz-label' }, '端口'),
          h('input', {
            className: 'ddz-input',
            style: { width: '86px' },
            value: port,
            inputMode: 'numeric',
            onChange: function (event) { setPort(event.target.value.replace(/[^0-9]/g, '')) },
          }),
          h('button', { type: 'button', className: 'ddz-btn primary', disabled: props.busy, onClick: onHost }, '开房'),
        ),
        h('div', { className: 'ddz-note' }, '开房后这台机器会成为权威，端口只在牌局期间打开。'),
        h('div', { className: 'ddz-row' },
          h('span', { className: 'ddz-label' }, '人机'),
          h('div', { className: 'ddz-chips ddz-grow' }, UI.BOT_LEVELS.map(function (value) {
            return h('button', {
              key: value,
              type: 'button',
              className: value === props.prefs.botLevel ? 'on' : '',
              title: UI.BOT_BLURBS[value],
              onClick: function () { props.setPrefs({ botLevel: value }) },
            }, UI.BOT_LABELS[value])
          })),
        ),
        h('div', { className: 'ddz-note' }, '这是补位电脑的强度：开房后点「用电脑补齐空位」，一个人也能开局。'),
      )
    : h('div', { className: 'ddz-col' },
        h('div', { className: 'ddz-row' },
          h('span', { className: 'ddz-label' }, '地址'),
          h('input', {
            className: 'ddz-input ddz-grow',
            value: address,
            placeholder: '192.168.1.50:8791',
            onChange: function (event) { setAddress(event.target.value) },
          }),
        ),
        h('div', { className: 'ddz-row' },
          h('span', { className: 'ddz-label' }, '房间码'),
          h('input', {
            className: 'ddz-input ddz-grow',
            value: code,
            maxLength: 8,
            placeholder: '6 位',
            onChange: function (event) { setCode(event.target.value.toUpperCase()) },
          }),
          h('button', { type: 'button', className: 'ddz-btn', disabled: props.busy, onClick: onProbe }, '检查'),
          h('button', { type: 'button', className: 'ddz-btn primary', disabled: props.busy, onClick: onJoin }, '加入'),
        ),
        note ? h('div', { className: 'ddz-note' }, note) : null,
      )

  return h('div', { className: 'ddz-col' },
    tabs,
    nameRow,
    hostRow,
    local ? h('div', { className: 'ddz-err' }, local) : null,
    state.lastError ? h('div', { className: 'ddz-err' }, state.lastError) : null,
  )
}

/**
 * The interactive strip: what you can do right now, and the cards you do it with.
 *
 * In the floating window it is docked *below* the scrolling table, so the hand
 * never scrolls out of reach while a 20-card landlord hand makes the table tall.
 * In the roomy tab it simply ends the column.
 */
function TurnDock(props) {
  const s = props.snapshot
  const controls = UI.controlsFor(s)
  const me = s ? s.you : null
  const hints = s && controls.playEnabled ? UI.hintMoves(s) : []
  const [hintAt, setHintAt] = React.useState(0)
  const turnKey = s ? s.handNo + ':' + s.seq : 'none'
  // Every suggestion is about the position in front of you: a new position means
  // start from the top again instead of resuming someone else's cycle.
  React.useEffect(function () { setHintAt(0) }, [turnKey])
  if (!s || !me) return null

  function onHint(list) {
    if (!list || !list.length) return
    const next = list[hintAt % list.length]
    props.setSelection(next.cards.slice())
    setHintAt((hintAt + 1) % list.length)
  }

  function onHintPlay(hint) {
    if (!hint) return
    props.setSelection(hint.cards.slice())
    act({ type: 'play', cards: hint.cards.slice() })
  }

  return h('div', { className: 'ddz-dock' + (props.fixed ? ' fixed' : '') },
    h(ActionRow, {
      snapshot: s,
      controls: controls,
      selection: props.selection,
      busy: props.busy,
      hints: hints,
      hintAt: hintAt,
      onHint: onHint,
      onHintPlay: onHintPlay,
    }),
    h(Hand, {
      ids: me.hand,
      selection: props.selection,
      mini: props.mini,
      empty: '手牌还没发',
      onToggle: controls.playEnabled
        ? function (id) { props.setSelection(UI.toggleSelection(props.selection, id)) }
        : undefined,
    }),
  )
}

/** The rows of one trick: who played what, and who said 不出. */
function TrickRows(props) {
  return h('div', { className: 'ddz-trick' + (props.latest ? ' latest' : '') },
    h('div', { className: 'ddz-trick-head' },
      h('span', { className: 'ddz-trick-no' }, '第 ' + props.group.index + ' 轮'),
      h('span', { className: 'ddz-grow' }),
      props.group.items[0] ? h('span', { className: 'ddz-note' }, props.group.items[0].name + ' 领出') : null,
    ),
    props.group.items.map(function (item) {
      return h('div', { key: item.key, className: 'ddz-turn' + (item.kind === 'pass' ? ' pass' : '') },
        h('span', { className: 'ddz-turn-who' }, item.name),
        h('span', { className: 'ddz-turn-what' }, item.kind === 'pass' ? '不出' : item.text),
        item.kind === 'pass' ? null : h('span', { className: 'ddz-turn-shape' }, item.label),
      )
    }),
  )
}

/**
 * The play history, folded into the table itself.
 *
 * It used to live behind the 记录 tab, which meant "what did he just play?" cost a
 * tab switch and lost the table. Now the summary line is always visible and the
 * detail unfolds in place, newest trick last and scrolled to, because the newest
 * trick is the one being asked about.
 */
function HistoryBlock(props) {
  const s = props.snapshot
  const groups = UI.turnGroups(s)
  const open = Boolean(props.open)
  const listRef = React.useRef(null)
  React.useEffect(function () {
    const node = listRef.current
    if (!open || !node) return
    // Park the newest trick at the bottom edge, but land on a trick boundary:
    // scrolling to scrollHeight cut the top row in half and looked like a
    // rendering bug, so show whole tricks and let the older ones sit above.
    const tricks = node.querySelectorAll('.ddz-trick')
    if (!tricks.length) { node.scrollTop = 0; return }
    const last = tricks[tricks.length - 1]
    const overflows = last.offsetTop + last.offsetHeight > node.clientHeight
    node.scrollTop = overflows && tricks.length > 1
      ? tricks[tricks.length - 2].offsetTop - 4
      : Math.max(0, node.scrollHeight - node.clientHeight)
  }, [open, groups.length, s ? s.seq : 0])
  return h('div', { className: 'ddz-history' + (open ? ' open' : '') },
    h('button', {
      type: 'button',
      className: 'ddz-history-head',
      'aria-expanded': open ? 'true' : 'false',
      onClick: function () { if (props.onToggle) props.onToggle() },
    },
    h('span', { className: 'ddz-chev' }, open ? '▾' : '▸'),
    h('span', { className: 'ddz-history-title' }, '出牌历史'),
    h('span', { className: 'ddz-note' }, UI.historySummary(s)),
    ),
    open
      ? h('div', { className: 'ddz-history-body', ref: listRef }, groups.map(function (group, index) {
          return h(TrickRows, { key: 'g' + group.index, group: group, latest: index === groups.length - 1 })
        }))
      : null,
  )
}

function StatusPanel(props) {
  const state = props.state
  const s = state.snapshot
  const controls = UI.controlsFor(s)
  const status = s ? UI.statusLine(s, controls) : ''
  const me = s ? s.you : null
  // A rename box is open while this is a string; null means the row is closed.
  const [renaming, setRenaming] = React.useState(null)

  function submitRename() {
    const name = UI.normaliseNickname(renaming)
    setRenaming(null)
    act({ type: 'rename', name: name })
  }

  const identity = h('div', { className: 'ddz-row' },
    h('span', { className: 'ddz-badge' }, state.role === 'host' ? '房主' : '客人'),
    me ? h('span', { className: 'ddz-badge ' + (me.role || '') }, UI.roleLabel(me.role) || '未定') : null,
    s && s.handNo > 0 ? h('span', { className: 'ddz-note' }, '第 ' + s.handNo + ' 局') : null,
    h('span', { className: 'ddz-grow' }),
    me
      ? h('button', {
          type: 'button',
          className: 'ddz-btn sm ghost',
          disabled: props.busy,
          title: '改一个另外两家看得见的名字',
          onClick: function () { setRenaming(me.name) },
        }, '改名')
      : null,
    h('button', {
      type: 'button',
      className: 'ddz-btn sm ghost',
      disabled: props.busy,
      onClick: function () { selection = []; post('leave', {}) },
    }, '散局'),
  )

  const renameRow = renaming === null
    ? null
    : h('div', { className: 'ddz-row ddz-rename' },
        h('span', { className: 'ddz-label' }, '昵称'),
        h('input', {
          className: 'ddz-input ddz-grow',
          value: renaming,
          maxLength: UI.MAX_NICK,
          placeholder: '另外两家会看到',
          autoFocus: true,
          onChange: function (event) { setRenaming(UI.normaliseNickname(event.target.value)) },
          onKeyDown: function (event) {
            if (event.key === 'Enter') submitRename()
            if (event.key === 'Escape') setRenaming(null)
          },
        }),
        h('button', { type: 'button', className: 'ddz-btn sm primary', disabled: props.busy, onClick: submitRename }, '保存'),
        h('button', { type: 'button', className: 'ddz-btn sm ghost', onClick: function () { setRenaming(null) } }, '取消'),
      )

  return h('div', { className: 'ddz-col' },
    identity,
    renameRow,
    status ? h('div', { className: 'ddz-status' }, status) : null,
    h(RoomStrip, { state: state, snapshot: s, busy: props.busy, compact: Boolean(props.mini) }),
    state.role === 'guest' && state.guest
      ? h('div', { className: 'ddz-note' }, '已连上 ' + String(state.guest.baseUrl).replace(/^https?:\/\//, '') + '，' + (state.guest.seat + 1) + ' 号位')
      : null,
    s ? h(SeatList, { snapshot: s }) : null,
    // The authority reveals every hand once the hand is over; that review screen
    // is the whole point of revealing them, so show them here rather than only
    // sending the data.
    s && s.secretsRevealed
      ? h('div', { className: 'ddz-col' },
          h('div', { className: 'ddz-label' }, '复盘 · 三家手牌'),
          (s.seats || [])
            .filter(function (info) { return info.seat !== s.you.seat && Array.isArray(info.hand) })
            .map(function (info) {
              return h('div', { key: 'reveal-' + info.seat, className: 'ddz-play' },
                h('span', { className: 'ddz-play-who' }, info.name),
                h(Hand, { ids: info.hand, mini: true }),
              )
            }))
      : null,
    s ? h(Felt, { snapshot: s }) : null,
    s ? h(HistoryBlock, {
      snapshot: s,
      open: props.prefs ? props.prefs.historyOpen : false,
      onToggle: props.setPrefs ? function () { props.setPrefs({ historyOpen: !(props.prefs && props.prefs.historyOpen) }) } : null,
    }) : null,
    props.dock
      ? null
      : h('div', { className: 'ddz-col' },
          h('div', { className: 'ddz-divider' }),
          h(TurnDock, {
            snapshot: s,
            selection: props.selection,
            setSelection: props.setSelection,
            busy: props.busy,
            mini: props.mini,
          }),
        ),
  )
}

function HistoryPanel(props) {
  const s = props.snapshot
  if (!s) return h('div', { className: 'ddz-empty' }, '还没有记录')
  const groups = UI.turnGroups(s)
  const events = UI.logEntries(s)
  return h('div', { className: 'ddz-col' },
    h('div', { className: 'ddz-label' }, '出牌历史'),
    groups.length
      ? h('div', { className: 'ddz-history-body static' }, groups.map(function (group, index) {
          return h(TrickRows, { key: 'g' + group.index, group: group, latest: index === groups.length - 1 })
        }))
      : h('div', { className: 'ddz-empty' }, '还没人出牌'),
    h('div', { className: 'ddz-divider' }),
    h('div', { className: 'ddz-label' }, '房间事件'),
    events.length
      ? h('div', { className: 'ddz-log' }, events.map(function (entry) {
          return h('div', { key: entry.key, className: 'ddz-log-item' }, h('span', {}, entry.text))
        }))
      : h('div', { className: 'ddz-empty' }, '还没有事件'),
  )
}

function Body(props) {
  const state = props.state
  if (!state) return h('div', { className: 'ddz-empty' }, '正在连接本机插件…')
  if (state.role === 'idle') {
    return h(Lobby, { state: state, prefs: props.prefs, setPrefs: props.setPrefs, busy: props.busy })
  }
  if (props.pane === 'log') return h(HistoryPanel, { snapshot: state.snapshot })
  return h(StatusPanel, {
    state: state,
    busy: props.busy,
    selection: props.selection,
    setSelection: props.setSelection,
    mini: props.mini,
    prefs: props.prefs,
    setPrefs: props.setPrefs,
    dock: props.dock,
  })
}

function Notices(props) {
  const state = props.state || {}
  const lines = []
  if (props.error) lines.push(['net', '连不上本机插件：' + props.error])
  if (props.actionError) lines.push(['act', props.actionError])
  if (state.lastError && state.role === 'idle') lines.push(['state', state.lastError])
  if (!lines.length) return null
  return h('div', { className: 'ddz-col' }, lines.map(function (line) {
    return h('div', { key: line[0], className: 'ddz-err' }, line[1])
  }))
}

/* --------------------------------------------------- floating window ----- */

function useTurn(state) {
  const s = state && state.snapshot
  return Boolean(s && (s.canAct || s.canBid))
}

function MiniWindow() {
  const view = useStore()
  const [prefs, setPrefs] = usePrefs()
  const [selectionState, setSelection] = React.useState(selection)
  const [live, setLive] = React.useState(null)
  const [drag, setDrag] = React.useState(null)
  const [box, setBox] = React.useState(null)
  const boxRef = React.useRef(null)
  // The slim pill is a <button>, and a button that is dragged still fires a click
  // on release — the pill expands on click, so every drag used to pop the window
  // open. Remember whether the pointer really moved and let the click swallow
  // itself once.
  const movedRef = React.useRef(false)
  const state = view.data
  const snapshot = state && state.snapshot
  const myTurn = useTurn(state)
  const collapsed = prefs.collapsed

  // Keep the selection in sync with the module-level value after a poll.
  React.useEffect(function () { setSelection(selection.slice()) }, [view])

  const setSelectionAndStore = React.useCallback(function (next) {
    selection = next
    setSelection(next)
  }, [])

  // Poll less often while collapsed; the pill only needs to notice a turn. While a
  // computer is on the clock the window asks again sooner, so its move does not
  // arrive a whole idle period late.
  React.useEffect(function () {
    setPeriod(UI.pollPeriod(snapshot, {
      collapsed: collapsed,
      active: POLL_MS,
      quiet: POLL_MS_QUIET,
      bot: POLL_MS_BOT,
    }))
  }, [collapsed, snapshot])

  // The window's height is whatever its content needs — an empty lobby is short,
  // a landlord's 20 cards are not — and the stylesheet caps it at 78vh. Clamping
  // the position against a constant would park the tall case half off the bottom
  // of the screen, so measure the real box instead. Identity is kept stable when
  // nothing changed, otherwise this would re-render forever.
  React.useLayoutEffect(function () {
    const node = boxRef.current
    if (!node || typeof node.getBoundingClientRect !== 'function') return
    const rect = node.getBoundingClientRect()
    if (!rect.width && !rect.height) return
    setBox(function (previous) {
      if (previous && Math.abs(previous.width - rect.width) < 1 && Math.abs(previous.height - rect.height) < 1) {
        return previous
      }
      return { width: rect.width, height: rect.height }
    })
  })

  const size = collapsed ? { width: PILL_W, height: 30 } : (box || { width: UI.MINI_W, height: UI.MINI_H })
  const placed = live || UI.clampPosition(prefs.x, prefs.y, viewport(), size)

  function onPointerDown(event) {
    if (event.button !== 0) return
    const box = boxRef.current ? boxRef.current.getBoundingClientRect() : null
    if (!box) return
    movedRef.current = false
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* older engines */ }
    setDrag({ x: event.clientX, y: event.clientY, left: box.left, top: box.top })
  }

  function onPointerMove(event) {
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!movedRef.current) {
      // Every click wobbles a pixel or two. Below the slop this is still a click,
      // so leave the window where it is and don't mark the gesture as a drag.
      if (Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return
      movedRef.current = true
    }
    setLive(UI.clampPosition(drag.left + dx, drag.top + dy, viewport(), size))
  }

  function onPointerUp() {
    if (!drag) return
    setDrag(null)
    if (live) {
      setPrefs({ x: live.x, y: live.y })
      setLive(null)
    }
  }

  // True exactly once per finished drag: that click belongs to the drag.
  function swallowDragClick() {
    if (!movedRef.current) return false
    movedRef.current = false
    return true
  }

  function stop(event) { event.stopPropagation() }

  if (collapsed) {
    return h('button', {
      type: 'button',
      ref: boxRef,
      className: 'ddz-pill' + (myTurn ? ' turn' : ''),
      style: { left: placed.x + 'px', top: placed.y + 'px' },
      title: '单击展开 · 拖动移动',
      onClick: function (event) {
        // A drag ends with a click the browser still delivers; without this the
        // window expanded on every drop.
        if (swallowDragClick()) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        setPrefs({ collapsed: false })
      },
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
      onPointerCancel: onPointerUp,
    },
      h('span', { className: 'ddz-dot' }),
      h('span', {}, '斗地主 · ' + (myTurn ? '该你了' : (snapshot ? UI.phaseLabel(snapshot.phase) : '未进桌'))),
    )
  }

  const stateLabel = !state
    ? '连接中'
    : state.role === 'idle'
      ? '未进桌'
      : snapshot
        ? UI.phaseLabel(snapshot.phase)
        : '已连接'

  return h('div', {
    ref: boxRef,
    className: 'ddz-mini' + (drag ? ' dragging' : ''),
    style: { left: placed.x + 'px', top: placed.y + 'px' },
  },
    h('div', Object.assign({
      className: 'ddz-mini-bar' + (drag ? ' dragging' : ''),
      title: '拖动可移动 · 双击收起',
      onDoubleClick: function () { setPrefs({ collapsed: true }) },
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
      onPointerCancel: onPointerUp,
    }),
      h('span', {}, '🃏'),
      h('span', { className: 'ddz-mini-title' }, '斗地主'),
      h('span', { className: 'ddz-mini-meta' }, myTurn ? '该你了' : stateLabel),
      h('button', {
        type: 'button',
        className: 'ddz-ico-btn',
        title: '收起为悬浮按钮',
        onPointerDown: stop,
        onClick: function () { setPrefs({ collapsed: true }) },
      }, '—'),
    ),
    h('div', { className: 'ddz-mini-body' },
      h(Notices, { state: state, error: view.error, actionError: view.actionError }),
      h(Body, {
        state: state,
        pane: prefs.pane,
        prefs: prefs,
        setPrefs: setPrefs,
        busy: view.busy,
        selection: selectionState,
        setSelection: setSelectionAndStore,
        mini: true,
        dock: true,
      }),
    ),
    // The hand is docked, not scrolled: a 20-card landlord hand makes the table
    // taller than the window, and the cards you play with must never be the part
    // that scrolls away. In the lobby there are no cards to dock yet.
    prefs.pane === 'table' && snapshot && snapshot.you && snapshot.phase !== 'lobby'
      ? h('div', { className: 'ddz-dock-bar' }, h(TurnDock, {
          snapshot: snapshot,
          selection: selectionState,
          setSelection: setSelectionAndStore,
          busy: view.busy,
          mini: true,
          fixed: true,
        }))
      : null,
    h('div', { className: 'ddz-mini-foot' },
      h('div', { className: 'ddz-tabs ddz-grow' },
        h('button', {
          type: 'button',
          className: prefs.pane === 'table' ? 'on' : '',
          onClick: function () { setPrefs({ pane: 'table' }) },
        }, '牌桌'),
        h('button', {
          type: 'button',
          className: prefs.pane === 'log' ? 'on' : '',
          onClick: function () { setPrefs({ pane: 'log' }) },
        }, '记录'),
      ),
    ),
  )
}

/* --------------------------------------------------- conversation tab ---- */

function TableView() {
  const view = useStore()
  const [prefs, setPrefs] = usePrefs()
  const [selectionState, setSelection] = React.useState(selection)
  const state = view.data
  const snapshot = state && state.snapshot

  React.useEffect(function () { setSelection(selection.slice()) }, [view])

  const setSelectionAndStore = React.useCallback(function (next) {
    selection = next
    setSelection(next)
  }, [])

  const controls = UI.controlsFor(snapshot)

  return h('div', { className: 'ddz-view' },
    h('div', { className: 'ddz-view-head' },
      h('h2', {}, '斗地主'),
      state ? h('span', { className: 'ddz-badge' }, state.role === 'host' ? '房主' : state.role === 'guest' ? '客人' : '未进桌') : null,
      snapshot ? h('span', { className: 'ddz-badge' }, UI.phaseLabel(snapshot.phase)) : null,
      snapshot ? h('span', { className: 'ddz-note' }, UI.statusLine(snapshot, controls)) : null,
      h('span', { className: 'ddz-grow' }),
      h('button', {
        type: 'button',
        className: 'ddz-btn sm',
        onClick: function () { setPrefs({ collapsed: !prefs.collapsed }) },
      }, prefs.collapsed ? '展开浮窗' : '收起浮窗'),
    ),
    h(Notices, { state: state, error: view.error, actionError: view.actionError }),
    h('div', { className: 'ddz-row', style: { alignItems: 'flex-start', gap: '20px' } },
      h('div', { style: { flex: '1 1 340px', minWidth: '300px' } },
        h(Body, {
          state: state,
          pane: 'table',
          prefs: prefs,
          setPrefs: setPrefs,
          busy: view.busy,
          selection: selectionState,
          setSelection: setSelectionAndStore,
        }),
      ),
      h('div', { style: { flex: '1 1 320px', minWidth: '280px' } },
        h(HistoryPanel, { snapshot: snapshot }),
      ),
    ),
  )
}

/* ------------------------------------------------------------- register -- */

function warn(what, error) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[dsh-doudizhu] ' + what + '；host 半区仍然可用', error)
  }
}

function apply(ctx) {
  // dsh can unload a plugin at runtime, so the module-scope poller needs a
  // matching teardown — it outlives any single mount.
  ctx.effect(function () {
    return function () {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      listeners.clear()
      store = { data: null, error: '', actionError: '', busy: false, at: 0 }
      selection = []
      lastPhase = undefined
      inflight = false
    }
  }, 'dsh-doudizhu: poller')

  ctx.effect(function () {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-doudizhu'
    style.textContent = CSS
    document.head.appendChild(style)
    return function () { style.remove() }
  }, 'dsh-doudizhu: styles')

  // The floating window lives in the shell's root overlay layer, so it survives
  // tab switches and can be dragged over the conversation.
  ctx.slots.inject('shell.overlay', function () {
    let dispose
    try {
      dispose = ctx.slots.register({ name: 'shell.overlay', id: 'doudizhu-mini', order: 30 }, MiniWindow)
    } catch (error) {
      warn('浮窗没注册上', error)
    }
    return typeof dispose === 'function' ? dispose : function () {}
  })

  ctx.slots.inject('conversation.view', function () {
    let dispose
    try {
      dispose = ctx.slots.register({ name: 'conversation.view', id: 'doudizhu', order: 30, label: '斗地主' }, TableView)
    } catch (error) {
      warn('斗地主标签页没注册上', error)
    }
    return typeof dispose === 'function' ? dispose : function () {}
  })
}

module.exports = {
  name: 'dsh-doudizhu',
  inject: ['slots'],
  apply: apply,
}
