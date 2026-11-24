import { build } from 'esbuild'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const result = await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: 'dist-server/index.cjs',
  metafile: true,
})
const read = path => readFileSync(path, 'utf8')

// Follow the emitted code, including bundled dependencies declared as build tools.
const packages = JSON.parse(read('package-lock.json')).packages
const bundled = new Set()
for (const output of Object.values(result.metafile.outputs)) {
  for (const [source, metrics] of Object.entries(output.inputs)) {
    if (!source.startsWith('node_modules/') || metrics.bytesInOutput === 0) continue
    let dir = dirname(source)
    while (!packages[dir] && dir !== '.') dir = dirname(dir)
    if (dir === '.') throw new Error(`Could not identify bundled dependency for ${source}`)
    bundled.add(dir)
  }
}

function noticeFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules') found.push(...noticeFiles(path))
    if (entry.isFile() && /^(licen[sc]e|notice|copying)(?:[-.]|$)/i.test(entry.name)) found.push(path)
  }
  return found
}

const notices = []
for (const dir of [...bundled].sort()) {
  const { name, version } = JSON.parse(read(join(dir, 'package.json')))
  const files = noticeFiles(dir).sort()
  notices.push(`# ${name}@${version}`)
  if (files.length === 0 && name === 'standardwebhooks' && version === '1.3.0') {
    // The npm archive omits the libraries/LICENSE inherited by libraries/javascript.
    notices.push('https://github.com/standard-webhooks/standard-webhooks/blob/daee8284cfe9d4e435ec16e3e68a8f30084d6aaf/libraries/LICENSE')
    notices.push(read('scripts/licenses/standardwebhooks-1.3.0-LICENSE.txt'))
  } else {
    if (files.length === 0) throw new Error(`Missing license text for ${name}@${version}`)
    for (const file of files) notices.push(relative(dir, file), read(file))
  }
}
writeFileSync('dist-server/THIRD-PARTY-NOTICES.txt', notices.join('\n\n'))

// Vite supplies package license texts. Keep the additional attributions embedded in
// the font's name table and QR implementation when those packages are distributed.
const clientPath = 'dist/CLIENT-LICENSES.json'
const client = JSON.parse(read(clientPath))
for (const entry of client) {
  if (!entry.text) throw new Error(`Missing client license text for ${entry.name}@${entry.version}`)
  if (entry.name === '@fontsource/big-shoulders-display') {
    entry.attribution = 'Copyright 2019 The Big Shoulders Project Authors (https://github.com/xotypeco/big_shoulders)'
  }
  if (entry.name === 'qrcode') {
    entry.attribution = 'Copyright (c) 2011 Ryan Day. Copyright (c) 2009 Kazuhiko Arase.'
  }
}
writeFileSync(clientPath, JSON.stringify(client, null, 2) + '\n')
