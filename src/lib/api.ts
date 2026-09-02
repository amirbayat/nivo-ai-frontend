import axios from 'axios'
import { env } from '@/env'
import { useToastStore } from '@/store/toast.store'
import { fa } from '@/locales/fa'

export const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 60

// صفحاتی که کاربر مهمان (بدون لاگین) هم واقعاً باید ببیندشان — اگر یک توکن قدیمی/نامعتبر
// همین‌جا باعث شکست refresh شود، نباید کاربر را از این صفحات به‌زور به /login پرت کرد؛
// خودِ router (HomeRoute/DiscoverPage) با نبود me data به‌درستی تجربه‌ی مهمان را نشان می‌دهد
const GUEST_ACCESSIBLE_PATHS = ['/', '/discover', '/landing', '/contact', '/login', '/otp', '/nivo-cal/intro']

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// رفرش توکن روی بک‌اند rotate می‌شود (auth.service.ts:471-474 — رفرش‌توکن قدیمی همون لحظه
// revoke می‌شود، یکی جدید صادر می‌شود) — یعنی تک‌بارمصرفه. چون JWT_EXPIRES_IN فقط ۱۵ دقیقه‌ست،
// React Query معمولاً چند کوئری را هم‌زمان (مثلاً موقع برگشت به تب/رفرش صفحه) می‌فرستد؛ اگر
// همه‌شون هم‌زمان با ۴۰۱ روبه‌رو بشن، بدون این قفل هرکدوم جدا refresh_token فعلی (که هنوز توی
// localStorage قدیمیه) رو می‌فرستادن — اولی موفق می‌شد و توکن رو rotate می‌کرد، بقیه با همون
// توکنِ همین‌الان-revoke-شده رد می‌شدن و کاربر رو مجبور به لاگین دوباره می‌کردن. این متغیر
// تضمین می‌کند در هر لحظه فقط یک درخواست واقعی refresh در پرواز باشد؛ بقیه‌ی ۴۰۱‌های هم‌زمان
// منتظر همون یک promise می‌مانند و با توکن تازه‌ی همون یکی retry می‌شوند.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) throw new Error('no refresh token')
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${env.VITE_API_URL}/auth/refresh`,
        { refreshToken: refresh },
      )
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      return data
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 429) {
      const retryAfter = Number(err.response.headers?.['retry-after']) || DEFAULT_RATE_LIMIT_RETRY_SECONDS
      useToastStore.getState().addToast(fa.common.tooManyRequests(retryAfter))
      return Promise.reject(err)
    }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const data = await refreshTokens()
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (!GUEST_ACCESSIBLE_PATHS.includes(window.location.pathname)) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  },
)
