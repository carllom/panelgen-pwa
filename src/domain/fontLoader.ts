/**
 * Lazy loader for Hershey font range files served from /data/.
 *
 * Every face needs range 1 (shared punctuation).  Additional ranges:
 *   Range 2 (1000–1999): *Small variants
 *   Range 3 (2000–2999): Complex, Duplex, simplex cross-range punctuation
 *   Range 4 (3000–3999): Triplex, Gothic
 *
 * Each range fetch is cached; concurrent requests for the same range share
 * a single in-flight promise.
 */

import { parseHersheyData, FontFace, HersheyFont } from './HersheyFont'
import type { GlyphMap } from './HersheyFont'

// ─── Range definition ────────────────────────────────────────────────────────

type HersheyRange = 1 | 2 | 3 | 4

const RANGE_URLS: Record<HersheyRange, string> = {
  1: '/data/hershey-1',
  2: '/data/hershey-2',
  3: '/data/hershey-3',
  4: '/data/hershey-4',
}

const JP_URL = '/data/hershey-jp'

// Ranges required per face, derived from the ASCII-map cross-range analysis.
// All faces need range 1; most also need range 3 for shared punctuation.
const FACE_RANGES: Record<FontFace, HersheyRange[]> = {
  [FontFace.RomanSimplex]:         [1, 3],
  [FontFace.RomanPlain]:           [1, 2],
  [FontFace.RomanComplex]:         [1, 3],
  [FontFace.RomanComplexSmall]:    [1, 2],
  [FontFace.RomanDuplex]:          [1, 3],
  [FontFace.RomanTriplex]:         [1, 3, 4],
  [FontFace.GreekSimplex]:         [1, 3],
  [FontFace.GreekPlain]:           [1, 2],
  [FontFace.GreekComplex]:         [1, 3],
  [FontFace.GreekComplexSmall]:    [1, 2],
  [FontFace.CyrillicComplex]:      [1, 3],
  [FontFace.ItalicComplex]:        [1, 3],
  [FontFace.ItalicComplexSmall]:   [1, 2],
  [FontFace.ItalicTriplex]:        [1, 3, 4],
  [FontFace.ScriptSimplex]:        [1, 3],
  [FontFace.ScriptComplex]:        [1, 3],
  [FontFace.GothicEnglishTriplex]: [1, 3, 4],
  [FontFace.GothicGermanTriplex]:  [1, 3, 4],
  [FontFace.GothicItalianTriplex]: [1, 3, 4],
  [FontFace.Japanese]:             [],  // dedicated file, see below
}

// ─── Cache ───────────────────────────────────────────────────────────────────

// Keyed by URL so ranges and the JP file use the same map.
const _cache = new Map<string, Promise<GlyphMap>>()

function _fetchGlyphs(url: string): Promise<GlyphMap> {
  let p = _cache.get(url)
  if (!p) {
    p = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Hershey font fetch failed: ${url} (${r.status})`)
        return r.text()
      })
      .then(parseHersheyData)
    _cache.set(url, p)
  }
  return p
}

function _merge(...maps: GlyphMap[]): GlyphMap {
  const out: GlyphMap = new Map()
  for (const m of maps) for (const [k, v] of m) out.set(k, v)
  return out
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load all glyph data needed for the given font face.
 * Results are cached; subsequent calls for the same face are free.
 */
export async function loadFaceGlyphs(face: FontFace): Promise<GlyphMap> {
  if (face === FontFace.Japanese) {
    return _fetchGlyphs(JP_URL)
  }
  const ranges = FACE_RANGES[face]
  const maps = await Promise.all(ranges.map(r => _fetchGlyphs(RANGE_URLS[r])))
  return _merge(...maps)
}

/**
 * Fire-and-forget pre-warm for the two ranges used by all default PanelGen
 * faces (RomanSimplex + shared punctuation).  Call once at app startup so
 * fonts are ready by the time the first panel renders.
 */
export function preloadDefaultFonts(): void {
  _fetchGlyphs(RANGE_URLS[1])
  _fetchGlyphs(RANGE_URLS[3])
}

/**
 * Async factory: resolves to a fully-loaded HersheyFont ready to draw.
 */
export async function loadHersheyFont(face: FontFace, size?: number): Promise<HersheyFont> {
  const glyphs = await loadFaceGlyphs(face)
  return new HersheyFont(face, glyphs, size)
}
