#!/usr/bin/env node
//
// Drive the *live* plugin through a whole hand, from outside DSH.
//
// This is the acceptance check that unit tests cannot give: it talks to the
// plugin instance mounted in a running DSH, opens a real room on a real LAN
// port, seats two more players over HTTP, plays a hand, and closes the room.
//
//   node scripts/live-check.mjs                       # uses $DSH_WEB_URL
//   node scripts/live-check.mjs --url http://127.0.0.1:19387 --port 8791
//   node scripts/live-check.mjs --keep                # leave the room open
//
// Exits non-zero on the first failed assertion, and always tries to /leave.

import { cardFromId, canBeat, classifyMove, smallestLead } from '../src/rules.js'

const ROUTE = '/dsh-doudizhu'
const LOCAL_TOKEN = 'x-dsh-doudizhu-token'
const LAN_TOKEN = 'x-ddz-token'

function parseArgs(argv) {
  const out = { url: process.env.DSH_WEB_URL ?? 'http://127.0.0.1:19387', port: 8791, keep: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--url') out.url = argv[++i]
    else if (arg === '--port') out.port = Number(argv[++i])
    else if (arg === '--keep') out.keep = true
    else if (arg === '--help') {
      console.log('usage: node scripts/live-check.mjs [--url <dsh url>] [--port <n>] [--keep]')
      process.exit(0)
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const problems = []
const notes = []

function check(condition, message) {
  if (condition) {
    console.log(`  ok   ${message}`)
    return true
  }
  console.log(`  FAIL ${message}`)
  problems.push(message)
  return false
}

async function local(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${args.url}${ROUTE}/${path}`, {
    method,
    headers: {
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
      ...(token ? { [LOCAL_TOKEN]: token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const header = response.headers.get(LOCAL_TOKEN)
  return { status: response.status, data: await response.json(), token: header ?? token }
}

async function lan(baseUrl, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
      ...(token ? { [LAN_TOKEN]: token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, data: await response.json() }
}

function cardStrings(value, out = new Set()) {
  if (typeof value === 'string') {
    out.add(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) cardStrings(item, out)
    return out
  }
  if (value && typeof value === 'object') for (const item of Object.values(value)) cardStrings(item, out)
  return out
}

/** Cards held by another seat and not yet public — computed only from the views. */
function foreignCards(viewer, views) {
  // Once the hand is over every hand is revealed on purpose; that is a review
  // screen, not a leak.
  if (views[viewer].secretsRevealed) return new Set()
  const mine = new Set(views[viewer].you.hand)
  const publicIds = new Set()
  for (const play of views[viewer].plays ?? []) for (const id of play.cards) publicIds.add(id)
  if (views[viewer].bottomRevealed) for (const id of views[viewer].bottom) publicIds.add(id)
  const foreign = new Set()
  for (let other = 0; other < views.length; other += 1) {
    if (other === viewer) continue
    for (const id of views[other].you.hand) if (!mine.has(id) && !publicIds.has(id)) foreign.add(id)
  }
  return foreign
}

function leakScan(views, label) {
  for (let viewer = 0; viewer < views.length; viewer += 1) {
    const seen = cardStrings(views[viewer])
    for (const id of foreignCards(viewer, views)) {
      if (seen.has(id)) {
        problems.push(`${label}: 座位 ${viewer} 看到了别人的 ${id}`)
        return
      }
    }
  }
}

/**
 * Pick a legal action. This used to read `move.shape` / `move.length`, which
 * `classifyMove` has never returned — so the beat branch was dead code and the
 * driver passed on every turn after the first lead. The hand still finished
 * (whoever led kept leading), which is exactly why it went unnoticed: it proved
 * the transport, not the rules. Now every candidate is validated through the
 * real `classifyMove` / `canBeat`, so the run exercises actual beating.
 */
function pickAction(view) {
  const hand = [...view.you.hand]
  if (!view.lastPlay) return { type: 'play', cards: smallestLead(hand) }

  const target = view.lastPlay.move
  const byValue = new Map()
  for (const id of hand) {
    const value = cardFromId(id).value
    if (!byValue.has(value)) byValue.set(value, [])
    byValue.get(value).push(id)
  }
  const ascending = [...byValue.keys()].sort((a, b) => a - b)

  // Same shape first, cheapest value upward: single / pair / triple.
  const sameShape = { single: 1, pair: 2, triple: 3 }[target.type]
  if (sameShape) {
    for (const value of ascending) {
      const group = byValue.get(value)
      if (group.length < sameShape) continue
      const cards = group.slice(0, sameShape)
      const candidate = classifyMove(cards)
      if (candidate && canBeat(candidate, target)) return { type: 'play', cards }
    }
  }

  // Then a bomb, then the rocket. Values 16/17 are the two jokers.
  for (const value of ascending) {
    const group = byValue.get(value)
    if (group.length !== 4) continue
    const cards = group.slice(0, 4)
    const candidate = classifyMove(cards)
    if (candidate && canBeat(candidate, target)) return { type: 'play', cards }
  }
  const rocket = hand.filter((id) => cardFromId(id).value >= 16)
  if (rocket.length === 2) {
    const candidate = classifyMove(rocket)
    if (candidate && canBeat(candidate, target)) return { type: 'play', cards: rocket }
  }
  return { type: 'pass' }
}

let token = null
let roomOpened = false

try {
  console.log(`live check against ${args.url}`)

  console.log('\n[1] 本地回环路由')
  const idle = await local('state')
  check(idle.status === 200, `GET ${ROUTE}/state -> HTTP ${idle.status}`)
  check(typeof idle.token === 'string' && idle.token.length >= 32, '响应头带本地令牌')
  token = idle.token
  check(idle.data.ok === true && idle.data.role, `角色字段存在（role=${idle.data.role}）`)

  console.log('\n[2] 开房')
  const hosted = await local('host', { method: 'POST', token, body: { port: args.port, name: '房主' } })
  check(hosted.status === 200 && hosted.data.ok, `POST /host -> HTTP ${hosted.status} ${hosted.data.error ?? ''}`)
  if (!hosted.data.ok) throw new Error('开房失败，后续步骤无法继续')
  roomOpened = true
  const { code, port, loopbackUrl, lanUrls } = hosted.data.authority
  check(typeof code === 'string' && code.length === 6, `房间码 ${code}`)
  check(hosted.data.snapshot.you.name === '房主', '大厅就已经显示自己起的名字')
  check(hosted.data.snapshot.you.seat === 0, '本地玩家坐 0 号位')
  console.log(`     局域网地址: ${lanUrls.length ? lanUrls.join(', ') : '（本机没有局域网地址）'}`)

  console.log('\n[3] 局域网端口')
  const hello = await lan(loopbackUrl, '/hello')
  check(hello.status === 200 && hello.data.code === code, `GET ${loopbackUrl}/hello -> HTTP ${hello.status}`)
  for (const url of lanUrls) {
    try {
      const remote = await lan(url, '/hello')
      check(remote.status === 200 && remote.data.code === code, `经局域网地址可达：${url}`)
    } catch (error) {
      notes.push(`${url} 本机自连失败：${error.message}（跨机可达性留给三机验收）`)
    }
  }
  const noCode = await lan(loopbackUrl, '/join', { method: 'POST', body: { name: 'X', code: 'ZZZZZZ' } })
  check(noCode.status === 403, `房间码不对 -> HTTP ${noCode.status}`)

  console.log('\n[4] 另外两家入座')
  const second = await lan(loopbackUrl, '/join', { method: 'POST', body: { name: '乙', code } })
  const third = await lan(loopbackUrl, '/join', { method: 'POST', body: { name: '丙', code } })
  check(second.status === 200 && second.data.seat === 1, `乙 入座 -> seat ${second.data.seat}`)
  check(third.status === 200 && third.data.seat === 2, `丙 入座 -> seat ${third.data.seat}`)
  check(third.data.state.phase === 'bidding', '三人到齐自动发牌')
  const tokens = [null, second.data.token, third.data.token]

  async function views() {
    const mine = (await local('state', { token })).data.snapshot
    const one = (await lan(loopbackUrl, '/state?since=0', { token: tokens[1] })).data.state
    const two = (await lan(loopbackUrl, '/state?since=0', { token: tokens[2] })).data.state
    return [mine, one, two]
  }

  let current = await views()
  check(current.every((view) => view.you.hand.length === 17), '三家各 17 张')
  check(new Set(current.flatMap((view) => view.you.hand)).size === 51, '三家看到的牌互不重叠')
  check(current[0].seats[1].hand === null && current[0].seats[2].hand === null, '自己看不到别人的手牌')
  leakScan(current, '发牌后')

  console.log('\n[5] 打完一盘')
  let steps = 0
  let leads = 0
  let beats = 0
  let passes = 0
  while (current[0].phase !== 'finished' && steps < 400) {
    steps += 1
    const reference = current[0]
    const seat = reference.phase === 'bidding' ? reference.bidTurnSeat : reference.toAct
    const action =
      reference.phase === 'bidding'
        ? { type: 'bid', score: (reference.bids?.length ?? 0) === 0 ? 1 : 0 }
        : pickAction(current[seat])
    if (reference.phase !== 'bidding') {
      if (action.type === 'pass') passes += 1
      else if (reference.lastPlay) beats += 1
      else leads += 1
    }
    const result =
      seat === 0
        ? await local('act', { method: 'POST', token, body: { action } })
        : await lan(loopbackUrl, '/act', { method: 'POST', token: tokens[seat], body: action })
    if (!result.data.ok) {
      check(false, `第 ${steps} 步（座位 ${seat} ${action.type}）被拒：${result.data.error}`)
      break
    }
    current = await views()
    leakScan(current, `第 ${steps} 步`)
  }
  check(current[0].phase === 'finished', `一盘打完（${steps} 步）`)
  console.log(`     领出 ${leads} 次 / 压上家 ${beats} 次 / 不出 ${passes} 次`)
  // The whole point of driving a hand is to exercise the beat path. Before this
  // assertion existed, a dead `move.shape` check made every turn a pass and the
  // hand still finished — the run proved the transport and nothing about beats.
  check(beats > 0, `真的压过牌（${beats} 次），不是一路不出`)
  check(passes > 0, `也有真的不出（${passes} 次）`)
  check(current.every((view) => view.secretsRevealed === true), '结束后才全明牌')

  const whole = new Set()
  for (const view of current) {
    for (const id of view.you.hand) whole.add(id)
    for (const play of view.plays) for (const id of play.cards) whole.add(id)
    for (const id of view.bottom) whole.add(id)
  }
  check(whole.size === 54, `手牌 + 出牌 + 底牌 = ${whole.size} 张`)

  console.log('\n[6] 下一局')
  const next = await local('act', { method: 'POST', token, body: { action: { type: 'next' } } })
  check(next.data.ok === true, '可以开下一局')
  check(next.data.snapshot.you.hand.length === 17, '下一局重新发牌')
} catch (error) {
  problems.push(`脚本异常：${error.message}`)
  console.error(`\n脚本异常：${error.stack ?? error.message}`)
} finally {
  if (roomOpened && !args.keep) {
    console.log('\n[7] 收尾：关房')
    try {
      const left = await local('leave', { method: 'POST', token, body: {} })
      console.log(`  ok   关房 -> role=${left.data.role}`)
    } catch (error) {
      problems.push(`关房失败：${error.message}`)
      console.error(`  关房失败：${error.message}（请手动 POST ${ROUTE}/leave）`)
    }
  } else if (roomOpened && args.keep) {
    console.log('\n[7] --keep：房间保持打开')
  }
}

for (const note of notes) console.log(`\n注意：${note}`)
if (problems.length) {
  console.log(`\n失败 ${problems.length} 项：`)
  for (const problem of problems) console.log(`  - ${problem}`)
  process.exit(1)
}
console.log('\n实机检查全部通过')
