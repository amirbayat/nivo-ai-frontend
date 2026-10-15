import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { toEnglishDigits } from '@/lib/digits'
import { ORDER_CARRIERS } from '@/lib/orderCarriers'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useShipOrder } from '@/queries/seller.queries'
import { useToastStore } from '@/store/toast.store'

// docs/PRD-seller-panel-simplification.md §4.11.7 — «ارسال شد» با انتخاب شرکت حمل (چیپ) و کد رهگیری
// اختیاری؛ برای «امروز» و جزئیات سفارش مشترک است. بدون undo (خریدار اعلان می‌گیرد).
export function ShipOrderSheet({ orderId, storeId, open, onClose, onDone }: { orderId: string; storeId: string; open: boolean; onClose: () => void; onDone?: () => void }) {
  const ship = useShipOrder(storeId)
  const addToast = useToastStore(s => s.addToast)
  const [carrier, setCarrier] = useState<string>(ORDER_CARRIERS[0])
  const [tracking, setTracking] = useState('')

  function submit() {
    ship.mutate(
      { orderId, carrier, trackingCode: tracking.trim() || undefined },
      {
        onSuccess: () => {
          addToast(fa.seller.v2.today.shippedToast)
          onClose()
          onDone?.()
        },
      },
    )
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={fa.seller.panel.orders.ship}
      footer={
        <button type="button" onClick={submit} disabled={ship.isPending} className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-40">
          {fa.seller.panel.orders.shipConfirm}
        </button>
      }
    >
      <p className="mb-2 text-xs text-slate-400">{fa.seller.panel.orders.carrierLabel}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER_CARRIERS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCarrier(c)}
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-sm',
              carrier === c ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700' : 'border-slate-700 text-slate-300 light:border-slate-300 light:text-slate-600',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="mb-1 block text-xs text-slate-400">{fa.seller.panel.orders.trackingLabel}</label>
      <input
        type="text"
        dir="ltr"
        value={tracking}
        onChange={e => setTracking(toEnglishDigits(e.target.value).slice(0, 64))}
        style={{ fontSize: 16, minHeight: 44 }}
        className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 text-slate-200 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
      />
      {ship.isError && <p className="mt-2 text-xs text-red-400">{extractErrorMessage(ship.error, fa.common.error)}</p>}
    </BottomSheet>
  )
}
