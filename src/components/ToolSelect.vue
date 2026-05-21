<script setup lang="ts">
import { useAppStore } from '../stores/appStore'

defineProps<{ modelValue: number }>()
defineEmits<{ 'update:modelValue': [value: number] }>()

const store = useAppStore()
</script>

<template>
  <select
    class="tool-select"
    :value="modelValue"
    @change="$emit('update:modelValue', +($event.target as HTMLSelectElement).value)"
  >
    <option v-if="store.tools.length === 0" :value="modelValue">T{{ modelValue + 1 }}</option>
    <option v-for="t in store.tools" :key="t.number" :value="t.number">
      {{ t.name ? `T${t.number + 1} – ${t.name}` : `T${t.number + 1} (∅${t.diameter}mm)` }}
    </option>
  </select>
</template>

<style scoped>
.tool-select {
  flex: 1;
  min-width: 0;
  background: #0d1b35;
  border: 1px solid #1e3a5a;
  color: #e0e0e0;
  border-radius: 3px;
  padding: 2px 4px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.tool-select:focus {
  outline: none;
  border-color: #4fc3f7;
}
</style>
