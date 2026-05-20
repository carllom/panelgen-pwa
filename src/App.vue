<script setup lang="ts">
import { ref, computed } from 'vue'
import PanelCanvas from './components/PanelCanvas.vue'
import PropertyEditor from './components/PropertyEditor.vue'
import ToolSidebar from './components/ToolSidebar.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useAppStore } from './stores/appStore'
import { CircularPocket } from './domain/CircularPocket'
import { RectangularPocket } from './domain/RectangularPocket'
import { Dial } from './domain/Dial'
import { Text } from './domain/Text'
import { PolyLine } from './domain/PolyLine'

const store = useAppStore()
const canvasRef = ref<InstanceType<typeof PanelCanvas> | null>(null)
const showDeleteConfirm = ref(false)

function onPropertyChange(): void {
  canvasRef.value?.scheduleRender()
}

function onDeleteRequested(): void {
  if (!store.selectedItem) return
  if (store.alwaysDelete) {
    canvasRef.value?.deleteSelected()
  } else {
    showDeleteConfirm.value = true
  }
}

function onDeleteConfirm(setAlways: boolean): void {
  if (setAlways) store.alwaysDelete = true
  showDeleteConfirm.value = false
  canvasRef.value?.deleteSelected()
}

function onDeleteCancel(): void {
  showDeleteConfirm.value = false
}

const deleteMessage = computed(() => {
  const item = store.selectedItem
  if (!item) return ''
  let type = 'object'
  if (item instanceof CircularPocket)    type = 'circular pocket'
  else if (item instanceof RectangularPocket) type = 'rectangular pocket'
  else if (item instanceof Dial)         type = 'dial'
  else if (item instanceof Text)         type = 'text'
  else if (item instanceof PolyLine)     type = 'polyline'
  return `Delete this ${type}? This cannot be undone.`
})
</script>

<template>
  <div class="app">
    <header>
      <h1>PanelGen</h1>
      <button class="header-btn" @click="canvasRef?.loadFile()">Load</button>
    </header>
    <div class="workspace">
      <ToolSidebar />
      <main>
        <PanelCanvas
          ref="canvasRef"
          @deleteRequested="onDeleteRequested"
        />
      </main>
      <PropertyEditor :item="store.selectedItem" @change="onPropertyChange" />
    </div>
  </div>

  <ConfirmDialog
    v-if="showDeleteConfirm"
    :message="deleteMessage"
    @confirm="onDeleteConfirm"
    @cancel="onDeleteCancel"
  />
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: system-ui, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

header h1 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4fc3f7;
}

.header-btn {
  padding: 4px 12px;
  background: #1a3a5c;
  color: #ccc;
  border: 1px solid #0f3460;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.header-btn:hover {
  background: #234d7a;
  color: #fff;
}

.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

main {
  flex: 1;
  overflow: hidden;
}
</style>
