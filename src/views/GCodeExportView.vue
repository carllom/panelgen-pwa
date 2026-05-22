<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/appStore'
import { GCodeStatistics } from '../domain/GCodeStatistics'
import type { GCodeStats } from '../domain/GCodeStatistics'
import type { Tool } from '../domain/Tool'

const store = useAppStore()
const exportByLayer = ref(false)

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportGCode(): void {
  if (!store.project) return
  const tools = store.tools.length ? store.tools : undefined
  if (exportByLayer.value) {
    const layers = store.project.generateGCodeByLayer(tools)
    for (const { tool, code } of layers)
      downloadText(`panel_T${tool.number + 1}.nc`, code)
  } else {
    downloadText('panel.nc', store.project.generateGCode(tools))
  }
}

function formatTime(seconds: number): string {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtM(mm: number): string {
  return (mm / 1000).toFixed(3)
}

function fmtMM(mm: number): string {
  return mm.toFixed(1) + ' mm'
}

function toolLabel(tool: Tool): string {
  return tool.name?.trim() || `T${tool.number + 1}`
}

interface ToolStats { tool: Tool; stats: GCodeStats }

const toolStats = computed<ToolStats[]>(() => {
  if (!store.project) return []
  const tools = store.tools.length ? store.tools : undefined
  return store.project.generateGCodeByLayer(tools)
    .map(({ tool, code }) => ({ tool, stats: GCodeStatistics.analyze(code) }))
})

const totalStats = computed<GCodeStats | null>(() => {
  if (!store.project) return null
  const tools = store.tools.length ? store.tools : undefined
  return GCodeStatistics.analyze(store.project.generateGCode(tools))
})

const panel = computed(() => store.project?.stock ?? null)

const showPerTool = computed(() => toolStats.value.length > 1)
</script>

<template>
  <div class="gcode-view">
    <h2>G-code Export</h2>
    <label class="option-row">
      <input type="checkbox" v-model="exportByLayer" />
      Export by layer (one file per tool)
    </label>
    <button
      class="export-btn"
      :disabled="!store.project"
      @click="exportGCode"
    >
      Export G-code
    </button>
    <p v-if="!store.project" class="no-project">No project loaded. Open a panel in the Editor first.</p>

    <template v-if="totalStats && panel">
      <div class="stats">
        <h3>Statistics</h3>

        <table class="stats-table info-table">
          <tbody>
            <tr>
              <td>Panel size</td>
              <td>{{ fmtMM(panel.width) }} × {{ fmtMM(panel.height) }}</td>
            </tr>
            <tr>
              <td>Effective work area</td>
              <td>{{ fmtMM(totalStats.effectiveWidth) }} × {{ fmtMM(totalStats.effectiveHeight) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Distance grid -->
        <h4>Distance (m)</h4>
        <table class="stats-table grid-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="ts in toolStats" :key="ts.tool.number">{{ toolLabel(ts.tool) }}</th>
              <th :class="{ total: showPerTool }">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">Engraving</td>
              <td v-for="ts in toolStats" :key="ts.tool.number">{{ fmtM(ts.stats.engravingDistance) }}</td>
              <td :class="{ total: showPerTool }">{{ fmtM(totalStats.engravingDistance) }}</td>
            </tr>
            <tr>
              <td class="row-label">Travel</td>
              <td v-for="ts in toolStats" :key="ts.tool.number">{{ fmtM(ts.stats.travelDistance) }}</td>
              <td :class="{ total: showPerTool }">{{ fmtM(totalStats.travelDistance) }}</td>
            </tr>
            <tr class="total-row">
              <td class="row-label">Total</td>
              <td v-for="ts in toolStats" :key="ts.tool.number">
                {{ fmtM(ts.stats.engravingDistance + ts.stats.travelDistance) }}
              </td>
              <td :class="{ total: showPerTool }">
                {{ fmtM(totalStats.engravingDistance + totalStats.travelDistance) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Time grid -->
        <h4>Time</h4>
        <table class="stats-table grid-table">
          <thead>
            <tr>
              <th></th>
              <th v-for="ts in toolStats" :key="ts.tool.number">{{ toolLabel(ts.tool) }}</th>
              <th :class="{ total: showPerTool }">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">Engraving</td>
              <td v-for="ts in toolStats" :key="ts.tool.number" class="mono">{{ formatTime(ts.stats.estimatedEngravingTime) }}</td>
              <td :class="{ total: showPerTool, mono: true }">{{ formatTime(totalStats.estimatedEngravingTime) }}</td>
            </tr>
            <tr>
              <td class="row-label">Travel</td>
              <td v-for="ts in toolStats" :key="ts.tool.number" class="mono">{{ formatTime(ts.stats.estimatedTravelTime) }}</td>
              <td :class="{ total: showPerTool, mono: true }">{{ formatTime(totalStats.estimatedTravelTime) }}</td>
            </tr>
            <tr class="total-row">
              <td class="row-label">Total</td>
              <td v-for="ts in toolStats" :key="ts.tool.number" class="mono">
                {{ formatTime(ts.stats.estimatedEngravingTime + ts.stats.estimatedTravelTime) }}
              </td>
              <td :class="{ total: showPerTool, mono: true }">
                {{ formatTime(totalStats.estimatedEngravingTime + totalStats.estimatedTravelTime) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gcode-view {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 2rem;
}

h2 {
  font-size: 1.1rem;
  color: #4fc3f7;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c0d0e8;
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
}

.export-btn {
  padding: 8px 20px;
  background: #0f3460;
  color: #e0e0e0;
  border: 1px solid #1e5a80;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.1s;
}

.export-btn:hover:not(:disabled) {
  background: #1a5a80;
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.no-project {
  font-size: 0.8rem;
  color: #8899bb;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats h3 {
  font-size: 0.9rem;
  color: #4fc3f7;
  font-weight: 600;
  margin: 0;
}

.stats h4 {
  font-size: 0.8rem;
  color: #7aafcc;
  font-weight: 600;
  margin: 4px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-table {
  border-collapse: collapse;
  font-size: 0.85rem;
  color: #c0d0e8;
}

.info-table td {
  padding: 2px 16px 2px 0;
  white-space: nowrap;
}

.info-table td:first-child {
  color: #8899bb;
}

.grid-table th,
.grid-table td {
  padding: 3px 12px 3px 0;
  white-space: nowrap;
  text-align: right;
}

.grid-table th:first-child,
.grid-table td:first-child {
  text-align: left;
}

.grid-table th {
  color: #7aafcc;
  font-weight: 600;
  border-bottom: 1px solid #2a3a50;
  padding-bottom: 4px;
}

.grid-table .row-label {
  color: #8899bb;
  padding-right: 20px;
}

.grid-table td.total,
.grid-table th.total {
  color: #e0e0e0;
  font-weight: 600;
  border-left: 1px solid #2a3a50;
  padding-left: 12px;
}

.grid-table tr.total-row td {
  border-top: 1px solid #2a3a50;
  font-weight: 600;
  color: #e0e0e0;
  padding-top: 4px;
}

.grid-table tr.total-row .row-label {
  color: #c0d0e8;
}

.mono {
  font-family: monospace;
  letter-spacing: 0.04em;
}
</style>
