import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import IntlApp from './App.intl.tsx'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱ — entry جدای مینی‌پنل INTL
// (index.intl.html)؛ عمداً بدون PWA register/disableZoom/Sentry (main.tsx IR) — صفحه‌ی
// مدیریتی دسکتاپ-محور، نیازی به app-like mobile experience ندارد
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntlApp />
  </StrictMode>,
)
