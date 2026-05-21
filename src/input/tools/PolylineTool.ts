import type { ToolHandler, ToolContext } from '../ToolHandler'
import { PolyLine } from '../../domain/PolyLine'
import { applySnap } from './snapUtils'

export class PolylineTool implements ToolHandler {
  readonly cursor = 'crosshair'
  private drawing = false
  private wip: PolyLine | null = null
  private mouseW = { x: 0, y: 0 }
  private onCanvas = false

  onPointerDown(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    const { x, y } = ctx.canvasCoords(e)
    const w = ctx.vp.screenToWorld(x, y)
    const snapped = e.ctrlKey ? w : applySnap(w.x, w.y, ctx)

    if (!this.drawing) {
      const pl = new PolyLine()
      pl.pos = { x: snapped.x, y: snapped.y, z: 0 }
      pl.points = [{ x: 0, y: 0 }]
      this.wip = pl
      this.drawing = true
    } else {
      if (this.tooClose(snapped.x, snapped.y, ctx)) return
      this.wip!.points.push({
        x: snapped.x - this.wip!.pos.x,
        y: snapped.y - this.wip!.pos.y,
      })
    }
    ctx.scheduleRender()
  }

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    const { x, y } = ctx.canvasCoords(e)
    const w = ctx.vp.screenToWorld(x, y)
    this.mouseW = e.ctrlKey ? w : applySnap(w.x, w.y, ctx)
    ctx.scheduleRender()
  }

  onPointerUp(_e: PointerEvent, _ctx: ToolContext): void {}

  onPointerEnter(_ctx: ToolContext): void {
    this.onCanvas = true
  }

  onPointerLeave(ctx: ToolContext): void {
    this.onCanvas = false
    ctx.scheduleRender()
  }

  onDblClick(_e: MouseEvent, ctx: ToolContext): void {
    if (!this.drawing || !this.wip) return
    // The proximity check in onPointerDown already blocked the duplicate vertex,
    // so nothing to pop — just commit whatever was placed.
    this.commit(ctx)
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext): void {
    if (!this.drawing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      this.commit(ctx)
    }
    if (e.key === 'Escape') {
      this.drawing = false
      this.wip = null
      ctx.scheduleRender()
      // Don't preventDefault — let Escape propagate to switch to select tool
    }
  }

  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.wip) return
    const pts = this.wip.points
    const ox = this.wip.pos.x
    const oy = this.wip.pos.y
    const lw = 1 / ctx.vp.zoom
    const hs = 3 * lw

    ctx2d.beginPath()
    ctx2d.moveTo(pts[0].x + ox, pts[0].y + oy)
    for (let i = 1; i < pts.length; i++) {
      ctx2d.lineTo(pts[i].x + ox, pts[i].y + oy)
    }
    if (this.onCanvas) ctx2d.lineTo(this.mouseW.x, this.mouseW.y)
    ctx2d.strokeStyle = ctx.store.colorPreviewRgba
    ctx2d.lineWidth = lw
    ctx2d.stroke()

    ctx2d.fillStyle = ctx.store.colorPreviewRgba
    for (const p of pts) {
      ctx2d.fillRect(p.x + ox - hs, p.y + oy - hs, hs * 2, hs * 2)
    }
  }

  private tooClose(wx: number, wy: number, ctx: ToolContext): boolean {
    const last = this.wip!.points.at(-1)!
    const ns = ctx.vp.worldToScreen(wx, wy)
    const ls = ctx.vp.worldToScreen(last.x + this.wip!.pos.x, last.y + this.wip!.pos.y)
    const dx = ns.x - ls.x
    const dy = ns.y - ls.y
    return dx * dx + dy * dy < 25  // 5px threshold
  }

  private commit(ctx: ToolContext): void {
    const pl = this.wip
    this.drawing = false
    this.wip = null
    if (!pl || pl.points.length < 2 || !ctx.store.project?.stock) {
      ctx.scheduleRender()
      return
    }
    ctx.store.project.stock.items.push(pl)
    ctx.store.selectedItem = pl
    ctx.store.activeTool = 'select'
    ctx.store.notifyItemChanged()
    ctx.scheduleRender()
  }
}
