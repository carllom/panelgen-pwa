<script setup lang="ts">
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
</script>

<template>
  <div class="settings-view">
    <h2 class="settings-title">Settings</h2>

    <section class="settings-section">
      <h3 class="section-title">Editing</h3>

      <label class="setting-row">
        <input type="checkbox" v-model="store.alwaysDelete" />
        <span class="has-tooltip" data-tooltip="Skip the confirmation dialog when deleting elements">Always delete without confirmation</span>
      </label>

      <label class="setting-row">
        <input type="checkbox" v-model="store.snapToGrid" />
        <span class="has-tooltip" data-tooltip="Constrain element positions to grid intervals when moving or creating">Snap to grid</span>
      </label>

      <div class="setting-row setting-row--indent" :class="{ disabled: !store.snapToGrid }">
        <span class="setting-label has-tooltip" data-tooltip="Grid spacing in mm">Grid step</span>
        <label class="grid-input-group">
          <span>X</span>
          <input
            type="number" step="0.1" min="0.1"
            v-model.number="store.gridX"
            :disabled="!store.snapToGrid"
          />
        </label>
        <label class="grid-input-group">
          <span>Y</span>
          <input
            type="number" step="0.1" min="0.1"
            v-model.number="store.gridY"
            :disabled="!store.snapToGrid"
          />
        </label>
      </div>

      <label class="setting-row">
        <input type="checkbox" v-model="store.showOriginAxes" />
        <span class="has-tooltip" data-tooltip="Display X and Y axis lines through the panel origin">Show origin axes</span>
      </label>
    </section>

    <section class="settings-section">
      <h3 class="section-title">New Panel Defaults</h3>

      <div class="setting-row setting-row--indent">
        <span class="setting-label has-tooltip" data-tooltip="Default panel width in mm">Width</span>
        <label class="grid-input-group">
          <input type="number" step="0.5" min="1" v-model.number="store.defaultPanelWidth" />
          <span>mm</span>
        </label>
      </div>
      <div class="setting-row setting-row--indent">
        <span class="setting-label has-tooltip" data-tooltip="Default panel height in mm">Height</span>
        <label class="grid-input-group">
          <input type="number" step="0.5" min="1" v-model.number="store.defaultPanelHeight" />
          <span>mm</span>
        </label>
      </div>
      <div class="setting-row setting-row--indent">
        <span class="setting-label has-tooltip" data-tooltip="Default panel material thickness in mm">Thickness</span>
        <label class="grid-input-group">
          <input type="number" step="0.1" min="0.1" v-model.number="store.defaultPanelThickness" />
          <span>mm</span>
        </label>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="section-title">GCode Generation</h3>

      <label class="setting-row">
        <input type="checkbox" v-model="store.machineSupportsG68" />
        <span class="has-tooltip" data-tooltip="Enable G68 coordinate rotation commands in generated G-code">Machine supports G68</span>
      </label>
    </section>

    <section class="settings-section">
      <h3 class="section-title">3D Preview</h3>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Surface material appearance of the panel in 3D preview">Material</span>
        <select v-model="store.previewMaterial" class="preview-select">
          <option value="brushed-metal">Brushed metal</option>
          <option value="anodized">Anodized aluminum</option>
          <option value="matte">Matte (non-glossy)</option>
          <option value="polished">Polished metal</option>
        </select>
      </div>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Base stock color in the 3D preview">Stock color</span>
        <input type="color" v-model="store.previewColor" />
      </div>
    </section>

    <section class="settings-section">
      <h3 class="section-title">Colors</h3>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Color used to draw pocket components">Pockets</span>
        <input type="color" v-model="store.colorPocket" />
      </div>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Color used to draw engraving components">Engraving</span>
        <input type="color" v-model="store.colorEngrave" />
      </div>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Color used to draw the panel border">Border</span>
        <input type="color" v-model="store.colorBorder" />
      </div>

      <div class="setting-row">
        <span class="setting-label has-tooltip" data-tooltip="Base color of the machining preview overlay">Preview</span>
        <input type="color" v-model="store.colorPreview" />
        <span class="setting-sublabel has-tooltip" data-tooltip="Opacity of the preview fill">Fill</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="store.colorPreviewAlpha" class="alpha-slider" />
        <span class="alpha-value">{{ Math.round(store.colorPreviewAlpha * 100) }}%</span>
        <span class="setting-sublabel has-tooltip" data-tooltip="Opacity of the preview box outline">Outline</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="store.colorPreviewBoxAlpha" class="alpha-slider" />
        <span class="alpha-value">{{ Math.round(store.colorPreviewBoxAlpha * 100) }}%</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  max-width: 560px;
}

.settings-title {
  font-size: 1rem;
  font-weight: 600;
  color: #4fc3f7;
  margin-bottom: 20px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
}

.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #556;
  margin-bottom: 2px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #c0cfe0;
  cursor: pointer;
}

.setting-row input[type="checkbox"] {
  accent-color: #4fc3f7;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.setting-row--indent {
  padding-left: 24px;
  cursor: default;
}

.setting-row--indent.disabled {
  opacity: 0.4;
}

.setting-label {
  color: #8899bb;
  min-width: 60px;
}

.setting-sublabel {
  color: #8899bb;
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

.grid-input-group {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #8899bb;
  cursor: default;
}

.grid-input-group input {
  width: 72px;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 12px;
  font-family: inherit;
}

.grid-input-group input:focus {
  outline: none;
  border-color: #4fc3f7;
}

.grid-input-group input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

input[type="color"] {
  width: 28px;
  height: 22px;
  padding: 1px 2px;
  border: 1px solid #1e3a5a;
  border-radius: 3px;
  background: #0d1b35;
  cursor: pointer;
}

.alpha-slider {
  width: 80px;
  accent-color: #4fc3f7;
}

.alpha-value {
  font-size: 11px;
  color: #8899bb;
  min-width: 32px;
  text-align: right;
}

.preview-select {
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 12px;
  font-family: inherit;
}
</style>
