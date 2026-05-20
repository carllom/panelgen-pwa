<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { CanvasDraw } from '../renderer/CanvasDraw'
import { Viewport } from '../renderer/Viewport'
import { ExtentsRenderer } from '../domain/ExtentsRenderer'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { loadProjectFromJson } from '../domain/projectLoader'
import type { PanelGenProject } from '../domain/PanelGenProject'
import type { PanelStockItem } from '../domain/PanelComponent'
import vcoData from '../../examples/vco_compressed.json'

const props = defineProps<{ selectedItem: PanelStockItem | null }>()
const emit = defineEmits<{ 'update:selectedItem': [item: PanelStockItem | null] }>()

const COLOR_POCKET   = '#f0a040'  // amber — milled pockets and drilled holes
const COLOR_ENGRAVE  = '#4fc3f7'  // blue  — engraved text, dial markings, polylines
const COLOR_BORDER   = '#555'

// ─── Renderer state ───────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const vp = new Viewport()

let ctx: CanvasRenderingContext2D | null = null
let project: PanelGenProject | null = null
let rafId = 0

function scheduleRender(): void {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    render()
  })
}

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

  // Pass 1 — pockets: CircularPocket, RectangularPocket, and Dial holes
  ctx.beginPath()
  for (const item of s.items) {
    if (item instanceof CircularPocket || item instanceof RectangularPocket) {
      const xr = new ExtentsRenderer()
      item.draw(xr)
      if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) {
        item.draw(drw)
      }
    } else if (item instanceof Dial && item.holeRadius > 0) {
      const { x, y } = item.pos
      const r = item.holeRadius
      if (vp.isVisible(x - r, y - r, x + r, y + r)) {
        item.drawHole(drw)
      }
    }
  }
  ctx.strokeStyle = COLOR_POCKET
  ctx.lineWidth   = lw
  ctx.stroke()

  // Pass 2 — engravings: Dial markings, Text, PolyLine
  ctx.beginPath()
  for (const item of s.items) {
    if (item instanceof CircularPocket || item instanceof RectangularPocket) continue
    const xr = new ExtentsRenderer()
    item.draw(xr)
    if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) {
      item.draw(drw)
    }
  }
  ctx.strokeStyle = COLOR_ENGRAVE
  ctx.lineWidth   = lw
  ctx.stroke()

  ctx.restore()

  // Selection highlight — drawn in screen space (always 1px, unaffected by zoom)
  const sel = props.selectedItem
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
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
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
  scheduleRender()
}

defineExpose({ loadFile, scheduleRender })

// ─── Pointer pan / click-select ──────────────────────────────────────────────

let dragging = false
let lastX = 0
let lastY = 0
let totalMovement = 0

function hitTest(wx: number, wy: number): PanelStockItem | null {
  const items = project?.stock?.items
  if (!items) return null
  let best: PanelStockItem | null = null
  let bestArea = Infinity
  for (const item of items) {
    if (!item.inside(wx, wy)) continue
    const e = item.extents
    const area = e.x * e.y
    if (area < bestArea) { best = item; bestArea = area }
  }
  return best
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  dragging = true
  totalMovement = 0
  lastX = e.clientX
  lastY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  totalMovement += Math.sqrt(dx * dx + dy * dy)
  vp.pan(dx, dy)
  lastX = e.clientX
  lastY = e.clientY
  scheduleRender()
}

function onPointerUp(e: PointerEvent): void {
  if (!dragging) return
  dragging = false
  if (totalMovement < 4) {
    const rect = canvasRef.value!.getBoundingClientRect()
    const { x, y } = vp.screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    emit('update:selectedItem', hitTest(x, y))
    scheduleRender()
  }
}

// ─── Wheel zoom ──────────────────────────────────────────────────────────────

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const rect   = canvasRef.value!.getBoundingClientRect()
  const cx     = e.clientX - rect.left
  const cy     = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
  vp.zoomAt(factor, cx, cy)
  scheduleRender()
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

let ro: ResizeObserver | null = null

onMounted(async () => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  canvas.addEventListener('wheel', onWheel, { passive: false })

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    canvas.width  = width
    canvas.height = height
    vp.canvasWidth  = width
    vp.canvasHeight = height
    scheduleRender()
  })
  ro.observe(canvas)  // fires synchronously — sets vp.canvasWidth/Height before await below

  project = await loadProjectFromJson(vcoData)
  vp.fitToStock(project.stock)
  scheduleRender()
})

onUnmounted(() => {
  ro?.disconnect()
  canvasRef.value?.removeEventListener('wheel', onWheel)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="canvas-wrap">
    <canvas
      ref="canvasRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp($event)"
      @pointercancel="dragging = false"
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
  cursor: crosshair;
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

.gcode-btn:hover {
  background: #444;
}
</style>
