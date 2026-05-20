import { PanelStockItem } from './PanelComponent'
import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'
import { v2Sub, v2Len } from './geometry'
import type { Tool } from './Tool'
import { fmt } from './GCodeEngraver'

export interface CircularStep {
  diameter: number
  depth: number
}

export class CircularPocket extends PanelStockItem {
  diameter = 0
  depth = 0
  steps: CircularStep[] = []

  private static readonly STEPOVER = 0.1

  get extents(): Vec3 {
    return { x: this.diameter, y: this.diameter, z: this.depth }
  }

  inside(x: number, y: number): boolean {
    const p = v2Sub({ x, y }, { x: this.pos.x, y: this.pos.y })
    return v2Len(p) <= this.diameter / 2
  }

  draw(drw: IDraw): void {
    // Approximate circle with 36 line segments for viewport display
    const r = this.diameter / 2
    const steps = 36
    drw.moveTo(this.pos.x + r, this.pos.y)
    for (let i = 1; i <= steps; i++) {
      const a = (2 * Math.PI * i) / steps
      drw.lineTo(this.pos.x + Math.cos(a) * r, this.pos.y + Math.sin(a) * r)
    }
  }

  clone(): CircularPocket {
    const copy = new CircularPocket()
    copy.pos = { ...this.pos }
    copy.toolNumber = this.toolNumber
    copy.diameter = this.diameter
    copy.depth = this.depth
    copy.steps = this.steps.map(s => ({ ...s }))
    return copy
  }

  generateCode(tool: Tool): string {
    const lines: string[] = []

    if (this.diameter < tool.diameter || this.steps.some(s => s.diameter < tool.diameter)) {
      lines.push('(ERROR: Pocket is too small for tool)')
      return lines.join('\n')
    }

    lines.push('(DEBUG: CircularPocket start)')
    if (this.steps.length === 0) {
      this._millPocket(lines, tool)
    } else {
      let z = 0
      for (const step of this.steps) {
        z = this._millStep(lines, tool, step, z)
      }
    }
    lines.push('(DEBUG: CircularPocket end)')
    return lines.join('\n')
  }

  private _millPocket(lines: string[], tool: Tool): number {
    return this._millStep(lines, tool, { diameter: this.diameter, depth: this.depth }, 0)
  }

  private _millStep(lines: string[], tool: Tool, step: CircularStep, startZ: number): number {
    if (step.diameter < tool.diameter * 2) {
      // Helix: pocket small enough to mill with a single helical pass
      const maxRadius = step.diameter / 2 - tool.diameter / 2

      lines.push(`G00 X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)}`)
      lines.push('F75')

      const endZ = startZ - step.depth
      for (let z = startZ - tool.zStep; z > endZ; z -= tool.zStep) {
        lines.push(`G02 I${fmt(-maxRadius)} X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)} Z${fmt(z)}`)
      }
      lines.push(`G02 I${fmt(-maxRadius)} X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)} Z${fmt(endZ)}`)
      lines.push(`G02 I${fmt(-maxRadius)} X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)}`)
    } else {
      // Surface milling: spiral outward at each z-step
      lines.push(`G00 X${fmt(this.pos.x)} Y${fmt(this.pos.y)}`)
      lines.push('F75')

      const endZ = startZ - step.depth
      for (let z = this.pos.z - tool.zStep; z > endZ; z -= tool.zStep) {
        lines.push(`G01 X${fmt(this.pos.x)}`)
        lines.push(`G01 Z${fmt(z)}`)
        this._millSurfaceSpiral(lines, tool, step.diameter)
      }
      lines.push(`G01 X${fmt(this.pos.x)}`)
      lines.push(`G01 Z${fmt(endZ)}`)
      this._millSurfaceSpiral(lines, tool, step.diameter)
    }
    return startZ - step.depth
  }

  private _millSurfaceSpiral(lines: string[], tool: Tool, diam: number): void {
    const maxRadius = diam / 2 - tool.diameter / 2
    const xDelta = tool.diameter * (1 - CircularPocket.STEPOVER)
    let xr = 0

    while (xr < maxRadius) {
      this._spiralSegment(lines, xr, Math.min(xr + xDelta, maxRadius), 36)
      xr += xDelta
    }
    lines.push(`G01 X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)}`)
    lines.push(`G02 I${fmt(-maxRadius)} X${fmt(this.pos.x + maxRadius)} Y${fmt(this.pos.y)}`)
  }

  private _spiralSegment(lines: string[], beginRadius: number, endRadius: number, steps: number): void {
    const radStep = (2 * Math.PI) / steps
    for (let step = 0; step <= steps; step++) {
      const nRad = beginRadius + (endRadius - beginRadius) * (step / steps)
      const nX = Math.cos(radStep * step) * nRad + this.pos.x
      const nY = -Math.sin(radStep * step) * nRad + this.pos.y
      lines.push(`G01 X${fmt(nX)} Y${fmt(nY)}`)
    }
  }
}
