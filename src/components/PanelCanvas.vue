<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { CanvasDraw } from '../renderer/CanvasDraw'
import { Viewport } from '../renderer/Viewport'
import { ExtentsRenderer } from '../domain/ExtentsRenderer'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { loadProjectFromJson } from '../domain/projectLoader'
import { loadFaceGlyphs } from '../domain/fontLoader'
import { FontFace } from '../domain/HersheyFont'
import type { GlyphMap } from '../domain/HersheyFont'
import type { PanelStockItem } from '../domain/PanelComponent'
import vcoData from '../../examples/vco_compressed.json'
import { useAppStore } from '../stores/appStore'
import type { ToolType } from '../stores/appStore'
import type { ToolHandler, ToolContext } from '../input/ToolHandler'
import { SelectTool } from '../input/tools/SelectTool'
import { DialTool } from '../input/tools/DialTool'
import { dispatchKey } from '../input/keybindings'
import type { KeyBinding } from '../input/keybindings'

const store = useAppStore()
const emit = defineEmits<{ deleteRequested: [] }>()

const COLOR_POCKET  = '#f0a040'
const COLOR_ENGRAVE = '#4fc3f7'
const COLOR_BORDER  = '#555'

// ─── Renderer state ───────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const vp = new Viewport()

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let glyphCache: GlyphMap | null = null

function scheduleRender(): void {
  if (rafId) return
  rafId = requestAnimationFrame(() => { rafId = 0; render() })
}

// ─── Viewport sync ────────────────────────────────────────────────────────────

function canvasRect(): DOMRect { return canvasRef.value!.getBoundingClientRect() }

function syncViewport(): void {
  store.zoom = vp.zoom
  store.panX = vp.panX
  store.panY = vp.panY
  store.viewportInitialized = true
}

// ─── Hit test ─────────────────────────────────────────────────────────────────

function hitTest(wx: number, wy: number): PanelStockItem | null {
  const items = store.project?.stock?.items
  if (!items) return null
  let best: PanelStockItem | null = null
  let bestArea = Infinity
  for (const item of items) {
    if (!item.inside(wx, wy)) continue
    const e = item.extents
    const area = e.x * e.y
    if (area < bestArea) { best = item as PanelStockItem; bestArea = area }
  }
  return best
}

// ─── Tool infrastructure ──────────────────────────────────────────────────────

const toolHandlers: Partial<Record<ToolType, ToolHandler>> = {
  select: new SelectTool(),
  dial:   new DialTool(),
}

const toolCtx: ToolContext = {
  vp,
  store,
  glyphCache: () => glyphCache,
  scheduleRender,
  syncViewport,
  canvasCoords: (e) => {
    const rect = canvasRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  },
  hitTest,
}

function activeTool(): ToolHandler {
  return toolHandlers[store.activeTool] ?? toolHandlers.select!
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(): void {
  if (!ctx) return
  const s = store.project?.stock ?? null
  ctx.clearRect(0, 0, vp.canvasWidth, vp.canvasHeight)
  if (!s) return

  ctx.save()
  vp.applyTransform(ctx)

  const lw  = 1 / vp.zoom
  const drw = new CanvasDraw(ctx)

  // Panel stock outline
  ctx.beginPath()
  const { width, height, pos } = s
  drw.moveTo(pos.x - width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y - height / 2)
  ctx.strokeStyle = COLOR_BORDER
  ctx.lineWidth   = lw
  ctx.stroke()

  // Pass 1 — pockets
  ctx.beginPath()
  for (const item of s.items) {
    if (item instanceof CircularPocket || item instanceof RectangularPocket) {
      const xr = new ExtentsRenderer()
      item.draw(xr)
      if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) item.draw(drw)
    } else if (item instanceof Dial && item.holeRadius > 0) {
      const { x, y } = item.pos
      const r = item.holeRadius
      if (vp.isVisible(x - r, y - r, x + r, y + r)) item.drawHole(drw)
    }
  }
  ctx.strokeStyle = COLOR_POCKET
  ctx.lineWidth   = lw
  ctx.stroke()

  // Pass 2 — engravings
  ctx.beginPath()
  for (const item of s.items) {
    if (item instanceof CircularPocket || item instanceof RectangularPocket) continue
    const xr = new ExtentsRenderer()
    item.draw(xr)
    if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) item.draw(drw)
  }
  ctx.strokeStyle = COLOR_ENGRAVE
  ctx.lineWidth   = lw
  ctx.stroke()

  // Active tool overlay (placement preview, rubber-band, etc.)
  activeTool().drawOverlay?.(ctx, toolCtx)

  ctx.restore()

  // Selection highlight — screen space, always 1px
  const sel = store.selectedItem
  if (sel) {
    const xr = new ExtentsRenderer()
    sel.draw(xr)
    if (sel instanceof Dial && sel.holeRadius > 0) sel.drawHole(xr)
    if (xr.minX <= xr.maxX) {
      const pad = 5
      const tl = vp.worldToScreen(xr.minX, xr.maxY)
      const br = vp.worldToScreen(xr.maxX, xr.minY)
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 3])
      ctx.strokeRect(tl.x - pad, tl.y - pad, br.x - tl.x + pad * 2, br.y - tl.y + pad * 2)
      ctx.setLineDash([])
      ctx.restore()
    }
  }
}

// ─── File load ────────────────────────────────────────────────────────────────

