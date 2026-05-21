import type { ToolHandler, ToolContext } from '../ToolHandler'
import { PolyLine } from '../../domain/PolyLine'
import { applySnap } from './snapUtils'

type DragMode = 'idle' | 'pan' | 'move' | 'vertex'

export class NodeEditTool implements ToolHandler {
  readonly cursor = 'crosshair'
  private dragMode: DragMode = 'idle'
  private selectedVertexIdx: number | null = null

  private lastX = 0
  private lastY = 0
  private totalMovement = 0
  private anchorDX = 0
  private anchorDY = 0

  private hitVertex(wx: number, wy: number, pl: PolyLine, ctx: ToolContext): number {
    // 6 screen-pixel hit radius, converted to world space
    const threshold = (6 / ctx.vp.zoom) ** 2
    for (let i = 0; i < pl.points.length; i++) {
      const vx = pl.points[i].x + pl.pos.x
      const vy = pl.points[i].y + pl.pos.y
      const dx = wx - vx
      const dy = wy - vy
      if (dx * dx + dy * dy < threshold) return i
    }
    return -1
  }

  onPointerDown(e: PointerEvent, ctx: ToolContext): void {
    if (e.button !== 0) return
    const { x, y } = ctx.canvasCoords(e)
    const world = ctx.vp.screenToWorld(x, y)
    const sel = ctx.store.selectedItem

    // Vertex handle hit test on selected PolyLine
    if (sel instanceof PolyLine) {
      const vi = this.hitVertex(world.x, world.y, sel, ctx)
      if (vi !== -1) {
        this.dragMode = 'vertex'
        this.selectedVertexIdx = vi
        const vx = sel.points[vi].x + sel.pos.x
        const vy = sel.points[vi].y + sel.pos.y
        this.anchorDX = vx - world.x
        this.anchorDY = vy - world.y
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        ctx.scheduleRender()
        return
      }
    }

    // Item body hit test — move whole item
    if (sel?.inside(world.x, world.y)) {
      this.dragMode = 'move'
      this.selectedVertexIdx = null
      this.anchorDX = sel.pos.x - world.x
      this.anchorDY = sel.pos.y - world.y
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // Pan / click to change selection
    this.dragMode = 'pan'
    this.selectedVertexIdx = null
    this.totalMovement = 0
    this.lastX = e.clientX
    this.lastY = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  onPointerMove(e: PointerEvent, ctx: ToolContext): void {
    if (this.dragMode === 'vertex') {
      const sel = ctx.store.selectedItem
      if (!(sel instanceof PolyLine) || this.selectedVertexIdx === null) return
      const { x, y } = ctx.canvasCoords(e)
      const world = ctx.vp.screenToWorld(x, y)
      let wx = world.x + this.anchorDX
      let wy = world.y + this.anchorDY
      if (!e.ctrlKey) ({ x: wx, y: wy } = applySnap(wx, wy, ctx))
      sel.points[this.selectedVertexIdx] = {
        x: Math.round((wx - sel.pos.x) * 1000) / 1000,
        y: Math.round((wy - sel.pos.y) * 1000) / 1000,
      }
      ctx.store.notifyItemChanged()
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

    if (this.dragMode === 'vertex' || this.dragMode === 'move') {
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
        this.selectedVertexIdx = null
        ctx.scheduleRender()
      }
    }
  }

  onPointerCancel(_e: PointerEvent, _ctx: ToolContext): void {
    this.dragMode = 'idle'
  }

  onKeyDown(e: KeyboardEvent, ctx: ToolContext): void {
    const sel = ctx.store.selectedItem
    if (!(sel instanceof PolyLine) || this.selectedVertexIdx === null) return
    if (this.selectedVertexIdx >= sel.points.length) return

    const stepX = ctx.store.snapToGrid && ctx.store.gridX > 0 ? ctx.store.gridX : 1.0
    const stepY = ctx.store.snapToGrid && ctx.store.gridY > 0 ? ctx.store.gridY : 1.0
    const pt = sel.points[this.selectedVertexIdx]

    let dx = 0
    let dy = 0
    if (e.key === 'ArrowLeft')  dx = e.ctrlKey ? -0.01 : e.shiftKey ? -stepX : -0.1
    if (e.key === 'ArrowRight') dx = e.ctrlKey ?  0.01 : e.shiftKey ?  stepX :  0.1
    if (e.key === 'ArrowUp')    dy = e.ctrlKey ?  0.01 : e.shiftKey ?  stepY :  0.1
    if (e.key === 'ArrowDown')  dy = e.ctrlKey ? -0.01 : e.shiftKey ? -stepY : -0.1
    if (dx === 0 && dy === 0) return

    e.preventDefault()
    sel.points[this.selectedVertexIdx] = {
      x: Math.round((pt.x + dx) * 1000) / 1000,
      y: Math.round((pt.y + dy) * 1000) / 1000,
    }
    ctx.store.notifyItemChanged()
    ctx.scheduleRender()
  }

  drawOverlay(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void {
    const sel = ctx.store.selectedItem
    if (!(sel instanceof PolyLine)) return

    const lw = 1 / ctx.vp.zoom
    const hs = 3.5 * lw  // half-size: constant ~7px appearance at any zoom

    for (let i = 0; i < sel.points.length; i++) {
      const vx = sel.points[i].x + sel.pos.x
      const vy = sel.points[i].y + sel.pos.y
      ctx2d.beginPath()
      ctx2d.rect(vx - hs, vy - hs, hs * 2, hs * 2)
      if (i === this.selectedVertexIdx) {
        ctx2d.fillStyle = '#4fc3f7'
        ctx2d.fill()
      } else {
        ctx2d.strokeStyle = '#4fc3f7'
        ctx2d.lineWidth = lw
        ctx2d.stroke()
      }
    }
  }
}
