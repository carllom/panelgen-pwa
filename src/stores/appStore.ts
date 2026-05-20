import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'
import type { PanelStockItem } from '../domain/PanelComponent'

export type ToolType = 'select' | 'dial' | 'text' | 'polyline' | 'circularPocket' | 'rectPocket'

export const useAppStore = defineStore('app', () => {
  // Selection
  const selectedItem = shallowRef<PanelStockItem | null>(null)

  // Active toolbar tool
  const activeTool = ref<ToolType>('select')

  // Incremented whenever selectedItem's properties are mutated externally,
  // so consumers that bind to item fields can react without deep reactivity.
  const itemVersion = ref(0)
  function notifyItemChanged(): void { itemVersion.value++ }

  // Viewport state — mirrors Viewport class values for reactive reads outside canvas
  // Application settings
  const alwaysDelete = ref(false)

  // Viewport state — mirrors Viewport class values for reactive reads outside canvas
  const zoom = ref(8)
  const panX = ref(0)
  const panY = ref(0)

  return { selectedItem, activeTool, itemVersion, notifyItemChanged, alwaysDelete, zoom, panX, panY }
})
