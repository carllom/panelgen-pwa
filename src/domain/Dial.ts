import { PanelStockItem } from './PanelComponent'
import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'
import type { Tool } from './Tool'
import { GCodeEngraver } from './GCodeEngraver'
import { ExtentsRenderer } from './ExtentsRenderer'
import { HersheyFont, FontFace } from './HersheyFont'
import type { GlyphMap } from './HersheyFont'
import { CircularPocket } from './CircularPocket'

export class Dial extends PanelStockItem {
  holeToolNumber = 0
  holeRadius = 0
  holeDepth = 0

  innerRadius = 0
  arcSpan = 270
  markerLength = 3
  minValue = 0
  maxValue = 10
  step = 1
  tickLength = 1.5
  tickCount = 4

  text = ''
  markerLabelOffset = 1.5

  labelFont: HersheyFont
  labelFontFace: FontFace = FontFace.RomanSimplex
  markerFont: HersheyFont

  constructor(glyphs: GlyphMap) {
    super()
    this.labelFont = new HersheyFont(FontFace.RomanSimplex, glyphs, 3)
    this.markerFont = new HersheyFont(FontFace.RomanSimplex, glyphs, 1.5)
  }

  get extents(): Vec3 {
    const xr = new ExtentsRenderer()
    this.draw(xr)
    return xr.extents
  }

  inside(x: number, y: number): boolean {
    const xr = new ExtentsRenderer()
    this.draw(xr)
    return xr.inside(x, y)
  }

  draw(drw: IDraw): void {
    const startAng = ((360 - this.arcSpan) * Math.PI) / 360
    const mCount = (this.maxValue - this.minValue) / this.step
    const markerArc = (this.arcSpan / mCount) * (Math.PI / 180)
    const tickArc = markerArc / (this.tickCount + 1)
    const outerRadius = this.innerRadius + this.markerLength
    const { x: xc, y: yc } = this.pos

    for (let i = 0; i < mCount; i++) {
      const mArc = startAng + i * markerArc
      drawTick(mArc, xc, yc, this.innerRadius, outerRadius, drw)
      drawTickLabel(
        (this.minValue + i * this.step).toString(), mArc,
        xc, yc, outerRadius + this.markerLabelOffset, this.markerFont, drw,
      )
      for (let j = tickArc; j < markerArc; j += tickArc) {
        drawTick(mArc + j, xc, yc, this.innerRadius, this.innerRadius + this.tickLength, drw)
      }
    }

    const maxAngle = startAng + mCount * markerArc
    drawTick(maxAngle, xc, yc, this.innerRadius, outerRadius, drw)
    drawTickLabel(this.maxValue.toString(), maxAngle, xc, yc,
      outerRadius + this.markerLabelOffset, this.markerFont, drw)

    const fWidth = this.labelFont.width(this.text)
    this.labelFont.drawString(
      drw, this.text,
      xc - fWidth / 2,
      yc - this.innerRadius - this.markerLength - 3,
      false,
    )
  }

  drawHole(drw: IDraw): void {
    if (this.holeRadius <= 0) return
    const r = this.holeRadius
    const steps = 36
    drw.moveTo(this.pos.x + r, this.pos.y)
    for (let i = 1; i <= steps; i++) {
      const a = (2 * Math.PI * i) / steps
      drw.lineTo(this.pos.x + Math.cos(a) * r, this.pos.y + Math.sin(a) * r)
    }
  }

  generateCode(tool: Tool): string {
    if (tool.number === this.toolNumber) {
      const engr = new GCodeEngraver()
      this.draw(engr)
      return engr.gCode()
    } else if (tool.number === this.holeToolNumber) {
      const cp = new CircularPocket()
      cp.diameter = this.holeRadius * 2
      cp.pos = { ...this.pos }
      cp.toolNumber = this.holeToolNumber
      cp.depth = this.holeDepth
      return cp.generateCode(tool)
    }
    return ''
  }

  usesTool(toolNumber: number): boolean {
    return super.usesTool(toolNumber) || toolNumber === this.holeToolNumber
  }

  clone(): Dial {
    const copy = new Dial(new Map())
    copy.pos = { ...this.pos }
    copy.toolNumber = this.toolNumber
    copy.holeToolNumber = this.holeToolNumber
    copy.holeRadius = this.holeRadius
    copy.holeDepth = this.holeDepth
    copy.innerRadius = this.innerRadius
    copy.arcSpan = this.arcSpan
    copy.markerLength = this.markerLength
    copy.minValue = this.minValue
    copy.maxValue = this.maxValue
    copy.step = this.step
    copy.tickLength = this.tickLength
    copy.tickCount = this.tickCount
    copy.text = this.text
    copy.markerLabelOffset = this.markerLabelOffset
    copy.labelFont = this.labelFont
    copy.labelFontFace = this.labelFontFace
    copy.markerFont = this.markerFont
    return copy
  }
}

function drawTick(angle: number, xc: number, yc: number, rInner: number, rOuter: number, drw: IDraw): void {
  const xk = -Math.sin(angle)
  const yk = Math.cos(angle)
  drw.moveTo(xc + xk * rInner, yc - yk * rInner)
  drw.lineTo(xc + xk * rOuter, yc - yk * rOuter)
}

function drawTickLabel(
  text: string, angle: number, xc: number, yc: number,
  dist: number, font: HersheyFont, drw: IDraw,
): void {
  if (font.size < 1) return
  let w = font.innerWidth(text)
  const xk = -Math.sin(angle)
  const yk = Math.cos(angle)
  if (xk < -1e-8) w = -w
  else if (xk <= 0) w = -w / 2
  else w = 0
  font.drawString(drw, text, xc + xk * dist + w, yc - yk * dist)
}
