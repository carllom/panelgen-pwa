import { createRouter, createWebHashHistory } from 'vue-router'
import PanelEditorView from '../views/PanelEditorView.vue'
import SettingsView from '../views/SettingsView.vue'
import GCodeExportView from '../views/GCodeExportView.vue'
import ToolsView from '../views/ToolsView.vue'
import PreviewView from '../views/PreviewView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',         component: PanelEditorView },
    { path: '/settings', component: SettingsView    },
    { path: '/gcode',    component: GCodeExportView },
    { path: '/tools',    component: ToolsView       },
    { path: '/preview',  component: PreviewView     },
  ],
})
