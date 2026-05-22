import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { useAuthStore } from './stores/auth.store'
import { useTemplateStore } from './stores/template.store'
import 'primeicons/primeicons.css'
import './styles/index.scss'
import './styles/tailwind.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

const authStore = useAuthStore(pinia)
authStore.initializeSession()

const templateStore = useTemplateStore(pinia)
templateStore.initializeTemplateState()

app.mount('#app')
