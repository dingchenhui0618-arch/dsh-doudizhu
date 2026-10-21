#!/usr/bin/env node
/**
 * 一条命令发版：build → pack → npm publish → tag/push → GitHub Release → 市场条目 PR → 校验。
 *
 * 为什么要有这个脚本：0.1.4 和 0.1.5 都是手工敲的，每版 6 步、每步都要人肉核对
 * （sha256 三处一致、市场的 tarball 指到新版、用例数跟上）。手工链条里最容易漏的
 * 恰恰是最后那步——市场条目还指着上一版。这些步骤全部可以判定「做了没做」，
 * 所以它们应该由脚本判，而不是由我记得。
 *
 * 每步都先查现状再动手，重复跑安全（幂等）：
 *   - 版本已经在 npm 上 → 跳过发布，只校验；
 *   - tag 已存在 → 不重复打，只校验它指向的 commit；
 *   - Release 已存在 → 不重建，只校验 asset 的 sha256；
 *   - 市场条目已经指着这一版 → 跳过；有同分支的 PR → 就地更新；没有 → 从 main 起新分支。
 *
 * 用法：
 *   node scripts/release.mjs --dry-run                  # 只打印将要执行什么
 *   node scripts/release.mjs                            # 真跑（不含市场步）
 *   node scripts/release.mjs --market                   # 连市场条目一起更新（会开/改 PR）
 *   node scripts/release.mjs --skip npm --dry-run
 *
 * 退出码：0 = 全部完成或按需跳过；2 = 有步骤被卡住（例如 npm 未登录）；1 = 有步骤失败。
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TMP = join(ROOT, '_tmp')
const STEPS = ['preflight', 'build', 'pack', 'npm', 'git', 'release', 'market', 'verify']

/* ------------------------------------------------------------------ 参数 -- */

