import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { configureSyncEngine } from './sync/syncEngine.js'

configureSyncEngine({
  apiBase: '/api',
  conflictStrategy: 'newer-wins',
  getHeaders: () => ({ 'Content-Type': 'application/json' }),
  onSyncComplete: ({ synced }) => {
    if (synced > 0) console.log(`[sync] ${synced} changes synced`)
  },
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[offline] Service worker registration failed', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
