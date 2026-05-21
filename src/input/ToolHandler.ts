import type { Viewport } from '../renderer/Viewport'
import type { GlyphMap } from '../domain/HersheyFont'
import type { PanelStockItem } from '../domain/PanelComponent'
import type { useAppStore } from '../stores/appStore'

export interface ToolContext {
  readonly vp: Viewport
  readonly store: ReturnType<typeof useAppStore>
  glyphCache(): GlyphMap | null
  scheduleRender(): void
  syncViewport(): void
  canvasCoords(e: PointerEvent): { x: number; y: number }
  hitTest(wx: number, wy: number): PanelStockItem | null
}

export interface ToolHandler {
  readonly cursor: string
  onPointerDown(e: PointerEvent, ctx: ToolContext): void
  onPointerMove(e: PointerEvent, ctx: ToolContext): void
  onPointerUp(e: PointerEvent, ctx: ToolContext): void
  onPointerCancel?(e: PointerEvent, ctx: ToolContext): void
  onPointerEnter?(ctx: ToolContext): void
  onPointerLeave?(ctx: ToolContext): void
  drawOverlay?(ctx2d: CanvasRenderingContext2D, ctx: ToolContext): void
  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void
  onDblClick?(e: MouseEvent, ctx: ToolContext): void
}
