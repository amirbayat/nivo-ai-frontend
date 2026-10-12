import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import darkLogoUrl from '@/assets/brand/horizontal-dark.svg'

// docs/PRD-mvp-launch-plan.md بخش ۱.۲ — مسیر ورودی جدا از پنل چت اصلی نیوو، برای فروشنده‌ای
// که برای ایجنت فروش دایرکت/تلگرام می‌آید، نه برای فیچرهای چت/عکس/ویدیوی محصول اصلی.
// این صفحه عمداً همیشه روشن است (data-theme="light" روی ریشه) — طبق تصمیم محصولی
// «Nivo Seller & Chat Design System»: سطح فروشنده/خریدار تم تیره ندارد. به همین دلیل از
// Logo.tsx (که به تم سراسری سایت وصل است) استفاده نمی‌شود؛ لوگوی روشن/تیره مستقیم انتخاب
// می‌شود تا مستقل از تم کلی کاربر همیشه درست دیده شود.
const DEMO_CATEGORIES: { label: string; icon: ReactElement }[] = [
  {
    label: 'پوشاک',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'کیف و کفش',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 10h16l-1.2 9a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 10Z" strokeLinejoin="round" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'آرایشی و بهداشتی',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3c1.5 2 1.5 4-.3 5.6M12 3c-1.5 2-1.5 4 .3 5.6" strokeLinecap="round" />
        <path d="M6 21c0-5 2.7-9 6-9s6 4 6 9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'خانه و آشپزخانه',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M3 11 12 4l9 7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'دیجیتال و لوازم جانبی',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'خوراکی و صنایع غذایی',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'جواهرات و اکسسوری',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="m12 3 3 4h-6l3-4Z" strokeLinejoin="round" />
        <path d="M6 7h12l-6 13L6 7Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'ورزش و سفر',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" strokeLinecap="round" />
      </svg>
    ),
  },
]

function ChevronForward() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0" aria-hidden="true">
      <path d="M12.7 5.3a1 1 0 0 1 0 1.4L9.4 10l3.3 3.3a1 1 0 1 1-1.4 1.4l-4-4a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 0Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  )
}

const FEATURE_ICONS: ReactElement[] = [
  <svg key="fa" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
    <path d="M12 4c4.97 0 9 3.36 9 7.5 0 2.1-1.03 4-2.69 5.37.14.98.56 2.1 1.44 3.13-1.63.2-3.06-.24-4.17-.9-1.1.4-2.32.6-3.58.6-4.97 0-9-3.36-9-7.5S7.03 4 12 4Z" strokeLinejoin="round" />
  </svg>,
  <svg key="link" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M10 14.5 14 10.5" strokeLinecap="round" />
    <path d="M8.5 16 6.6 17.9a3 3 0 1 1-4.2-4.2L4.3 11.8M15.5 8l1.9-1.9a3 3 0 1 1 4.2 4.2L19.7 12.2" strokeLinecap="round" />
  </svg>,
  <svg key="check" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  <svg key="card" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="3.5" y="6" width="17" height="12" rx="2" />
    <path d="M3.5 10h17" strokeLinecap="round" />
  </svg>,
  <svg key="coin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M12 3v3M12 18v3M4.2 12H3M21 12h-1.2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    <circle cx="12" cy="12" r="4.5" />
  </svg>,
  <svg key="gift" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M10.3 3.9 2.9 17a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L15.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
    <path d="M12 9.5v4M12 17h.01" strokeLinecap="round" />
  </svg>,
]

