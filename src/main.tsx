import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { disableZoom } from '@/lib/disableZoom'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })
disableZoom()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
