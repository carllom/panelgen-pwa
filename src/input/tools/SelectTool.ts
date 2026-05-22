import type { ToolHandler, ToolContext } from '../ToolHandler'
import type { Guide } from '../../domain/Guide'

function guideSnapNormal(
  guides: Guide[], x: number, y: number, threshold: number
): { x: number; y: number } {
  let rx = x, ry = y, bestX = threshold, bestY = threshold
  for (const g of guides) {
    if (g.direction === 'horizontal') {
      const d = Math.abs(y - g.pos)
      if (d < bestY) { bestY = d; ry = g.pos }
    } else {
      const d = Math.abs(x - g.pos)
      if (d < bestX) { bestX = d; rx = g.pos }
    }
  }
  return { x: rx, y: ry }
}

function guideSnapConstrained(
  guides: Guide[], originX: number, originY: number,
  snapAngle: number, refX: number, refY: number, threshold: number
): { x: number; y: number } | null {
  const cosA = Math.cos(snapAngle)
  const sinA = Math.sin(snapAngle)
  let best: { x: number; y: number } | null = null
  let bestDist = threshold
  for (const g of guides) {
    let ix: number, iy: number
    if (g.direction === 'horizontal') {
      if (Math.abs(sinA) < 1e-9) continue
      const t = (g.pos - originY) / sinA
      ix = originX + t * cosA; iy = g.pos
    } else {
      if (Math.abs(cosA) < 1e-9) continue
      const t = (g.pos - originX) / cosA
      ix = g.pos; iy = originY + t * sinA
    }
    const dist = Math.sqrt((ix - refX) ** 2 + (iy - refY) ** 2)
    if (dist < bestDist) { bestDist = dist; best = { x: ix, y: iy } }
  }
  return best
}

type DragMode = 'idle' | 'pan' | 'move' | 'moveGuide'

const GUIDE_HIT_PX = 8  // screen pixels for guide click tolerance

function isNearGuide(guide: Guide, wx: number, wy: number, zoom: number): boolean {
  const threshold = GUIDE_HIT_PX / zoom
  return guide.direction === 'horizontal'
    ? Math.abs(wy - guide.pos) < threshold
    : Math.abs(wx - guide.pos) < threshold
}

function hitGuide(ctx: ToolContext, wx: number, wy: number): Guide | null {
  const guides = ctx.store.project?.stock.guides ?? []
  if (guides.length === 0) return null
  const threshold = GUIDE_HIT_PX / ctx.vp.zoom
  let best: Guide | null = null
  let bestDist = threshold
  for (const guide of guides) {
    const dist = guide.direction === 'horizontal'
      ? Math.abs(wy - guide.pos)
      : Math.abs(wx - guide.pos)
    if (dist < bestDist) { best = guide; bestDist = dist }
  }
  return best
}

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

  // moveGuide state — offset from click axis coordinate to guide.pos
  private guideAnchor = 0

  onPointerDown(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    const { x, y } = ctx.canvasCoords(e)
    const world = ctx.vp.screenToWorld(x, y)
    const sel = ctx.store.selectedItem

    const selGuide = ctx.store.selectedGuide
    if (sel?.inside(world.x, world.y)) {
      ctx.pushHistory()
      this.dragMode  = 'move'
      this.anchorDX  = sel.pos.x - world.x
      this.anchorDY  = sel.pos.y - world.y
      this.originX   = sel.pos.x
      this.originY   = sel.pos.y
    } else if (selGuide && isNearGuide(selGuide, world.x, world.y, ctx.vp.zoom)) {
      ctx.pushHistory()
      this.dragMode    = 'moveGuide'
      this.guideAnchor = selGuide.direction === 'horizontal'
        ? selGuide.pos - world.y
        : selGuide.pos - world.x
    } else {
      this.dragMode      = 'pan'
      this.totalMovement = 0
      this.lastX         = e.clientX
      this.lastY         = e.clientY
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    if (this.dragMode === 'moveGuide') {
      const guide = ctx.store.selectedGuide
      if (!guide) return
      const { x, y } = ctx.canvasCoords(e)
      const world = ctx.vp.screenToWorld(x, y)
      const raw = (guide.direction === 'horizontal' ? world.y : world.x) + this.guideAnchor
      const { snapToGrid, gridX, gridY } = ctx.store
      if (!e.ctrlKey && snapToGrid) {
        const step = guide.direction === 'horizontal' ? gridY : gridX
        guide.pos = step > 0 ? Math.round(raw / step) * step : Math.round(raw * 1000) / 1000
      } else {
        guide.pos = Math.round(raw * 1000) / 1000
      }
      ctx.store.notifyGuideChanged()
      ctx.scheduleRender()
      return
    }

    if (this.dragMode === 'move') {
      const item = ctx.store.selectedItem
      if (!item) return
      const { x, y } = ctx.canvasCoords(e)
      const world = ctx.vp.screenToWorld(x, y)
      let newX = world.x + this.anchorDX
      let newY = world.y + this.anchorDY
      const { snapToGrid, gridX, gridY, snapToGuides, guideSnapDistance } = ctx.store
      const guides = ctx.store.project?.stock.guides ?? []
      const useGuideSnap = !e.ctrlKey && snapToGuides && guides.length > 0
      const guideThreshold = guideSnapDistance / ctx.vp.zoom
      if (e.shiftKey) {
        // Constrain to nearest 45° ray from the drag-start position
        const dx = newX - this.originX
        const dy = newY - this.originY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
          const snapAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
          newX = this.originX + dist * Math.cos(snapAngle)
          newY = this.originY + dist * Math.sin(snapAngle)
          if (useGuideSnap) {
            const snapped = guideSnapConstrained(guides, this.originX, this.originY, snapAngle, newX, newY, guideThreshold)
            if (snapped) { newX = snapped.x; newY = snapped.y }
          }
        } else {
          newX = this.originX
          newY = this.originY
        }
      } else {
        if (!e.ctrlKey && snapToGrid && gridX > 0 && gridY > 0) {
          newX = Math.round(newX / gridX) * gridX
          newY = Math.round(newY / gridY) * gridY
        }
        if (useGuideSnap) {
          const snapped = guideSnapNormal(guides, newX, newY, guideThreshold)
          newX = snapped.x; newY = snapped.y
        }
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

    if (this.dragMode === 'move' || this.dragMode === 'moveGuide') {
      this.dragMode = 'idle'
      ctx.scheduleRender()
      return
    }

    if (this.dragMode === 'pan') {
      this.dragMode = 'idle'
      if (this.totalMovement < 4) {
        const { x, y } = ctx.canvasCoords(e)
        const w = ctx.vp.screenToWorld(x, y)
        ctx.store.selectedItem  = ctx.hitTest(w.x, w.y)
        ctx.store.selectedGuide = ctx.store.selectedItem ? null : hitGuide(ctx, w.x, w.y)
        ctx.scheduleRender()
      }
    }
  }

  onPointerCancel(_e: PointerEvent, _ctx: ToolContext): void {
    this.dragMode = 'idle'
  }
}
