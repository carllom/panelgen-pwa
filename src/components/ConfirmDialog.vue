<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ message: string }>()
const emit = defineEmits<{ confirm: [setAlways: boolean]; cancel: [] }>()

const setAlways = ref(false)
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @mousedown.self="emit('cancel')">
      <div class="dialog">
        <p class="dialog-msg">{{ message }}</p>
        <label class="always-row">
          <input type="checkbox" v-model="setAlways" />
          Always delete without confirmation
        </label>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
          <button class="btn-delete" @click="emit('confirm', setAlways)">Delete</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 20px 24px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.dialog-msg {
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.4;
}

.always-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8899bb;
  font-size: 12px;
  cursor: pointer;
}

.always-row input[type="checkbox"] {
  accent-color: #4fc3f7;
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-delete {
  padding: 5px 16px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel {
  background: none;
  border-color: #334;
  color: #aaa;
}

.btn-cancel:hover {
  background: #1a2a4a;
  color: #e0e0e0;
}

.btn-delete {
  background: #7b2020;
  border-color: #a03030;
  color: #f0d0d0;
}

.btn-delete:hover {
  background: #9b2828;
  color: #fff;
}
</style>
