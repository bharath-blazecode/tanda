// Renders the PWA icons from public/logo.svg, then checks the manifest against what was written.
// Run with `node scripts/icons.mjs` after changing the logo, and commit the PNGs.
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const out = join(pub, 'icons')
const BENCH = '#121A18'
// Render the vector at high density so downscaling stays crisp.
const svg = await readFile(join(pub, 'logo.svg'))
const mark = (size) => sharp(svg, { density: 1200 }).resize(size, size).png().toBuffer()

// The mark centred on a solid square: opaque for iOS, inside the safe zone for maskable.
async function onBench(file, size, markSize) {
  const offset = Math.round((size - markSize) / 2)
  const composed = await sharp({ create: { width: size, height: size, channels: 4, background: BENCH } })
    .composite([{ input: await mark(markSize), top: offset, left: offset }])
    .png()
    .toBuffer()
  // Second pass drops the alpha channel entirely: iOS paints transparency black.
  await sharp(composed)
    .flatten({ background: BENCH })
    .removeAlpha()
    .png()
    .toFile(join(out, file))
}

await mkdir(out, { recursive: true })
await sharp(await mark(192)).toFile(join(out, 'icon-192.png'))
await sharp(await mark(512)).toFile(join(out, 'icon-512.png'))
// Maskable safe zone is the central 80% circle; a 70% square fits inside it.
await onBench('icon-maskable-512.png', 512, Math.round(512 * 0.7))
await onBench('apple-touch-icon.png', 180, 156)

// Check: the manifest parses and every icon exists at its stated size.
const manifest = JSON.parse(await readFile(join(pub, 'manifest.webmanifest'), 'utf8'))
let bad = 0
for (const icon of manifest.icons) {
  const path = join(pub, icon.src)
  if (!existsSync(path)) {
    console.error(`missing ${icon.src}`)
    bad++
    continue
  }
  const { width, height } = await sharp(path).metadata()
  if (`${width}x${height}` !== icon.sizes) {
    console.error(`${icon.src} is ${width}x${height}, manifest says ${icon.sizes}`)
    bad++
  } else {
    console.log(`ok ${icon.src} ${icon.sizes} ${icon.purpose}`)
  }
}
const apple = await sharp(join(out, 'apple-touch-icon.png')).metadata()
console.log(`ok /icons/apple-touch-icon.png ${apple.width}x${apple.height} alpha=${apple.hasAlpha}`)
if (bad) process.exit(1)
