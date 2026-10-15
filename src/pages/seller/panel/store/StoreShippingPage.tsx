import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useMyStores, useUpdateStore } from '@/queries/seller.queries'
import { useSellerStore } from '../SellerPanelLayout'
import { SellerShippingPage } from '../SellerShippingPage'
import { SaveBar, StoreSubpage } from './StoreSubpage'

const t = fa.seller.v2.storeShipping

// docs/PRD-seller-panel-simplification.md §4.9 — «ارسال»: ارسال فیزیکی دارم؟ ← چند روز ← هزینه ← توضیح
export function StoreShippingPage() {
  const { storeId } = useSellerStore()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const update = useUpdateStore(storeId)
  const [on, setOn] = useState(true)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!store || loaded.current) return
    loaded.current = true
    setOn(store.requiresShipping)
    setMin(store.shippingDaysMin != null ? String(store.shippingDaysMin) : '')
    setMax(store.shippingDaysMax != null ? String(store.shippingDaysMax) : '')
    setInfo(store.shippingInfo ?? '')
  }, [store])

  if (!store) return <StoreSubpage title={t.title}>{null}</StoreSubpage>
  const dirty = on !== store.requiresShipping || min !== (store.shippingDaysMin != null ? String(store.shippingDaysMin) : '') || max !== (store.shippingDaysMax != null ? String(store.shippingDaysMax) : '') || info !== (store.shippingInfo ?? '')

  function save() {
    setError(null)
    const minN = min ? Number(min) : null
    const maxN = max ? Number(max) : null
    const ok = (minN === null && maxN === null) || (minN !== null && maxN !== null && minN >= 1 && maxN <= 60 && minN <= maxN)
    if (!ok) {
      setError(fa.seller.panel.storeSettings.shippingDaysInvalid)
      return
    }
    update.mutate(
      { requiresShipping: on, shippingDaysMin: minN, shippingDaysMax: maxN, shippingInfo: info.trim() || undefined },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
        onError: e => setError(extractErrorMessage(e, fa.seller.panel.storeSettings.saveError)),
      },
    )
  }

  return (
    <StoreSubpage title={t.title} footer={<SaveBar onSave={save} pending={update.isPending} dirty={dirty} saved={saved} error={error} />}>
      <ToggleRow label={t.requires} checked={on} onChange={setOn} />
      {on && (
        <>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-200 light:text-slate-800">{t.days}</p>
            <div className="flex items-center gap-2">
              <DigitsInput kind="int" label={fa.seller.panel.storeSettings.shippingDaysMinLabel} value={min} onChange={setMin} className="text-center" />
              <DigitsInput kind="int" label={fa.seller.panel.storeSettings.shippingDaysMaxLabel} value={max} onChange={setMax} className="text-center" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-200 light:text-slate-800">{t.cost}</p>
            <SellerShippingPage embedded />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-200 light:text-slate-800">{t.more}</label>
            <textarea value={info} onChange={e => setInfo(e.target.value)} rows={3} maxLength={1000} placeholder={fa.seller.panel.storeSettings.shippingInfoPlaceholder} className="w-full resize-none rounded-xl border border-slate-700 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900" />
          </div>
        </>
      )}
    </StoreSubpage>
  )
}
