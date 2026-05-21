<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { FilePlus, FolderOpen, Save } from '@lucide/vue'
import { useAppStore } from './stores/appStore'
import { saveProjectToJson } from './domain/projectSaver'
import ToastNotification from './components/ToastNotification.vue'

const router = useRouter()
const store = useAppStore()

const toastMessage = ref('')
let toastTimer = 0

function showToast(msg: string): void {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2500)
}

async function onNewProject(): Promise<void> {
  await router.push('/')
  store.pendingNew = true
}

async function onLoad(): Promise<void> {
  await router.push('/')
  store.pendingLoad = true
}

async function onSave(): Promise<void> {
  if (!store.project) return
  const json = saveProjectToJson(store.project, store.tools)

  try {
    if (store.fileHandle) {
      const writable = await store.fileHandle.createWritable()
      await writable.write(json)
      await writable.close()
      showToast(`Saved — ${store.saveFileName}`)
      return
    }

    if ('showSaveFilePicker' in window) {
      const handle = await (window as Window & typeof globalThis & {
        showSaveFilePicker(opts: object): Promise<FileSystemFileHandle>
      }).showSaveFilePicker({
        suggestedName: store.saveFileName,
        types: [{ description: 'PanelGen Project', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      store.fileHandle = handle
      store.saveFileName = handle.name
      showToast(`Saved — ${handle.name}`)
      return
    }
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') throw e
    return
  }

  // Fallback: trigger download
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = store.saveFileName
  a.click()
  URL.revokeObjectURL(url)
  showToast(`Downloaded — ${store.saveFileName}`)
}
</script>

<template>
  <div class="app">
    <header>
      <span class="app-title">PanelGen</span>
      <button class="icon-btn" title="New project" @click="onNewProject">
        <FilePlus :size="18" :stroke-width="1.5" />
      </button>
      <button class="icon-btn" title="Load panel" @click="onLoad">
        <FolderOpen :size="18" :stroke-width="1.5" />
      </button>
      <button class="icon-btn" title="Save panel" :disabled="!store.project" @click="onSave">
        <Save :size="18" :stroke-width="1.5" />
      </button>
      <nav class="header-nav">
        <RouterLink to="/" class="nav-link">Editor</RouterLink>
        <RouterLink to="/tools" class="nav-link">Tools</RouterLink>
        <RouterLink to="/settings" class="nav-link">Settings</RouterLink>
        <RouterLink to="/gcode" class="nav-link">Export</RouterLink>
      </nav>
    </header>
    <RouterView class="router-view" />
    <ToastNotification :message="toastMessage" />
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: system-ui, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 1rem;
  height: 44px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.app-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #4fc3f7;
  margin-right: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #8899bb;
  cursor: pointer;
  transition: color 0.1s, background 0.1s;
}

.icon-btn:hover {
  color: #e0e0e0;
  background: #1a3a5c;
  border-color: #0f3460;
}

.header-nav {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.nav-link {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #8899bb;
  text-decoration: none;
  border: 1px solid transparent;
  transition: color 0.1s, background 0.1s;
}

.nav-link:hover {
  color: #e0e0e0;
  background: #1a3a5c;
}

.nav-link.router-link-active {
  color: #4fc3f7;
  background: #0f2a45;
  border-color: #1e5a80;
}

.router-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
