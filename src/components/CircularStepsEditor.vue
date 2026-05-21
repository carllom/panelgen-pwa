<script setup lang="ts">
import type { CircularStep } from '../domain/CircularPocket'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const props = defineProps<{ steps: CircularStep[] }>()
const emit = defineEmits<{ change: [] }>()

function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value)
}

function setDiam(i: number, e: Event): void {
  const v = num(e)
  if (!isNaN(v)) { props.steps[i].diameter = v; emit('change') }
}

function setDepth(i: number, e: Event): void {
  const v = num(e)
  if (!isNaN(v)) { props.steps[i].depth = v; emit('change') }
}

function removeStep(i: number): void {
  props.steps.splice(i, 1)
  emit('change')
}

function addStep(): void {
  const last = props.steps.at(-1)
  props.steps.push({ diameter: last?.diameter ?? 0, depth: last?.depth ?? 1 })
  emit('change')
}
</script>

<template>
  <div class="steps-editor">
    <span style="display:none">{{ store.itemVersion }}</span>
    <div class="steps-header">
      <span class="col-diam">Diam.</span>
      <span class="col-depth">Depth</span>
      <span class="col-del" />
    </div>
    <div v-for="(step, i) in steps" :key="i" class="step-row">
      <input class="col-diam" type="number" step="0.1" min="0.01" :value="step.diameter" @input="setDiam(i, $event)" />
      <input class="col-depth" type="number" step="0.1" min="0.01" :value="step.depth"    @input="setDepth(i, $event)" />
      <button class="col-del" @click="removeStep(i)" title="Remove step">×</button>
    </div>
    <button class="add-btn" @click="addStep">+ Add step</button>
  </div>
</template>

<style scoped>
.steps-editor {
  display: flex;
  flex-direction: column;
}

.steps-header {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: 3px;
  color: #556;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-top: 1px solid #1a2a4a;
  border-bottom: 1px solid #1a2a4a;
}

.step-row {
  display: flex;
  align-items: center;
  padding: 2px 10px;
  gap: 3px;
}

.step-row:hover {
  background: #0d1b35;
}

.col-diam,
.col-depth {
  flex: 1;
  min-width: 0;
}

input.col-diam,
input.col-depth {
  width: 100%;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 11px;
  font-family: inherit;
}

input.col-diam:focus,
input.col-depth:focus {
  outline: none;
  border-color: #4fc3f7;
}

.col-del {
  width: 18px;
  min-width: 18px;
}

button.col-del {
  background: none;
  border: none;
  color: #556;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

button.col-del:hover {
  color: #f07070;
}

.add-btn {
  margin: 4px 10px;
  padding: 3px 0;
  background: none;
  border: 1px dashed #1e3a5a;
  border-radius: 3px;
  color: #556;
  font-size: 11px;
  cursor: pointer;
  text-align: center;
}

.add-btn:hover {
  border-color: #4fc3f7;
  color: #4fc3f7;
}
</style>
