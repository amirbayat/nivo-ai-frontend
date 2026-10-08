import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatCardNumberGroups } from '@/lib/digits'
import {
  useCheckSlugAvailable,
  useClassifyBusinessSetup,
  useCreateStore,
  useGenerateBrandIntroAi,
  useUpdateStore,
} from '@/queries/seller.queries'
import type { AnalyzeOwnerNotesResult, ClassifyBusinessSetupResult } from '@/types/api'
import { GuidePromptModal } from './panel/GuidePromptModal'
import { NotesSuggestionsPanel } from './panel/NotesSuggestionsPanel'

// docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۶ — مرحله‌ی «محصول اول» کلاً از ویزارد حذف شد؛
// فروشنده بعد از ساخت فروشگاه مستقیم به صفحه‌ی واقعی ساخت محصول در پنل هدایت می‌شود
// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۹ (پروفایل برند عمیق‌تر در
// آنبوردینگ) — یک قدم اختیاری تازه (step 3) بین ساخت فروشگاه و صفحه‌ی موفقیت (که step4 شد) اضافه شد
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <path d="M11.5 3.5a1.75 1.75 0 0 1 2.5 2.5L5.5 14.5l-3 .75.75-3Z" />
    </svg>
  )
}

export function SellerOnboardingPage() {
  const navigate = useNavigate()
  const createStore = useCreateStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  // docs/PRD-ai-assisted-business-setup.md — قدم ۱، سه حالت نمایش بخش دسته‌بندی: توصیف آزاد
  // (پیش‌فرض) → کارت تأیید AI (فقط confidence=HIGH) → چیپ‌های دستی (fallback یا ویرایش)
  const [bizMode, setBizMode] = useState<'describe' | 'confirm' | 'manual'>('describe')
  const [bizRawText, setBizRawText] = useState('')
  const [classification, setClassification] = useState<ClassifyBusinessSetupResult | null>(null)
  const [businessType, setBusinessType] = useState<'PRODUCT_SALES' | 'APPOINTMENT_BOOKING'>('PRODUCT_SALES')
  const [editingFromConfirm, setEditingFromConfirm] = useState(false)
  const [slug, setSlug] = useState('')
  const [debouncedSlug, setDebouncedSlug] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [brandRawText, setBrandRawText] = useState('')
  const [brandIntroDraft, setBrandIntroDraft] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [notesResult, setNotesResult] = useState<AnalyzeOwnerNotesResult | null>(null)

  const generateBrandIntro = useGenerateBrandIntroAi(storeId ?? '')
  const updateStore = useUpdateStore(storeId ?? '')
  const classifyBusinessSetup = useClassifyBusinessSetup()

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

  async function runClassify() {
    const result = await classifyBusinessSetup.mutateAsync(bizRawText)
    setClassification(result)
    setCategory(result.category)
    setBusinessType(result.businessType)
    setBizMode(result.confidence === 'HIGH' ? 'confirm' : 'manual')
  }

  async function submitStore() {
    const store = await createStore.mutateAsync({
      name,
      category: category ?? undefined,
      businessType,
      slug,
      bankCardNumber: cardNumber,
      bankOwnerName: ownerName,
      instagramUrl: instagramUrl || undefined,
      telegramUrl: telegramUrl || undefined,
      websiteUrl: websiteUrl || undefined,
    })
    setStoreId(store.id)
    setStoreSlug(store.slug)
    setStep(3)
  }

  async function generateBrandIntroDraft() {
    const result = await generateBrandIntro.mutateAsync(brandRawText)
    setBrandIntroDraft(result.suggestedBrandIntro)
  }

  async function confirmBrandIntroAndContinue() {
    if (brandIntroDraft) await updateStore.mutateAsync({ brandIntro: brandIntroDraft })
    setStep(4)
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

            {bizMode === 'describe' && (
              <div className="mb-6">
                <p className="mb-2 text-sm text-slate-300 light:text-slate-700">{fa.seller.step1.businessDescLabel}</p>
                <textarea
                  value={bizRawText}
                  onChange={e => setBizRawText(e.target.value)}
                  placeholder={fa.seller.step1.businessDescPlaceholder}
                  rows={4}
                  className="mb-2 w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 px-4 py-3 text-sm text-slate-200 light:text-slate-800 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <p className="mb-3 text-xs text-slate-500">{fa.seller.step1.businessDescHint}</p>

                {classifyBusinessSetup.isError && <p className="mb-3 text-center text-xs text-red-400 light:text-red-600">{fa.seller.step1.classifyError}</p>}

                <button
                  onClick={runClassify}
                  disabled={!bizRawText.trim() || classifyBusinessSetup.isPending}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-[14px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {classifyBusinessSetup.isPending ? fa.seller.step1.classifyLoading : fa.seller.step1.classifyButton}
                </button>
                <button onClick={() => setBizMode('manual')} className="w-full text-center text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
                  {fa.seller.step1.pickManually}
                </button>
              </div>
            )}

            {bizMode === 'confirm' && classification && (
              <div className="mb-6 flex flex-col gap-3">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-300 light:text-emerald-700">
                  {fa.seller.step1.aiSuggestionBadge} · {fa.seller.step1.highConfidenceBadge}
                </div>

                <div className="rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{fa.seller.step1.businessTypeFieldLabel}</span>
                    <button
                      onClick={() => { setEditingFromConfirm(true); setBizMode('manual') }}
                      aria-label={fa.seller.step1.editFieldAria}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                  <div className="text-[15px] font-semibold text-slate-100 light:text-slate-900">
                    {businessType === 'PRODUCT_SALES' ? fa.seller.step1.businessTypeProductSales : fa.seller.step1.businessTypeAppointmentBooking}
                  </div>
                  <div className="mt-1 text-xs leading-[1.7] text-slate-500">{classification.businessTypeReason}</div>
                </div>

                <div className="rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{fa.seller.step1.categoryFieldLabel}</span>
                    <button
                      onClick={() => { setEditingFromConfirm(true); setBizMode('manual') }}
                      aria-label={fa.seller.step1.editFieldAria}
                      className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                  <div className="text-[15px] font-semibold text-slate-100 light:text-slate-900">{category}</div>
                  <div className="mt-1 text-xs leading-[1.7] text-slate-500">{classification.categoryReason}</div>
                </div>

                {classification.pricingNote && (
                  <div className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-xs leading-[1.8] text-amber-300 light:text-amber-700">
                    {classification.pricingNote}
                  </div>
                )}

                {businessType === 'APPOINTMENT_BOOKING' && (
                  <div className="rounded-xl bg-amber-500/10 px-3.5 py-3 text-xs leading-[1.8] text-amber-300 light:text-amber-700">
                    {fa.seller.step1.appointmentBookingComingSoon}
                  </div>
                )}

                <button onClick={() => setBizMode('describe')} className="w-full text-center text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
                  {fa.seller.step1.backToDescription}
                </button>
              </div>
            )}

            {bizMode === 'manual' && (
              <div className="mb-6">
                {classification && classification.confidence !== 'HIGH' && (
                  <p className="mb-3 text-xs leading-[1.8] text-amber-300 light:text-amber-700">{fa.seller.step1.lowConfidenceNotice}</p>
                )}

                {editingFromConfirm && (
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => setBusinessType('PRODUCT_SALES')}
                      className={clsx(
                        'flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-semibold',
                        businessType === 'PRODUCT_SALES'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                          : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600',
                      )}
                    >
                      {fa.seller.step1.businessTypeProductSales}
                    </button>
                    <button
                      onClick={() => setBusinessType('APPOINTMENT_BOOKING')}
                      className={clsx(
                        'flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-semibold',
                        businessType === 'APPOINTMENT_BOOKING'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                          : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600',
                      )}
                    >
                      {fa.seller.step1.businessTypeAppointmentBooking}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
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

                {businessType === 'APPOINTMENT_BOOKING' && (
                  <div className="mt-3 rounded-xl bg-amber-500/10 px-3.5 py-3 text-xs leading-[1.8] text-amber-300 light:text-amber-700">
                    {fa.seller.step1.appointmentBookingComingSoon}
                  </div>
                )}

                <button onClick={() => setBizMode('describe')} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
                  {fa.seller.step1.backToDescription}
                </button>
              </div>
            )}

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
          <>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h1 className="text-[22px] font-bold text-slate-100 light:text-slate-900">{fa.seller.step3Brand.heading}</h1>
              {storeId && (
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20"
                >
                  ✨ {fa.seller.panel.guidePrompt.button}
                </button>
              )}
            </div>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.seller.step3Brand.subheading}</p>

            {storeId && notesResult && (
              <NotesSuggestionsPanel
                storeId={storeId}
                result={notesResult}
                onApplyBrandIntro={text => setBrandIntroDraft(text)}
                onApplyShippingInfo={text => updateStore.mutate({ shippingInfo: text })}
                onApplyReturnPolicy={text => updateStore.mutate({ returnPolicy: text })}
                onApplyCategory={c => updateStore.mutate({ category: c })}
              />
            )}

            {brandIntroDraft === null ? (
              <>
                <textarea
                  value={brandRawText}
                  onChange={e => setBrandRawText(e.target.value)}
                  placeholder={fa.seller.step3Brand.placeholder}
                  rows={5}
                  className="mb-4 w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 px-4 py-3 text-sm text-slate-200 light:text-slate-800 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />

                {generateBrandIntro.isError && <p className="mb-3 text-center text-xs text-red-400 light:text-red-600">{fa.seller.step3Brand.generateError}</p>}

                <NextButton onClick={generateBrandIntroDraft} disabled={!brandRawText.trim()} loading={generateBrandIntro.isPending}>
                  {generateBrandIntro.isPending ? fa.seller.step3Brand.generateLoading : fa.seller.step3Brand.generateButton}
                </NextButton>
              </>
            ) : (
              <>
                <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.step3Brand.previewLabel}</label>
                <textarea
                  value={brandIntroDraft}
                  onChange={e => setBrandIntroDraft(e.target.value)}
                  rows={4}
                  className="mb-4 w-full resize-none rounded-2xl border border-emerald-500/60 bg-slate-800/40 light:bg-slate-50 px-4 py-3 text-sm text-slate-200 light:text-slate-800 focus:border-emerald-500 focus:outline-none"
                />

                {updateStore.isError && <p className="mb-3 text-center text-xs text-red-400 light:text-red-600">{fa.seller.errorGeneric}</p>}

                <NextButton onClick={confirmBrandIntroAndContinue} disabled={!brandIntroDraft.trim()} loading={updateStore.isPending}>
                  {fa.seller.step3Brand.confirmButton}
                </NextButton>
              </>
            )}

            <button onClick={() => setStep(4)} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
              {fa.seller.step3Brand.skip}
            </button>

            {storeId && (
              <GuidePromptModal
                open={guideOpen}
                onClose={() => setGuideOpen(false)}
                context="store-setup"
                storeId={storeId}
                category={category}
                businessType={businessType}
                storeName={name}
                onResult={setNotesResult}
              />
            )}
          </>
        )}

        {step === 4 && (
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