function parseArgs(argv) {
  const out = { dry: false, skip: new Set(), market: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => {
      const value = argv[i + 1]
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} 需要一个值`)
      i += 1
      return value
    }
    if (arg === '--dry-run') out.dry = true
    else if (arg === '--market') out.market = true
    else if (arg === '--version') out.version = next()
    else if (arg === '--skip') for (const id of next().split(',')) out.skip.add(id.trim())
    else if (arg === '--npm-name') out.npmName = next()
    else if (arg === '--market-repo') out.marketRepo = next()
    else if (arg === '--market-fork') out.marketFork = next()
    else if (arg === '--help' || arg === '-h') out.help = true
    else throw new Error(`看不懂参数 ${arg}`)
  }
  for (const id of out.skip) if (!STEPS.includes(id)) throw new Error(`--skip 里有未知步骤 ${id}`)
  return out
}

/* ------------------------------------------------------------- 跑命令 -- */

function quote(value) {
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}

function sh(cmd, args = [], { cwd = ROOT, dry = false, quiet = false, shell = false } = {}) {
  const printable = [cmd, ...args].map(quote).join(' ')
  if (dry) {
    if (!quiet) console.log(`    $ ${printable}`)
    return { ok: true, out: '', code: 0 }
  }
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell, maxBuffer: 64 << 20 })
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
  if (res.status !== 0 && !quiet) console.log(`    $ ${printable}\n      → 退出码 ${res.status}${out ? `\n      ${out.split('\n').slice(-4).join('\n      ')}` : ''}`)
  return { ok: res.status === 0, out, code: res.status ?? 1 }
}

/** 返回 {ok,out}，不打印、不抛。 */
const probe = (cmd, args, opts = {}) => sh(cmd, args, { ...opts, quiet: true })

// Windows 上 npm 是 .cmd，必须借 shell 才能解析；其余命令都有 .exe。
const npm = (args, opts = {}) => sh('npm', args, { ...opts, shell: process.platform === 'win32' })

/* ---------------------------------------------------------------- 小工具 -- */

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const rel = (p) => p.replace(ROOT, '.').replace(/\\/g, '/')
const warn = (msg) => console.log(`  ! ${msg}`)
const FAILED = []
const BLOCKED = []

function stepStarted(title) {
  console.log(`\n▶ ${title}`)
}
function note(message) {
  console.log(`  · ${message}`)
}

/** 读 package.json（不走 require，避免缓存）。 */
function readPkg() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
}

/** CHANGELOG 里 `## [x.y.z]` 那一节，用来当 Release notes 的正文。 */
function changelogSection(version) {
  const path = join(ROOT, 'CHANGELOG.md')
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8')
  const head = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n`, 'm')
  const hit = head.exec(text)
  if (!hit) return null
  const rest = text.slice(hit.index + hit[0].length)
  const next = /^## \[/m.exec(rest)
  return (next ? rest.slice(0, next.index) : rest).trim()
}

/** 从 `git remote get-url origin` 里取 owner/repo。 */
function githubSlug() {
  const url = probe('git', ['remote', 'get-url', 'origin']).out
  const m = /github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?$/.exec(url.trim())
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

/* ------------------------------------------------------------- 各步骤 -- */

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log('node scripts/release.mjs [--dry-run] [--market] [--version x.y.z] [--skip a,b]')
    return 0
  }
  mkdirSync(TMP, { recursive: true })

  const pkg = readPkg()
  const version = args.version ?? pkg.version
  const tag = `v${version}`
  const slug = githubSlug()
  if (!slug) throw new Error('取不到 origin 的 GitHub owner/repo')
  const repoSlug = `${slug.owner}/${slug.repo}`
  const dry = args.dry
  const want = (id) => !args.skip.has(id) && (id !== 'market' || args.market)
  const results = []

  console.log(`📦 ${pkg.name} ${version}  (${repoSlug}${dry ? ' · dry-run' : ''})`)

  /* -- 1. 前置检查 ------------------------------------------------------ */
  if (want('preflight')) {
    stepStarted('前置检查')
    const problems = []
    if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`版本号格式不像 x.y.z：${version}`)
    if (!existsSync(join(ROOT, 'lib/index.js')) || !existsSync(join(ROOT, 'lib/client.js'))) problems.push('lib/ 里缺构建产物')
    if (!changelogSection(version)) problems.push(`CHANGELOG.md 里没有 ## [${version}] 这一节`)
    if (!probe('git', ['rev-parse', '--is-inside-work-tree']).ok) problems.push('不是一个 git 仓库')
    if (pkg.repository === undefined) problems.push('package.json 缺 repository —— 市场的 npm 映射要靠它认领，不补就白发布')
    const status = probe('git', ['status', '--porcelain']).out
    if (status) problems.push(`工作区不干净，先提交再发版：\n${status.split('\n').map((l) => '      ' + l).join('\n')}`)
    const branch = probe('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out
    if (branch !== 'main') problems.push(`当前分支是 ${branch}，发版只从 main 走`)
    if (problems.length) {
      for (const p of problems) warn(p)
      results.push({ step: 'preflight', status: 'failed' })
      FAILED.push('preflight')
      report(results, version, args)
      return 1
    }
    note(`版本 ${version}、分支 main、工作区干净、CHANGELOG 有这一节、有仓库元数据`)

    const tests = probe(join(process.execPath), ['--test', 'test/*.test.mjs'])
    const pass = Number((/# pass (\d+)/.exec(tests.out) ?? /pass (\d+)/.exec(tests.out) ?? [])[1] ?? -1)
    const fail = Number((/# fail (\d+)/.exec(tests.out) ?? /fail (\d+)/.exec(tests.out) ?? [])[1] ?? -1)
    if (!tests.ok || fail !== 0) {
      warn(`单测没过：pass=${pass} fail=${fail}`)
      results.push({ step: 'preflight', status: 'failed' })
      FAILED.push('preflight')
      report(results, version, args)
      return 1
    }
    args.tests = pass
    note(`单测 ${pass} 条全过`)

    const prepush = probe(join(process.execPath), ['scripts/pre-push-check.mjs'])
    if (!prepush.ok) {
      warn('pre-push 三步检查没过（密钥 / .gitignore / 无关文件）')
      results.push({ step: 'preflight', status: 'failed' })
      FAILED.push('preflight')
      report(results, version, args)
      return 1
    }
    note('pre-push 三步检查 PASS')
    results.push({ step: 'preflight', status: 'done', tests: pass })
  }

  /* -- 2. 构建 --------------------------------------------------------- */
  if (want('build')) {
    stepStarted('构建')
    const built = sh(join(process.execPath), ['scripts/build.mjs'], { dry })
    if (!built.ok) {
      FAILED.push('build')
      results.push({ step: 'build', status: 'failed' })
    } else {
      note(dry ? '将重建 lib/' : built.out.split('\n').filter(Boolean).join(' / '))
      results.push({ step: 'build', status: 'done' })
    }
  }

  /* -- 3. 打包 + 指纹 -------------------------------------------------- */
  let tarball = null
  let digest = null
  if (want('pack')) {
    stepStarted('打包')
    tarball = join(TMP, `${pkg.name}-${version}.tgz`)
    const packed = npm(['pack', '--pack-destination', TMP], { dry })
    if (!packed.ok) {
      FAILED.push('pack')
      results.push({ step: 'pack', status: 'failed' })
    } else if (!existsSync(tarball) && !dry) {
      warn(`没找到 ${rel(tarball)}`)
      FAILED.push('pack')
      results.push({ step: 'pack', status: 'failed' })
    } else {
      if (!dry) {
        digest = sha256(tarball)
        const size = readFileSync(tarball).length
        // 包里必须真的有这一版：解出来的 package.json 版本对得上，lib/ 两个半区都在。
        const inspect = spawnSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' })
        const inner = inspect.status === 0 ? JSON.parse(inspect.stdout) : null
        if (!inner || inner.version !== version) {
          warn(`包内 package.json 版本不是 ${version}`)
          FAILED.push('pack')
          results.push({ step: 'pack', status: 'failed' })
        } else {
          note(`${rel(tarball)} · ${size} 字节 · sha256 ${digest}`)
          results.push({ step: 'pack', status: 'done', tarball: rel(tarball), size, sha256: digest })
        }
      } else {
        note(`将打出 ${rel(tarball)}`)
        results.push({ step: 'pack', status: 'done' })
      }
    }
  }

  /* -- 4. npm 发布 ----------------------------------------------------- */
  let npmName = null
  let npmPublished = false
  if (want('npm')) {
    stepStarted('npm 发布')
    if (dry) {
      // dry-run 不碰登录态（whoami 会真的打网络），只把判定逻辑讲清楚。
      note(`将检查 npm 登录态；包名 ${args.npmName ?? pkg.name} 被别人占着就提示改用 scope 名`)
      note(`已在 npm 上的版本会跳过发布；否则 $ npm publish --access public`)
      results.push({ step: 'npm', status: 'planned' })
    } else {
    const who = npm(['whoami'])
    if (!who.ok) {
      // 登录态是外部条件，脚本不猜也不编：如实标 BLOCKED，把命令交给用户。
      warn('npm 没登录（或 token 失效）。这一版其余步骤不受影响，npm 之后再跑一次即可：')
      warn('  npm login            # 或者写一个带 publish 权限、能绕 2FA 的 token 到 ~/.npmrc')
      BLOCKED.push('npm：需要 npmjs 登录态')
      results.push({ step: 'npm', status: 'blocked', why: 'npm 未登录' })
    } else {
      const me = who.out.trim().split('\n').pop()
      if (!dry) note(`已登录 npm 账号 ${me}`)
      const name = args.npmName ?? pkg.name
      npmName = name
      // 包名归属：别人先占了就退回 scope 名，别浪费一轮失败。只有发不带 scope 的原名时
      // 才需要问这一句——scope 名下不可能有别人的包。
      if (!args.npmName) {
        const owner = probe('npm', ['view', pkg.name, 'maintainers', '--json'], { shell: process.platform === 'win32' })
        const maintainers = owner.ok ? (() => { try { const parsed = JSON.parse(owner.out); return Array.isArray(parsed) ? parsed.map((m) => m.name ?? m) : [] } catch { return [] } })() : []
        if (maintainers.length && !maintainers.includes(me)) {
          warn(`npm 上的 ${pkg.name} 归 ${maintainers.join(', ')}，不是你（${me}）`)
          warn(`  要么让它转给你，要么用 scope 发：--npm-name @${me}/${pkg.name}`)
          BLOCKED.push(`npm：包名 ${pkg.name} 被 ${maintainers.join(', ')} 占着`)
          results.push({ step: 'npm', status: 'blocked', why: `包名被 ${maintainers.join(', ')} 占用` })
        }
      }
      if (!BLOCKED.length) {
        const existing = probe('npm', ['view', `${name}@${version}`, 'version'], { shell: process.platform === 'win32' })
        if (existing.ok && existing.out.includes(version)) {
          note(`${name}@${version} 已经在 npm 上，跳过发布（只校验）`)
          npmPublished = true
          results.push({ step: 'npm', status: 'done', name, version, already: true })
        } else {
          // 用的是另一个名字（scope）时，发的是**解包出来再改名字**的那份：内容与 GitHub
          // asset 逐字节相同，只改 package.json 的 name 和 patch 里的引用名，两处必须一起改，
          // 否则 scoped 安装后 bundle patch 指不回自己的 lib/。
          let publishDir = ROOT
          if (name !== pkg.name) {
            const stage = join(TMP, 'npm-stage')
            rmSync(stage, { recursive: true, force: true })
            mkdirSync(stage, { recursive: true })
            const untar = sh('tar', ['-xzf', tarball, '-C', stage])
            if (!untar.ok) {
              warn('解不开刚打出来的 tarball，没发。')
              FAILED.push('npm')
              results.push({ step: 'npm', status: 'failed' })
            } else {
              publishDir = join(stage, 'package')
              const pjPath = join(publishDir, 'package.json')
              const staged = JSON.parse(readFileSync(pjPath, 'utf8'))
              staged.name = name
              // 打包产物里没有 scripts/，`prepack` 会在暂存目录里跑一次 build 然后失败。
              // tarball 里已经带着构建好的 lib/，发布时不需要再跑生命周期脚本。
              if (staged.scripts) {
                delete staged.scripts.prepack
                delete staged.scripts.prepare
              }
              writeFileSync(pjPath, JSON.stringify(staged, null, 2) + '\n')
              const patchPath = join(publishDir, 'cordis.patch.yml')
              if (existsSync(patchPath)) {
                writeFileSync(patchPath, readFileSync(patchPath, 'utf8')
                  .replace(/^(\s*name:\s*)dsh-doudizhu\s*$/gm, `$1${name}`))
              }
              note(`暂存目录 ${rel(publishDir)}（包名与 patch 引用改成 ${name}）`)
            }
          }
          if (!FAILED.includes('npm')) {
            const published = npm(['publish', '--access', 'public'], { dry, cwd: publishDir })
            if (!published.ok) {
              if (/EOTP|one-time password/i.test(published.out)) {
                // 2FA 刷卡这一步自动化不了：npm 要在能等的终端里打开浏览器、等你按一下安全密钥。
                warn('npm 要 2FA：publish 必须在一个能等你的终端里跑，脚本这种非交互调用等不了。')
                warn('在一个真终端窗口里贴这两行（浏览器会弹出来，按一下安全密钥即可）：')
                warn(`  cd "${publishDir}"`)
                warn('  npm publish --access public')
                BLOCKED.push('npm：publish 需要 2FA（跑一次上面的命令）')
                results.push({ step: 'npm', status: 'blocked', why: '2FA 需要交互终端' })
              } else {
                warn('npm publish 失败，原文见上。常见原因：未登录 / 2FA / 包名被占 / 版本已存在')
                BLOCKED.push('npm：publish 失败')
                results.push({ step: 'npm', status: 'blocked', why: 'publish 失败' })
              }
            } else {
              npmPublished = true
              note(`${name}@${version} 已发布`)
              results.push({ step: 'npm', status: 'done', name, version })
            }
          }
        }
      }
    }
    }
  }

  /* -- 5. 提交 / 打 tag / 推送 ----------------------------------------- */
  if (want('git')) {
    stepStarted('git：tag + 推送')
    const localTag = probe('git', ['tag', '--list', tag]).out.trim()
    if (localTag) {
      note(`tag ${tag} 已存在，不重复打`)
    } else {
      const created = sh('git', ['tag', '-a', tag, '-m', `${pkg.name} ${tag}`], { dry })
      if (!created.ok) FAILED.push('git')
      else note(dry ? `将打 tag ${tag}` : `已打 tag ${tag}`)
    }
    const pushedTag = probe('git', ['ls-remote', 'origin', `refs/tags/${tag}`]).out.trim()
    if (!pushedTag) {
      const pushed = sh('git', ['push', 'origin', 'main', `refs/tags/${tag}`], { dry })
      if (!pushed.ok) FAILED.push('git')
      else note(dry ? `将推送 main 与 ${tag}` : `已推送 main 与 ${tag}`)
    } else {
      note(`origin 上已有 ${tag}`)
    }
    const head = probe('git', ['rev-parse', '--short', 'HEAD']).out.trim()
    note(`HEAD ${head}`)
    results.push({ step: 'git', status: FAILED.includes('git') ? 'failed' : 'done', tag })
  }

  /* -- 6. GitHub Release + 指纹复核 ------------------------------------ */
  let releaseUrl = null
  if (want('release')) {
    stepStarted('GitHub Release')
    const view = probe('gh', ['release', 'view', tag, '--json', 'url,assets'])
    if (view.ok) {
      const info = JSON.parse(view.out)
      releaseUrl = info.url
      const asset = (info.assets ?? []).find((a) => a.name === `${pkg.name}-${version}.tgz`)
      if (!asset) {
        warn(`Release ${tag} 存在但缺 asset ${pkg.name}-${version}.tgz`)
        BLOCKED.push('release：asset 缺失')
        results.push({ step: 'release', status: 'blocked', why: 'asset 缺失', url: releaseUrl })
      } else if (digest && asset.digest && asset.digest !== `sha256:${digest}`) {
        warn(`asset 指纹和本地包不一致：registry ${asset.digest} vs 本地 sha256:${digest}`)
        FAILED.push('release')
        results.push({ step: 'release', status: 'failed', why: '指纹不一致', url: releaseUrl })
      } else {
        note(`Release ${tag} 已存在，asset 指纹与本地一致`)
        results.push({ step: 'release', status: 'done', url: releaseUrl, asset: asset.name })
      }
    } else {
      // notes = CHANGELOG 那一节 + 安装方式 + 指纹，指纹在打包时就有了。
      const body = changelogSection(version) ?? `## ${tag}\n`
      const lines = [
        body,
        '',
        '## 安装',
        '',
        '```',
        `https://github.com/${repoSlug}/releases/download/${tag}/${pkg.name}-${version}.tgz`,
        '```',
        '',
        npmPublished && npmName ? `npm：\`npm view ${npmName}@${version}\`` : '',
        '',
        digest ? `**SHA256** \`${digest}\`` : '',
      ].filter((line) => line !== '')
      const notesPath = join(TMP, `release-notes-${version}.md`)
      if (!dry) writeFileSync(notesPath, lines.join('\n') + '\n')
      const created = sh('gh', ['release', 'create', tag, tarball ?? '', '--title', `${tag}`, '--notes-file', notesPath], { dry })
      if (!created.ok) {
        FAILED.push('release')
        results.push({ step: 'release', status: 'failed' })
      } else {
        releaseUrl = created.out.trim().split('\n').pop() || null
        note(dry ? `将创建 Release ${tag}` : `已创建 Release ${releaseUrl}`)
        results.push({ step: 'release', status: 'done', url: releaseUrl })
      }
    }
  }

  /* -- 7. 市场条目 ----------------------------------------------------- */
  if (want('market')) {
    stepStarted('市场条目（awesome-dsh-plugin）')
    const marketDir = args.marketRepo ?? 'D:\\Projects\\awesome-dsh-plugin'
    const fork = args.marketFork ?? 'fork'
    const entry = `data/plugins/${slug.owner}__${slug.repo}.yml`
    if (!existsSync(join(marketDir, '.git'))) {
      warn(`市场克隆不在 ${marketDir}（用 --market-repo 指定）`)
      BLOCKED.push('market：找不到市场克隆')
      results.push({ step: 'market', status: 'blocked', why: '找不到市场克隆' })
    } else {
      sh('git', ['-C', marketDir, 'fetch', 'origin', '--prune'], { dry })
      const mainEntry = probe('git', ['-C', marketDir, 'show', `origin/main:${entry}`])
      if (!mainEntry.ok) {
        warn(`origin/main 里没有 ${entry}`)
        BLOCKED.push('market：条目不在 main 上（还没被收录？）')
        results.push({ step: 'market', status: 'blocked', why: '条目不在 main 上' })
      } else {
        const shown = /releases\/download\/v([\d.]+)\//.exec(mainEntry.out)
        const onMain = shown ? shown[1] : null
        if (onMain === version) {
          note(`main 上已经是 v${version}，不用再提`)
          results.push({ step: 'market', status: 'done', already: true, mainVersion: onMain })
        } else {
          // 目标版本 + 用例数要写进条目：tarball 换版本，描述里的用例数跟上。
          const edit = (text) => {
            let next = text.replace(/releases\/download\/v[\d.]+\/[^\s'"]+\.tgz/, `releases/download/${tag}/${pkg.name}-${version}.tgz`)
            if (args.tests) {
              next = next.replace(/\b\d+ unit tests\b/g, `${args.tests} unit tests`)
              next = next.replace(/\d+ 个单元测试/g, `${args.tests} 个单元测试`)
            }
            return next
          }
          // 同一个条目已经有开着的 PR 时就地更新那一条分支——不要给维护者开第二个同题 PR。
          // （2026-10-19：#7526 合并后我往旧分支 push 只留了个孤儿提交，教训写进 README。）
          let branch = `update-${slug.repo}-${tag}`
          let openPr = null
          const listed = probe('gh', ['pr', 'list', '--repo', 'awesome-dsh-plugin/awesome-dsh-plugin', '--state', 'open', '--search', `${slug.repo} in:title`, '--json', 'number,headRefName,url', '--limit', '20'])
          if (listed.ok) {
            let candidates = []
            try {
              candidates = JSON.parse(listed.out || '[]')
            } catch {
              candidates = []
            }
            for (const candidate of candidates) {
              const files = probe('gh', ['pr', 'view', String(candidate.number), '--repo', 'awesome-dsh-plugin/awesome-dsh-plugin', '--json', 'files'])
              let paths = []
              try {
                paths = (JSON.parse(files.out || '{}').files ?? []).map((f) => f.path)
              } catch {
                paths = []
              }
              if (paths.includes(entry)) {
                openPr = candidate
                branch = candidate.headRefName
                break
              }
            }
          }
          const wt = join(TMP, `market-${tag}`)
          if (!dry) {
            rmSync(wt, { recursive: true, force: true })
            if (openPr) {
              sh('git', ['-C', marketDir, 'fetch', fork], { dry })
              sh('git', ['-C', marketDir, 'worktree', 'add', '-B', branch, wt, `${fork}/${branch}`], { dry })
            } else {
              sh('git', ['-C', marketDir, 'worktree', 'add', '-B', branch, wt, 'origin/main'], { dry })
            }
          }
          const file = join(wt, entry)
          if (!dry) {
            const before = readFileSync(file, 'utf8')
            const after = edit(before)
            if (after === before) {
              warn('条目里没找到可替换的 tarball 行，市场步停下请手工看一眼')
              BLOCKED.push('market：条目内容没变')
              results.push({ step: 'market', status: 'blocked', why: '条目没变化' })
            } else {
              writeFileSync(file, after)
              sh('git', ['-C', wt, 'add', entry])
              sh('git', ['-C', wt, 'commit', '-m', `Update the ${slug.repo} entry to ${tag}`])
              const pushed = sh('git', ['-C', wt, 'push', fork, `HEAD:${branch}`])
              const body = [
                `Updates \`${slug.owner}/${slug.repo}\` from v${onMain ?? '?'} to ${tag}.`,
                '',
                `- tarball → ${tag}`,
                args.tests ? `- test count → ${args.tests}` : '',
                '',
                'Release: ' + (releaseUrl ?? `https://github.com/${repoSlug}/releases/tag/${tag}`),
              ].filter(Boolean).join('\n')
              const bodyPath = join(TMP, `market-body-${version}.md`)
              writeFileSync(bodyPath, body + '\n')
              const title = `Update the ${slug.repo} entry to ${tag}`
              if (!pushed.ok) {
                FAILED.push('market')
                results.push({ step: 'market', status: 'failed', why: 'push 失败' })
              } else if (openPr) {
                // 就地更新还要把标题/正文里的版本号改掉，否则 PR 叫 v0.1.5 内容却是 v0.1.6。
                const edited = sh('gh', ['pr', 'edit', String(openPr.number), '--repo', 'awesome-dsh-plugin/awesome-dsh-plugin', '--title', title, '--body-file', bodyPath])
                if (!edited.ok) FAILED.push('market')
                note(`已更新 PR #${openPr.number}（标题与正文同步到 ${tag}），CI 会重跑`)
                results.push({ step: 'market', status: edited.ok ? 'done' : 'failed', pr: openPr.number, url: openPr.url })
              } else {
                const created = sh('gh', ['pr', 'create', '--repo', 'awesome-dsh-plugin/awesome-dsh-plugin', '--base', 'main', '--head', `${slug.owner}:${branch}`, '--title', title, '--body-file', bodyPath])
                if (!created.ok) {
                  FAILED.push('market')
                  results.push({ step: 'market', status: 'failed', why: 'PR 创建失败' })
                } else {
                  note(`已开 PR ${created.out.trim()}`)
                  results.push({ step: 'market', status: 'done', url: created.out.trim() })
                }
              }
            }
            rmSync(wt, { recursive: true, force: true })
            sh('git', ['-C', marketDir, 'worktree', 'prune'], { quiet: true })
          } else {
            note(`将在 ${marketDir} 起分支 ${branch}，把 tarball 从 v${onMain} 改到 ${tag}${args.tests ? `，用例数改成 ${args.tests}` : ''}`)
            note(openPr ? `同分支 PR #${openPr.number} 已开着 → 就地更新` : '没有同分支 PR → 从 origin/main 起新分支并开 PR')
            results.push({ step: 'market', status: 'planned' })
          }
        }
      }
    }
  }

  /* -- 8. 校验 --------------------------------------------------------- */
  if (want('verify')) {
    stepStarted('校验')
    if (digest && existsSync(tarball)) {
      const again = sha256(tarball)
      note(`本地包 sha256 ${again === digest ? '稳定' : '变了！'}`)
      if (again !== digest) FAILED.push('verify')
      const dl = join(TMP, `download-check-${version}.tgz`)
      if (!dry) {
        const url = `https://github.com/${repoSlug}/releases/download/${tag}/${pkg.name}-${version}.tgz`
        const got = sh('curl', ['-sL', '-o', dl, `${url}?cb=${Date.now()}`])
        if (!got.ok || !existsSync(dl)) {
          warn('下载新的包失败')
          FAILED.push('verify')
        } else {
          const remote = sha256(dl)
          note(`下载回来的包 sha256 ${remote === digest ? '一致' : '不一致！'}`)
          if (remote !== digest) FAILED.push('verify')
        }
      }
    } else if (dry) {
      note('将对本地包、GitHub asset、下载回来的包三处比对 sha256')
    }
    results.push({ step: 'verify', status: FAILED.includes('verify') ? 'failed' : 'done' })
  }

  report(results, version, args)
  if (FAILED.length) return 1
  if (BLOCKED.length) return 2
  return 0
}

function report(results, version, args) {
  const receipt = { version, dryRun: !!args.dry, at: new Date().toISOString(), results, failed: FAILED, blocked: BLOCKED }
  try {
    mkdirSync(TMP, { recursive: true })
    writeFileSync(join(TMP, `release-${version}.json`), JSON.stringify(receipt, null, 2) + '\n')
  } catch {
    /* 收据写不下不影响发布结论 */
  }
  const icon = { done: '✅', failed: '❌', blocked: '⛔', planned: '📝' }
  console.log('\n┌────────────┬────────┐')
  for (const r of results) console.log(`│ ${r.step.padEnd(10)} │ ${icon[r.status] ?? '·'} ${r.status.padEnd(4)} │`)
  console.log('└────────────┴────────┘')
  for (const b of BLOCKED) console.log(`⛔ ${b}`)
  for (const f of FAILED) console.log(`❌ ${f}`)
  if (!FAILED.length && !BLOCKED.length) console.log(`\n🟢 ${version} 发布完毕${args.dry ? '（dry-run，什么都没改）' : ''}`)
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  })
