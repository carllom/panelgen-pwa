import type { IDraw } from './IDraw'
import type { Vec2, Segment2 } from './geometry'
import { v2Add, v2Scale, v2Normalize, seg2Normal, seg2Offset } from './geometry'
import type { Tool } from './Tool'

/** Format a number with up to 3 decimal places and no trailing zeros (mirrors C# {0:0.###}). */
export function fmt(n: number): string {
  const rounded = Math.round(n * 1000) / 1000
  return rounded.toString()
}

export class GCodeEngraver implements IDraw {
  engravingDepth = 0.3
  surface = 0
  travelZ = 1
  feedrate = 100
  travelSpeed = 1500

  private _lines: string[] = []
  private _raised = false

  init(): void {
    this._lines = []
    this._raised = false
    this._lines.push('G17')    // Select XY plane
    this._lines.push('G21')    // Units in mm
    this._lines.push('M3 S1000') // Spindle on
  }

  finish(): void {
    this._raiseTool()
    this._lines.push('M5')
    this.moveTo(0, 0)
  }

  gCode(): string {
    return this._lines.join('\n')
  }

  addLine(from: Vec2, to: Vec2, raise = true): void {
    this._begin(from)
    this._lines.push(`G1 X${fmt(to.x)} Y${fmt(to.y)}`)
    if (raise) this._end()
  }

  addPolyLine(points: Vec2[], raise = true): void {
    if (points.length === 0) return
    this._begin(points[0])
    for (let i = 1; i < points.length; i++) {
      this._lines.push(`G1 X${fmt(points[i].x)} Y${fmt(points[i].y)}`)
    }
    if (raise) this._end()
  }

  addFatLine(points: Vec2[], tool: Tool, width: number): void {
    const offset = (width - tool.diameter) / 2
    const overlap = 0.2

    for (let i = 0; i < points.length - 1; i++) {
      const seg: Segment2 = { begin: points[i], end: points[i + 1] }
      this._fatSegment(seg, tool, offset, overlap)
    }
  }

  private _fatSegment(seg: Segment2, tool: Tool, offset: number, overlap: number): void {
    this.moveTo(seg.begin.x, seg.begin.y)
    this.lineTo(seg.end.x, seg.end.y)

    const n = v2Normalize(seg2Normal(seg))
    let toff = 0

    while (toff < offset) {
      toff += Math.min(offset, tool.diameter * (1 - overlap))
      const xtr1 = seg2Offset(seg, v2Scale(n, toff))
      const xtr2 = seg2Offset(seg, v2Scale({ x: -n.x, y: -n.y }, toff))

      this.lineTo(xtr1.end.x, xtr1.end.y)
      this.lineTo(xtr1.begin.x, xtr1.begin.y)
      this.lineTo(xtr2.begin.x, xtr2.begin.y)
      this.lineTo(xtr2.end.x, xtr2.end.y)
      this.lineTo(xtr1.end.x, xtr1.end.y)
    }
  }

  private _begin(pos: Vec2): void {
    this._lines.push(`G0 X${fmt(pos.x)} Y${fmt(pos.y)}`)
    this._lines.push(`G0 Z${fmt(this.surface - this.engravingDepth)} F${this.feedrate}`)
  }

  private _end(): void {
    this._lines.push(`G0 Z${fmt(this.surface + this.travelZ)} F${this.travelSpeed}`)
  }

  private _raiseTool(): void {
    if (!this._raised) {
      this._lines.push(`G0 Z${fmt(this.surface + this.travelZ)} F${this.travelSpeed}`)
    }
    this._raised = true
  }

  private _lowerTool(): void {
    if (this._raised) {
      this._lines.push(`G0 Z${fmt(this.surface - this.engravingDepth)} F${this.feedrate}`)
    }
    this._raised = false
  }

  raise(): void {
    this._lines.push(`G0 Z${fmt(this.surface + this.travelZ)} F${this.travelSpeed}`)
  }

  // IDraw interface
  moveTo(x: number, y: number): void {
    this._raiseTool()
    this._lines.push(`G0 X${fmt(x)} Y${fmt(y)}`)
  }

  lineTo(x: number, y: number): void {
    this._lowerTool()
    this._lines.push(`G1 X${fmt(x)} Y${fmt(y)}`)
  }

  moveToV(v: Vec2): void { this.moveTo(v.x, v.y) }
  lineToV(v: Vec2): void { this.lineTo(v.x, v.y) }
}
