<script setup lang="ts">
import { ref, computed } from 'vue'
import PanelCanvas from '../components/PanelCanvas.vue'
import PropertyEditor from '../components/PropertyEditor.vue'
import ToolSidebar from '../components/ToolSidebar.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAppStore } from '../stores/appStore'
import { CircularPocket } from '../domain/CircularPocket'
import { RectangularPocket } from '../domain/RectangularPocket'
import { Dial } from '../domain/Dial'
import { Text } from '../domain/Text'
import { PolyLine } from '../domain/PolyLine'

const store = useAppStore()
const canvasRef = ref<InstanceType<typeof PanelCanvas> | null>(null)
const showDeleteConfirm = ref(false)

function onPropertyChange(): void {
  canvasRef.value?.scheduleRender()
}

function onDeleteRequested(): void {
  if (!store.selectedItem) return
  if (store.alwaysDelete) {
    canvasRef.value?.deleteSelected()
  } else {
    showDeleteConfirm.value = true
  }
}

function onDeleteConfirm(setAlways: boolean): void {
  if (setAlways) store.alwaysDelete = true
  showDeleteConfirm.value = false
  canvasRef.value?.deleteSelected()
}

const deleteMessage = computed(() => {
  const item = store.selectedItem
  if (!item) return ''
  let type = 'object'
  if (item instanceof CircularPocket)         type = 'circular pocket'
  else if (item instanceof RectangularPocket) type = 'rectangular pocket'
  else if (item instanceof Dial)              type = 'dial'
  else if (item instanceof Text)              type = 'text'
  else if (item instanceof PolyLine)          type = 'polyline'
  return `Delete this ${type}? This cannot be undone.`
})
</script>

<template>
  <div class="editor-view">
    <div class="editor-workspace">
      <ToolSidebar />
      <main>
        <PanelCanvas
          ref="canvasRef"
          @deleteRequested="onDeleteRequested"
        />
      </main>
      <PropertyEditor :item="store.selectedItem" @change="onPropertyChange" />
    </div>
  </div>

  <ConfirmDialog
    v-if="showDeleteConfirm"
    :message="deleteMessage"
    @confirm="onDeleteConfirm"
    @cancel="showDeleteConfirm = false"
  />
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}


.editor-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

main {
  flex: 1;
  overflow: hidden;
}
</style>
