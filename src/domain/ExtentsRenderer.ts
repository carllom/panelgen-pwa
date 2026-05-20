import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'

export class ExtentsRenderer implements IDraw {
  minX = Number.MAX_VALUE
  minY = Number.MAX_VALUE
  maxX = -Number.MAX_VALUE
  maxY = -Number.MAX_VALUE

  get extents(): Vec3 {
    return { x: this.maxX - this.minX, y: this.maxY - this.minY, z: 0 }
  }

  inside(x: number, y: number): boolean {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
  }

  addPos(x: number, y: number): void {
    if (x < this.minX) this.minX = x
    if (x > this.maxX) this.maxX = x
    if (y < this.minY) this.minY = y
    if (y > this.maxY) this.maxY = y
  }

  moveTo(x: number, y: number): void { this.addPos(x, y) }
  lineTo(x: number, y: number): void { this.addPos(x, y) }
}
