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
const PILL_W = 148

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

function SeatRow(props) {
  const info = (props.snapshot.seats || [])[props.seat]
  if (!info) return null
  const role = UI.roleLabel(info.role)
  const active = UI.activeSeat(props.snapshot) === props.seat
  const className =
    'ddz-seat' + (active ? ' active' : '') + (props.seat === props.youSeat ? ' me' : '') + (props.wide ? ' wide' : '')
  const marks = []
  if (role) marks.push(h('span', { key: 'role', className: 'ddz-badge ' + info.role }, role))
  if (active) marks.push(h('span', { key: 'turn', className: 'ddz-badge turn' }, '行动中'))
  if (info.occupied && !info.connected) marks.push(h('span', { key: 'gone', className: 'ddz-badge gone' }, '掉线'))
  if (!info.occupied) marks.push(h('span', { key: 'empty', className: 'ddz-badge' }, '空位'))
  return h('div', { className: className },
    h('span', { className: 'ddz-seat-name' }, (props.seat === props.youSeat ? '你 · ' : '') + info.name),
    marks,
    h('span', { className: 'ddz-seat-count' },
      info.hand ? info.hand.length + ' 张' : info.count + ' 张'),
  )
}

function Felt(props) {
  const s = props.snapshot
  const last = s.lastPlay
  const parts = [
    h('div', { key: 'last', className: 'ddz-play' },
      last
        ? [
            h('span', { key: 'who', className: 'ddz-play-who' }, (s.seats || [])[last.seat]?.name ?? ''),
            last.move ? h('span', { key: 'shape', className: 'ddz-badge' }, last.move.label) : null,
            (last.cards || []).map(function (id) { return h(Card, { key: id, id: id, mini: true }) }),
          ]
        : h('span', { className: 'ddz-empty' }, s.phase === 'finished' ? '本局结束' : '台面空着'),
    ),
  ]
  if (s.bottomRevealed && Array.isArray(s.bottom) && s.bottom.length) {
    parts.push(h('div', { key: 'bottom', className: 'ddz-play' },
      h('span', { className: 'ddz-play-who' }, '底牌'),
      s.bottom.map(function (id) { return h(Card, { key: id, id: id, mini: true }) }),
    ))
  }
  if (s.passes) parts.push(h('span', { key: 'passes', className: 'ddz-note' }, '连续 ' + s.passes + ' 家不出'))
  return h('div', { className: 'ddz-table' }, parts)
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
      h('span', { className: 'ddz-note' }, error || UI.selectionSummary(props.selection)),
    ))
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

