import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { disableZoom } from '@/lib/disableZoom'
import { env } from '@/env'
import { initSentry } from '@/lib/sentry'
import './index.css'
import App from './App.tsx'

// باید همین ابتدا، پیش از هر چیز دیگر مقداردهی شود تا خطاهای احتمالی رندر/initialization
// بقیه‌ی اپ هم گزارش شوند. بدون VITE_SENTRY_DSN فقط مانیتورینگ خطا غیرفعال می‌ماند
if (env.VITE_SENTRY_DSN) {
  initSentry(env.VITE_SENTRY_DSN)
}

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
