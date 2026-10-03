import { useState } from 'react'
import { fa } from '@/locales/fa'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { FirstVisitTooltip } from '@/components/seller/FirstVisitTooltip'
import { useApproveOrder, useOrders, useRejectOrder } from '@/queries/seller.queries'
import type { SellerOrder, SellerOrderStatus } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

const FILTERS: { value: SellerOrderStatus | undefined; label: string }[] = [
  { value: undefined, label: fa.seller.panel.orders.filterAll },
  { value: 'RECEIPT_SUBMITTED', label: fa.seller.panel.orders.filterPending },
  { value: 'APPROVED', label: fa.seller.panel.orders.filterApproved },
  { value: 'REJECTED', label: fa.seller.panel.orders.filterRejected },
]

function OrderDetailSheet({ order, storeId, onClose }: { order: SellerOrder; storeId: string; onClose: () => void }) {
  const [showReceipt, setShowReceipt] = useState(false)
  const approve = useApproveOrder(storeId)
  const reject = useRejectOrder(storeId)
  const canDecide = order.status === 'RECEIPT_SUBMITTED'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.orderStatusLabels[order.status]}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">{fa.seller.panel.orders.close}</button>
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          {order.items.map(i => (
            <div key={i.productId} className="flex items-center justify-between text-sm text-slate-300 light:text-slate-700">
              <span>{i.name} × {i.qty}</span>
              <span>{(i.unitPrice * i.qty).toLocaleString('fa-IR')} {fa.common.toman}</span>
            </div>
          ))}
        </div>
        <div className="mb-5 flex items-center justify-between border-t border-slate-700/60 light:border-slate-200 pt-3 text-base font-bold text-slate-100 light:text-slate-900">
          <span>{fa.seller.panel.orders.total}</span>
          <span>{order.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}</span>
        </div>

        {order.receiptImageKey ? (
          <button
            onClick={() => setShowReceipt(true)}
            className="mb-4 w-full rounded-xl border border-slate-600/60 light:border-slate-300 py-3 text-sm font-semibold text-slate-200 light:text-slate-800 hover:border-slate-500 light:hover:border-slate-400"
          >
            {fa.seller.panel.orders.viewReceipt}
          </button>
        ) : (
          <p className="mb-4 text-center text-xs text-slate-500">{fa.seller.panel.orders.noReceipt}</p>
        )}

        {canDecide && (
          <div className="flex gap-3">
            <button
              onClick={() => reject.mutate({ orderId: order.id }, { onSuccess: onClose })}
              disabled={approve.isPending || reject.isPending}
              className="flex-1 rounded-2xl bg-red-500/15 py-3.5 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40"
            >
              {fa.seller.panel.orders.reject}
            </button>
            <button
              onClick={() => approve.mutate(order.id, { onSuccess: onClose })}
              disabled={approve.isPending || reject.isPending}
              className="flex-1 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {fa.seller.panel.orders.approve}
            </button>
          </div>
        )}
      </div>

      {showReceipt && order.receiptImageKey && (
        <ImageLightbox
          src={`/v2/stores/${storeId}/orders/${order.id}/receipt-image`}
          onClose={() => setShowReceipt(false)}
          analyticsSource="seller-order-receipt"
        />
      )}
    </div>
  )
}

export function SellerOrdersPage() {
  const { storeId } = useSellerStore()
  const [filter, setFilter] = useState<SellerOrderStatus | undefined>(undefined)
  const [openOrder, setOpenOrder] = useState<SellerOrder | null>(null)
  const orders = useOrders(storeId, filter)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.nav.orders}</h1>

      <FirstVisitTooltip id="orders" text={fa.seller.panel.helpCenter.tooltips.orders} />

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f.value
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600 hover:border-slate-600 light:hover:border-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.orders.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {orders.data?.map(order => (
          <button
            key={order.id}
            onClick={() => setOpenOrder(order)}
            className="flex items-center justify-between rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5 text-start hover:border-slate-600 light:hover:border-slate-300"
          >
            <div>
              <p className="text-sm font-semibold text-slate-200 light:text-slate-900">{order.items.length.toLocaleString('fa-IR')} قلم</p>
              <p className="mt-0.5 text-xs text-slate-500">{fa.shop.orderStatusLabels[order.status]}</p>
            </div>
            <span className="text-sm font-bold text-emerald-300 light:text-emerald-700">{order.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}</span>
          </button>
        ))}
      </div>

      {openOrder && <OrderDetailSheet order={openOrder} storeId={storeId} onClose={() => setOpenOrder(null)} />}
    </div>
  )
}
