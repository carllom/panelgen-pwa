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
  // item's world position at the moment the drag started (for constrained move)
  private originX = 0
  private originY = 0

  onPointerDown(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    const { x, y } = ctx.canvasCoords(e)
    const world = ctx.vp.screenToWorld(x, y)
    const sel = ctx.store.selectedItem

    if (sel?.inside(world.x, world.y)) {
      ctx.pushHistory()
      this.dragMode  = 'move'
      this.anchorDX  = sel.pos.x - world.x
      this.anchorDY  = sel.pos.y - world.y
      this.originX   = sel.pos.x
      this.originY   = sel.pos.y
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
      let newX = world.x + this.anchorDX
      let newY = world.y + this.anchorDY
      const { snapToGrid, gridX, gridY } = ctx.store
      if (e.shiftKey) {
        // Constrain to nearest 45° ray from the drag-start position
        const dx = newX - this.originX
        const dy = newY - this.originY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
          const snapAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
          newX = this.originX + dist * Math.cos(snapAngle)
          newY = this.originY + dist * Math.sin(snapAngle)
        } else {
          newX = this.originX
          newY = this.originY
        }
      } else if (!e.ctrlKey && snapToGrid && gridX > 0 && gridY > 0) {
        newX = Math.round(newX / gridX) * gridX
        newY = Math.round(newY / gridY) * gridY
      }
      newX = Math.round(newX * 1000) / 1000
      newY = Math.round(newY * 1000) / 1000
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
