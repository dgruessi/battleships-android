import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { initFirebase } from '@/firebase'
import '@/styles/tokens.css'
import '@/styles/typography.css'
import '@/styles/animations.css'
import '@/App.css'
import App from '@/App'

// Fire-and-forget: render happens immediately, Firebase init runs in background.
// SecurityException or any other error is caught inside initFirebase.
initFirebase()

// Only register SW in browser — Capacitor serves assets from APK, SW just blocks updates.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
