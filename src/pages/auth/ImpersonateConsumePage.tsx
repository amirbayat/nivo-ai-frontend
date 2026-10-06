import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { identify } from '@/lib/events'
import { identifyClarity } from '@/lib/clarity'
import { fa } from '@/locales/fa'
import type { SellerStore } from '@/types/api'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md — کد یک‌بارمصرف ۶۰ثانیه‌ای ادمین
// (admin-impersonate.controller.ts) را به توکن واقعی همین کاربر تبدیل می‌کند و دقیقاً مثل
// verify-otp معمولی access/refresh را در localStorage ذخیره می‌کند؛ بعد بر اساس اینکه این
// کاربر فروشگاهی دارد یا نه، به پنل فروشنده یا اکسپلور (خریدار) هدایت می‌شود
export function ImpersonateConsumePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const started = useRef(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    void (async () => {
      try {
        const { data } = await api.post<{
          accessToken: string
          refreshToken: string
          user: { id: string }
        }>('/auth/impersonate/consume', { code })
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        identify(data.user.id)
        identifyClarity(data.user.id)

        const stores = await api.get<SellerStore[]>('/v2/stores/me').then(r => r.data)
        navigate(stores.length > 0 ? '/seller/panel/home' : '/explore', { replace: true })
      } catch {
        setError(true)
      }
    })()
  }, [params, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="rtl">
      <p className="text-sm text-slate-500">{error ? fa.common.error : fa.common.loading}</p>
    </div>
  )
}
