import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

// docs/PRD-mvp-launch-plan.md بخش ۱.۲ — مسیر ورودی جدا از پنل چت اصلی نیوو، برای فروشنده‌ای
// که برای ایجنت فروش دایرکت/تلگرام می‌آید، نه برای فیچرهای چت/عکس/ویدیوی محصول اصلی
export function SellerLandingPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 light:bg-white p-4 text-center" dir="rtl">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-6 w-40" />
        <span className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 light:text-emerald-700">
          {fa.seller.landing.badge}
        </span>
        <h1 className="mb-3 text-2xl font-bold leading-snug text-slate-100 light:text-slate-900">{fa.seller.landing.heading}</h1>
        <p className="mb-8 text-sm leading-[1.8] text-slate-400 light:text-slate-600">{fa.seller.landing.subheading}</p>
        <Button className="w-full" onClick={() => navigate('/seller/login')}>
          {fa.seller.landing.cta}
        </Button>
      </div>
    </div>
  )
}
