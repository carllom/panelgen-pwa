<script setup lang="ts">
import { ref } from 'vue'
import PanelCanvas from './components/PanelCanvas.vue'
import PropertyEditor from './components/PropertyEditor.vue'
import type { PanelStockItem } from './domain/PanelComponent'

const canvasRef = ref<InstanceType<typeof PanelCanvas> | null>(null)
const selectedItem = ref<PanelStockItem | null>(null)

function onPropertyChange(): void {
  canvasRef.value?.scheduleRender()
}
</script>

<template>
  <div class="app">
    <header>
      <h1>PanelGen</h1>
      <button class="header-btn" @click="canvasRef?.loadFile()">Load</button>
    </header>
    <div class="workspace">
      <nav class="tool-sidebar" />
      <main>
        <PanelCanvas
          ref="canvasRef"
          v-model:selectedItem="selectedItem"
        />
      </main>
      <PropertyEditor :item="selectedItem" @change="onPropertyChange" />
    </div>
  </div>
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

.tool-sidebar {
  width: 40px;
  min-width: 40px;
  background: #16213e;
  border-right: 1px solid #0f3460;
}

main {
  flex: 1;
  overflow: hidden;
}
</style>
