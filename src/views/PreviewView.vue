<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useAppStore } from '../stores/appStore'
import { DexelHeightmap } from '../domain/DexelHeightmap'
import { parseGCodeMoves } from '../domain/GCodeParser'

const store = useAppStore()
const container = ref<HTMLDivElement | null>(null)
const zScale = ref(1)
const resolution = ref(2)
const building = ref(false)
const statusMsg = ref('')

// Estimated vertex count for the current panel + resolution setting
const vertexEstimate = computed<string>(() => {
  const project = store.project
  if (!project) return ''
  const w = Math.ceil(project.stock.width  * resolution.value) + 1
  const h = Math.ceil(project.stock.height * resolution.value) + 1
  const count = w * h
  if (count >= 1_000_000) return `~${(count / 1_000_000).toFixed(1)}M verts`
  if (count >= 1_000)     return `~${Math.round(count / 1000)}k verts`
  return `${count} verts`
})

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let panelMesh: THREE.Mesh | null = null
let wallMesh: THREE.Mesh | null = null
let outlineGroup: THREE.Group | null = null
let currentHm: DexelHeightmap | null = null
let animId = 0
let ro: ResizeObserver | null = null

onMounted(() => {
  initThree()
  rebuild()
})

onBeforeUnmount(dispose)

// ── Three.js setup ────────────────────────────────────────────────────────────

function initThree(): void {
  const el = container.value!
  const w = el.clientWidth || 800
  const h = el.clientHeight || 600

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = false
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x12182a)

  camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const key = new THREE.DirectionalLight(0xffffff, 1.1)
  key.position.set(0.6, 0.8, 1).normalize().multiplyScalar(200)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x6688cc, 0.28)
  fill.position.set(-0.5, -0.3, 0.4).normalize().multiplyScalar(200)
  scene.add(fill)
  const back = new THREE.DirectionalLight(0xffffff, 0.12)
  back.position.set(0, -1, -0.3).normalize().multiplyScalar(200)
  scene.add(back)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minPolarAngle = 0
  controls.maxPolarAngle = Math.PI * 0.95

  ro = new ResizeObserver(() => onResize())
  ro.observe(el)

  function animate() {
    animId = requestAnimationFrame(animate)
    controls!.update()
    renderer!.render(scene!, camera!)
  }
  animate()
}