async function loadFile(): Promise<void> {
  let text: string
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await (window as Window & typeof globalThis & {
        showOpenFilePicker(opts: object): Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
        types: [{ description: 'PanelGen JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false,
      })
      text = await (await handle.getFile()).text()
    } else {
      text = await new Promise<string>((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (file) resolve(await file.text())
          else reject(new Error('no file'))
        }
        input.click()
      })
    }
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return
    throw e
  }
  store.project = await loadProjectFromJson(JSON.parse(text))
  vp.fitToStock(store.project.stock)
  syncViewport()
  scheduleRender()
}

function deleteSelected(): void {
  const item = store.selectedItem
  if (!item || !store.project?.stock) return
  const idx = store.project.stock.items.indexOf(item)
  if (idx !== -1) store.project.stock.items.splice(idx, 1)
  store.selectedItem = null
  scheduleRender()
}

defineExpose({ loadFile, scheduleRender, deleteSelected })

watch(() => store.pendingLoad, (val) => {
  if (!val) return
  store.pendingLoad = false
  loadFile()
})

// ─── Pointer events ───────────────────────────────────────────────────────────

function onPointerEnter(): void              { activeTool().onPointerEnter?.(toolCtx) }
function onPointerLeave(): void              { activeTool().onPointerLeave?.(toolCtx) }
function onPointerDown(e: PointerEvent): void  { activeTool().onPointerDown(e, toolCtx) }
function onPointerMove(e: PointerEvent): void  { activeTool().onPointerMove(e, toolCtx) }
function onPointerUp(e: PointerEvent): void    { activeTool().onPointerUp(e, toolCtx) }
function onPointerCancel(e: PointerEvent): void { activeTool().onPointerCancel?.(e, toolCtx) }

// ─── Wheel zoom ───────────────────────────────────────────────────────────────

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect   = canvasRect()
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
  vp.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
  syncViewport()
  scheduleRender()
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────

function moveItem(dx: number, dy: number): void {
  const item = store.selectedItem
  if (!item) return
  item.pos.x = Math.round((item.pos.x + dx) * 1000) / 1000
  item.pos.y = Math.round((item.pos.y + dy) * 1000) / 1000
  store.notifyItemChanged()
  scheduleRender()
}

const hasSel   = () => store.selectedItem !== null
const notSel   = () => store.activeTool !== 'select'
const stepX    = () => store.snapToGrid && store.gridX > 0 ? store.gridX : 1.0
const stepY    = () => store.snapToGrid && store.gridY > 0 ? store.gridY : 1.0

const keyBindings: KeyBinding[] = [
  { key: 'Escape', guard: notSel, action: () => { store.activeTool = 'select'; scheduleRender() } },
  { key: 'Delete', guard: hasSel, action: () => emit('deleteRequested') },
  // Arrow nudge — ctrl: fine (0.01 mm), shift: coarse (1.0 mm), plain: normal (0.1 mm)
  { key: 'ArrowLeft',  ctrl: true,                guard: hasSel, action: () => moveItem(-0.01,  0)    },
  { key: 'ArrowRight', ctrl: true,                guard: hasSel, action: () => moveItem( 0.01,  0)    },
  { key: 'ArrowUp',    ctrl: true,                guard: hasSel, action: () => moveItem(0,      0.01) },
  { key: 'ArrowDown',  ctrl: true,                guard: hasSel, action: () => moveItem(0,     -0.01) },
  { key: 'ArrowLeft',  shift: true, ctrl: false,  guard: hasSel, action: () => moveItem(-stepX(),  0)       },
  { key: 'ArrowRight', shift: true, ctrl: false,  guard: hasSel, action: () => moveItem( stepX(),  0)       },
  { key: 'ArrowUp',    shift: true, ctrl: false,  guard: hasSel, action: () => moveItem(0,         stepY()) },
  { key: 'ArrowDown',  shift: true, ctrl: false,  guard: hasSel, action: () => moveItem(0,        -stepY()) },
  { key: 'ArrowLeft',  ctrl: false, shift: false, guard: hasSel, action: () => moveItem(-0.1,   0)    },
  { key: 'ArrowRight', ctrl: false, shift: false, guard: hasSel, action: () => moveItem( 0.1,   0)    },
  { key: 'ArrowUp',    ctrl: false, shift: false, guard: hasSel, action: () => moveItem(0,      0.1)  },
  { key: 'ArrowDown',  ctrl: false, shift: false, guard: hasSel, action: () => moveItem(0,     -0.1)  },
]

function onKeyDown(e: KeyboardEvent): void {
  dispatchKey(e, keyBindings)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let ro: ResizeObserver | null = null

onMounted(async () => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)

  loadFaceGlyphs(FontFace.RomanSimplex).then(g => { glyphCache = g })

  const initialRect = canvas.getBoundingClientRect()
  canvas.width    = initialRect.width
  canvas.height   = initialRect.height
  vp.canvasWidth  = initialRect.width
  vp.canvasHeight = initialRect.height

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    canvas.width  = width
    canvas.height = height
    vp.canvasWidth  = width
    vp.canvasHeight = height
    scheduleRender()
  })
  ro.observe(canvas)

  if (store.pendingLoad) {
    store.pendingLoad = false
    loadFile()
    return
  }

  if (!store.project) {
    store.project = await loadProjectFromJson(vcoData)
  }
  if (store.viewportInitialized) {
    vp.zoom = store.zoom
    vp.panX = store.panX
    vp.panY = store.panY
  } else {
    vp.fitToStock(store.project.stock)
    syncViewport()
  }
  scheduleRender()
})

onUnmounted(() => {
  ro?.disconnect()
  canvasRef.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="canvas-wrap">
    <canvas
      ref="canvasRef"
      :style="{ cursor: activeTool().cursor }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    />
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
