import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { extractErrorMessage, storeLogoUrl } from '@/lib/sellerProduct'
import {
  useAnalyzeOwnerNotes,
  useMyStores,
  useProducts,
  useRemoveStoreLogo,
  useUpdateStore,
  useUploadStoreLogo,
} from '@/queries/seller.queries'
import type { AnalyzeOwnerNotesResult, SellerStore } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'
import { GuideAssistantModal } from './GuideAssistantModal'
import { NotesSuggestionsPanel } from './NotesSuggestionsPanel'

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — عکس پروفایل فروشگاه؛ همون الگوی
// ProductImages در SellerProductEditPage.tsx، ساده‌شده برای تک‌عکس (نه آرایه)
function StoreLogoUpload({ store }: { store: SellerStore }) {
  const upload = useUploadStoreLogo(store.id)
  const remove = useRemoveStoreLogo(store.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
  }, [pendingPreview])

  const previewSrc = pendingPreview ?? (store.logoImageKey ? storeLogoUrl(store.id, store.logoImageKey) : null)

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.storeSettings.logoLabel}
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
        >
          {previewSrc ? <img src={previewSrc} alt="" className="size-full object-cover" /> : '+'}
          {upload.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          )}
        </button>
        {store.logoImageKey && (
          <button onClick={() => remove.mutate()} disabled={remove.isPending} className="text-xs text-red-400 hover:text-red-300">
            حذف عکس
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.storeSettings.logoHint}</p>
      {upload.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(upload.error, fa.seller.panel.storeSettings.logoUploadError)}</p>
      )}
      {remove.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(remove.error, fa.seller.panel.storeSettings.logoRemoveError)}</p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const previewUrl = URL.createObjectURL(file)
          setPendingPreview(previewUrl)
          upload.mutate(file, { onSettled: () => setPendingPreview(null) })
        }}
      />
    </div>
  )
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۳.۲ — فیلدهای ساختاریافته‌ی فروشگاه که تا امروز
// فقط یک‌بار در ویزارد ثبت‌نام قابل ورود بودند و بعدش هیچ‌جا قابل ویرایش نبودند
export function SellerStoreSettingsPage() {
  const { storeId } = useSellerStore()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const update = useUpdateStore(storeId)
  const reanalyze = useAnalyzeOwnerNotes(storeId)
  const products = useProducts(storeId)

  const [category, setCategory] = useState('')
  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۳
  const [goldWageType, setGoldWageType] = useState<'PERCENT' | 'FIXED_PER_GRAM'>('PERCENT')
  const [goldWageValue, setGoldWageValue] = useState('')
  const [goldProfitPercent, setGoldProfitPercent] = useState('')
  const [goldVatPercent, setGoldVatPercent] = useState('10')
  // بخش ۳.۳ سند — فقط وقتی دسته‌ی طلا/جواهر انتخاب شده یا حداقل یک محصول وزن‌محور دارد نمایش داده می‌شود
  const showGoldPricingSection =
    category === 'جواهرات و اکسسوری' || (products.data?.some(p => p.pricingModel === 'WEIGHT_BASED_FORMULA') ?? false)
  const [shippingInfo, setShippingInfo] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('')
  const [brandIntro, setBrandIntro] = useState('')
  const [ownerNotes, setOwnerNotes] = useState('')
  const [workingHoursStart, setWorkingHoursStart] = useState('')
  const [workingHoursEnd, setWorkingHoursEnd] = useState('')
  const [postPurchaseFollowUpEnabled, setPostPurchaseFollowUpEnabled] = useState(true)
  const [abandonedCartReminderEnabled, setAbandonedCartReminderEnabled] = useState(true)
  const [persuasionTechniquesEnabled, setPersuasionTechniquesEnabled] = useState(true)
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false)
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [saved, setSaved] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [notesResult, setNotesResult] = useState<AnalyzeOwnerNotesResult | null>(null)
  const [aiTouched, setAiTouched] = useState(false)

  // فقط یک‌بار بعد از رسیدن دیتا مقداردهی اولیه می‌شود — ویرایش‌های در حال تایپ کاربر با
  // رفرش/invalidate پس‌زمینه‌ای بعد از useUpdateStore بازنویسی نمی‌شوند
  useEffect(() => {
    if (!store) return
    setCategory(store.category ?? '')
    setShippingInfo(store.shippingInfo ?? '')
    setReturnPolicy(store.returnPolicy ?? '')
    setBrandIntro(store.brandIntro ?? '')
    setOwnerNotes(store.ownerNotes ?? '')
    setWorkingHoursStart(store.workingHoursStart ?? '')
    setWorkingHoursEnd(store.workingHoursEnd ?? '')
    setPostPurchaseFollowUpEnabled(store.postPurchaseFollowUpEnabled)
    setAbandonedCartReminderEnabled(store.abandonedCartReminderEnabled)
    setPersuasionTechniquesEnabled(store.persuasionTechniquesEnabled)
    setVoiceRepliesEnabled(store.voiceRepliesEnabled)
    setRequiresShipping(store.requiresShipping)
    if (store.goldWageType) setGoldWageType(store.goldWageType)
    setGoldWageValue(store.goldWageValue != null ? String(store.goldWageValue) : '')
    setGoldProfitPercent(store.goldProfitPercent != null ? String(store.goldProfitPercent) : '')
    setGoldVatPercent(String(store.goldVatPercent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id])

  function save() {
    update.mutate(
      {
        category: category.trim() || undefined,
        shippingInfo: shippingInfo.trim() || undefined,
        returnPolicy: returnPolicy.trim() || undefined,
        brandIntro: brandIntro.trim() || undefined,
        ownerNotes: ownerNotes.trim() || undefined,
        workingHoursStart: workingHoursStart || undefined,
        workingHoursEnd: workingHoursEnd || undefined,
        postPurchaseFollowUpEnabled,
        abandonedCartReminderEnabled,
        persuasionTechniquesEnabled,
        voiceRepliesEnabled,
        requiresShipping,
        goldWageType: showGoldPricingSection ? goldWageType : undefined,
        goldWageValue: showGoldPricingSection && goldWageValue ? Number(goldWageValue) : undefined,
        goldProfitPercent: showGoldPricingSection && goldProfitPercent ? Number(goldProfitPercent) : undefined,
        goldVatPercent: showGoldPricingSection && goldVatPercent ? Number(goldVatPercent) : undefined,
        source: aiTouched ? 'AI_ENRICHMENT' : undefined,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setAiTouched(false)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  function reanalyzeNotes() {
    reanalyze.mutate(
      { entityType: 'STORE', rawText: undefined },
      { onSuccess: setNotesResult },
    )
  }

  return (
    <div className="px-5 py-6">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.storeSettings.title}</h1>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20"
        >
          ✨ {fa.seller.panel.guidePrompt.button}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.storeSettings.subtitle}</p>

      {store && <StoreLogoUpload store={store} />}

      {notesResult && (
        <NotesSuggestionsPanel
          storeId={storeId}
          result={notesResult}
          onApplyBrandIntro={text => {
            setBrandIntro(text)
            setAiTouched(true)
          }}
          onApplyShippingInfo={text => {
            setShippingInfo(text)
            setAiTouched(true)
          }}
          onApplyReturnPolicy={text => {
            setReturnPolicy(text)
            setAiTouched(true)
          }}
          onApplyCategory={c => {
            setCategory(c)
            setAiTouched(true)
          }}
        />
      )}

      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.categoryLabel}
        </label>
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder={fa.seller.panel.storeSettings.categoryPlaceholder}
          className="w-full rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
      </div>

      <div className="mb-6">
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.storeSettings.requiresShippingLabel}
            checked={requiresShipping}
            onChange={setRequiresShipping}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">
          {fa.seller.panel.storeSettings.requiresShippingHint}
        </p>
      </div>

      {showGoldPricingSection && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-300">{fa.seller.panel.storeSettings.goldPricingTitle}</p>
          <p className="mb-3 text-[11px] text-slate-500">{fa.seller.panel.storeSettings.goldPricingHint}</p>

          <label className="mb-1.5 block text-xs font-semibold text-slate-300 light:text-slate-700">
            {fa.seller.panel.storeSettings.goldWageTypeLabel}
          </label>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setGoldWageType('PERCENT')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${goldWageType === 'PERCENT' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypePercent}
            </button>
            <button
              type="button"
              onClick={() => setGoldWageType('FIXED_PER_GRAM')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${goldWageType === 'FIXED_PER_GRAM' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypeFixedPerGram}
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <Input
              label={
                goldWageType === 'PERCENT'
                  ? fa.seller.panel.storeSettings.goldWageValuePercentLabel
                  : fa.seller.panel.storeSettings.goldWageValueFixedLabel
              }
              value={goldWageValue}
              onChange={e => setGoldWageValue(e.target.value.replace(/[^\d.]/g, ''))}
              dir="ltr"
              inputMode="decimal"
              className="text-center"
            />
            <Input
              label={fa.seller.panel.storeSettings.goldProfitPercentLabel}
              value={goldProfitPercent}
              onChange={e => setGoldProfitPercent(e.target.value.replace(/[^\d.]/g, ''))}
              dir="ltr"
              inputMode="decimal"
              className="text-center"
            />
          </div>
          <Input
            label={fa.seller.panel.storeSettings.goldVatPercentLabel}
            value={goldVatPercent}
            onChange={e => setGoldVatPercent(e.target.value.replace(/[^\d.]/g, ''))}
            dir="ltr"
            inputMode="decimal"
            className="w-1/2 text-center"
          />
        </div>
      )}

      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.shippingInfoLabel}
        </label>
        <textarea
          value={shippingInfo}
          onChange={e => setShippingInfo(e.target.value)}
          placeholder={fa.seller.panel.storeSettings.shippingInfoPlaceholder}
          rows={2}
          className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.returnPolicyLabel}
        </label>
        <textarea
          value={returnPolicy}
          onChange={e => setReturnPolicy(e.target.value)}
          placeholder={fa.seller.panel.storeSettings.returnPolicyPlaceholder}
          rows={2}
          className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.brandIntroLabel}
        </label>
        <textarea
          value={brandIntro}
          onChange={e => setBrandIntro(e.target.value)}
          placeholder={fa.seller.panel.storeSettings.brandIntroPlaceholder}
          rows={2}
          className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.guidePrompt.ownerNotesLabel}</label>
          <button
            type="button"
            onClick={reanalyzeNotes}
            disabled={!ownerNotes.trim() || reanalyze.isPending}
            className="shrink-0 text-xs font-bold text-emerald-400 light:text-emerald-700 hover:underline disabled:opacity-40"
          >
            {reanalyze.isPending ? fa.seller.panel.guidePrompt.reanalyzing : fa.seller.panel.guidePrompt.reanalyze}
          </button>
        </div>
        <textarea
          value={ownerNotes}
          onChange={e => setOwnerNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
        <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.guidePrompt.ownerNotesHint}</p>
        {reanalyze.isError && <p className="mt-1 text-xs text-red-400">{fa.seller.panel.guidePrompt.analyzeError}</p>}
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.storeSettings.workingHoursLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={fa.seller.panel.storeSettings.workingHoursStartLabel}
            type="time"
            value={workingHoursStart}
            onChange={e => setWorkingHoursStart(e.target.value)}
            dir="ltr"
          />
          <Input
            label={fa.seller.panel.storeSettings.workingHoursEndLabel}
            type="time"
            value={workingHoursEnd}
            onChange={e => setWorkingHoursEnd(e.target.value)}
            dir="ltr"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.storeSettings.workingHoursHint}</p>
      </div>

      <div className="mb-6">
        <p className="mb-0.5 text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.storeSettings.autoMessagesLabel}</p>
        <p className="mb-1 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.storeSettings.autoMessagesHint}</p>
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.storeSettings.postPurchaseFollowUpLabel}
            checked={postPurchaseFollowUpEnabled}
            onChange={setPostPurchaseFollowUpEnabled}
          />
          <ToggleRow
            label={fa.seller.panel.storeSettings.abandonedCartReminderLabel}
            checked={abandonedCartReminderEnabled}
            onChange={setAbandonedCartReminderEnabled}
          />
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-0.5 text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.persuasionLabel}
        </p>
        <p className="mb-1 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.storeSettings.persuasionHint}</p>
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.storeSettings.persuasionToggleLabel}
            checked={persuasionTechniquesEnabled}
            onChange={setPersuasionTechniquesEnabled}
          />
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-0.5 text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.storeSettings.voiceLabel}
        </p>
        <p className="mb-1 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.storeSettings.voiceHint}</p>
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.storeSettings.voiceToggleLabel}
            checked={voiceRepliesEnabled}
            onChange={setVoiceRepliesEnabled}
          />
        </div>
      </div>

      {update.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.storeSettings.saveError}</p>}

      <button
        onClick={save}
        disabled={update.isPending}
        className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {saved ? fa.seller.panel.storeSettings.saved : fa.seller.panel.storeSettings.save}
      </button>

      <GuideAssistantModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        context="store-setup"
        storeId={storeId}
        category={store?.category}
        businessType={store?.businessType}
        storeName={store?.name}
        onResult={result => {
          setOwnerNotes(result.ownerNotes)
          setNotesResult(result)
        }}
      />
    </div>
  )
}
