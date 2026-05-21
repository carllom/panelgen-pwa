<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/appStore'

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
</style>
