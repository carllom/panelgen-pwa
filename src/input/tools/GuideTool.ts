import type { ToolHandler, ToolContext } from '../ToolHandler'
import { Guide } from '../../domain/Guide'
import { applySnap } from './snapUtils'

const EXTENT = 10000  // extends guide lines well beyond any visible panel

export class GuideTool implements ToolHandler {
  readonly cursor = 'crosshair'
  readonly preview = new Guide()
  private onCanvas = false
  private mouseX = 0
  private mouseY = 0

  onPointerEnter(ctx: ToolContext): void {
    this.onCanvas = true
    ctx.store.selectedItem  = null
    ctx.store.selectedGuide = this.preview
  }

  onPointerLeave(ctx: ToolContext): void {
    this.onCanvas = false
    ctx.scheduleRender()
  }

  onPointerDown(_e: PointerEvent, _ctx: ToolContext): void {}

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    const { x, y } = ctx.canvasCoords(e)
    this.mouseX = x
    this.mouseY = y
    this.onCanvas = true
    const w = ctx.vp.screenToWorld(x, y)
    const snapped = e.ctrlKey ? w : applySnap(w.x, w.y, ctx)
    this.preview.pos = this.preview.direction === 'horizontal' ? snapped.y : snapped.x
    ctx.store.notifyGuideChanged()
    ctx.scheduleRender()
  }

  onPointerUp(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    if (!ctx.store.project?.stock) return
    ctx.pushHistory()
    const guide = new Guide()
    guide.direction = this.preview.direction
    guide.pos       = this.preview.pos
    ctx.store.project.stock.guides.push(guide)
    ctx.store.selectedGuide = guide
    ctx.store.activeTool    = 'select'
    ctx.scheduleRender()
  }

  onPointerCancel(_e: PointerEvent, _ctx: ToolContext): void {
    this.onCanvas = false
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext): void {
    if (e.key === ' ') {
      e.preventDefault()
      this.preview.direction = this.preview.direction === 'horizontal' ? 'vertical' : 'horizontal'
      if (this.onCanvas) {
        const w = ctx.vp.screenToWorld(this.mouseX, this.mouseY)
        this.preview.pos = this.preview.direction === 'horizontal' ? w.y : w.x
      }
      ctx.store.notifyGuideChanged()
      ctx.scheduleRender()
    }
  }

  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.onCanvas) return
    const lw  = 1 / ctx.vp.zoom
    const pos = this.preview.pos
    ctx2d.save()
    ctx2d.strokeStyle = ctx.store.colorGuide
    ctx2d.globalAlpha = 0.85
    ctx2d.lineWidth   = lw
    ctx2d.setLineDash([4 * lw, 4 * lw])
    ctx2d.beginPath()
    if (this.preview.direction === 'horizontal') {
      ctx2d.moveTo(-EXTENT, pos)
      ctx2d.lineTo( EXTENT, pos)
    } else {
      ctx2d.moveTo(pos, -EXTENT)
      ctx2d.lineTo(pos,  EXTENT)
    }
    ctx2d.stroke()
    ctx2d.setLineDash([])
    ctx2d.restore()
  }
}
