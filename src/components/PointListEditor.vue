<script setup lang="ts">
import type { Vec2 } from '../domain/geometry'

const props = defineProps<{ points: Vec2[] }>()
const emit = defineEmits<{ change: [] }>()

function num(e: Event): number {
  return parseFloat((e.target as HTMLInputElement).value)
}

function setX(i: number, e: Event): void {
  const v = num(e)
  if (!isNaN(v)) { props.points[i].x = v; emit('change') }
}

function setY(i: number, e: Event): void {
  const v = num(e)
  if (!isNaN(v)) { props.points[i].y = v; emit('change') }
}

function removePoint(i: number): void {
  props.points.splice(i, 1)
  emit('change')
}

function addPoint(): void {
  const last = props.points.at(-1) ?? { x: 0, y: 0 }
  props.points.push({ x: last.x, y: last.y })
  emit('change')
}
</script>

<template>
  <div class="point-list">
    <div class="point-list-header">
      <span class="col-idx">#</span>
      <span class="col-xy">X</span>
      <span class="col-xy">Y</span>
      <span class="col-del" />
    </div>
    <div class="point-rows">
      <div v-for="(pt, i) in points" :key="i" class="point-row">
        <span class="col-idx">{{ i }}</span>
        <input class="col-xy" type="number" step="0.1" :value="pt.x" @input="setX(i, $event)" />
        <input class="col-xy" type="number" step="0.1" :value="pt.y" @input="setY(i, $event)" />
        <button class="col-del" @click="removePoint(i)" title="Remove point">×</button>
      </div>
    </div>
    <button class="add-btn" @click="addPoint">+ Add point</button>
  </div>
</template>

<style scoped>
.point-list {
  display: flex;
  flex-direction: column;
}

.point-list-header {
  display: flex;
  align-items: center;
  padding: 3px 10px;
  gap: 3px;
  color: #556;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #1a2a4a;
}

.point-rows {
  max-height: 180px;
  overflow-y: auto;
}

.point-row {
  display: flex;
  align-items: center;
  padding: 2px 10px;
  gap: 3px;
}

.point-row:hover {
  background: #0d1b35;
}

.col-idx {
  width: 18px;
  min-width: 18px;
  color: #556;
  font-size: 10px;
  text-align: right;
}

.col-xy {
  flex: 1;
  min-width: 0;
}

input.col-xy {
  width: 100%;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 11px;
  font-family: inherit;
}

input.col-xy:focus {
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
