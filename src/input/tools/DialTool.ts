import type { ToolHandler, ToolContext } from '../ToolHandler'
import { CanvasDraw } from '../../renderer/CanvasDraw'
import { ExtentsRenderer } from '../../domain/ExtentsRenderer'
import { Dial } from '../../domain/Dial'
import { loadFaceGlyphs } from '../../domain/fontLoader'
import { FontFace } from '../../domain/HersheyFont'
import type { GlyphMap } from '../../domain/HersheyFont'

const COLOR_PREVIEW     = 'rgba(79, 195, 247, 0.55)'
const COLOR_PREVIEW_BOX = 'rgba(79, 195, 247, 0.25)'

function makeDefaultDial(x: number, y: number, glyphs: GlyphMap): Dial {
  const d = new Dial(glyphs)
  d.pos              = { x, y, z: 0 }
  d.innerRadius      = 8
  d.arcSpan          = 270
  d.markerLength     = 3
  d.minValue         = 0
  d.maxValue         = 10
  d.step             = 1
  d.tickLength       = 1.5
  d.tickCount        = 4
  d.markerLabelOffset = 1.5
  d.text             = 'Dial'
  return d
}

function applySnap(wx: number, wy: number, ctx: ToolContext): { x: number; y: number } {
  const { snapToGrid, gridX, gridY } = ctx.store
  let x = Math.round(wx * 1000) / 1000
  let y = Math.round(wy * 1000) / 1000
  if (snapToGrid && gridX > 0 && gridY > 0) {
    x = Math.round(Math.round(x / gridX) * gridX * 1000) / 1000
    y = Math.round(Math.round(y / gridY) * gridY * 1000) / 1000
  }
  return { x, y }
}

export class DialTool implements ToolHandler {
  readonly cursor = 'none'
  private mouseX = 0
  private mouseY = 0
  private onCanvas = false

  onPointerDown(_e: PointerEvent, _ctx: ToolContext): void {}

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    const { x, y } = ctx.canvasCoords(e)
    this.mouseX = x
    this.mouseY = y
    ctx.scheduleRender()
  }

  onPointerUp(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    void this.place(e, ctx)
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
    const glyphs = ctx.glyphCache()
    if (!glyphs) return

    const w = ctx.vp.screenToWorld(this.mouseX, this.mouseY)
    const { x, y } = applySnap(w.x, w.y, ctx)
    const preview = makeDefaultDial(x, y, glyphs)
    const xr = new ExtentsRenderer()
    preview.draw(xr)

    const drw = new CanvasDraw(ctx2d)
    const lw = 1 / ctx.vp.zoom

    ctx2d.beginPath()
    preview.draw(drw)
    ctx2d.strokeStyle = COLOR_PREVIEW
    ctx2d.lineWidth   = lw
    ctx2d.stroke()

    if (xr.minX <= xr.maxX) {
      const pad = 2 * lw
      ctx2d.strokeStyle = COLOR_PREVIEW_BOX
      ctx2d.lineWidth   = lw
      ctx2d.setLineDash([4 * lw, 2 * lw])
      ctx2d.strokeRect(xr.minX - pad, xr.minY - pad,
        xr.maxX - xr.minX + pad * 2, xr.maxY - xr.minY + pad * 2)
      ctx2d.setLineDash([])
    }
  }

  private async place(e: PointerEvent, ctx: ToolContext): Promise<void> {
    if (!ctx.store.project?.stock) return
    const glyphs = ctx.glyphCache() ?? await loadFaceGlyphs(FontFace.RomanSimplex)
    const { x, y } = ctx.canvasCoords(e)
    const w = ctx.vp.screenToWorld(x, y)
    const snapped = applySnap(w.x, w.y, ctx)
    const newDial = makeDefaultDial(snapped.x, snapped.y, glyphs)
    ctx.store.project.stock.items.push(newDial)
    ctx.store.selectedItem = newDial
    ctx.store.activeTool   = 'select'
    ctx.store.notifyItemChanged()
    ctx.scheduleRender()
  }
}
