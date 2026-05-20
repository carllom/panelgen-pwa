import type { PanelStock } from '../domain/PanelStock'

/**
 * Manages the canvas coordinate transform (y-up world ↔ y-down screen).
 *
 * The applied transform is:  ctx.setTransform(zoom, 0, 0, -zoom, panX, panY)
 *   screen.x = world.x * zoom  + panX
 *   screen.y = world.y * -zoom + panY
 *
 * (panX, panY) is the canvas pixel position of the world origin.
 */
export class Viewport {
  zoom = 8        // pixels per mm
  panX = 0        // canvas pixel x of world origin
  panY = 0        // canvas pixel y of world origin
  canvasWidth  = 0
  canvasHeight = 0

  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.zoom, 0, 0, -this.zoom, this.panX, this.panY)
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (this.panY - sy) / this.zoom,
    }
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx *  this.zoom + this.panX,
      y: wy * -this.zoom + this.panY,
    }
  }

  /** True if the world-space AABB overlaps the current visible viewport. */
  isVisible(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const wLeft   = -this.panX / this.zoom
    const wRight  =  (this.canvasWidth  - this.panX) / this.zoom
    const wBottom =  (this.panY - this.canvasHeight) / this.zoom
    const wTop    =   this.panY / this.zoom
    return maxX >= wLeft && minX <= wRight && maxY >= wBottom && minY <= wTop
  }

  /** Translate by screen-space delta (pointer drag). */
  pan(dx: number, dy: number): void {
    this.panX += dx
    this.panY += dy
  }

  /** Zoom by factor, keeping the canvas point (cx, cy) fixed. */
  zoomAt(factor: number, cx: number, cy: number): void {
    this.panX = cx + (this.panX - cx) * factor
    this.panY = cy + (this.panY - cy) * factor
    this.zoom *= factor
  }

  /** Set zoom and pan so the stock fills the canvas with a pixel margin. */
  fitToStock(stock: PanelStock, margin = 40): void {
    const zoomX = (this.canvasWidth  - 2 * margin) / stock.width
    const zoomY = (this.canvasHeight - 2 * margin) / stock.height
    this.zoom = Math.min(zoomX, zoomY)
    // center: screen(stock.pos) = (canvasWidth/2, canvasHeight/2)
    this.panX = this.canvasWidth  / 2 - stock.pos.x * this.zoom
    this.panY = this.canvasHeight / 2 + stock.pos.y * this.zoom
  }
}
