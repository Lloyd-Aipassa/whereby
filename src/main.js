import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

// Polyfill for process.nextTick (required by simple-peer in browser)
if (typeof window !== 'undefined') {
  window.process = window.process || {}
  window.process.nextTick = window.process.nextTick || function(callback) {
    setTimeout(callback, 0)
  }
}

createApp(App).mount('#app')
