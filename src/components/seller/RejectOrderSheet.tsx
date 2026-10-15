import { useState } from 'react'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { PriceInput } from '@/components/ui/PriceInput'
import { useRejectOrder } from '@/queries/seller.queries'
import { extractErrorMessage } from '@/lib/sellerProduct'
import type { SellerOrder } from '@/types/api'

interface Props {
  order: Pick<SellerOrder, 'id' | 'status' | 'totalAmount' | 'receiptImageKey'>
  storeId: string
  open: boolean
  onClose: () => void
  onDone?: () => void
}

// docs/PRD-seller-panel-simplification.md §4.9 — دو مرحله‌ی «رد رسید» (پول رسیده؟ + دلیل) که قبلاً
// داخل OrderDetailSheet بود؛ برای «امروز» و جزئیات سفارش مشترک است. منطق دقیقاً همان قبلی [R0.12].
export function RejectOrderSheet({ order, storeId, open, onClose, onDone }: Props) {
  const reject = useRejectOrder(storeId)
  const [reason, setReason] = useState('')
  const [moneyChoice, setMoneyChoice] = useState<'yes' | 'no' | null>(null)
  const [refundAmount, setRefundAmount] = useState(String(order.totalAmount))
  const needsMoneyAnswer = order.status === 'RECEIPT_SUBMITTED' || order.status === 'APPROVED' || !!order.receiptImageKey
  const amount = Number(refundAmount)
  const amountValid = Number.isInteger(amount) && amount >= 1 && amount <= order.totalAmount
  const blocked = needsMoneyAnswer && (moneyChoice == null || (moneyChoice === 'yes' && !amountValid))

  function submit() {
    reject.mutate(
      {
        orderId: order.id,
        reason: reason.trim() || undefined,
        ...(needsMoneyAnswer ? { moneyReceived: moneyChoice === 'yes' } : {}),
        ...(needsMoneyAnswer && moneyChoice === 'yes' && amountValid ? { refundAmountToman: amount } : {}),
      },
      {
        onSuccess: () => {
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
      title={fa.seller.panel.orders.reject}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={reject.isPending} className="h-12 flex-1 rounded-2xl border border-slate-700 text-sm font-bold text-slate-300 disabled:opacity-40 light:border-slate-300 light:text-slate-700">
            {fa.seller.panel.orders.cancel}
          </button>
          <button type="button" onClick={submit} disabled={reject.isPending || blocked} className="h-12 flex-1 rounded-2xl bg-red-500 text-sm font-bold text-white disabled:opacity-40">
            {fa.seller.panel.orders.confirmReject}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {needsMoneyAnswer && (
          <>
            <button
              type="button"
              onClick={() => setMoneyChoice('yes')}
              className={`rounded-xl border px-3 py-2.5 text-start text-xs ${moneyChoice === 'yes' ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300 light:border-slate-300 light:text-slate-700'}`}
            >
              {fa.seller.panel.orders.moneyArrived(amountValid ? amount : null)}
            </button>
            {moneyChoice === 'yes' && <PriceInput value={refundAmount} onChange={setRefundAmount} aria-label={fa.seller.panel.orders.refundAmountLabel} />}
            <button
              type="button"
              onClick={() => setMoneyChoice('no')}
              className={`rounded-xl border px-3 py-2.5 text-start text-xs ${moneyChoice === 'no' ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300 light:border-slate-300 light:text-slate-700'}`}
            >
              {fa.seller.panel.orders.moneyMissing}
            </button>
          </>
        )}
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={fa.seller.panel.orders.rejectReasonPlaceholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
        />
        {reject.isError && <p className="text-xs text-red-400">{extractErrorMessage(reject.error, fa.common.error)}</p>}
      </div>
    </BottomSheet>
  )
}