function resetCamera(): void {
  if (!camera || !controls) return
  const project = store.project
  if (project) {
    const { width, height } = project.stock
    const diag = Math.sqrt(width * width + height * height)
    camera.position.set(0, -diag * 0.8, diag * 0.65)
  } else {
    camera.position.set(0, -120, 90)
  }
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

function onResize(): void {
  if (!renderer || !camera || !container.value) return
  const w = container.value.clientWidth
  const h = container.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function dispose(): void {
  cancelAnimationFrame(animId)
  ro?.disconnect()
  removePanelMesh()
  removeHoleGeometry()
  removeOutline()
  controls?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
}

// ── Heightmap + mesh ──────────────────────────────────────────────────────────

function removePanelMesh(): void {
  if (!panelMesh || !scene) return
  scene.remove(panelMesh)
  panelMesh.geometry.dispose()
  ;(panelMesh.material as THREE.Material).dispose()
  panelMesh = null
}

function removeHoleGeometry(): void {
  if (wallMesh && scene) {
    scene.remove(wallMesh)
    wallMesh.geometry.dispose()
    ;(wallMesh.material as THREE.Material).dispose()
  }
  wallMesh = null
}

function removeOutline(): void {
  if (!outlineGroup || !scene) return
  scene.remove(outlineGroup)
  outlineGroup.traverse(obj => {
    const m = obj as THREE.Mesh
    m.geometry?.dispose()
    if (Array.isArray(m.material)) m.material.forEach(x => x.dispose())
    else (m.material as THREE.Material)?.dispose()
  })
  outlineGroup = null
}

async function rebuild(): Promise<void> {
  if (!scene || !store.project) {
    statusMsg.value = 'No project loaded.'
    return
  }

  building.value = true
  statusMsg.value = ''
  await nextTick()                                      // flush Vue's vdom to real DOM
  await new Promise<void>(r => setTimeout(r, 0))       // yield to browser so it can repaint

  removePanelMesh()
  removeHoleGeometry()
  removeOutline()

  currentHm = computeHeightmap()
  if (currentHm) {
    const thickness = store.project.stock.thickness
    panelMesh = buildMeshFromHm(currentHm)
    scene.add(panelMesh)
    buildHoleGeometry(currentHm, thickness, zScale.value)
    addOutline(currentHm.panelW, currentHm.panelH)
  }

  resetCamera()
  building.value = false
}

function computeHeightmap(): DexelHeightmap | null {
  const project = store.project
  if (!project) return null

  const { width, height } = project.stock
  const tools = store.tools.length ? store.tools : undefined
  const layers = project.generateGCodeByLayer(tools)

  if (layers.length === 0) {
    statusMsg.value = 'No toolpaths found — add components and tools first.'
    return null
  }

  const hm = new DexelHeightmap(width, height, resolution.value)

  for (const { tool, code } of layers) {
    const toolType = tool.toolType ?? 'endmill'
    const moves = parseGCodeMoves(code)
    for (const move of moves) {
      if (!move.isLinear || move.z >= 0) continue
      if (toolType === 'vbit') {
        hm.applyVBit(move.fromX, move.fromY, move.x, move.y, move.z, tool.vbitAngle ?? 90)
      } else {
        hm.applyEndMill(move.fromX, move.fromY, move.x, move.y, move.z, tool.diameter / 2)
      }
    }
  }

  return hm
}

function buildMeshFromHm(hm: DexelHeightmap): THREE.Mesh {
  const { gridW, gridH, panelW, panelH, data } = hm
  const thickness = store.project?.stock.thickness ?? 999
  const geo = new THREE.PlaneGeometry(panelW, panelH, gridW - 1, gridH - 1)
  const pos = geo.attributes.position as THREE.BufferAttribute

  applyHeightmapToGeometry(pos, geo, data, zScale.value, thickness)

  const mat = new THREE.MeshStandardMaterial({
    color: 0xb0bfcc,
    roughness: 0.38,
    metalness: 0.68,
    side: THREE.DoubleSide,
  })

  return new THREE.Mesh(geo, mat)
}

/**
 * Apply heightmap depths to vertex Z positions, compute normals, then punch through-holes.
 *
 * Two-step to avoid NaN poisoning adjacent vertex normals:
 *   1. Set Z capped at -thickness so the rim geometry is valid for normal computation.
 *   2. After computeVertexNormals(), set through-hole vertices to NaN — the GPU discards
 *      any triangle containing a NaN vertex, opening the hole without a visible cap.
 */
function applyHeightmapToGeometry(
  pos: THREE.BufferAttribute,
  geo: THREE.BufferGeometry,
  data: Float32Array,
  scale: number,
  thickness: number,
): void {
  // Step 1 — valid Z for every vertex (capped so rim normals are correct)
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.max(data[i], -thickness) * scale)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()

  // Step 2 — punch through-holes: NaN Z causes the GPU to discard those triangles
  for (let i = 0; i < pos.count; i++) {
    if (data[i] <= -thickness) pos.setZ(i, NaN)
  }
  pos.needsUpdate = true
}

function addOutline(panelW: number, panelH: number): void {
  if (!scene) return
  outlineGroup = new THREE.Group()

  // Panel border — just edges, no fill, so nothing blocks the view into pockets
  const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(panelW, panelH))
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7 })
  const border = new THREE.LineSegments(edgeGeo, edgeMat)
  border.position.z = 0.5  // just above the surface plane
  outlineGroup.add(border)

  scene.add(outlineGroup)
}

// ── Through-hole walls + back panel ──────────────────────────────────────────

function buildHoleGeometry(hm: DexelHeightmap, thickness: number, scale: number): void {
  if (!scene) return

  // Wall quads only — no back cap, so holes are open all the way through.
  // Built at scale=1 (z in mm); wallMesh.scale.z drives the visual depth.
  const wm = buildWallMesh(hm, thickness)
  if (wm) {
    wm.scale.z = scale
    wallMesh = wm
    scene.add(wm)
  }
}

/**
 * For every through-hole pixel that borders a solid pixel, emit a vertical quad
 * running from the solid neighbour's surface depth down to -thickness.
 * Built at z scale=1 so the caller can animate depth via mesh.scale.z.
 */
