/**
 * Splits the monolithic Hershey font file into four range files and copies
 * the Japanese font, placing all outputs in public/data/.
 *
 * Usage: node scripts/split-hershey.mjs
 *
 * Output files:
 *   public/data/hershey-1  IDs    1–999   (RomanSimplex/Plain, Greek/Script simplex)
 *   public/data/hershey-2  IDs 1000–1999  (*ComplexSmall variants)
 *   public/data/hershey-3  IDs 2000–2999  (Complex, Duplex + shared punctuation)
 *   public/data/hershey-4  IDs 3000–3999  (Triplex, Gothic)
 *   public/data/hershey-jp            (Japanese – unchanged)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root       = join(__dirname, '..')
const srcDir     = join(root, 'archive/PanelGen/PanelGen.Cli/data')
const outDir     = join(root, 'public/data')

mkdirSync(outDir, { recursive: true })

const RANGES = [
  { file: 'hershey-1', min:    1, max:  999 },
  { file: 'hershey-2', min: 1000, max: 1999 },
  { file: 'hershey-3', min: 2000, max: 2999 },
  { file: 'hershey-4', min: 3000, max: 3999 },
]

// Read source, normalise to LF
const raw   = readFileSync(join(srcDir, 'hershey'), 'utf8')
const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '')

// The Hershey data format uses fixed-width fields: glyph ID is always in
// columns 0-4 (5 chars, right-justified). Some lines have no space between
// the ID and the vertex count (e.g. "  994113D_..."), so a greedy \d+ regex
// would incorrectly read "994113" instead of "994". Using substring(0,5) is
// the only safe approach.
function glyphId(line) {
  return parseInt(line.substring(0, 5), 10)
}

let total = 0
for (const { file, min, max } of RANGES) {
  const filtered = lines.filter(line => {
    if (line.length < 5) return false
    const id = glyphId(line)
    return Number.isFinite(id) && id >= min && id <= max
  })
  // Write with LF endings
  const out = filtered.join('\n') + '\n'
  writeFileSync(join(outDir, file), out, 'utf8')
  console.log(`${file}: ${filtered.length} glyphs, ${(out.length / 1024).toFixed(1)} KB`)
  total += filtered.length
}

// Japanese – copy as-is (LF-normalised)
const jpRaw    = readFileSync(join(srcDir, 'japanese'), 'utf8')
const jpLines  = jpRaw.split(/\r?\n/).filter(l => l.trim() !== '')
const jpOut    = jpLines.join('\n') + '\n'
writeFileSync(join(outDir, 'hershey-jp'), jpOut, 'utf8')
console.log(`hershey-jp: ${jpLines.length} glyphs, ${(jpOut.length / 1024).toFixed(1)} KB`)

console.log(`\nDone. ${total} hershey glyphs split across 4 files → ${outDir}`)
