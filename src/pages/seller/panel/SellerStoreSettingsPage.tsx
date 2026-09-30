import { useEffect, useState } from 'react'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { useMyStores, useUpdateStore } from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

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
