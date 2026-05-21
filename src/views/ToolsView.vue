<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/appStore'
import { makeTool } from '../domain/Tool'
import type { Tool } from '../domain/Tool'

const store = useAppStore()

const selectedIndex = ref<number | null>(null)

const selected = computed<Tool | null>(() =>
  selectedIndex.value !== null ? store.tools[selectedIndex.value] ?? null : null
)

function selectTool(i: number): void {
  selectedIndex.value = i
}

function addTool(): void {
  const usedNumbers = new Set(store.tools.map(t => t.number))
  let next = 1
  while (usedNumbers.has(next)) next++
  store.tools.push(makeTool({ number: next }))
  selectedIndex.value = store.tools.length - 1
}

function deleteTool(i: number): void {
  store.tools.splice(i, 1)
  if (selectedIndex.value !== null) {
    if (store.tools.length === 0) selectedIndex.value = null
    else selectedIndex.value = Math.min(selectedIndex.value, store.tools.length - 1)
  }
}

function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value) || 0
}
</script>

<template>
  <div class="tools-view">
    <h2 class="view-title">CNC Tools</h2>

    <div class="tools-layout">
      <!-- Tool list -->
      <aside class="tool-list-panel">
        <div class="tool-list">
          <button
            v-for="(tool, i) in store.tools"
            :key="i"
            class="tool-item"
            :class="{ 'tool-item--active': selectedIndex === i }"
            @click="selectTool(i)"
          >
            <span class="tool-number">T{{ tool.number + 1 }}</span>
            <span class="tool-name">{{ tool.name || '(unnamed)' }}</span>
            <span class="tool-diam">∅{{ tool.diameter }}mm</span>
          </button>
          <div v-if="store.tools.length === 0" class="tool-list-empty">
            No tools defined
          </div>
        </div>
        <div class="tool-list-footer">
          <button class="action-btn" @click="addTool">+ Add Tool</button>
          <button
            class="action-btn action-btn--danger"
            :disabled="selectedIndex === null"
            @click="selectedIndex !== null && deleteTool(selectedIndex)"
          >Delete</button>
        </div>
      </aside>

      <!-- Tool editor -->
      <section class="tool-editor" v-if="selected">
        <div class="editor-section">
          <div class="editor-section-title">Identity</div>
          <div class="field-row">
            <label class="field-label">Number</label>
            <input
              type="number" step="1" min="0"
              :value="selected.number"
              @change="selected.number = num($event)"
            />
          </div>
          <div class="field-row">
            <label class="field-label">Name</label>
            <input
              type="text" placeholder="e.g. End Mill 3mm"
              :value="selected.name"
              @input="selected.name = ($event.target as HTMLInputElement).value"
            />
          </div>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">Geometry</div>
          <div class="field-row">
            <label class="field-label has-tooltip" data-tooltip="Tool cutting diameter in mm">Diameter</label>
            <input type="number" step="0.1" min="0.01"
              :value="selected.diameter"
              @change="selected.diameter = num($event)"
            />
            <span class="unit">mm</span>
          </div>
          <div class="field-row">
            <label class="field-label has-tooltip" data-tooltip="Depth of cut per pass (pecking step) in mm">Z-Step</label>
            <input type="number" step="0.1" min="0.01"
              :value="selected.zStep"
              @change="selected.zStep = num($event)"
            />
            <span class="unit">mm</span>
          </div>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">Feed Rates</div>
          <div class="field-row">
            <label class="field-label has-tooltip" data-tooltip="XY cutting feed rate in mm/min">XY Feed</label>
            <input type="number" step="10" min="1"
              :value="selected.feedRate"
              @change="selected.feedRate = num($event)"
            />
            <span class="unit">mm/min</span>
          </div>
          <div class="field-row">
            <label class="field-label has-tooltip" data-tooltip="Plunge (Z-axis) feed rate in mm/min — use lower values for thin tools">Z Feed</label>
            <input type="number" step="10" min="1"
              :value="selected.zFeedRate"
              @change="selected.zFeedRate = num($event)"
            />
            <span class="unit">mm/min</span>
          </div>
          <div class="field-row">
            <label class="field-label has-tooltip" data-tooltip="Spindle speed in RPM">RPM</label>
            <input type="number" step="100" min="100"
              :value="selected.rpm"
              @change="selected.rpm = num($event)"
            />
            <span class="unit">rpm</span>
          </div>
        </div>
      </section>

      <section class="tool-editor tool-editor--empty" v-else>
        <span>{{ store.tools.length ? 'Select a tool to edit' : 'Add a tool to get started' }}</span>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tools-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px 32px;
}

.view-title {
  font-size: 1rem;
  font-weight: 600;
  color: #4fc3f7;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.tools-layout {
  display: flex;
  gap: 24px;
  flex: 1;
  overflow: hidden;
}

/* ── Tool list ── */
.tool-list-panel {
  display: flex;
  flex-direction: column;
  width: 220px;
  min-width: 220px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  overflow: hidden;
}

.tool-list {
  flex: 1;
  overflow-y: auto;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid #0f2a45;
  color: #c0cfe0;
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  transition: background 0.1s;
}

.tool-item:hover {
  background: #1a3a5c;
}

.tool-item--active {
  background: #0f2a45;
  color: #4fc3f7;
}

.tool-number {
  font-weight: 600;
  font-size: 11px;
  color: #4fc3f7;
  min-width: 24px;
}

.tool-item--active .tool-number {
  color: #4fc3f7;
}

.tool-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-diam {
  font-size: 11px;
  color: #556;
  white-space: nowrap;
}

.tool-list-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #556;
  text-align: center;
}

.tool-list-footer {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #0f3460;
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  padding: 5px 8px;
  background: #0f3460;
  color: #c0cfe0;
  border: 1px solid #1e5a80;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  transition: background 0.1s;
}

.action-btn:hover:not(:disabled) {
  background: #1a5a80;
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.action-btn--danger {
  background: #2a1010;
  border-color: #4a1010;
  color: #e07070;
}

.action-btn--danger:hover:not(:disabled) {
  background: #3a1515;
}

/* ── Tool editor ── */
.tool-editor {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 380px;
}

.tool-editor--empty {
  align-items: center;
  justify-content: center;
  color: #556;
  font-size: 13px;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-section-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #556;
  margin-bottom: 2px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.field-label {
  width: 76px;
  min-width: 76px;
  color: #8899bb;
  font-size: 12px;
}

.field-row input {
  flex: 1;
  min-width: 0;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 4px 7px;
  font-size: 12px;
  font-family: inherit;
}

.field-row input:focus {
  outline: none;
  border-color: #4fc3f7;
}

.unit {
  font-size: 11px;
  color: #556;
  white-space: nowrap;
  min-width: 42px;
}

.has-tooltip {
  position: relative;
  cursor: help;
}

.has-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a2a45;
  border: 1px solid #2a3a55;
  color: #c0cfe0;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 100;
}

.has-tooltip:hover::after {
  opacity: 1;
}
</style>
