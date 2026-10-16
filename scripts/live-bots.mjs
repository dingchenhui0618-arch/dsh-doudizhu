#!/usr/bin/env node
//
// Drive the *live* plugin's computer players, from outside DSH.
//
// `live-check.mjs` proves the transport with three humans behind real HTTP. This
// one proves the other half of the feature against a running DSH: that the
// **authority**, not any client, moves the computers — and that it keeps doing so
// while the script deliberately sits still.
//
//   node scripts/live-bots.mjs                          # 一人在场 + 两个困难电脑
//   node scripts/live-bots.mjs --level hell --port 8791
//   node scripts/live-bots.mjs --keep                   # 打完不关房
//
// It talks to the plugin's local loopback routes on the running DSH, so it needs
// the plugin to be installed and enabled (after a DSH restart, since the computer
// players live in the host half).
//
// Exits non-zero on the first failed assertion, and always tries to /leave.

import { cardFromId, canBeat, classifyMove, smallestLead } from '../src/rules.js'
import { BOT_LEVELS, BOT_LABELS } from '../src/ui-logic.js'

const ROUTE = '/dsh-doudizhu'
const LOCAL_TOKEN = 'x-dsh-doudizhu-token'

function parseArgs(argv) {
  const out = {
    url: process.env.DSH_WEB_URL ?? 'http://127.0.0.1:19387',
    port: 8791,
    level: 'hard',
    keep: false,
    waitMs: 3500,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--url') out.url = argv[++i]
    else if (arg === '--port') out.port = Number(argv[++i])
    else if (arg === '--level') out.level = argv[++i]
    else if (arg === '--wait') out.waitMs = Number(argv[++i])
    else if (arg === '--keep') out.keep = true
    else if (arg === '--help') {
      console.log('usage: node scripts/live-bots.mjs [--url <dsh url>] [--port <n>] [--level easy|medium|hard|hell] [--wait <ms>] [--keep]')
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

/** Same policy the human path in live-check.mjs uses: cheapest legal thing. */
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
  const ascending = [...byValue.keys()].sort((left, right) => left - right)

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
  for (const value of ascending) {
    const group = byValue.get(value)
    if (group.length !== 4) continue
    const candidate = classifyMove(group.slice(0, 4))
    if (candidate && canBeat(candidate, target)) return { type: 'play', cards: group.slice(0, 4) }
  }
  const rocket = hand.filter((id) => cardFromId(id).value >= 16)
  if (rocket.length === 2) {
    const candidate = classifyMove(rocket)
    if (candidate && canBeat(candidate, target)) return { type: 'play', cards: rocket }
  }
  return { type: 'pass' }
}

const totalActions = (view) => (view.plays?.length ?? 0) + (view.bids?.length ?? 0)
const turnSeat = (view) => (view.phase === 'bidding' ? view.bidTurnSeat : view.toAct)

let token = null
let roomOpened = false

try {
  console.log(`live bot check against ${args.url}`)
  if (!BOT_LEVELS.includes(args.level)) throw new Error(`--level 只能是 ${BOT_LEVELS.join(' / ')}`)

  console.log('\n[1] 本地回环路由')
  const idle = await local('state')
  check(idle.status === 200, `GET ${ROUTE}/state -> HTTP ${idle.status}`)
  check(typeof idle.token === 'string' && idle.token.length >= 32, '响应头带本地令牌')
  token = idle.token
  check(idle.data.ok === true, `插件在跑（role=${idle.data.role}）`)

  console.log('\n[2] 开房（补位电脑强度先写进房间）')
  const hosted = await local('host', { method: 'POST', token, body: { port: args.port, name: '房主', botLevel: args.level } })
  check(hosted.status === 200 && hosted.data.ok, `POST /host -> HTTP ${hosted.status} ${hosted.data.error ?? ''}`)
  if (!hosted.data.ok) throw new Error('开房失败，后续步骤无法继续')
  roomOpened = true
  const { code, loopbackUrl } = hosted.data.authority
  check(hosted.data.snapshot.botLevel === args.level, `房间记住强度 ${BOT_LABELS[args.level]}`)
  check(hosted.data.snapshot.botsSeated === 0, '刚开房时一个电脑都没上')
  check(hosted.data.snapshot.canSetBotCount === true, '还没开局，数量可以调')
  console.log(`     房间码 ${code} · 本地地址 ${loopbackUrl}`)

  console.log('\n[3] 一个人 + 两台电脑')
  const filled = await local('act', { method: 'POST', token, body: { action: { type: 'bots', level: args.level, count: 2 } } })
  check(filled.data.ok === true, `POST /act {type:'bots'} -> ${filled.data.error ?? 'ok'}`)
  let snap = filled.data.snapshot
  check(snap.phase === 'bidding', `坐满立刻发牌（phase=${snap.phase}）`)
  const botSeats = snap.seats.filter((info) => info.bot)
  check(botSeats.length === 2, `两个电脑入座（${botSeats.map((info) => info.name).join('、')}）`)
  check(botSeats.every((info) => info.bot === args.level), `两台都是 ${BOT_LABELS[args.level]}`)
  check(snap.botsSeated === 2 && snap.botLevel === args.level, '快照报出电脑数量与强度')
  check(snap.isHost === true, '自己是房主')
  check(snap.canSetBotLevel === true, '局中仍能换强度')
  check(snap.canSetBotCount === false, '局中不能改数量')
  check(snap.seats.filter((info) => info.seat !== 0).every((info) => info.hand === null), '看不到电脑的手牌')
  check(snap.you.hand.length === 17, '我有 17 张')

  console.log(`\n[4] 先走完我这一手，然后闲置 ${args.waitMs}ms`)
  // The auction opens with the host, so sitting still *before* bidding would leave
  // the table quiet for an innocent reason: nobody has anything to do. Take my turn
  // first, then be deliberately idle.
  if (turnSeat(snap) === 0) {
    const action = snap.phase === 'bidding' ? { type: 'bid', score: 0 } : pickAction(snap)
    const acted = await local('act', { method: 'POST', token, body: { action } })
    check(acted.data.ok === true, `我先走一手（${action.type}）`)
    snap = acted.data.snapshot
  }
  const before = totalActions(snap)
  await sleep(args.waitMs)
  snap = (await local('state', { token })).data.snapshot
  const after = totalActions(snap)
  const waitingOnMe = snap.phase !== 'finished' && turnSeat(snap) === 0
  // A stall would be: not my turn, and the table still has not moved. If the window
  // ended on my turn, standing still is exactly right.
  check(
    after > before || waitingOnMe,
    `没人碰键盘的 ${args.waitMs}ms 里：动作数 ${before} -> ${after}${waitingOnMe ? '（后半程轮到我，台面停着是对的）' : ''}`,
  )
  console.log(`     权威替电脑走了 ${after - before} 步（配置的电脑间隔 700ms）`)

  console.log('\n[5] 我只答自己的回合，把这一盘打完')
  let mine = 0
  let midHand = null
  const deadline = Date.now() + 120000
  while (snap.phase !== 'finished' && Date.now() < deadline) {
    const seat = snap.phase === 'bidding' ? snap.bidTurnSeat : snap.toAct
    if (seat !== 0) {
      await sleep(100)
      snap = (await local('state', { token })).data.snapshot
      continue
    }
    const action =
      snap.phase === 'bidding'
        ? { type: 'bid', score: (snap.bids?.length ?? 0) === 0 ? 1 : 0 }
        : pickAction(snap)
    const result = await local('act', { method: 'POST', token, body: { action } })
    if (!result.data.ok) {
      check(false, `我的 ${action.type} 被拒：${result.data.error}`)
      break
    }
    mine += 1
    snap = result.data.snapshot
    if (snap.phase !== 'finished') midHand = snap
  }
  check(snap.phase === 'finished', `一盘打完（我只出了 ${mine} 手，其余全是权威替电脑走的）`)
  check(mine > 0, '我自己真的出过手')
  check(snap.plays.length > 0, `台面上有 ${snap.plays?.length ?? 0} 次出牌`)

  // The sharpest evidence in this script: these plays happened while the only
  // requests I sent were for seat 0, so every one of them was made by the
  // authority on its own timer.
  const botSeatList = snap.seats.filter((info) => info.bot).map((info) => info.seat)
  const botPlays = (snap.plays ?? []).filter((play) => play.seat !== 0)
  const botBids = (snap.bids ?? []).filter((bid) => bid.seat !== 0)
  check(botPlays.length > 0, `电脑自己出了 ${botPlays.length} 次牌，一次都不是我发的请求`)
  check(
    botPlays.every((play) => botSeatList.includes(play.seat)),
    '那些牌全都来自电脑座位',
  )
  console.log(`     电脑出牌 ${botPlays.length} 次 / 电脑叫分 ${botBids.length} 次；我只发了 ${mine} 次请求（全是 0 号位）`)
  check(
    !(snap.log ?? []).some((entry) => /出手失败|保底/.test(String(entry.note ?? ''))),
    '电脑一次都没提出非法出法、也没被保底兜住',
  )
  check(snap.secretsRevealed === true, '结束后才全明牌')

  // The same anti-leak property the unit tests pin, checked against a snapshot
  // taken *during* the hand — cards that were still secret then.
  if (midHand) {
    const visible = cardStrings(midHand)
    const publicIds = new Set()
    for (const play of snap.plays ?? []) for (const id of play.cards) publicIds.add(id)
    if (snap.bottomRevealed) for (const id of snap.bottom ?? []) publicIds.add(id)
    let leaked = 0
    for (const info of snap.seats) {
      if (info.seat === 0) continue
      for (const id of info.hand ?? []) if (!publicIds.has(id) && visible.has(id)) leaked += 1
    }
    check(leaked === 0, '局中那张快照里没有出现过电脑当时的手牌')
  } else {
    notes.push('这一盘只走到叫分就结束了，没取到局中的快照')
  }

  const whole = new Set()
  for (const info of snap.seats) for (const id of info.hand ?? []) whole.add(id)
  for (const play of snap.plays ?? []) for (const id of play.cards) whole.add(id)
  for (const id of snap.bottom ?? []) whole.add(id)
  check(whole.size === 54, `三家手牌 + 出牌 + 底牌 = ${whole.size} 张`)

  console.log('\n[6] 下一局仍然带着电脑')
  const next = await local('act', { method: 'POST', token, body: { action: { type: 'next' } } })
  check(next.data.ok === true, `下一局 -> ${next.data.error ?? 'ok'}`)
  const again = next.data.snapshot
  check(again.seats.filter((info) => info.bot).length === 2, '两台电脑还在座位上')
  check(again.you.hand.length === 17, '重新发了 17 张')
  check(again.phase === 'bidding', `回到叫分（phase=${again.phase}）`)
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
    console.log('\n[7] --keep：房间保持打开（电脑会继续自己打）')
  }
}

for (const note of notes) console.log(`\n注意：${note}`)
if (problems.length) {
  console.log(`\n失败 ${problems.length} 项：`)
  for (const problem of problems) console.log(`  - ${problem}`)
  process.exit(1)
}
console.log('\n实机电脑补位检查全部通过')