export function SellerLandingPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(0)
  const t = fa.seller.landing

  function goToSignup(source: string) {
    track(`seller_landing_${source}_cta_click`)
    navigate('/seller/login')
  }

  function goToDemo(source: string) {
    track(`seller_landing_${source}_demo_click`)
    navigate('/demo/seller')
  }

  return (
    <div data-theme="light" className="min-h-screen bg-white text-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <img src="/brand2/horizontal.svg" alt="نیوو" className="h-7 w-auto" />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">{t.nav.features}</a>
            <a href="#how" className="hover:text-slate-900">{t.nav.how}</a>
            <a href="#demo" className="hover:text-slate-900">{t.nav.demo}</a>
            <a href="#pricing" className="hover:text-slate-900">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-slate-900">{t.nav.faq}</a>
          </nav>
          <button
            type="button"
            onClick={() => goToSignup('header')}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
          >
            {t.cta}
            <ChevronForward />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-14 px-6 py-16 sm:py-20">
        <div className="min-w-0 flex-[999_1_440px]">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            {t.badge}
          </span>
          <h1 className="mb-4 text-[32px] font-extrabold leading-[1.25] sm:text-[44px]">{t.heading}</h1>
          <p className="mb-7 max-w-lg text-[17px] leading-[1.85] text-slate-600">{t.subheading}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => goToSignup('hero')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {t.cta}
              <ChevronForward />
            </button>
            <button
              type="button"
              onClick={() => goToDemo('hero')}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-600/20 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <PlayIcon />
              {fa.demo.startButton}
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">{t.heroMicro}</p>
        </div>

        <div className="flex min-w-[280px] flex-[1_1_300px] justify-center">
          <div className="w-[280px] rounded-[36px] border border-slate-200 bg-white p-3.5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-2.5 rounded-3xl bg-slate-50 p-4">
              <div className="mb-0.5 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <div className="flex size-6 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">ک</div>
                <div className="text-[11.5px] font-bold">کیف و کفش ماهرخ</div>
                <span className="mr-auto flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  فعال
                </span>
              </div>

              <div className="self-end max-w-[84%] rounded-2xl rounded-se-md bg-emerald-50 px-3 py-2 text-[12.5px] leading-[1.7]">
                سلام، این کیف چرم مشکی رو دارید؟
              </div>
              <div className="self-start max-w-[86%] rounded-2xl rounded-ss-md border border-slate-200 bg-white px-3 py-2 text-[12.5px] leading-[1.7]">
                سلام، بله موجوده. عکس و قیمتش رو براتون می‌فرستم.
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="flex gap-2.5">
                  <div className="flex size-[52px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
                      <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">کیف چرم دست‌دوز مشکی</div>
                    <div className="mt-1 text-xs font-bold text-emerald-700" dir="ltr">485,000 تومان</div>
                  </div>
                </div>
                <button type="button" className="rounded-lg bg-emerald-600 py-1.5 text-center text-xs font-bold text-white">افزودن به سبد</button>
              </div>

              <div className="self-end max-w-[84%] rounded-2xl rounded-se-md bg-emerald-50 px-3 py-2 text-[12.5px] leading-[1.7]">
                همینو می‌خوام، چطور پرداخت کنم؟
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="text-[11.5px] font-bold">سبد خرید — ۱ کالا</div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">مبلغ قابل پرداخت</span>
                  <span className="text-[13px] font-bold" dir="ltr">485,000 تومان</span>
                </div>
                <button type="button" className="rounded-lg bg-emerald-600 py-1.5 text-center text-xs font-bold text-white">تکمیل سفارش</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl border-t border-slate-200 px-6 py-16 sm:py-20">
        <div className="mx-auto mb-11 max-w-xl text-center">
          <p className="mb-2.5 text-xs font-bold text-emerald-700">{t.howItWorks.eyebrow}</p>
          <h2 className="text-[26px] font-bold sm:text-[32px]">{t.howItWorks.title}</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {t.howItWorks.steps.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex size-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                {(i + 1).toLocaleString('fa-IR')}
              </div>
              <h3 className="mb-2 text-[15px] font-bold">{step.title}</h3>
              <p className="text-[13px] leading-[1.85] text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl border-t border-slate-200 px-6 py-16 sm:py-20">
        <div className="mx-auto mb-11 max-w-xl text-center">
          <p className="mb-2.5 text-xs font-bold text-emerald-700">{t.features.eyebrow}</p>
          <h2 className="text-[26px] font-bold sm:text-[32px]">{t.features.title}</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => (
            <div key={f.title} className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                {FEATURE_ICONS[i]}
              </div>
              <div>
                <h3 className="mb-1.5 text-[15px] font-bold">{f.title}</h3>
                <p className="text-[13px] leading-[1.85] text-slate-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="mb-2.5 text-xs font-bold text-emerald-700">{fa.demo.sellerBadge}</p>
            <h2 className="text-[26px] font-bold sm:text-[32px]">{fa.demo.sellerHeading}</h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-[1.8] text-slate-600">{fa.demo.sellerSubheading}</p>
          </div>

          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEMO_CATEGORIES.map(cat => (
              <div key={cat.label} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-600">
                {cat.icon}
                <span className="text-[12.5px] font-semibold text-slate-700">{cat.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="mb-5 text-xs text-slate-400">{t.demoSection.categoriesNote}</p>
            <button
              type="button"
              onClick={() => goToDemo('section')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {fa.demo.startButton}
              <ChevronForward />
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mx-auto mb-11 max-w-xl text-center">
          <p className="mb-2.5 text-xs font-bold text-emerald-700">{t.pricing.eyebrow}</p>
          <h2 className="text-[26px] font-bold sm:text-[32px]">{t.pricing.title}</h2>
        </div>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          <div className="mb-1.5 text-sm font-bold text-slate-600">{t.pricing.creditLabel}</div>
          <div className="mb-4 text-[40px] font-extrabold" dir="ltr">{t.pricing.creditAmount}</div>
          <p className="mb-6 text-[13.5px] leading-[1.9] text-slate-600">{t.pricing.description}</p>
          <div className="mx-auto mb-7 flex max-w-xs flex-col items-start gap-2.5">
            {t.pricing.checks.map(c => (
              <div key={c} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                <CheckIcon />
                {c}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goToSignup('pricing')}
            className="inline-flex h-11 w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
          >
            {t.cta}
            <ChevronForward />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl border-t border-slate-200 px-6 py-16 sm:py-20">
        <div className="mx-auto mb-11 max-w-xl text-center">
          <p className="mb-2.5 text-xs font-bold text-emerald-700">{t.faq.title}</p>
          <h2 className="text-[26px] font-bold sm:text-[32px]">{t.faq.title}</h2>
        </div>
        <div className="mx-auto max-w-2xl">
          {t.faq.items.map((item, i) => {
            const isOpen = openFaq === i
            return (
              <div key={item.q} className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right text-sm font-bold"
                >
                  <span>{item.q}</span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    className="shrink-0 text-slate-400 transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {isOpen && <div className="px-5 pb-4 text-[13px] leading-[1.9] text-slate-600">{item.a}</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-emerald-600/15 bg-emerald-50">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h2 className="mb-2.5 text-[26px] font-bold sm:text-[32px]">{t.finalCta.title}</h2>
          <p className="mx-auto mb-7 max-w-md text-[15px] leading-[1.8] text-slate-600">{t.finalCta.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => goToSignup('final')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              {t.cta}
              <ChevronForward />
            </button>
            <button
              type="button"
              onClick={() => goToDemo('final')}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
            >
              {fa.demo.startButton}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-10 px-6 py-12">
          <div className="min-w-[220px] flex-1">
            <img src={darkLogoUrl} alt="نیوو" className="mb-3.5 h-6 w-auto" />
            <p className="max-w-[280px] text-[13px] leading-[1.9] text-slate-400">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-14">
            <div>
              <div className="mb-3.5 text-xs font-bold text-slate-100">{t.footer.product}</div>
              <div className="flex flex-col gap-2.5 text-[13px] text-slate-400">
                <a href="#features" className="hover:text-white">{t.nav.features}</a>
                <a href="#demo" className="hover:text-white">{t.nav.demo}</a>
                <a href="#pricing" className="hover:text-white">{t.nav.pricing}</a>
              </div>
            </div>
            <div>
              <div className="mb-3.5 text-xs font-bold text-slate-100">{t.footer.support}</div>
              <div className="flex flex-col gap-2.5 text-[13px] text-slate-400">
                <a href="#faq" className="hover:text-white">{t.nav.faq}</a>
                <a href="/contact" className="hover:text-white" data-track="seller_landing_contact_click">{t.footer.contact}</a>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-slate-500">
            © ۱۴۰۴ نیوو. {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}