function ShareBlock(props) {
  const authority = props.state.authority
  if (!authority) return null
  const text = UI.shareText(authority)
  const chips = UI.lanChips(authority)
  const hidden = UI.hiddenLanCandidates(authority)
  function bare(url) { return String(url).replace(/^https?:\/\//, '') }
  return h('div', { className: 'ddz-col' },
    h('div', { className: 'ddz-row' },
      h('span', { className: 'ddz-label' }, '房间码'),
      h('span', { className: 'ddz-code' }, authority.code),
    ),
    h('div', { className: 'ddz-urls' },
      chips.map(function (chip) {
        return h('code', {
          key: chip.key,
          title: (chip.iface ? '网卡 ' + chip.iface + ' · ' : '') + '点击复制',
          onClick: function () { copy(bare(chip.url)) },
        }, bare(chip.url))
      }).concat(authority.loopbackUrl
        // Shown, but labelled: handing 127.0.0.1 to someone else points at
        // *their* machine, which is the same trap as a virtual adapter.
        ? [h('code', {
            key: 'loopback',
            title: '本机回环地址，只有这台电脑能用 · 点击复制（复制的是纯地址）',
            onClick: function () { copy(bare(authority.loopbackUrl)) },
          }, bare(authority.loopbackUrl) + '（本机）')]
        : []),
    ),
    h('div', { className: 'ddz-share', title: '点击复制', onClick: function () { copy(text) } }, text),
    hidden.length
      ? h('div', { className: 'ddz-note' },
          '已隐藏 ' + hidden.length + ' 个虚拟网卡地址（' + hidden.map(function (entry) { return entry.iface }).join('、') +
          '）—— 那是 WSL / 虚拟机 / VPN 的网卡，别的电脑连不上。')
      : null,
    h('div', { className: 'ddz-note' }, '把上面这一行发给另外两家，他们在自己的浮窗里填地址和房间码。'),
  )
}

function Lobby(props) {
  const state = props.state
  const [mode, setMode] = React.useState('host')
  const [name, setName] = React.useState(props.prefs.name || state.playerName || '')
  const [port, setPort] = React.useState(String((state.defaults && state.defaults.port) || 8791))
  const [address, setAddress] = React.useState('')
  const [code, setCode] = React.useState('')
  const [note, setNote] = React.useState('')
  const [local, setLocal] = React.useState('')

  function remember(next) {
    props.setPrefs({ name: String(next || '').trim().slice(0, 12) })
  }

  function onHost() {
    props.setPrefs({ name: String(name || '').trim().slice(0, 12) })
    post('host', { port: Number(port) || 0, name: String(name || '').trim() })
  }

  function onJoin() {
    const base = UI.normaliseAddress(address)
    if (!base) { setLocal('先填房主地址'); return }
    if (!/^[A-Za-z0-9]{4,8}$/.test(String(code).trim())) { setLocal('房间码是 6 位字母数字'); return }
    props.setPrefs({ name: String(name || '').trim().slice(0, 12) })
    setLocal('')
    post('join', { baseUrl: base, code: String(code).trim().toUpperCase(), name: String(name || '').trim() })
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

  const nameRow = h('div', { className: 'ddz-row' },
    h('span', { className: 'ddz-label' }, '昵称'),
    h('input', {
      className: 'ddz-input ddz-grow',
      value: name,
      maxLength: 12,
      placeholder: '另外两家会看到',
      onChange: function (event) { setName(event.target.value) },
      onBlur: function () { remember(name) },
    }),
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

function StatusPanel(props) {
  const state = props.state
  const s = state.snapshot
  const controls = UI.controlsFor(s)
  const status = s ? UI.statusLine(s, controls) : ''
  const me = s ? s.you : null

  const identity = h('div', { className: 'ddz-row' },
    h('span', { className: 'ddz-badge' }, state.role === 'host' ? '房主' : '客人'),
    me ? h('span', { className: 'ddz-badge ' + (me.role || '') }, UI.roleLabel(me.role) || '未定') : null,
    s ? h('span', { className: 'ddz-note' }, '第 ' + s.handNo + ' 局') : null,
    h('span', { className: 'ddz-grow' }),
    h('button', {
      type: 'button',
      className: 'ddz-btn sm ghost',
      disabled: props.busy,
      onClick: function () { selection = []; post('leave', {}) },
    }, '散局'),
  )

  const seats = s
    ? h('div', { className: 'ddz-seats' }, (s.seats || []).map(function (info) {
        return h(SeatRow, { key: info.seat, seat: info.seat, snapshot: s, youSeat: s.you.seat, wide: info.seat === s.you.seat })
      }))
    : null

  return h('div', { className: 'ddz-col' },
    identity,
    status ? h('div', { className: 'ddz-note' }, status) : null,
    state.role === 'host' ? h(ShareBlock, { state: state }) : null,
    state.role === 'guest' && state.guest
      ? h('div', { className: 'ddz-note' }, '已连上 ' + String(state.guest.baseUrl).replace(/^https?:\/\//, '') + '，' + (state.guest.seat + 1) + ' 号位')
      : null,
    seats,
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
    h('div', { className: 'ddz-divider' }),
    s && me ? h(ActionRow, { snapshot: s, controls: controls, selection: props.selection, busy: props.busy }) : null,
    s && me ? h(Hand, {
      ids: me.hand,
      selection: props.selection,
      mini: props.mini,
      empty: '手牌还没发',
      onToggle: controls.playEnabled
        ? function (id) { props.setSelection(UI.toggleSelection(props.selection, id)) }
        : undefined,
    }) : null,
  )
}

function HistoryPanel(props) {
  const s = props.snapshot
  if (!s) return h('div', { className: 'ddz-empty' }, '还没有记录')
  const plays = UI.playEntries(s)
  const events = UI.logEntries(s)
  return h('div', { className: 'ddz-col' },
    h('div', { className: 'ddz-label' }, '出牌记录'),
    plays.length
      ? h('div', { className: 'ddz-log' }, plays.map(function (entry) {
          return h('div', { key: entry.key, className: 'ddz-log-item' }, h('span', {}, entry.text))
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

  // Poll less often while collapsed; the pill only needs to notice a turn.
  React.useEffect(function () {
    setPeriod(collapsed ? POLL_MS_QUIET : POLL_MS)
  }, [collapsed])

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
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* older engines */ }
    setDrag({ x: event.clientX, y: event.clientY, left: box.left, top: box.top })
  }

  function onPointerMove(event) {
    if (!drag) return
    setLive(UI.clampPosition(
      drag.left + (event.clientX - drag.x),
      drag.top + (event.clientY - drag.y),
      viewport(),
      size,
    ))
  }

  function onPointerUp() {
    if (!drag) return
    setDrag(null)
    if (live) {
      setPrefs({ x: live.x, y: live.y })
      setLive(null)
    }
  }

  function stop(event) { event.stopPropagation() }

  if (collapsed) {
    return h('button', {
      type: 'button',
      ref: boxRef,
      className: 'ddz-pill' + (myTurn ? ' turn' : ''),
      style: { left: placed.x + 'px', top: placed.y + 'px' },
      title: '展开斗地主浮窗',
      onClick: function () { setPrefs({ collapsed: false }) },
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
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
      }),
    ),
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
