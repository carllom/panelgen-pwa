import { PanelStockItem } from './PanelComponent'
import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'
import { v2Sub } from './geometry'
import type { Tool } from './Tool'
import { fmt } from './GCodeEngraver'

interface Rect {
  centerX: number
  centerY: number
  width: number
  height: number
}

function rectLeft(r: Rect): number { return r.centerX - r.width / 2 }
function rectRight(r: Rect): number { return r.centerX + r.width / 2 }
function rectTop(r: Rect): number { return r.centerY + r.height / 2 }
function rectBottom(r: Rect): number { return r.centerY - r.height / 2 }

export class RectangularPocket extends PanelStockItem {
  width = 0
  height = 0
  depth = 0

  private static readonly STEPOVER = 0.1

  get extents(): Vec3 {
    return { x: this.width, y: this.height, z: this.depth }
  }

  inside(x: number, y: number): boolean {
    const p = v2Sub({ x, y }, { x: this.pos.x, y: this.pos.y })
    return Math.abs(p.x) <= this.width / 2 && Math.abs(p.y) <= this.height / 2
  }

  draw(drw: IDraw): void {
    const l = this.pos.x - this.width / 2
    const r = this.pos.x + this.width / 2
    const t = this.pos.y + this.height / 2
    const b = this.pos.y - this.height / 2
    drw.moveTo(l, b)
    drw.lineTo(l, t)
    drw.lineTo(r, t)
    drw.lineTo(r, b)
    drw.lineTo(l, b)
  }

  clone(): RectangularPocket {
    const copy = new RectangularPocket()
    copy.pos = { ...this.pos }
    copy.toolNumber = this.toolNumber
    copy.width = this.width
    copy.height = this.height
    copy.depth = this.depth
    return copy
  }

  generateCode(tool: Tool): string {
    const lines: string[] = []

    if (this.width < tool.diameter || this.height < tool.diameter) {
      lines.push('(ERROR: Pocket is too small for tool)')
      return lines.join('\n')
    }

    lines.push('(DEBUG: RectangularPocket start)')

    const toolOutline: Rect = {
      centerX: this.pos.x,
      centerY: this.pos.y,
      width: this.width - tool.diameter,
      height: this.height - tool.diameter,
    }

    for (let z = this.pos.z - tool.zStep; z > -this.depth; z -= tool.zStep) {
      this._millPlane(lines, tool, z, toolOutline)
    }
    this._millPlane(lines, tool, -this.depth, toolOutline)

    lines.push('(DEBUG: RectangularPocket end)')
    return lines.join('\n')
  }

  private _millPlane(lines: string[], tool: Tool, z: number, toolOutline: Rect): void {
    const toolSurface: Rect = {
      centerX: toolOutline.centerX,
      centerY: toolOutline.centerY,
      width: toolOutline.width - tool.diameter,
      height: toolOutline.height - tool.diameter,
    }

    lines.push(`G00 X${fmt(rectLeft(toolSurface))} Y${fmt(rectBottom(toolSurface))}`)
    lines.push(`G01 Z${fmt(z)}`)

    if (Math.min(this.width, this.height) - 2 * tool.diameter > 0) {
      this._millSurfaceSnake(lines, toolSurface, tool.diameter * (1 - RectangularPocket.STEPOVER))
    }

    lines.push(`G01 X${fmt(rectLeft(toolOutline))} Y${fmt(rectBottom(toolOutline))}`)
    RectangularPocket._millOutline(lines, toolOutline)
  }

  private _millSurfaceSnake(lines: string[], r: Rect, step: number): void {
    let pos = true
    if (r.width > r.height) {
      let ypos = rectBottom(r) + step
      while (ypos < rectTop(r)) {
        lines.push(`G01 X${fmt(pos ? rectRight(r) : rectLeft(r))}`)
        lines.push(`G01 Y${fmt(ypos)}`)
        ypos += step
        pos = !pos
      }
      lines.push(`G01 X${fmt(pos ? rectRight(r) : rectLeft(r))}`)
      lines.push(`G01 Y${fmt(rectTop(r))}`)
      pos = !pos
      lines.push(`G01 X${fmt(pos ? rectRight(r) : rectLeft(r))}`)
    } else {
      let xpos = rectLeft(r) + step
      while (xpos < rectRight(r)) {
        lines.push(`G01 Y${fmt(pos ? rectTop(r) : rectBottom(r))}`)
        lines.push(`G01 X${fmt(xpos)}`)
        xpos += step
        pos = !pos
      }
      lines.push(`G01 Y${fmt(pos ? rectTop(r) : rectBottom(r))}`)
      lines.push(`G01 X${fmt(rectRight(r))}`)
      pos = !pos
      lines.push(`G01 Y${fmt(pos ? rectTop(r) : rectBottom(r))}`)
    }
  }

  private static _millOutline(lines: string[], r: Rect): void {
    lines.push(`G01 Y${fmt(rectTop(r))}`)
    lines.push(`G01 X${fmt(rectRight(r))}`)
    lines.push(`G01 Y${fmt(rectBottom(r))}`)
    lines.push(`G01 X${fmt(rectLeft(r))}`)
  }
}
