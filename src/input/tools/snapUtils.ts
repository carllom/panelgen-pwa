import type { ToolContext } from '../ToolHandler'

export function applySnap(wx: number, wy: number, ctx: ToolContext): { x: number; y: number } {
  const { snapToGrid, gridX, gridY } = ctx.store
  let x = Math.round(wx * 1000) / 1000
  let y = Math.round(wy * 1000) / 1000
  if (snapToGrid && gridX > 0 && gridY > 0) {
    x = Math.round(Math.round(x / gridX) * gridX * 1000) / 1000
    y = Math.round(Math.round(y / gridY) * gridY * 1000) / 1000
  }
  return { x, y }
}
