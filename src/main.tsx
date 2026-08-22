import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { disableZoom } from '@/lib/disableZoom'
import './index.css'
import App from './App.tsx'

// مرورگر خودش هم SW را چک می‌کند، ولی این چک پس‌زمینه را حداکثر هر ۲۴ ساعت یک‌بار انجام
// می‌دهد (فارغ از هدرهای no-cache روی sw.js در nginx.spa.conf) — یعنی کاربری که کمتر از
// یک روز از آخرین نصب SW گذشته، با هر تعداد رفرش معمولی هم نسخه‌ی جدید (مثل نیوا کال) را
// نمی‌بیند. registration.update() دستی این محدودیت را دور می‌زند و چک واقعی به سرور می‌زند.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => { registration.update() }, 60 * 1000)
  },
})
disableZoom()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
