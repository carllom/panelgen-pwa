import { createRouter, createWebHashHistory } from 'vue-router'
import PanelEditorView from '../views/PanelEditorView.vue'
import SettingsView from '../views/SettingsView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',         component: PanelEditorView },
    { path: '/settings', component: SettingsView    },
  ],
})
