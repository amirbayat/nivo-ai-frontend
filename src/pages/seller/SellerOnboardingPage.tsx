import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatCardNumberGroups } from '@/lib/digits'
import { useCheckSlugAvailable, useCreateStore } from '@/queries/seller.queries'

// docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۶ — مرحله‌ی «محصول اول» کلاً از ویزارد حذف شد؛
// فروشنده بعد از ساخت فروشگاه مستقیم به صفحه‌ی واقعی ساخت محصول در پنل هدایت می‌شود
const TOTAL_STEPS = 3
const CATEGORIES = fa.seller.step1.categories

// طبق CLAUDE.md — سایت RTL است: شورون «بازگشت» رو به راست، «ادامه» رو به چپ اشاره می‌کند
function BackChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ForwardChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8 flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={clsx('h-1 flex-1 rounded-full', i < step ? 'bg-emerald-500' : 'bg-slate-800 light:bg-slate-200')} />
      ))}
    </div>
  )
}

function StepHeader({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <button onClick={onBack} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-500 hover:border-slate-600 light:hover:border-slate-400 hover:text-slate-200 light:hover:text-slate-800" aria-label={fa.common.back}>
        <BackChevron />
      </button>
      <span className="text-[13px] font-medium text-slate-500">{fa.seller.stepOf(step, TOTAL_STEPS)}</span>
    </div>
  )
}

function NextButton({ onClick, disabled, loading, children }: { onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{children}</span>
      {!loading && <ForwardChevron />}
    </button>
  )
}

export function SellerOnboardingPage() {
  const navigate = useNavigate()
  const createStore = useCreateStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [debouncedSlug, setDebouncedSlug] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(slug), 400)
    return () => clearTimeout(t)
  }, [slug])

  const slugCheck = useCheckSlugAvailable(debouncedSlug)

  function goBack() {
    if (step === 1) {
      navigate('/seller/login')
      return
    }
    setStep(s => s - 1)
  }

  async function submitStore() {
    const store = await createStore.mutateAsync({
      name,
      category: category ?? undefined,
      slug,
      bankCardNumber: cardNumber,
      bankOwnerName: ownerName,
      instagramUrl: instagramUrl || undefined,
      telegramUrl: telegramUrl || undefined,
      websiteUrl: websiteUrl || undefined,
    })
    setStoreSlug(store.slug)
    setStep(3)
  }

  const chatLink = storeSlug ? `${window.location.origin}/shop/${storeSlug}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardNumberValid = /^[0-9]{16}$/.test(toEnglishDigits(cardNumber))
  const slugValid = /^[a-z0-9-]{3,40}$/.test(slug)

  return (
    <div className="min-h-screen bg-slate-950 light:bg-white px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        <StepHeader onBack={goBack} step={step} />
        <ProgressBar step={step} />

        {step === 1 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100 light:text-slate-900">{fa.seller.step1.heading}</h1>
            <p className="mb-8 text-sm leading-[1.7] text-slate-500">{fa.seller.step1.subheading}</p>

            <div className="mb-5">
              <Input label={fa.seller.step1.nameLabel} placeholder={fa.seller.step1.namePlaceholder} value={name} onChange={e => setName(e.target.value)} />
            </div>

            <label className="mb-3 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.step1.categoryLabel}</label>
            <div className="mb-6 flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
                    category === c
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                      : 'border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 text-slate-400 light:text-slate-600 hover:border-slate-600 light:hover:border-slate-400',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mb-1">
              <Input
                label={fa.seller.step1.slugLabel}
                placeholder={fa.seller.step1.slugPlaceholder}
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                dir="ltr"
                className="text-left"
              />
            </div>
            <p className="mb-6 text-xs text-slate-500">
              {fa.seller.step1.slugHint}
              {slugValid && debouncedSlug === slug && (
                slugCheck.isLoading ? (
                  <span className="mr-1 text-slate-500"> {fa.seller.step1.slugChecking}</span>
                ) : slugCheck.data === false ? (
                  <span className="mr-1 text-red-400 light:text-red-600"> {fa.seller.step1.slugTaken}</span>
                ) : slugCheck.data === true ? (
                  <span className="mr-1 text-emerald-400 light:text-emerald-600"> {fa.seller.step1.slugAvailable}</span>
                ) : null
              )}
            </p>

            <label className="mb-3 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.step1.linksLabel}</label>
            <div className="mb-2">
              <Input placeholder={fa.seller.step1.instagramPlaceholder} value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <div className="mb-2">
              <Input placeholder={fa.seller.step1.telegramPlaceholder} value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <div className="mb-6">
              <Input placeholder={fa.seller.step1.websitePlaceholder} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} dir="ltr" className="text-left" />
            </div>

            <NextButton onClick={() => setStep(2)} disabled={!name || !slugValid || slugCheck.data !== true}>
              {fa.seller.next}
            </NextButton>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100 light:text-slate-900">{fa.seller.step2.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step2.subheading}</p>

            <div className="mb-5">
              <Input
                label={fa.seller.step2.cardNumberLabel}
                placeholder="6037 XXXX XXXX XXXX"
                value={formatCardNumberGroups(cardNumber)}
                onChange={e => setCardNumber(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 16))}
                dir="ltr"
                inputMode="numeric"
                className="text-center tracking-widest"
              />
            </div>
            <div className="mb-3">
              <Input label={fa.seller.step2.ownerNameLabel} value={ownerName} onChange={e => setOwnerName(e.target.value)} />
            </div>

            {createStore.isError && <p className="mb-3 text-center text-xs text-red-400 light:text-red-600">{fa.seller.errorGeneric}</p>}

            <NextButton onClick={submitStore} disabled={!cardNumberValid || !ownerName} loading={createStore.isPending}>
              {fa.seller.next}
            </NextButton>
          </>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 light:text-emerald-600">
              <svg viewBox="0 0 24 24" fill="none" className="size-7">
                <path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100 light:text-slate-900">{fa.seller.step3.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step3.subheading}</p>

            <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 px-4 py-4">
              <p dir="ltr" className="break-all text-center text-[15px] font-mono text-emerald-300 light:text-emerald-700">{chatLink}</p>
            </div>

            <button onClick={copyLink} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-[14px] font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
              {copied ? fa.seller.step3.linkCopied : fa.seller.step3.copyLink}
            </button>

            {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۶ — CTA اصلی دیگر «برو به داشبورد»
                نیست، مستقیم به فرم کامل ساخت محصول واقعی در پنل می‌رود */}
            <button onClick={() => navigate('/seller/panel/products/new')} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600">
              {fa.seller.step3.addFirstProduct}
            </button>
            <button onClick={() => navigate('/seller/panel/home')} className="w-full text-center text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
              {fa.seller.step3.skipToDashboard}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
