import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import type { PanelStockItem } from '../domain/PanelComponent'
import type { PanelGenProject } from '../domain/PanelGenProject'
import type { Tool } from '../domain/Tool'
import { hexToRgba } from '../utils/color'

export type ToolType = 'select' | 'nodeEdit' | 'dial' | 'text' | 'polyline' | 'circularPocket' | 'rectPocket'

export const useAppStore = defineStore('app', () => {
  // Active project
  const project = shallowRef<PanelGenProject | null>(null)

  // Selection
  const selectedItem = shallowRef<PanelStockItem | null>(null)

  // Active toolbar tool
  const activeTool = ref<ToolType>('select')

  // Incremented whenever selectedItem's properties are mutated externally,
  // so consumers that bind to item fields can react without deep reactivity.
  const itemVersion = ref(0)
  function notifyItemChanged(): void { itemVersion.value++ }

  // Application settings (persisted)
  const alwaysDelete   = ref(false)
  const snapToGrid     = ref(false)
  const gridX          = ref(5)
  const gridY          = ref(5)
  const showOriginAxes = ref(false)

  // New-panel defaults (persisted)
  const defaultPanelWidth     = ref(100)
  const defaultPanelHeight    = ref(150)
  const defaultPanelThickness = ref(3)

  // Global CNC tool library (persisted)
  const tools = ref<Tool[]>([])

  // GCode generation (persisted)
  const machineSupportsG68 = ref(false)

  // Canvas colors (persisted)
  const colorPocket          = ref('#f0a040')
  const colorEngrave         = ref('#4fc3f7')
  const colorBorder          = ref('#555555')
  const colorPreview         = ref('#4fc3f7')
  const colorPreviewAlpha    = ref(0.55)
  const colorPreviewBoxAlpha = ref(0.25)

  const colorPreviewRgba    = computed(() => hexToRgba(colorPreview.value, colorPreviewAlpha.value))
  const colorPreviewBoxRgba = computed(() => hexToRgba(colorPreview.value, colorPreviewBoxAlpha.value))

  // Transient
  const pendingLoad = ref(false)
  const pendingNew  = ref(false)
  const saveFileName = ref('panel.json')
  const fileHandle = ref<FileSystemFileHandle | null>(null)

  // Viewport state — mirrors Viewport class values for reactive reads outside canvas
  const viewportInitialized = ref(false)
  const zoom = ref(8)
  const panX = ref(0)
  const panY = ref(0)

  return {
    project, selectedItem, activeTool, itemVersion, notifyItemChanged,
    tools,
    machineSupportsG68,
    alwaysDelete, pendingLoad, pendingNew, saveFileName, fileHandle, snapToGrid, gridX, gridY,
    defaultPanelWidth, defaultPanelHeight, defaultPanelThickness,
    colorPocket, colorEngrave, colorBorder,
    colorPreview, colorPreviewAlpha, colorPreviewBoxAlpha,
    colorPreviewRgba, colorPreviewBoxRgba,
    showOriginAxes,
    viewportInitialized, zoom, panX, panY,
  }
}, {
  persist: {
    pick: [
      'tools',
      'machineSupportsG68',
      'alwaysDelete', 'snapToGrid', 'gridX', 'gridY',
      'defaultPanelWidth', 'defaultPanelHeight', 'defaultPanelThickness',
      'colorPocket', 'colorEngrave', 'colorBorder',
      'colorPreview', 'colorPreviewAlpha', 'colorPreviewBoxAlpha',
      'showOriginAxes',
    ],
  },
})
