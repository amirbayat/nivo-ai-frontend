import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { FirstVisitTooltip } from '@/components/seller/FirstVisitTooltip'
import { useApproveOrder, useOrders, useRejectOrder, useShipOrder } from '@/queries/seller.queries'
import { productImageUrl } from '@/lib/sellerProduct'
import type { SellerOrder, SellerOrderStatus } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

const FILTERS: { value: SellerOrderStatus | undefined; label: string }[] = [
  { value: undefined, label: fa.seller.panel.orders.filterAll },
  { value: 'RECEIPT_SUBMITTED', label: fa.seller.panel.orders.filterPending },
  { value: 'APPROVED', label: fa.seller.panel.orders.filterApproved },
  { value: 'SHIPPED', label: fa.seller.panel.orders.filterShipped },
  { value: 'REJECTED', label: fa.seller.panel.orders.filterRejected },
]

function OrderDetailSheet({ order, storeId, onClose }: { order: SellerOrder; storeId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [showReceipt, setShowReceipt] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const approve = useApproveOrder(storeId)
  const reject = useRejectOrder(storeId)
  const ship = useShipOrder(storeId)
  const canDecide = order.status === 'RECEIPT_SUBMITTED'
  // فیدبک کاربر — بعد از رد اشتباهی، فروشنده راهی برای تایید دوباره‌ی سفارش نداشت
  const canReapprove = order.status === 'REJECTED'
  // docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۳.۲ — بعد از تایید، سفارش
  // «آماده‌ی ارسال»ه تا فروشنده دکمه‌ی «ارسال شد» را بزند
  const canShip = order.status === 'APPROVED'
  const recipientAddress = [order.shippingProvince, order.shippingAddress, order.postalCode]
    .filter(Boolean)
    .join('، ')

  const submitReject = () => {
    reject.mutate({ orderId: order.id, reason: rejectReason.trim() || undefined }, { onSuccess: onClose })
  }

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

        <button
          onClick={() => navigate(`/seller/panel/attention?conversationId=${order.conversationId}`)}
          className="mb-4 text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
        >
          {fa.seller.panel.orders.viewConversation}
        </button>

        <div className="mb-4 flex flex-col gap-2">
          {order.items.map(i => (
            <div key={i.productId} className="flex items-center gap-2.5 text-sm text-slate-300 light:text-slate-700">
              {i.imageKey ? (
                <img src={productImageUrl(i.productId, i.imageKey)} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="size-10 shrink-0 rounded-lg bg-slate-800 light:bg-slate-100" />
              )}
              <span className="flex-1">{i.name} × {i.qty}</span>
              <span>{(i.unitPrice * i.qty).toLocaleString('fa-IR')} {fa.common.toman}</span>
            </div>
          ))}
        </div>
        {order.shippingCostToman != null && (
          <div className="mb-2 flex items-center justify-between text-sm text-slate-400 light:text-slate-600">
            <span>{fa.seller.panel.orders.shippingCostLabel}</span>
            <span>{order.shippingCostToman.toLocaleString('fa-IR')} {fa.common.toman}</span>
          </div>
        )}
        <div className="mb-5 flex items-center justify-between border-t border-slate-700/60 light:border-slate-200 pt-3 text-base font-bold text-slate-100 light:text-slate-900">
          <span>{fa.seller.panel.orders.total}</span>
          <span>{order.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}</span>
        </div>

        {order.recipientName && (
          <div className="mb-4 rounded-xl border border-slate-700/60 light:border-slate-200 p-3 text-sm text-slate-300 light:text-slate-700">
            <p className="mb-1 font-semibold text-slate-200 light:text-slate-900">{fa.seller.panel.orders.recipientTitle}</p>
            <p>{order.recipientName} · {order.recipientPhone}</p>
            {recipientAddress && <p className="mt-1 text-xs text-slate-400 light:text-slate-600">{recipientAddress}</p>}
          </div>
        )}

        {order.status === 'REJECTED' && order.rejectReason && (
          <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
            {fa.seller.panel.orders.rejectReasonLabel}: {order.rejectReason}
          </p>
        )}

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

        {canDecide && !showRejectReason && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowRejectReason(true)}
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

        {canDecide && showRejectReason && (
          <div className="flex flex-col gap-2">
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={fa.seller.panel.orders.rejectReasonPlaceholder}
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white p-3 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectReason(false)}
                disabled={reject.isPending}
                className="flex-1 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-sm font-bold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
              >
                {fa.seller.panel.orders.cancel}
              </button>
              <button
                onClick={submitReject}
                disabled={reject.isPending}
                className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {fa.seller.panel.orders.confirmReject}
              </button>
            </div>
          </div>
        )}

        {canReapprove && (
          <button
            onClick={() => approve.mutate(order.id, { onSuccess: onClose })}
            disabled={approve.isPending}
            className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {fa.seller.panel.orders.reapprove}
          </button>
        )}

        {canShip && (
          <button
            onClick={() => ship.mutate(order.id, { onSuccess: onClose })}
            disabled={ship.isPending}
            className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {fa.seller.panel.orders.ship}
          </button>
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
  const [searchParams, setSearchParams] = useSearchParams()

  // docs/PRD-seller-panel-order-chat-linking.md بخش ۲.۱ — لینک از تب «نیاز به توجه»؛ فیلتر فعلی
  // ممکن است این سفارش را پنهان کند (مثلاً فیلتر «تاییدشده» روی یک سفارش «در انتظار»)، پس همان
  // لحظه فیلتر را هم «همه» می‌کنیم تا سفارش واقعاً پیدا شود
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId || !orders.data) return
    const match = orders.data.find(o => o.id === orderId)
    if (match) {
      setOpenOrder(match)
      setSearchParams({}, { replace: true })
    } else if (filter !== undefined) {
      setFilter(undefined)
    }
  }, [searchParams, setSearchParams, orders.data, filter])

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
