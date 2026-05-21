<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="toast">{{ message }}</div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 8px 16px;
  background: #0f2a45;
  border: 1px solid #1e5a80;
  border-radius: 6px;
  color: #4fc3f7;
  font-size: 13px;
  pointer-events: none;
  z-index: 1000;
}

.toast-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.toast-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(6px); }
.toast-leave-to     { opacity: 0; transform: translateY(6px); }
</style>
