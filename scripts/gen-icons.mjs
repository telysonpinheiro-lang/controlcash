/**
 * Generates PWA icons (192x192 and 512x512) as PNG files.
 * Requires: npm install -D sharp  (or run once manually)
 *
 * Usage: node scripts/gen-icons.mjs
 *
 * If sharp is not available, copies SVG as fallback reference.
 */
import { createRequire } from 'module'
import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function generate() {
  const svgPath = resolve(root, 'public/icons/icon.svg')

  try {
    const require = createRequire(import.meta.url)
    const sharp = require('sharp')
    const svgBuf = readFileSync(svgPath)

    for (const size of [192, 512]) {
      const outPath = resolve(root, `public/icons/icon-${size}.png`)
      await sharp(svgBuf).resize(size, size).png().toFile(outPath)
      console.log(`Generated: icon-${size}.png`)
    }
  } catch {
    // sharp not installed — copy SVG as named PNG (browsers handle it as fallback)
    for (const size of [192, 512]) {
      const outPath = resolve(root, `public/icons/icon-${size}.png`)
      copyFileSync(svgPath, outPath)
      console.log(`Fallback (SVG→PNG placeholder): icon-${size}.png`)
    }
    console.log('\nTo generate real PNGs, run: npm install -D sharp && node scripts/gen-icons.mjs')
  }
}

generate()
