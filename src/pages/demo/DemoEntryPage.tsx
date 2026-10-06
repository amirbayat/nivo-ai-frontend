import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSendOtp, useVerifyOtp } from '@/queries/auth.queries'
import { useEnsureDemoStore } from '@/queries/demo.queries'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { toEnglishDigits } from '@/lib/digits'
import { DEMO_CATEGORY_LABELS } from '@/lib/demoCategories'
import { fa } from '@/locales/fa'

type DemoRole = 'seller' | 'buyer'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۵.۲ — همان جریان واقعی
// OTP فروشنده (SellerLoginPage/SellerOtpPage)، فقط بعد از ورود به‌جای ویزارد ثبت‌نام،
// POST /v2/demo/stores/ensure کپی/پیداکردن فروشگاه نمونه را انجام می‌دهد و بسته به نقش
// به پنل فروشنده یا چت خریدار (همان کامپوننت‌های واقعی) ریدایرکت می‌کند
export function DemoEntryPage({ role }: { role: DemoRole }) {
  const { category = '' } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()
  const ensureDemoStore = useEnsureDemoStore()

  const categoryLabel = DEMO_CATEGORY_LABELS[category]
  const badge = role === 'seller' ? fa.demo.sellerBadge : fa.demo.buyerBadge
  const heading = role === 'seller' ? fa.demo.sellerHeading : fa.demo.buyerHeading
  const subheading = role === 'seller' ? fa.demo.sellerSubheading : fa.demo.buyerSubheading

  const validatePhone = (val: string) => /^(\+98|0)?9[0-9]{9}$/.test(val)

  async function onSubmitPhone(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!categoryLabel) {
      setError(fa.demo.categoryInvalid)
      return
    }
    if (!validatePhone(phone)) {
      setError(fa.auth.invalidPhone)
      return
    }
    try {
      await sendOtp.mutateAsync(phone)
      setStep('otp')
    } catch {
      setError(fa.common.error)
    }
  }

  async function onSubmitOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await verifyOtp.mutateAsync({ phone, code })
    } catch {
      setError(fa.common.error)
      return
    }
    try {
      const { slug } = await ensureDemoStore.mutateAsync(category)
      navigate(role === 'seller' ? '/seller/panel/home' : `/shop/${slug}`, { replace: true })
    } catch {
      setError(fa.demo.setupError)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-4 w-40" />
          <span className="mb-2 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 light:text-emerald-700">
            {badge}
          </span>
          <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {subheading}
            {categoryLabel ? ` (${categoryLabel})` : ''}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={onSubmitPhone} className="space-y-4">
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
              {fa.demo.startButton}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmitOtp} className="space-y-4">
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
            <Button
              type="submit"
              className="w-full"
              loading={verifyOtp.isPending || ensureDemoStore.isPending}
              disabled={code.length < 6}
            >
              {ensureDemoStore.isPending ? fa.demo.settingUp : fa.auth.verifyOtp}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
