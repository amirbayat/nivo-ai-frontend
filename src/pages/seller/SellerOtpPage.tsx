import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useVerifyOtp, useSendOtp, type WaitlistedInfo } from '@/queries/auth.queries'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { fa } from '@/locales/fa'
import type { SellerStore } from '@/types/api'
import { DigitsInput } from '@/components/ui/DigitsInput'

const RESEND_SECONDS = 120

export function SellerOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const phone = (location.state as { phone?: string } | null)?.phone ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [autoSubmittedCode, setAutoSubmittedCode] = useState<string | null>(null)
  const [waitlisted, setWaitlisted] = useState<WaitlistedInfo | null>(null)

  const verifyOtp = useVerifyOtp()
  const sendOtp = useSendOtp()

  useEffect(() => {
    if (!phone) {
      navigate('/seller/login', { replace: true })
      return
    }
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [phone, navigate])

  const submit = async () => {
    setError('')
    try {
      const result = await verifyOtp.mutateAsync({ phone, code })
      // همان رفتار OtpPage — لیست انتظار: منتظر تأیید کاربر می‌مانیم
      if (result.waitlisted) {
        setWaitlisted(result.waitlisted)
        return
      }
      // فقط مسیر داخلی فروشنده (جلوگیری از open redirect)
      if (returnTo && returnTo.startsWith('/seller/') && !returnTo.startsWith('//')) {
        navigate(returnTo, { replace: true })
        return
      }
      // بعد از این، توکن در localStorage ذخیره شده (onSuccess داخل useVerifyOtp) — حالا
      // مشخص می‌کنیم فروشنده قبلاً فروشگاه ساخته یا باید وارد ویزارد شود (بخش ۱.۲ سند)
      const stores = await api.get<SellerStore[]>('/v2/stores/me').then(r => r.data)
      navigate(stores.length > 0 ? '/seller/panel/today' : '/seller/onboarding', { replace: true })
    } catch {
      setError(fa.common.error)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await submit()
  }

  useEffect(() => {
    if (code.length === 6 && code !== autoSubmittedCode && !verifyOtp.isPending) {
      setAutoSubmittedCode(code)
      void submit()
    }
  }, [code])

  const onResend = async () => {
    if (countdown > 0) return
    try {
      await sendOtp.mutateAsync(phone)
      setCountdown(RESEND_SECONDS)
      setCode('')
      setError('')
    } catch {
      setError(fa.common.error)
    }
  }

  if (waitlisted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 light:bg-white" dir="rtl">
        <div className="w-full max-w-sm text-center">
          <p className="text-slate-100 light:text-slate-900">{waitlisted.message}</p>
          <p className="mt-2 text-sm text-slate-500 light:text-slate-400">{fa.waitlist.queuePosition(waitlisted.queuePosition)}</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/', { replace: true })}>
            {fa.waitlist.gotIt}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{fa.auth.enterOtp}</h1>
          <p className="mt-1 text-sm text-slate-500">{fa.auth.otpSentTo(phone)}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <DigitsInput kind="otp"
            placeholder="● ● ● ● ● ●"
            value={code}
            onChange={setCode}
            error={error}
            autoFocus
            style={{ fontSize: 24 }}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <Button type="submit" className="w-full" loading={verifyOtp.isPending} disabled={code.length < 6}>
            {fa.auth.verifyOtp}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {countdown > 0 ? (
            <p className="text-sm text-slate-500">{fa.auth.resendIn(countdown)}</p>
          ) : (
            <button onClick={onResend} disabled={sendOtp.isPending} className="text-sm text-emerald-400 light:text-emerald-600 hover:text-emerald-300 light:hover:text-emerald-700">
              {fa.auth.resendOtp}
            </button>
          )}
        </div>
        <button onClick={() => navigate('/seller/login')} className="mt-2 w-full text-center text-sm text-slate-600 hover:text-slate-400 light:hover:text-slate-700">
          {fa.common.back}
        </button>
      </div>
    </div>
  )
}
