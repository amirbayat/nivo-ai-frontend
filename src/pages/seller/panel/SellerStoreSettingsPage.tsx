import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { extractErrorMessage, storeLogoUrl } from '@/lib/sellerProduct'
import { useMyStores, useRemoveStoreLogo, useUpdateStore, useUploadStoreLogo } from '@/queries/seller.queries'
import type { SellerStore } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

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

  const [shippingInfo, setShippingInfo] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('')
  const [brandIntro, setBrandIntro] = useState('')
  const [workingHoursStart, setWorkingHoursStart] = useState('')
  const [workingHoursEnd, setWorkingHoursEnd] = useState('')
  const [postPurchaseFollowUpEnabled, setPostPurchaseFollowUpEnabled] = useState(true)
  const [abandonedCartReminderEnabled, setAbandonedCartReminderEnabled] = useState(true)
  const [persuasionTechniquesEnabled, setPersuasionTechniquesEnabled] = useState(true)
  const [saved, setSaved] = useState(false)

  // فقط یک‌بار بعد از رسیدن دیتا مقداردهی اولیه می‌شود — ویرایش‌های در حال تایپ کاربر با
  // رفرش/invalidate پس‌زمینه‌ای بعد از useUpdateStore بازنویسی نمی‌شوند
  useEffect(() => {
    if (!store) return
    setShippingInfo(store.shippingInfo ?? '')
    setReturnPolicy(store.returnPolicy ?? '')
    setBrandIntro(store.brandIntro ?? '')
    setWorkingHoursStart(store.workingHoursStart ?? '')
    setWorkingHoursEnd(store.workingHoursEnd ?? '')
    setPostPurchaseFollowUpEnabled(store.postPurchaseFollowUpEnabled)
    setAbandonedCartReminderEnabled(store.abandonedCartReminderEnabled)
    setPersuasionTechniquesEnabled(store.persuasionTechniquesEnabled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id])

  function save() {
    update.mutate(
      {
        shippingInfo: shippingInfo.trim() || undefined,
        returnPolicy: returnPolicy.trim() || undefined,
        brandIntro: brandIntro.trim() || undefined,
        workingHoursStart: workingHoursStart || undefined,
        workingHoursEnd: workingHoursEnd || undefined,
        postPurchaseFollowUpEnabled,
        abandonedCartReminderEnabled,
        persuasionTechniquesEnabled,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.storeSettings.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.storeSettings.subtitle}</p>

      {store && <StoreLogoUpload store={store} />}

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

      {update.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.storeSettings.saveError}</p>}

      <button
        onClick={save}
        disabled={update.isPending}
        className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {saved ? fa.seller.panel.storeSettings.saved : fa.seller.panel.storeSettings.save}
      </button>
    </div>
  )
}
