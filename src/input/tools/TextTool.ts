import type { ToolHandler, ToolContext } from '../ToolHandler'
import { CanvasDraw } from '../../renderer/CanvasDraw'
import { ExtentsRenderer } from '../../domain/ExtentsRenderer'
import { Text } from '../../domain/Text'
import { loadFaceGlyphs } from '../../domain/fontLoader'
import { FontFace } from '../../domain/HersheyFont'
import type { GlyphMap } from '../../domain/HersheyFont'
import { applySnap } from './snapUtils'

const COLOR_PREVIEW     = 'rgba(79, 195, 247, 0.55)'
const COLOR_PREVIEW_BOX = 'rgba(79, 195, 247, 0.25)'

function makeDefaultText(x: number, y: number, glyphs: GlyphMap): Text {
  const t = new Text('Label', glyphs)
  t.pos = { x, y, z: 0 }
  return t
}

export class TextTool implements ToolHandler {
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
    const preview = makeDefaultText(x, y, glyphs)
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
    const newText = makeDefaultText(snapped.x, snapped.y, glyphs)
    ctx.store.project.stock.items.push(newText)
    ctx.store.selectedItem = newText
    ctx.store.activeTool   = 'select'
    ctx.store.notifyItemChanged()
    ctx.scheduleRender()
  }
}
