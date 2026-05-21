import type { ToolHandler, ToolContext } from '../ToolHandler'
import { CanvasDraw } from '../../renderer/CanvasDraw'
import { ExtentsRenderer } from '../../domain/ExtentsRenderer'
import { CircularPocket } from '../../domain/CircularPocket'
import { applySnap } from './snapUtils'

function makeDefaultCircularPocket(x: number, y: number): CircularPocket {
  const p = new CircularPocket()
  p.pos      = { x, y, z: 0 }
  p.diameter = 6
  p.depth    = 1
  return p
}

export class CircularPocketTool implements ToolHandler {
  readonly cursor = 'none'
  private mouseX = 0
  private mouseY = 0
  private onCanvas = false

  onPointerDown(_e: PointerEvent, _ctx: ToolContext): void {}

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    const { x, y } = ctx.canvasCoords(e)
    this.mouseX = x
    this.mouseY = y
    this.onCanvas = true
    ctx.scheduleRender()
  }

  onPointerUp(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    if (!ctx.store.project?.stock) return
    const { x, y } = ctx.canvasCoords(e)
    const w = ctx.vp.screenToWorld(x, y)
    const snapped = applySnap(w.x, w.y, ctx)
    const item = makeDefaultCircularPocket(snapped.x, snapped.y)
    ctx.store.project.stock.items.push(item)
    ctx.store.selectedItem = item
    ctx.store.activeTool   = 'select'
    ctx.store.notifyItemChanged()
    ctx.scheduleRender()
  }

  onPointerEnter(_ctx: ToolContext): void {
    this.onCanvas = true
  }

  onPointerLeave(ctx: ToolContext): void {
    this.onCanvas = false
    ctx.scheduleRender()
  }

  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.onCanvas) return
    const w = ctx.vp.screenToWorld(this.mouseX, this.mouseY)
    const { x, y } = applySnap(w.x, w.y, ctx)
    const preview = makeDefaultCircularPocket(x, y)
    const xr = new ExtentsRenderer()
    preview.draw(xr)

    const drw = new CanvasDraw(ctx2d)
    const lw = 1 / ctx.vp.zoom

    ctx2d.beginPath()
    preview.draw(drw)
    ctx2d.strokeStyle = ctx.store.colorPreviewRgba
    ctx2d.lineWidth   = lw
    ctx2d.stroke()

    if (xr.minX <= xr.maxX) {
      const pad = 2 * lw
      ctx2d.strokeStyle = ctx.store.colorPreviewBoxRgba
      ctx2d.lineWidth   = lw
      ctx2d.setLineDash([4 * lw, 2 * lw])
      ctx2d.strokeRect(xr.minX - pad, xr.minY - pad,
        xr.maxX - xr.minX + pad * 2, xr.maxY - xr.minY + pad * 2)
      ctx2d.setLineDash([])
    }
  }
}
