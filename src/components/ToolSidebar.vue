<script setup lang="ts">
import { MousePointer2, Gauge, Type, Spline, Cylinder, Box } from 'lucide-vue-next'
import { useAppStore } from '../stores/appStore'
import type { ToolType } from '../stores/appStore'

const store = useAppStore()

const tools: { id: ToolType; icon: unknown; label: string }[] = [
  { id: 'select',         icon: MousePointer2, label: 'Select'            },
  { id: 'dial',           icon: Gauge,         label: 'Dial'              },
  { id: 'text',           icon: Type,          label: 'Text'              },
  { id: 'polyline',       icon: Spline,        label: 'Polyline'          },
  { id: 'circularPocket', icon: Cylinder,      label: 'Circular pocket'   },
  { id: 'rectPocket',     icon: Box,           label: 'Rect. pocket'      },
]
</script>

<template>
  <nav class="tool-sidebar">
    <button
      v-for="tool in tools"
      :key="tool.id"
      class="tool-btn"
      :class="{ active: store.activeTool === tool.id }"
      :title="tool.label"
      @click="store.activeTool = tool.id"
    >
      <component :is="tool.icon" :size="18" :stroke-width="1.5" />
    </button>
  </nav>
</template>

<style scoped>
.tool-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  width: 48px;
  min-width: 48px;
  background: #16213e;
  border-right: 1px solid #0f3460;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #556;
  cursor: pointer;
  transition: color 0.1s, background 0.1s, border-color 0.1s;
}

.tool-btn:hover {
  color: #aac4e0;
  background: #1a3a5c;
}

.tool-btn.active {
  color: #4fc3f7;
  background: #0f2a45;
  border-color: #1e5a80;
}
</style>
