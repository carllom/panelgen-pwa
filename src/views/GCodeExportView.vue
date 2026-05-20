<script setup lang="ts">
import { useAppStore } from '../stores/appStore'

const store = useAppStore()

function exportGCode(): void {
  if (!store.project) return
  const gcode = store.project.generateGCode()
  const blob = new Blob([gcode], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'panel.nc'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="gcode-view">
    <h2>G-code Export</h2>
    <p class="hint">Options will appear here in a future update.</p>
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

.hint {
  color: #8899bb;
  font-size: 0.85rem;
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
