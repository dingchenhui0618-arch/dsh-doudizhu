#!/usr/bin/env node
//
// The three pre-push checks, executable instead of remembered.
//
//   1. secret scan       — keys, tokens, private keys, and LAN addresses that
//                          were observed on a real machine rather than invented
//   2. .gitignore review — the entries that must stay ignored
//   3. scratch cleanup   — no temp artifact / dependency dump is tracked
//
// It exits non-zero on the first problem, so it can gate the push itself:
//
//   node scripts/pre-push-check.mjs && git push origin main
//
// This exists because a scan whose output a human is supposed to read *after*
// the commit is not a check. A real address did get pushed once that way.
//
// It scans TRACKED files only. What sits in the working tree but is not
// committed is not what gets published — and `_tmp/` is deliberately full of
// state dumps and screenshots with local addresses in them.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const problems = []

// ---------------------------------------------------------------- 1. secrets --

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key block'],
  [/\bghp_[A-Za-z0-9]{20,}/, 'a GitHub personal access token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/, 'a GitHub fine-grained token'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'an OpenAI-style API key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
  [/\b(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i, 'an inline credential'],
  [/C:\\Users\\[^\\\s]+/i, 'a real home directory path'],
]

// Addresses this repo is allowed to show because they are documentation
// examples. Extend this list only with a reason: the point of the check is to
// catch an address someone actually observed on their own network.
const DOC_ADDRESSES = new Set([
  '0.0.0.0',
  '127.0.0.1',
  '10.0.0.1',
  '172.22.0.1',
  '192.168.1.1',
  '192.168.1.7',
  '192.168.1.50',
  '192.168.1.99',
])
const PRIVATE_IPV4 =
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g

// ------------------------------------------------------------- 2. gitignore --

const REQUIRED_IGNORES = ['node_modules/', '.env', '*.pem', '*.key', '_tmp/', '*.tgz']

// --------------------------------------------------------------- 3. scratch --

const SCRATCH_PATTERNS = [
  [/(^|\/)_tmp\//, 'lives under _tmp/'],
  [/(^|\/)node_modules\//, 'is a dependency dump'],
  [/\.tgz$/, 'is a packed artifact (release assets do not belong in the tree)'],
  [/\.log$/, 'is a log'],
  [/\.(png|jpg|jpeg|webp)$/, 'is an image'],
]

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
}

const files = trackedFiles()

for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue // binary or unreadable: the scratch check below still sees the path
  }
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const [pattern, what] of SECRET_PATTERNS) {
      if (pattern.test(line)) problems.push(`${file}:${index + 1} contains ${what}`)
    }
    for (const match of line.matchAll(PRIVATE_IPV4)) {
      if (!DOC_ADDRESSES.has(match[0])) {
        problems.push(`${file}:${index + 1} contains the private address ${match[0]} — not a documentation example`)
      }
    }
  })
  for (const [pattern, why] of SCRATCH_PATTERNS) {
    if (pattern.test(file)) problems.push(`${file} ${why}`)
  }
}

let ignoreText = ''
try {
  ignoreText = readFileSync('.gitignore', 'utf8')
} catch {
  problems.push('.gitignore is missing')
}
for (const entry of REQUIRED_IGNORES) {
  if (!ignoreText.split(/\r?\n/).some((line) => line.trim() === entry)) {
    problems.push(`.gitignore does not ignore ${entry}`)
  }
}

// ------------------------------------------------------------------- report --

console.log(`pre-push check: ${files.length} tracked files, ${DOC_ADDRESSES.size} allowed example addresses`)
if (problems.length) {
  console.log(`\nFAIL — ${problems.length} problem(s); do not push:`)
  for (const problem of problems) console.log(`  ${problem}`)
  process.exit(1)
}
console.log('PASS — no secrets, no observed addresses, .gitignore intact, no scratch tracked')
