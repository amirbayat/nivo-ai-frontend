import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { useCheckSlugAvailable, useCreateProduct, useCreateStore } from '@/queries/seller.queries'

const TOTAL_STEPS = 4
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
        <div key={i} className={clsx('h-1 flex-1 rounded-full', i < step ? 'bg-emerald-500' : 'bg-slate-800')} />
      ))}
    </div>
  )
}

function StepHeader({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <button onClick={onBack} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200" aria-label={fa.common.back}>
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
  const [cardNumber, setCardNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(slug), 400)
    return () => clearTimeout(t)
  }, [slug])

  const slugCheck = useCheckSlugAvailable(debouncedSlug)
  const createProduct = useCreateProduct(storeId ?? '')

  function goBack() {
    if (step === 1) {
      navigate('/seller/login')
      return
    }
    setStep(s => s - 1)
  }

  async function submitStore() {
    const store = await createStore.mutateAsync({ name, category: category ?? undefined, slug, bankCardNumber: cardNumber, bankOwnerName: ownerName })
    setStoreId(store.id)
    setStoreSlug(store.slug)
    setStep(3)
  }

  async function submitProduct() {
    if (!storeId) return
    await createProduct.mutateAsync({
      name: productName,
      basePrice: Number(toEnglishDigits(productPrice)) || 0,
      stock: productStock ? Number(toEnglishDigits(productStock)) : undefined,
    })
    setStep(4)
  }

  const chatLink = storeSlug ? `${window.location.origin}/shop/${storeSlug}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ url: chatLink, title: name })
        return
      } catch {
        // کاربر شیت اشتراک‌گذاری را بست — چیزی نمایش نمی‌دهیم
      }
    }
    await copyLink()
  }

  const cardNumberValid = /^[0-9]{16}$/.test(toEnglishDigits(cardNumber))
  const slugValid = /^[a-z0-9-]{3,40}$/.test(slug)

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        <StepHeader onBack={goBack} step={step} />
        <ProgressBar step={step} />

        {step === 1 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.seller.step1.heading}</h1>
            <p className="mb-8 text-sm leading-[1.7] text-slate-500">{fa.seller.step1.subheading}</p>

            <div className="mb-5">
              <Input label={fa.seller.step1.nameLabel} placeholder={fa.seller.step1.namePlaceholder} value={name} onChange={e => setName(e.target.value)} />
            </div>

            <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.seller.step1.categoryLabel}</label>
            <div className="mb-6 flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
                    category === c ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600',
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
                  <span className="mr-1 text-red-400"> {fa.seller.step1.slugTaken}</span>
                ) : slugCheck.data === true ? (
                  <span className="mr-1 text-emerald-400"> {fa.seller.step1.slugAvailable}</span>
                ) : null
              )}
            </p>

            <NextButton onClick={() => setStep(2)} disabled={!name || !slugValid || slugCheck.data !== true}>
              {fa.seller.next}
            </NextButton>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.seller.step2.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step2.subheading}</p>

            <div className="mb-5">
              <Input
                label={fa.seller.step2.cardNumberLabel}
                placeholder="6037-XXXX-XXXX-XXXX"
                value={cardNumber}
                onChange={e => setCardNumber(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 16))}
                dir="ltr"
                inputMode="numeric"
                className="text-center tracking-widest"
              />
            </div>
            <div className="mb-3">
              <Input label={fa.seller.step2.ownerNameLabel} value={ownerName} onChange={e => setOwnerName(e.target.value)} />
            </div>

            {createStore.isError && <p className="mb-3 text-center text-xs text-red-400">{fa.seller.errorGeneric}</p>}

            <NextButton onClick={submitStore} disabled={!cardNumberValid || !ownerName} loading={createStore.isPending}>
              {fa.seller.next}
            </NextButton>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.seller.step3.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step3.subheading}</p>

            <div className="mb-5">
              <Input label={fa.seller.step3.nameLabel} value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <Input
                label={fa.seller.step3.priceLabel}
                value={productPrice}
                onChange={e => setProductPrice(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
                dir="ltr"
                inputMode="numeric"
                className="text-center"
              />
              <Input
                label={fa.seller.step3.stockLabel}
                value={productStock}
                onChange={e => setProductStock(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
                dir="ltr"
                inputMode="numeric"
                className="text-center"
              />
            </div>

            <button disabled className="mb-2 w-full rounded-2xl border border-dashed border-slate-700 py-3.5 text-[13px] font-medium text-slate-600">
              {fa.seller.step3.excelUpload}
            </button>

            {createProduct.isError && <p className="mb-3 text-center text-xs text-red-400">{fa.seller.errorGeneric}</p>}

            <NextButton onClick={submitProduct} disabled={!productName || !productPrice} loading={createProduct.isPending}>
              {fa.seller.next}
            </NextButton>
          </>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" className="size-7">
                <path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.seller.step4.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step4.subheading}</p>

            <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 px-4 py-4">
              <p dir="ltr" className="break-all text-center text-[15px] font-mono text-emerald-300">{chatLink}</p>
            </div>

            <button onClick={copyLink} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 py-3.5 text-[14px] font-semibold text-slate-200 hover:border-slate-600">
              {copied ? fa.seller.step4.linkCopied : fa.seller.step4.copyLink}
            </button>
            <button onClick={shareLink} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600">
              {fa.seller.step4.shareLink}
            </button>
            <button onClick={() => navigate('/seller/dashboard-placeholder')} className="w-full text-center text-sm text-slate-500 hover:text-slate-300">
              {fa.seller.step4.goToDashboard}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
