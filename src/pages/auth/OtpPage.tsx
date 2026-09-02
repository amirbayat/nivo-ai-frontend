import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useVerifyOtp, useSendOtp, type WaitlistedInfo } from '@/queries/auth.queries'
import { useActivateWaitlist } from '@/queries/campaign.queries'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'

const RESEND_SECONDS = 120

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { phone?: string; waitlistToken?: string | null } | null
  const phone = state?.phone ?? ''
  const waitlistToken = state?.waitlistToken ?? null

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [waitlisted, setWaitlisted] = useState<WaitlistedInfo | null>(null)
  const [autoSubmittedCode, setAutoSubmittedCode] = useState<string | null>(null)

  const verifyOtp = useVerifyOtp()
  const sendOtp = useSendOtp()
  const activateWaitlist = useActivateWaitlist()

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true })
      return
    }
    const timer = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [phone, navigate])

  const submit = async () => {
    setError('')
    try {
      const referralCode = localStorage.getItem('nivo:referralCode') ?? undefined
      const result = await verifyOtp.mutateAsync({ phone, code, referralCode })
      // فقط روی اولین ثبت‌نام اثر واقعی دارد؛ در هر صورت بعد از یک تلاش موفق پاک می‌شود
      localStorage.removeItem('nivo:referralCode')
      if (referralCode) track('referral_code_redeemed', { redeemed: true })

      // اگر از لینک پیامک «دسترسی باز شد» آمده، فعال‌سازی را ثبت کن (نیاز به JWT دارد
      // که همین الان توسط verifyOtp ذخیره شد) — مستقل از وضعیت waitlisted پاسخ فعلی
      if (waitlistToken) {
        activateWaitlist.mutate(waitlistToken)
      }

      if (result.waitlisted) {
        setWaitlisted(result.waitlisted)
        track('waitlisted', { queuePosition: result.waitlisted.queuePosition })
        return // منتظر تأیید کاربر می‌مانیم، بخش ۱۸.۱۱
      }
      // مدال خوش‌آمد (شارژ اولیه‌ی رایگان) توی ChatLayout نمایش داده می‌شه — این‌جا فقط
      // مقدار رو (اگه پر بود، یعنی همین الان ثبت‌نام کرده) توی sessionStorage می‌ذاریم
      if (result.signupBonusCredits) {
        sessionStorage.setItem('nivo:signupBonusCredits', String(result.signupBonusCredits))
      }
      // بعد از لاگین موفق کاربر باید به هاب برود (نه مستقیم /chat) — طبق HomeRoute در
      // router/index.tsx، «/» برای کاربر لاگین‌کرده HubPage است
      navigate('/', { replace: true })
    } catch {
      track('otp_verify_failed', { reason: 'invalid_code' })
      setError(fa.common.error)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await submit()
  }

  // سابمیت خودکار وقتی کد ۶ رقمی کامل شد (bugs.md #2)
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 size-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-7 text-amber-400">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-slate-100">{waitlisted.message}</p>
          <p className="mt-2 text-sm text-slate-500">{fa.waitlist.queuePosition(waitlisted.queuePosition)}</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/', { replace: true })}>
            {fa.waitlist.gotIt}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 size-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-7 text-emerald-400">
              <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{fa.auth.enterOtp}</h1>
          <p className="mt-1 text-sm text-slate-500">{fa.auth.otpSentTo(phone)}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="● ● ● ● ● ●"
            value={code}
            onChange={e => setCode(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            error={error}
            autoFocus
            dir="ltr"
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
            <button
              onClick={onResend}
              disabled={sendOtp.isPending}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {fa.auth.resendOtp}
            </button>
          )}
        </div>
        <button
          onClick={() => navigate('/login')}
          className="mt-2 w-full text-center text-sm text-slate-600 hover:text-slate-400 transition-colors"
        >
          {fa.common.back}
        </button>
      </div>
    </div>
  )
}
