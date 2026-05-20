import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { preloadDefaultFonts } from './domain'

preloadDefaultFonts()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
