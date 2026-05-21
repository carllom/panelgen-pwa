<script setup lang="ts">
import { MousePointer2, Waypoints, Gauge, Type, Spline, Cylinder, Box } from '@lucide/vue'
import { useAppStore } from '../stores/appStore'
import type { ToolType } from '../stores/appStore'

const store = useAppStore()

const tools: { id: ToolType; icon: unknown; label: string; key: string }[] = [
  { id: 'select',         icon: MousePointer2, label: 'Select',           key: 'V'   },
  { id: 'nodeEdit',       icon: Waypoints,     label: 'Node edit',        key: 'A'   },
  { id: 'dial',           icon: Gauge,         label: 'Dial',             key: 'D'   },
  { id: 'text',           icon: Type,          label: 'Text',             key: 'T'   },
  { id: 'polyline',       icon: Spline,        label: 'Polyline',         key: 'P'   },
  { id: 'circularPocket', icon: Cylinder,      label: 'Circular pocket',  key: 'C'   },
  { id: 'rectPocket',     icon: Box,           label: 'Rect. pocket',     key: 'R'   },
]
</script>

<template>
  <nav class="tool-sidebar">
    <button
      v-for="tool in tools"
      :key="tool.id"
      class="tool-btn"
      :class="{ active: store.activeTool === tool.id }"
      :title="`${tool.label} (${tool.key})`"
      @click="store.activeTool = tool.id"
    >
      <component :is="tool.icon" :size="18" :stroke-width="1.5" />
      <span class="key-hint">{{ tool.key }}</span>
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 36px;
  height: 40px;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #556;
  cursor: pointer;
  transition: color 0.1s, background 0.1s, border-color 0.1s;
}

.key-hint {
  font-size: 9px;
  line-height: 1;
  opacity: 0.5;
  font-family: ui-monospace, monospace;
  letter-spacing: 0;
}

.tool-btn.active .key-hint {
  opacity: 0.7;
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
