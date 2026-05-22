import { PanelStockItem } from './PanelComponent'
import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'
import type { Tool } from './Tool'
import { GCodeEngraver } from './GCodeEngraver'
import { ExtentsRenderer } from './ExtentsRenderer'
import { HersheyFont, FontFace } from './HersheyFont'
import type { GlyphMap } from './HersheyFont'

export enum Alignment { Left, Center, Right }

export class Text extends PanelStockItem {
  text: string
  font: HersheyFont
  fontFace: FontFace = FontFace.RomanSimplex
  anchor = Alignment.Center

  constructor(text: string, glyphs: GlyphMap, face = FontFace.RomanSimplex) {
    super()
    this.text = text
    this.fontFace = face
    this.font = new HersheyFont(face, glyphs)
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
    let align = 0
    if (this.anchor !== Alignment.Right)
      align = -this.font.innerWidth(this.text)
    if (this.anchor === Alignment.Center)
      align /= 2
    this.font.drawString(drw, this.text, this.pos.x + align, this.pos.y)
  }

  generateCode(tool: Tool): string {
    const engr = new GCodeEngraver()
    engr.engravingDepth = tool.zStep
    this.draw(engr)
    return engr.gCode()
  }

  clone(): Text {
    const copy = new Text(this.text, new Map(), this.fontFace)
    copy.pos = { ...this.pos }
    copy.toolNumber = this.toolNumber
    copy.anchor = this.anchor
    copy.font = new HersheyFont(this.fontFace, new Map(), this.font.size)
    return copy
  }
}
