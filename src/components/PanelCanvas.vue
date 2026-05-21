<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { CanvasDraw } from '../renderer/CanvasDraw'
import { Viewport } from '../renderer/Viewport'
import { ExtentsRenderer } from '../domain/ExtentsRenderer'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { PolyLine } from '../domain/PolyLine'
import { PanelGenProject } from '../domain/PanelGenProject'
import { PanelStock } from '../domain/PanelStock'
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
import { TextTool } from '../input/tools/TextTool'
import { CircularPocketTool } from '../input/tools/CircularPocketTool'
import { RectangularPocketTool } from '../input/tools/RectangularPocketTool'
import { PolylineTool } from '../input/tools/PolylineTool'
import { NodeEditTool } from '../input/tools/NodeEditTool'
import { dispatchKey } from '../input/keybindings'
import type { KeyBinding } from '../input/keybindings'

const store = useAppStore()
const emit = defineEmits<{ deleteRequested: [] }>()


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
  select:         new SelectTool(),
  nodeEdit:       new NodeEditTool(),
  dial:           new DialTool(),
  text:           new TextTool(),
  polyline:       new PolylineTool(),
  circularPocket: new CircularPocketTool(),
  rectPocket:     new RectangularPocketTool(),
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

  // Origin axes
  if (store.showOriginAxes) {
    const tl = vp.screenToWorld(0, 0)
    const br = vp.screenToWorld(vp.canvasWidth, vp.canvasHeight)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(tl.x, 0); ctx.lineTo(br.x, 0)
    ctx.strokeStyle = '#f44336'  // X axis — red
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, tl.y); ctx.lineTo(0, br.y)
    ctx.strokeStyle = '#4caf50'  // Y axis — green
    ctx.stroke()
  }

  // Panel stock outline
  ctx.beginPath()
  const { width, height, pos } = s
  drw.moveTo(pos.x - width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y - height / 2)
  ctx.strokeStyle = store.colorBorder
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
  ctx.strokeStyle = store.colorPocket
  ctx.lineWidth   = lw
  ctx.stroke()

  // Pass 1b — inner step circles of stepped pockets (dimmed)
  ctx.beginPath()
  for (const item of s.items) {
    if (!(item instanceof CircularPocket) || item.steps.length === 0) continue
    const xr = new ExtentsRenderer()
    item.draw(xr)
    if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY))
      item.drawSteps(drw)
  }
  ctx.globalAlpha = 0.4
  ctx.strokeStyle = store.colorPocket
  ctx.lineWidth   = lw
  ctx.stroke()
  ctx.globalAlpha = 1

  // Pass 2 — engravings
  ctx.beginPath()
  for (const item of s.items) {
    if (item instanceof CircularPocket || item instanceof RectangularPocket) continue
    const xr = new ExtentsRenderer()
    item.draw(xr)
    if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) item.draw(drw)
  }
  ctx.strokeStyle = store.colorEngrave
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
      store.fileHandle = handle
      store.saveFileName = handle.name
    } else {
      text = await new Promise<string>((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) { reject(new Error('no file')); return }
          store.fileHandle = null
          store.saveFileName = file.name
          resolve(await file.text())
        }
        input.click()
      })
    }
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return
    throw e
  }
  store.project = await loadProjectFromJson(JSON.parse(text))
  if (store.tools.length === 0 && store.project.tools.length > 0)
    store.tools = store.project.tools.map(t => ({ ...t }))
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

watch(() => store.activeTool, (_newTool, oldTool) => {
  toolHandlers[oldTool]?.onPointerLeave?.(toolCtx)
  if (mouseOnCanvas && lastMouseEvent) {
    activeTool().onPointerMove(lastMouseEvent, toolCtx)
  }
})

watch(() => store.pendingLoad, (val) => {
  if (!val) return
  store.pendingLoad = false
  loadFile()
})

watch(() => store.pendingNew, (val) => {
  if (!val) return
  store.pendingNew = false
  const p = new PanelGenProject()
  p.stock = new PanelStock()
  p.stock.width     = store.defaultPanelWidth
  p.stock.height    = store.defaultPanelHeight
  p.stock.thickness = store.defaultPanelThickness
  p.stock.pos       = { x: store.defaultPanelWidth / 2, y: store.defaultPanelHeight / 2, z: 0 }
  store.project      = p
  store.selectedItem = null
  store.fileHandle   = null
  store.saveFileName = 'panel.json'
  vp.fitToStock(p.stock)
  syncViewport()
  scheduleRender()
})

// ─── Pointer events ───────────────────────────────────────────────────────────

let mouseOnCanvas   = false
let lastMouseEvent: PointerEvent | null = null

function onPointerEnter(e: PointerEvent): void {
  mouseOnCanvas = true
  lastMouseEvent = e
  activeTool().onPointerEnter?.(toolCtx)
}
function onPointerLeave(): void {
  mouseOnCanvas  = false
  lastMouseEvent = null
  activeTool().onPointerLeave?.(toolCtx)
}
function onPointerDown(e: PointerEvent): void  { activeTool().onPointerDown(e, toolCtx) }
function onPointerMove(e: PointerEvent): void  {
  mouseOnCanvas  = true
  lastMouseEvent = e
  activeTool().onPointerMove(e, toolCtx)
}
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

const setTool = (t: ToolType) => () => { store.activeTool = t; scheduleRender() }

const keyBindings: KeyBinding[] = [
  { key: 'Escape', guard: notSel, action: () => { store.activeTool = 'select'; scheduleRender() } },
  { key: 'Enter',  guard: () => store.activeTool === 'select' && store.selectedItem instanceof PolyLine, action: setTool('nodeEdit') },
  { key: 'v', action: setTool('select')         },
  { key: 'a', action: setTool('nodeEdit')        },
  { key: 'p', action: setTool('polyline')        },
  { key: 't', action: setTool('text')            },
  { key: 'r', action: setTool('rectPocket')      },
  { key: 'c', action: setTool('circularPocket')  },
  { key: 'd', action: setTool('dial')            },
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

function onDblClick(e: MouseEvent): void {
  activeTool().onDblClick?.(e, toolCtx)
}

function onKeyDown(e: KeyboardEvent): void {
  const tool = activeTool()
  tool.onKeyDown?.(e, toolCtx)
  if (e.defaultPrevented) return
  dispatchKey(e, keyBindings)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let ro: ResizeObserver | null = null

onMounted(async () => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('dblclick', onDblClick)
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
    if (store.tools.length === 0 && store.project.tools.length > 0)
      store.tools = store.project.tools.map(t => ({ ...t }))
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
  canvasRef.value?.removeEventListener('dblclick', onDblClick)
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
