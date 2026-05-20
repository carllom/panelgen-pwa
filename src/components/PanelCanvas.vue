<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
import type { PanelGenProject } from '../domain/PanelGenProject'
import type { PanelStockItem } from '../domain/PanelComponent'
import vcoData from '../../examples/vco_compressed.json'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const emit = defineEmits<{ deleteRequested: [] }>()

const COLOR_POCKET  = '#f0a040'
const COLOR_ENGRAVE = '#4fc3f7'
const COLOR_BORDER  = '#555'
const COLOR_PREVIEW = 'rgba(79, 195, 247, 0.55)'
const COLOR_PREVIEW_BOX = 'rgba(79, 195, 247, 0.25)'

// ─── Renderer state ───────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const vp = new Viewport()

let ctx: CanvasRenderingContext2D | null = null
let project: PanelGenProject | null = null
let rafId = 0
let glyphCache: GlyphMap | null = null

// Mouse tracking for placement preview
let mouseCanvasX = 0
let mouseCanvasY = 0
let mouseOnCanvas = false

function scheduleRender(): void {
  if (rafId) return
  rafId = requestAnimationFrame(() => { rafId = 0; render() })
}

// ─── Default dial factory ─────────────────────────────────────────────────────

function makeDefaultDial(x: number, y: number, glyphs: GlyphMap): Dial {
  const d = new Dial(glyphs)
  d.pos         = { x, y, z: 0 }
  d.innerRadius = 8
  d.arcSpan     = 270
  d.markerLength = 3
  d.minValue    = 0
  d.maxValue    = 10
  d.step        = 1
  d.tickLength  = 1.5
  d.tickCount   = 4
  d.markerLabelOffset = 1.5
  d.text        = 'Dial'
  return d
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(): void {
  if (!ctx) return
  const s = project?.stock ?? null
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

  // Dial placement preview
  if (store.activeTool === 'dial' && mouseOnCanvas && glyphCache) {
    const { x, y } = vp.screenToWorld(mouseCanvasX, mouseCanvasY)
    const preview = makeDefaultDial(x, y, glyphCache)
    const xr = new ExtentsRenderer()
    preview.draw(xr)

    ctx.beginPath()
    preview.draw(drw)
    ctx.strokeStyle = COLOR_PREVIEW
    ctx.lineWidth   = lw
    ctx.stroke()

    if (xr.minX <= xr.maxX) {
      const pad = 2 * lw
      ctx.strokeStyle = COLOR_PREVIEW_BOX
      ctx.lineWidth   = lw
      ctx.setLineDash([4 * lw, 2 * lw])
      ctx.strokeRect(xr.minX - pad, xr.minY - pad,
        xr.maxX - xr.minX + pad * 2, xr.maxY - xr.minY + pad * 2)
      ctx.setLineDash([])
    }
  }

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

// ─── G-code ───────────────────────────────────────────────────────────────────

function openGCodeInTab(): void {
  if (!project) return
  const gcode = project.generateGCode()
  const blob = new Blob([gcode], { type: 'text/plain' })
  window.open(URL.createObjectURL(blob), '_blank')
}

// ─── File load ───────────────────────────────────────────────────────────────

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
  project = await loadProjectFromJson(JSON.parse(text))
  vp.fitToStock(project.stock)
  syncViewport()
  scheduleRender()
}

function deleteSelected(): void {
  const item = store.selectedItem
  if (!item || !project?.stock) return
  const idx = project.stock.items.indexOf(item)
  if (idx !== -1) project.stock.items.splice(idx, 1)
  store.selectedItem = null
  scheduleRender()
}

defineExpose({ loadFile, scheduleRender, deleteSelected })

// ─── Pointer events ──────────────────────────────────────────────────────────

let dragging = false
let lastX = 0
let lastY = 0
let totalMovement = 0

function canvasRect(): DOMRect { return canvasRef.value!.getBoundingClientRect() }

function hitTest(wx: number, wy: number): PanelStockItem | null {
  const items = project?.stock?.items
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

function syncViewport(): void {
  store.zoom = vp.zoom
  store.panX = vp.panX
  store.panY = vp.panY
}

function onPointerEnter(): void {
  mouseOnCanvas = true
}

function onPointerLeave(): void {
  mouseOnCanvas = false
  if (store.activeTool !== 'select') scheduleRender()
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  if (store.activeTool !== 'select') return  // no pan in placement modes
  dragging = true
  totalMovement = 0
  lastX = e.clientX
  lastY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  // Always track canvas-relative mouse for placement preview
  const rect = canvasRect()
  mouseCanvasX = e.clientX - rect.left
  mouseCanvasY = e.clientY - rect.top

  if (store.activeTool !== 'select') {
    scheduleRender()
    return
  }

  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  totalMovement += Math.sqrt(dx * dx + dy * dy)
  vp.pan(dx, dy)
  lastX = e.clientX
  lastY = e.clientY
  syncViewport()
  scheduleRender()
}

function onPointerUp(e: PointerEvent): void {
  if (e.button !== 0) return

  if (store.activeTool === 'dial') {
    placeDial(e)
    return
  }

  if (!dragging) return
  dragging = false
  if (totalMovement < 4) {
    const rect = canvasRect()
    const { x, y } = vp.screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    store.selectedItem = hitTest(x, y)
    scheduleRender()
  }
}

async function placeDial(e: PointerEvent): Promise<void> {
  if (!project?.stock) return
  const glyphs = glyphCache ?? await loadFaceGlyphs(FontFace.RomanSimplex)
  const rect = canvasRect()
  const w = vp.screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
  const x = Math.round(w.x * 1000) / 1000
  const y = Math.round(w.y * 1000) / 1000
  const newDial = makeDefaultDial(x, y, glyphs)
  project.stock.items.push(newDial)
  store.selectedItem = newDial
  store.activeTool = 'select'
  store.notifyItemChanged()
  scheduleRender()
}

// ─── Wheel zoom ──────────────────────────────────────────────────────────────

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect   = canvasRect()
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
  vp.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
  syncViewport()
  scheduleRender()
}

// ─── Keyboard ────────────────────────────────────────────────────────────────

function onKeyDown(e: KeyboardEvent): void {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  if (e.key === 'Escape' && store.activeTool !== 'select') {
    store.activeTool = 'select'
    scheduleRender()
    return
  }

  const item = store.selectedItem
  if (!item) return

  if (e.key === 'Delete') {
    e.preventDefault()
    emit('deleteRequested')
    return
  }

  let dx = 0, dy = 0
  const step = e.ctrlKey ? 0.01 : e.shiftKey ? 1.0 : 0.1
  switch (e.key) {
    case 'ArrowLeft':  dx = -step; break
    case 'ArrowRight': dx =  step; break
    case 'ArrowUp':    dy =  step; break
    case 'ArrowDown':  dy = -step; break
    default: return
  }

  e.preventDefault()
  item.pos.x = Math.round((item.pos.x + dx) * 1000) / 1000
  item.pos.y = Math.round((item.pos.y + dy) * 1000) / 1000
  store.notifyItemChanged()
  scheduleRender()
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

let ro: ResizeObserver | null = null

onMounted(async () => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)

  loadFaceGlyphs(FontFace.RomanSimplex).then(g => { glyphCache = g })

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    canvas.width  = width
    canvas.height = height
    vp.canvasWidth  = width
    vp.canvasHeight = height
    scheduleRender()
  })
  ro.observe(canvas)

  project = await loadProjectFromJson(vcoData)
  vp.fitToStock(project.stock)
  syncViewport()
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
      :style="{ cursor: store.activeTool === 'select' ? 'crosshair' : 'none' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp($event)"
      @pointercancel="dragging = false"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    />
    <button class="gcode-btn" @click="openGCodeInTab">G-code</button>
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

.gcode-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 14px;
  background: #333;
  color: #eee;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.gcode-btn:hover { background: #444; }
</style>
