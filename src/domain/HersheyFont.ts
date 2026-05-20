import type { IDraw } from './IDraw'

export enum FontFace {
  GothicEnglishTriplex,
  GothicGermanTriplex,
  GothicItalianTriplex,
  GreekComplex,
  GreekComplexSmall,
  GreekPlain,
  GreekSimplex,
  CyrillicComplex,
  ItalicComplex,
  ItalicComplexSmall,
  ItalicTriplex,
  ScriptComplex,
  ScriptSimplex,
  RomanComplex,
  RomanComplexSmall,
  RomanDuplex,
  RomanPlain,
  RomanSimplex,
  RomanTriplex,
  Japanese,
}

export interface GlyphPoint { x: number; y: number }
export interface Glyph { posL: number; posR: number; data: GlyphPoint[] }
export type GlyphMap = Map<number, Glyph>

/** Parse a raw Hershey font text file (from archive/PanelGen.Cli/data/hershey) into a GlyphMap. */
export function parseHersheyData(text: string): GlyphMap {
  const map: GlyphMap = new Map()
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const charNum = parseInt(line.substring(0, 5), 10)
    const numVert = parseInt(line.substring(5, 8), 10)
    const posL = line.charCodeAt(8) - 82 // 'R'
    const posR = line.charCodeAt(9) - 82
    const available = Math.floor((line.length - 10) / 2)
    const count = Math.min(numVert - 1, available)
    const data: GlyphPoint[] = []
    for (let i = 0; i < count; i++) {
      data.push({
        x: line.charCodeAt(2 * i + 10) - 82,
        y: line.charCodeAt(2 * i + 11) - 82,
      })
    }
    map.set(charNum, { posL, posR, data })
  }
  return map
}

const EMPTY_GLYPH: Glyph = { posL: 0, posR: 0, data: [] }
const PEN_UP_X = -50

// ASCII maps: index is char code, value is Hershey glyph number (-1 = unmapped)
/* eslint-disable */
const MAP_ROMANS: readonly number[] = [
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  699,714,717,733,719,2271,734,731,721,722,2219,725,711,724,710,720,
  700,701,702,703,704,705,706,707,708,709,712,713,2241,726,2242,715,
  2273,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,
  516,517,518,519,520,521,522,523,524,525,526,2223,804,2224,2262,999,
  730,601,602,603,604,605,606,607,608,609,610,611,612,613,614,615,
  616,617,618,619,620,621,622,623,624,625,626,2225,723,2226,2246,718,
]
const MAP_ROMANC: readonly number[] = [
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  2199,2214,2213,2275,2274,2271,2272,2251,2221,2222,2219,2232,2211,2231,2210,2220,
  2200,2201,2202,2203,2204,2205,2206,2207,2208,2209,2212,2213,2241,2238,2242,2215,
  2273,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,
  2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2223,804,2224,2262,999,
  2252,2101,2102,2103,2104,2105,2106,2107,2108,2109,2110,2111,2112,2113,2114,2115,
  2116,2117,2118,2119,2120,2121,2122,2123,2124,2125,2126,2225,2229,2226,2246,2218,
]
/* eslint-enable */

const ASCII_MAPS: ReadonlyMap<FontFace, readonly number[]> = new Map([
  [FontFace.RomanSimplex, MAP_ROMANS],
  [FontFace.RomanComplex, MAP_ROMANC],
  // Additional faces share the same glyph file; maps can be added incrementally.
])

export class HersheyFont {
  private _glyphs: GlyphMap
  private _asciiMap: readonly number[]
  private _scale = 0.1
  private _size = 2

  constructor(face: FontFace, glyphs: GlyphMap, size = 2) {
    this._glyphs = glyphs
    this._asciiMap = ASCII_MAPS.get(face) ?? []
    this.size = size
  }

  get size(): number { return this._size }
  set size(value: number) {
    this._size = value
    const m = this._getGlyph('M')
    const h = glyphHeight(m)
    this._scale = h > 0 ? value / h : 0.1
  }

  drawString(drw: IDraw, text: string, x: number, y: number, centerGlyph = true): void {
    let offx = x
    for (const c of text) {
      const glyph = this._getGlyph(c)
      let raised = true
      if (offx > x || !centerGlyph)
        offx -= glyph.posL * this._scale

      for (const gp of glyph.data) {
        if (gp.x === PEN_UP_X && gp.y === 0) {
          raised = true
          continue
        }
        if (raised) {
          drw.moveTo(gp.x * this._scale + offx, -gp.y * this._scale + y)
          raised = false
        } else {
          drw.lineTo(gp.x * this._scale + offx, -gp.y * this._scale + y)
        }
      }
      offx += glyph.posR * this._scale
    }
  }

  width(text: string): number {
    return [...text]
      .map(c => this._getGlyph(c))
      .reduce((sum, g) => sum + (g.posR - g.posL) * this._scale, 0)
  }

  innerWidth(text: string): number {
    if (text.length === 0) return 0
    const chars = [...text]
    const first = this._getGlyph(chars[0])
    const last = this._getGlyph(chars[chars.length - 1])
    return this.width(text) - (last.posR - first.posL) * this._scale
  }

  private _getGlyph(c: string): Glyph {
    const code = c.charCodeAt(0)
    if (code > 0x7f) return EMPTY_GLYPH
    const idx = this._asciiMap[code] ?? -1
    if (idx === -1) return EMPTY_GLYPH
    return this._glyphs.get(idx) ?? EMPTY_GLYPH
  }
}

function glyphHeight(g: Glyph): number {
  if (g.data.length === 0) return 0
  let max = -Infinity
  let min = Infinity
  for (const p of g.data) {
    if (p.x === PEN_UP_X && p.y === 0) continue
    if (p.y > max) max = p.y
    if (p.y < min) min = p.y
  }
  return max > min ? max - min : 0
}
