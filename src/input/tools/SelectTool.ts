import type { ToolHandler, ToolContext } from '../ToolHandler'

type DragMode = 'idle' | 'pan' | 'move'

export class SelectTool implements ToolHandler {
  readonly cursor = 'crosshair'
  private dragMode: DragMode = 'idle'

  // pan state
  private lastX = 0
  private lastY = 0
  private totalMovement = 0

  // move state — anchor offset from click point to item origin (world space)
  private anchorDX = 0
  private anchorDY = 0

  onPointerDown(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    const { x, y } = ctx.canvasCoords(e)
    const world = ctx.vp.screenToWorld(x, y)
    const sel = ctx.store.selectedItem

    if (sel?.inside(world.x, world.y)) {
      this.dragMode  = 'move'
      this.anchorDX  = sel.pos.x - world.x
      this.anchorDY  = sel.pos.y - world.y
    } else {
      this.dragMode      = 'pan'
      this.totalMovement = 0
      this.lastX         = e.clientX
      this.lastY         = e.clientY
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    if (this.dragMode === 'move') {
      const item = ctx.store.selectedItem
      if (!item) return
      const { x, y } = ctx.canvasCoords(e)
      const world = ctx.vp.screenToWorld(x, y)
      let newX = Math.round((world.x + this.anchorDX) * 1000) / 1000
      let newY = Math.round((world.y + this.anchorDY) * 1000) / 1000
      const { snapToGrid, gridX, gridY } = ctx.store
      if (!e.ctrlKey && snapToGrid && gridX > 0 && gridY > 0) {
        newX = Math.round(Math.round(newX / gridX) * gridX * 1000) / 1000
        newY = Math.round(Math.round(newY / gridY) * gridY * 1000) / 1000
      }
      item.pos.x = newX
      item.pos.y = newY
      ctx.store.notifyItemChanged()
      ctx.scheduleRender()
      return
    }

    if (this.dragMode === 'pan') {
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.totalMovement += Math.sqrt(dx * dx + dy * dy)
      ctx.vp.pan(dx, dy)
      this.lastX = e.clientX
      this.lastY = e.clientY
      ctx.syncViewport()
      ctx.scheduleRender()
    }
  }

  onPointerUp(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return

    if (this.dragMode === 'move') {
      this.dragMode = 'idle'
      ctx.scheduleRender()
      return
    }

    if (this.dragMode === 'pan') {
      this.dragMode = 'idle'
      if (this.totalMovement < 4) {
        const { x, y } = ctx.canvasCoords(e)
        const w = ctx.vp.screenToWorld(x, y)
        ctx.store.selectedItem = ctx.hitTest(w.x, w.y)
        ctx.scheduleRender()
      }
    }
  }

  onPointerCancel(_e: PointerEvent, _ctx: ToolContext): void {
    this.dragMode = 'idle'
  }
}
