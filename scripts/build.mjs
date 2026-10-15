#!/usr/bin/env node
//
// Builds the two halves of the plugin into lib/, which is committed because
// users install the prebuilt npm package and never run this themselves.
//
//   src/host.js    -> lib/index.js    (Node ESM; the cordis plugin)
//   src/client.cjs -> lib/client.js   (browser CJS wrapped for __ModuleLoader__)
//
// The client step is skipped while src/client.cjs does not exist yet, so the
// host half can be built and exercised on its own.

import { build } from 'esbuild'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { wrapClient } from './wrap-client.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'lib')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

async function isFile(path) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

await build({
  entryPoints: [join(root, 'src/host.js')],
  outfile: join(out, 'index.js'),
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  bundle: true,
  // Runtime dependencies stay external and empty on purpose: the published
  // package must install with no dependency tree at all.
  packages: 'external',
  logLevel: 'warning',
})

const built = []

// A bundle that fails to load must fail the build, not the user's GUI.
const host = await import(pathToFileURL(join(out, 'index.js')).href)
if (host.name !== pkg.name) {
  throw new Error(`host plugin name mismatch: ${host.name} !== ${pkg.name}`)
}
if (typeof host.apply !== 'function') throw new Error('host plugin is missing apply(ctx)')
if (!Array.isArray(host.inject) || !host.inject.includes('webServer')) {
  throw new Error('host plugin must inject the webServer service')
}
built.push('lib/index.js')

if (await isFile(join(root, 'src/client.cjs'))) {
  const temporary = join(out, '_client.js')
  await build({
    entryPoints: [join(root, 'src/client.cjs')],
    outfile: temporary,
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    bundle: true,
    // React comes from the harness, never from the bundle.
    external: ['react'],
    logLevel: 'warning',
  })
  const source = await readFile(temporary, 'utf8')
  await rm(temporary)
  const clientBundle = wrapClient(source, pkg.name)
  // Parse it now so a syntax error is a build failure rather than a GUI failure.
  new Function(clientBundle)
  await writeFile(join(out, 'client.js'), clientBundle)
  built.push('lib/client.js')
} else {
  console.log('src/client.cjs not present yet — host half only')
}

console.log(`Built ${pkg.name} ${pkg.version}: ${built.join(', ')}`)
