import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSendOtp } from '@/queries/auth.queries'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { toEnglishDigits } from '@/lib/digits'
import { fa } from '@/locales/fa'
import type { SellerStore } from '@/types/api'

export function SellerLoginPage() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const navigate = useNavigate()
  const sendOtp = useSendOtp()

  // اگر از قبل توکن معتبر داشته باشد (مثلاً فروشنده دوباره لینک /seller را باز کرده)،
  // مستقیم بر اساس وجود فروشگاه به مقصد درست می‌رود، نه دوباره فرم شماره‌موبایل
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setCheckingSession(false)
      return
    }
    api
      .get<SellerStore[]>('/v2/stores/me')
      .then(r => navigate(r.data.length > 0 ? '/seller/dashboard-placeholder' : '/seller/onboarding', { replace: true }))
      .catch(() => setCheckingSession(false))
  }, [navigate])

  const validate = (val: string) => /^(\+98|0)?9[0-9]{9}$/.test(val)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate(phone)) {
      setError(fa.auth.invalidPhone)
      return
    }
    try {
      await sendOtp.mutateAsync(phone)
      navigate('/seller/otp', { state: { phone } })
    } catch {
      setError(fa.common.error)
    }
  }

  if (checkingSession) return <div className="min-h-screen bg-slate-950" />

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-4 w-40" />
          <h1 className="text-xl font-bold text-slate-100">{fa.seller.login.heading}</h1>
          <p className="mt-1 text-sm text-slate-500">{fa.seller.login.subheading}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="tel"
            placeholder={fa.auth.phonePlaceholder}
            value={phone}
            onChange={e => setPhone(toEnglishDigits(e.target.value))}
            error={error}
            autoFocus
            inputMode="numeric"
            dir="ltr"
            className="text-center tracking-widest"
          />
          <Button type="submit" className="w-full" loading={sendOtp.isPending}>
            {fa.auth.sendOtp}
          </Button>
        </form>
      </div>
    </div>
  )
}
