// Sentry (مانیتورینگ خطا) — سرویس کاملاً مستقل و اختیاری، هیچ‌وقت نباید به‌خاطر خطای
// آن اپ اصلی بشکند (fail-silent).
import * as Sentry from '@sentry/react'

let initialized = false

export function initSentry(dsn: string) {
  if (initialized) return
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
    })
    initialized = true
  } catch {
    // fail-silent
  }
}