function buildWallMesh(hm: DexelHeightmap, thickness: number): THREE.Mesh | null {
  const { gridW, gridH, panelW, panelH, data, pxPerMm } = hm
  const mmPerPx = 1 / pxPerMm
  const hw = mmPerPx * 0.5
  const zBack = -thickness

  const verts: number[] = []
  const idxs: number[] = []

  function quad(x0: number, y0: number, x1: number, y1: number, zTop: number): void {
    const b = verts.length / 3
    verts.push(x0, y0, zTop,  x1, y1, zTop,  x1, y1, zBack,  x0, y0, zBack)
    idxs.push(b, b+1, b+2,  b, b+2, b+3)
  }

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      if (data[row * gridW + col] > -thickness) continue   // not a through-hole pixel

      const cx = col * mmPerPx - panelW / 2
      const cy = panelH / 2 - row * mmPerPx

      // For each of the 4 neighbours: if it's solid, emit a wall quad on the shared edge
      if (col + 1 < gridW && data[row * gridW + col + 1] > -thickness) {
        const xe = cx + hw
        quad(xe, cy - hw, xe, cy + hw, data[row * gridW + col + 1])
      }
      if (col > 0 && data[row * gridW + col - 1] > -thickness) {
        const xe = cx - hw
        quad(xe, cy + hw, xe, cy - hw, data[row * gridW + col - 1])
      }
      if (row > 0 && data[(row - 1) * gridW + col] > -thickness) {
        const ye = cy + hw
        quad(cx - hw, ye, cx + hw, ye, data[(row - 1) * gridW + col])
      }
      if (row + 1 < gridH && data[(row + 1) * gridW + col] > -thickness) {
        const ye = cy - hw
        quad(cx + hw, ye, cx - hw, ye, data[(row + 1) * gridW + col])
      }
    }
  }

  if (verts.length === 0) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setIndex(idxs)
  geo.computeVertexNormals()

  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xb0bfcc, roughness: 0.38, metalness: 0.68, side: THREE.DoubleSide,
  }))
}

// ── Z-scale live update (no full rebuild needed) ───────────────────────────────

function updateZScale(): void {
  if (!panelMesh || !currentHm) return
  const thickness = store.project?.stock.thickness ?? 999
  applyHeightmapToGeometry(
    panelMesh.geometry.attributes.position as THREE.BufferAttribute,
    panelMesh.geometry, currentHm.data, zScale.value, thickness,
  )
  if (wallMesh) wallMesh.scale.z = zScale.value
}
</script>

<template>
  <div class="preview-view">
    <div class="preview-toolbar">
      <span class="toolbar-title">3D Preview</span>

      <label class="ctrl-row">
        <span class="ctrl-lbl">Z Scale</span>
        <input
          type="range" min="1" max="100" step="1"
          v-model.number="zScale"
          @input="updateZScale"
          class="z-slider"
        />
        <span class="ctrl-val">{{ zScale }}×</span>
      </label>

      <label class="ctrl-row">
        <span class="ctrl-lbl">Resolution</span>
        <select v-model.number="resolution" class="ctrl-select">
          <option :value="1">1 px/mm</option>
          <option :value="2">2 px/mm</option>
          <option :value="4">4 px/mm</option>
          <option :value="8">8 px/mm</option>
          <option :value="10">10 px/mm</option>
        </select>
        <span class="ctrl-hint" :class="{ 'ctrl-hint--warn': vertexEstimate.includes('M') }">
          {{ vertexEstimate }}
        </span>
      </label>

      <button
        class="tb-btn"
        :disabled="building || !store.project"
        @click="rebuild"
      >{{ building ? 'Building…' : 'Rebuild' }}</button>

      <button class="tb-btn" @click="resetCamera">Reset View</button>

      <span v-if="statusMsg" class="status-msg">{{ statusMsg }}</span>
    </div>

    <div ref="container" class="canvas-wrap" />
  </div>
</template>

<style scoped>
.preview-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 16px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4fc3f7;
  white-space: nowrap;
}

.ctrl-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #c0d0e8;
  cursor: default;
}

.ctrl-lbl {
  color: #8899bb;
  white-space: nowrap;
  min-width: 56px;
}

.ctrl-val {
  min-width: 36px;
  color: #e0e0e0;
  font-size: 0.8rem;
  text-align: right;
}

.ctrl-hint {
  font-size: 0.75rem;
  color: #6688aa;
  white-space: nowrap;
}

.ctrl-hint--warn {
  color: #cc9940;
}

.z-slider {
  width: 120px;
  accent-color: #4fc3f7;
}

.ctrl-select {
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.8rem;
  font-family: inherit;
}

.tb-btn {
  padding: 4px 14px;
  background: #0f3460;
  color: #e0e0e0;
  border: 1px solid #1e5a80;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  transition: background 0.1s;
  white-space: nowrap;
}

.tb-btn:hover:not(:disabled) { background: #1a5a80; }
.tb-btn:disabled { opacity: 0.4; cursor: default; }


.status-msg {
  font-size: 0.78rem;
  color: #8899bb;
}

.canvas-wrap {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
