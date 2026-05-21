import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PanelStock } from '../domain/PanelStock'
import type { GlyphMap } from '../domain/HersheyFont'
import { serializeStock } from '../domain/projectSaver'
import { loadStockFromRaw } from '../domain/projectLoader'

const MAX_HISTORY = 50

export const useHistoryStore = defineStore('history', () => {
  const past   = ref<string[]>([])
  const future = ref<string[]>([])
  const lastCoalesceKey = ref<string | null>(null)

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function pushHistory(stock: PanelStock, coalesceKey?: string): void {
    if (coalesceKey && coalesceKey === lastCoalesceKey.value) return
    if (past.value.length >= MAX_HISTORY) past.value.shift()
    past.value.push(JSON.stringify(serializeStock(stock)))
    future.value = []
    lastCoalesceKey.value = coalesceKey ?? null
  }

  function undo(currentStock: PanelStock, glyphs: GlyphMap): PanelStock | null {
    if (!past.value.length) return null
    future.value.push(JSON.stringify(serializeStock(currentStock)))
    const snapshot = past.value.pop()!
    lastCoalesceKey.value = null
    return loadStockFromRaw(JSON.parse(snapshot), glyphs)
  }

  function redo(currentStock: PanelStock, glyphs: GlyphMap): PanelStock | null {
    if (!future.value.length) return null
    past.value.push(JSON.stringify(serializeStock(currentStock)))
    const snapshot = future.value.pop()!
    lastCoalesceKey.value = null
    return loadStockFromRaw(JSON.parse(snapshot), glyphs)
  }

  function reset(): void {
    past.value = []
    future.value = []
    lastCoalesceKey.value = null
  }

  return { canUndo, canRedo, pushHistory, undo, redo, reset }
})
