import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'
import type { PanelStockItem } from '../domain/PanelComponent'

export type ToolType = 'select' | 'dial' | 'text' | 'polyline' | 'circularPocket' | 'rectPocket'

export const useAppStore = defineStore('app', () => {
  // Selection
  const selectedItem = shallowRef<PanelStockItem | null>(null)

  // Active toolbar tool
  const activeTool = ref<ToolType>('select')

  // Viewport state — mirrors Viewport class values for reactive reads outside canvas
  const zoom = ref(8)
  const panX = ref(0)
  const panY = ref(0)

  return { selectedItem, activeTool, zoom, panX, panY }
})
