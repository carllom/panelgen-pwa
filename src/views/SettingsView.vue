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
        <span>Always delete without confirmation</span>
      </label>

      <label class="setting-row">
        <input type="checkbox" v-model="store.snapToGrid" />
        <span>Snap to grid</span>
      </label>

      <div class="setting-row setting-row--indent" :class="{ disabled: !store.snapToGrid }">
        <span class="setting-label">Grid step</span>
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
</style>
