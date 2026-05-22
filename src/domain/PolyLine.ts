import { PanelStockItem } from './PanelComponent'
import type { IDraw } from './IDraw'
import type { Vec2, Vec3 } from './geometry'
import { v2Sub, v2Len } from './geometry'
import type { Tool } from './Tool'
import { GCodeEngraver } from './GCodeEngraver'
import { ExtentsRenderer } from './ExtentsRenderer'

export class PolyLine extends PanelStockItem {
  radius = 0
  points: Vec2[] = []

  get extents(): Vec3 {
    const xr = new ExtentsRenderer()
    this.draw(xr)
    return xr.extents
  }

  inside(x: number, y: number): boolean {
    const p = v2Sub({ x, y }, { x: this.pos.x, y: this.pos.y })
    for (let i = 0; i < this.points.length - 1; i++) {
      if (distToSegment(p, this.points[i], this.points[i + 1]) < 1.5) return true
    }
    return false
  }

  draw(drw: IDraw): void {
    if (this.points.length < 2) return
    drw.moveTo(this.points[0].x + this.pos.x, this.points[0].y + this.pos.y)
    for (let i = 1; i < this.points.length; i++) {
      drw.lineTo(this.points[i].x + this.pos.x, this.points[i].y + this.pos.y)
    }
  }

  generateCode(tool: Tool): string {
    const engr = new GCodeEngraver()
    engr.engravingDepth = tool.zStep
    this.draw(engr)
    return engr.gCode()
  }

  clone(): PolyLine {
    const copy = new PolyLine()
    copy.pos = { ...this.pos }
    copy.toolNumber = this.toolNumber
    copy.radius = this.radius
    copy.points = this.points.map(p => ({ ...p }))
    return copy
  }
}

function dist2(v: Vec2, w: Vec2): number {
  return (v.x - w.x) ** 2 + (v.y - w.y) ** 2
}

function distToSegment(p: Vec2, v: Vec2, w: Vec2): number {
  const l2 = dist2(v, w)
  if (l2 === 0) return v2Len(v2Sub(p, v))
  const t = Math.max(0, Math.min(1,
    ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  ))
  return v2Len(v2Sub(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }))
}
