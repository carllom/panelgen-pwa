<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { CanvasDraw } from '../renderer/CanvasDraw'
import { Viewport } from '../renderer/Viewport'
import { ExtentsRenderer } from '../domain/ExtentsRenderer'
import { PanelStock } from '../domain/PanelStock'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'

// ─── Hardcoded test project ───────────────────────────────────────────────────

const stock = new PanelStock()
stock.width  = 120
stock.height =  80

const cp = new CircularPocket()
cp.pos      = { x: -30, y: 15, z: 0 }
cp.diameter = 12
cp.depth    = 1.5
stock.items.push(cp)

const rp = new RectangularPocket()
rp.pos    = { x: 25, y: -10, z: 0 }
rp.width  = 40
rp.height = 25
rp.depth  = 1
stock.items.push(rp)

const cp2 = new CircularPocket()
cp2.pos      = { x: 45, y: 25, z: 0 }
cp2.diameter = 6
cp2.depth    = 1
stock.items.push(cp2)

// ─── Renderer state ───────────────────────────────────────────────────────────

const canvasRef = ref<HTMLCanvasElement | null>(null)
const vp = new Viewport()

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let firstResize = true

function scheduleRender(): void {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (ctx) render()
  })
}

function render(): void {
  if (!ctx) return
  const { canvasWidth: w, canvasHeight: h } = vp

  ctx.clearRect(0, 0, w, h)
  ctx.save()
  vp.applyTransform(ctx)

  const lw  = 1 / vp.zoom  // 1 screen pixel in world units
  const drw = new CanvasDraw(ctx)

  // Panel stock outline
  ctx.beginPath()
  const { width, height, pos } = stock
  drw.moveTo(pos.x - width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y - height / 2)
  drw.lineTo(pos.x + width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y + height / 2)
  drw.lineTo(pos.x - width / 2, pos.y - height / 2)
  ctx.strokeStyle = '#444'
  ctx.lineWidth   = lw
  ctx.stroke()

  // Items (with viewport culling via ExtentsRenderer)
  ctx.beginPath()
  for (const item of stock.items) {
    const xr = new ExtentsRenderer()
    item.draw(xr)
    if (xr.minX <= xr.maxX && vp.isVisible(xr.minX, xr.minY, xr.maxX, xr.maxY)) {
      item.draw(drw)
    }
  }
  ctx.strokeStyle = '#4fc3f7'
  ctx.lineWidth   = lw
  ctx.stroke()

  ctx.restore()
}

// ─── Pointer pan ─────────────────────────────────────────────────────────────

let dragging = false
let lastX = 0
let lastY = 0

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent): void {
  if (!dragging) return
  vp.pan(e.clientX - lastX, e.clientY - lastY)
  lastX = e.clientX
  lastY = e.clientY
  scheduleRender()
}

function onPointerUp(): void {
  dragging = false
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

onMounted(() => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  canvas.addEventListener('wheel', onWheel, { passive: false })

  ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    canvas.width  = width
    canvas.height = height
    vp.canvasWidth  = width
    vp.canvasHeight = height
    if (firstResize) {
      firstResize = false
      vp.fitToStock(stock)
    }
    scheduleRender()
  })
  ro.observe(canvas)
})

onUnmounted(() => {
  ro?.disconnect()
  canvasRef.value?.removeEventListener('wheel', onWheel)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
