import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logDemoPanelEvent, useConvertDemoStoreToReal } from '@/queries/demo.queries'
import { fa } from '@/locales/fa'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { RejectOrderSheet } from '@/components/seller/RejectOrderSheet'
import { ShipOrderSheet } from '@/components/seller/ShipOrderSheet'
import { RefundsPanel, useRefundsOpenCount } from './SellerRefundsPage'
import { useApproveOrder, useDeliverOrder, useOrders, useOverpayRefund } from '@/queries/seller.queries'
import { productImageUrl } from '@/lib/sellerProduct'
import { copyText } from '@/lib/clipboard'
import { toEnglishDigits } from '@/lib/digits'
import type { SellerOrder, SellerOrderStatus } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// SP-6 — فیلترها به زبان فروشنده: «ارسال شده» = SHIPPED+DELIVERED، «لغو/رد» = REJECTED+CANCELLED
const FILTERS: { key: string; value: SellerOrderStatus | SellerOrderStatus[] | undefined; label: string }[] = [
  { key: 'all', value: undefined, label: fa.seller.v2.orders.filterAll },
  { key: 'pending', value: 'RECEIPT_SUBMITTED', label: fa.seller.v2.orders.filterWaitingApproval },
  { key: 'awaitingPayment', value: 'PENDING_PAYMENT', label: fa.seller.v2.orders.filterWaitingPayment },
  { key: 'toShip', value: 'APPROVED', label: fa.seller.v2.orders.filterToShip },
  { key: 'shipped', value: ['SHIPPED', 'DELIVERED'], label: fa.seller.v2.orders.filterShipped },
  { key: 'closed', value: ['REJECTED', 'CANCELLED'], label: fa.seller.v2.orders.filterClosed },
]

// 3.4 — کد سفارش نمایشی؛ سفارش قدیمیِ backfill‌نشده: ۸ نویسه‌ی اول id
function orderCodeOf(order: Pick<SellerOrder, 'id' | 'orderCode'>): string {
  const code = order.orderCode
  if (!code) return order.id.slice(0, 8)
  return code.startsWith('NV') ? `NV-${code.slice(2)}` : code
}

function OrderCode({ order }: { order: Pick<SellerOrder, 'id' | 'orderCode'> }) {
  const [copied, setCopied] = useState(false)
  const code = orderCodeOf(order)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span dir="ltr" className="font-mono text-sm font-bold text-slate-100 light:text-slate-900">{code}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={fa.seller.panel.orders.copyCode}
        onClick={e => {
          e.stopPropagation()
          void copyText(code).then(r => {
            if (r === 'ok') {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }
          })
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.click()
        }}
        className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-emerald-400 light:text-emerald-700 hover:bg-emerald-500/10"
      >
        {copied ? fa.seller.panel.orders.codeCopied : fa.seller.panel.orders.copyCode}
      </span>
    </span>
  )
}

function OrderDetailSheet({ order, storeId, onClose, onApproved }: { order: SellerOrder; storeId: string; onClose: () => void; onApproved?: () => void }) {
  const navigate = useNavigate()
  const [showReceipt, setShowReceipt] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showShip, setShowShip] = useState(false)
  const approve = useApproveOrder(storeId)
  const deliver = useDeliverOrder(storeId)
  const overpay = useOverpayRefund(storeId)
  const canDecide = order.status === 'RECEIPT_SUBMITTED'
  // فیدبک کاربر — بعد از رد اشتباهی، فروشنده راهی برای تایید دوباره‌ی سفارش نداشت
  const canReapprove = order.status === 'REJECTED'
  // docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۳.۲ — بعد از تایید، سفارش
  // «آماده‌ی ارسال»ه تا فروشنده دکمه‌ی «ارسال شد» را بزند
  const canShip = order.status === 'APPROVED'
  const canDeliver = order.status === 'SHIPPED'
  const overpaid = order.receiptCheck?.overpaidToman ?? 0
  const recipientAddress = [order.shippingProvince, order.shippingAddress, order.postalCode]
    .filter(Boolean)
    .join('، ')

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.orderStatusLabels[order.status]}</span>
              <span className="rounded-full bg-slate-700/60 light:bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-300 light:text-slate-700">
                {fa.shop.paymentMethodLabels[order.paymentMethod]}
              </span>
            </div>
            <div className="mt-1"><OrderCode order={order} /></div>
            <p className="mt-0.5 text-xs text-slate-500">{fa.seller.panel.orders.registeredAt(new Date(order.createdAt).toLocaleDateString('fa-IR'))}</p>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">{fa.seller.panel.orders.close}</button>
        </div>

        <button
          onClick={() => navigate(`/seller/panel/chats/${order.conversationId}`)}
          className="mb-4 text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
        >
          {fa.seller.panel.orders.viewConversation}
        </button>

        <div className="mb-4 flex flex-col gap-2">
          {order.items.map(i => (
            <div key={`${i.productId}:${i.variantId ?? ''}`} className="flex items-center gap-2.5 text-sm text-slate-300 light:text-slate-700">
              {i.imageKey ? (
                <img src={productImageUrl(i.productId, i.imageKey)} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="size-10 shrink-0 rounded-lg bg-slate-800 light:bg-slate-100" />
              )}
              <span className="flex-1">{i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''} × {i.qty}</span>
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

        {order.paymentMethod === 'SNAPPPAY' && order.snapppayTrackingCode && (
          <p className="mb-4 rounded-xl border border-slate-700/60 light:border-slate-200 p-3 text-xs text-slate-300 light:text-slate-700">
            {fa.shop.snapppayTrackingCodeLabel}: <span dir="ltr">{order.snapppayTrackingCode}</span>
          </p>
        )}

        {order.carrier && (
          <p className="mb-4 rounded-xl border border-slate-700/60 light:border-slate-200 p-3 text-xs text-slate-300 light:text-slate-700">
            {fa.seller.panel.orders.shippedVia(order.carrier)}
            {order.trackingCode && (
              <>
                {' · '}{fa.seller.panel.orders.trackingValue}: <span dir="ltr">{order.trackingCode}</span>
              </>
            )}
          </p>
        )}

        {order.receiptType === 'MANUAL_INFO' && order.receiptManualInfo && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 light:text-amber-800">
            <p className="mb-1 font-semibold">{fa.seller.panel.orders.manualReceiptBadge}</p>
            <p>{fa.seller.panel.orders.manualReceiptCard}: <span dir="ltr">{order.receiptManualInfo.cardLast4}</span></p>
            <p>{fa.seller.panel.orders.manualReceiptTime}: {order.receiptManualInfo.approxTime}</p>
            {order.receiptManualInfo.trackingCode && (
              <p>{fa.seller.panel.orders.manualReceiptTracking}: <span dir="ltr">{order.receiptManualInfo.trackingCode}</span></p>
            )}
          </div>
        )}

        {order.status === 'REJECTED' && order.rejectReason && (
          <p className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
            {fa.seller.panel.orders.rejectReasonLabel}: {order.rejectReason}
          </p>
        )}

        {order.status === 'PENDING_PAYMENT' && order.paymentDueAt && (
          <p className="mb-4 text-center text-xs text-slate-500">
            {fa.seller.panel.orders.paymentDueLabel}: {new Date(order.paymentDueAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' })}
          </p>
        )}

        {order.receiptCheck && (
          <p className="mb-4 rounded-xl border border-slate-700/60 light:border-slate-200 p-3 text-xs text-slate-300 light:text-slate-700">
            {order.receiptCheck.match === 'OK' && fa.seller.panel.orders.receiptOk}
            {order.receiptCheck.match === 'MISMATCH' &&
              (overpaid
                ? fa.seller.panel.orders.receiptOverpaid(overpaid)
                : fa.seller.panel.orders.receiptMismatch)}
            {order.receiptCheck.match === 'DUPLICATE' && fa.seller.panel.orders.receiptDuplicate}
            {order.receiptCheck.match === 'UNREADABLE' && fa.seller.panel.orders.receiptUnreadable}
          </p>
        )}

        {order.receiptImageKey ? (
          <button
            onClick={() => setShowReceipt(true)}
            className="mb-4 w-full rounded-xl border border-slate-600/60 light:border-slate-300 py-3 text-sm font-semibold text-slate-200 light:text-slate-800 hover:border-slate-500 light:hover:border-slate-400"
          >
            {fa.seller.panel.orders.viewReceipt}
          </button>
        ) : order.receiptType === 'MANUAL_INFO' ? null : (
          <p className="mb-4 text-center text-xs text-slate-500">{fa.seller.panel.orders.noReceipt}</p>
        )}

        {canDecide && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowReject(true)}
              disabled={approve.isPending}
              className="flex-1 rounded-2xl bg-red-500/15 py-3.5 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40"
            >
              {fa.seller.panel.orders.reject}
            </button>
            <button
              onClick={() => approve.mutate(order.id, { onSuccess: () => { onApproved?.(); onClose() } })}
              disabled={approve.isPending}
              className="flex-1 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {fa.seller.panel.orders.approve}
            </button>
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

        {overpaid > 0 && (
          <button
            onClick={() => overpay.mutate(order.id)}
            disabled={overpay.isPending}
            className="mb-3 w-full rounded-2xl border border-amber-500/50 py-3.5 text-sm font-bold text-amber-300 light:text-amber-800 disabled:opacity-40"
          >
            {fa.seller.panel.orders.overpayRefund}
          </button>
        )}

        {canDeliver && (
          <button
            onClick={() => deliver.mutate(order.id, { onSuccess: onClose })}
            disabled={deliver.isPending}
            className="mb-3 w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {fa.seller.panel.orders.deliver}
          </button>
        )}

        {canShip && (
          <button
            onClick={() => setShowShip(true)}
            className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
          >
            {fa.seller.panel.orders.ship}
          </button>
        )}
      </div>

      <RejectOrderSheet order={order} storeId={storeId} open={showReject} onClose={() => setShowReject(false)} onDone={onClose} />
      <ShipOrderSheet orderId={order.id} storeId={storeId} open={showShip} onClose={() => setShowShip(false)} onDone={onClose} />

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
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'orders' | 'refunds' = searchParams.get('view') === 'refunds' ? 'refunds' : 'orders'
  const [filterKey, setFilterKey] = useState('all')
  const filter = FILTERS.find(f => f.key === filterKey)?.value
  const [openOrder, setOpenOrder] = useState<SellerOrder | null>(null)
  // 3.5 — جست‌وجو با debounce ۳۰۰ms (کد سفارش، شماره، نام)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])
  const orders = useOrders(storeId, filter, search)
  // DEMO-5 — تور دمو قدم ②: سفارش خودِ کاربر هایلایت می‌شود، تایید که شد کارت پایانی ③
  const navigate = useNavigate()
  const demoTour = searchParams.get('demoTour') === '2'
  const highlightId = demoTour ? searchParams.get('highlight') : null
  const [tourApproved, setTourApproved] = useState(false)
  const convertDemo = useConvertDemoStoreToReal(storeId)
  useEffect(() => {
    if (demoTour) logDemoPanelEvent(storeId, 'demo_panel_opened_from_order')
  }, [demoTour, storeId])
  const refundsCount = useRefundsOpenCount(storeId)
  const t = fa.seller.v2.orders

  // docs/PRD-seller-panel-order-chat-linking.md بخش ۲.۱ — لینک از «امروز»/چت؛ فیلتر فعلی ممکن
  // است این سفارش را پنهان کند، پس فیلتر «همه» می‌شود تا سفارش واقعاً پیدا شود
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId || !orders.data) return
    const match = orders.data.find(o => o.id === orderId)
    if (match) {
      setOpenOrder(match)
      const next = new URLSearchParams(searchParams)
      next.delete('orderId')
      setSearchParams(next, { replace: true })
    } else if (orders.hasNextPage) {
      // R3.2 — سفارش قدیمی‌تر از صفحه‌ی اول است؛ صفحه‌ی بعد را می‌آوریم تا پیدا شود
      if (!orders.isFetchingNextPage) void orders.fetchNextPage()
    } else if (filterKey !== 'all') {
      setFilterKey('all')
    }
  }, [searchParams, setSearchParams, orders, filterKey])

  function setView(next: 'orders' | 'refunds') {
    const params = new URLSearchParams(searchParams)
    if (next === 'refunds') params.set('view', 'refunds')
    else params.delete('view')
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-5">
      <h1 className="mb-3 text-xl font-extrabold text-slate-100 light:text-slate-900">{fa.seller.panel.nav.orders}</h1>

      {demoTour && !tourApproved && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700">
          {fa.seller.panel.demoBanner.tourStep2}
        </div>
      )}
      {demoTour && tourApproved && (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-sm font-extrabold text-emerald-300 light:text-emerald-700">{fa.seller.panel.demoBanner.tourDoneTitle}</p>
          <button
            type="button"
            disabled={convertDemo.isPending}
            onClick={() => convertDemo.mutate(undefined, { onSuccess: () => navigate('/seller/panel/today?setup=1') })}
            className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {fa.seller.panel.demoBanner.tourConvert}
          </button>
        </div>
      )}

      <div className="mb-4 flex rounded-xl bg-slate-800/60 p-1 light:bg-slate-100">
        <button type="button" onClick={() => setView('orders')} className={`flex-1 rounded-lg py-2 text-[13px] ${view === 'orders' ? 'bg-slate-950 font-extrabold text-slate-100 light:bg-white light:text-slate-900' : 'text-slate-400'}`}>
          {t.segOrders}
        </button>
        <button type="button" onClick={() => setView('refunds')} className={`flex-1 rounded-lg py-2 text-[13px] ${view === 'refunds' ? 'bg-slate-950 font-extrabold text-slate-100 light:bg-white light:text-slate-900' : 'text-slate-400'}`}>
          {t.segRefunds}
          {refundsCount > 0 ? ` (${refundsCount.toLocaleString('fa-IR')})` : ''}
        </button>
      </div>

      {view === 'refunds' ? (
        <RefundsPanel embedded />
      ) : (
        <>
          <div className="relative mb-3">
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(toEnglishDigits(e.target.value).slice(0, 64))}
              placeholder={fa.seller.panel.orders.searchPlaceholder}
              aria-label={fa.seller.panel.orders.searchPlaceholder}
              style={{ fontSize: 16, minHeight: 44 }}
              className="w-full rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-4 text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  filterKey === f.key
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 light:text-emerald-700'
                    : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600 hover:border-slate-600 light:hover:border-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {orders.isError && (
            <div className="py-10 text-center">
              <p className="mb-3 text-sm text-red-400">{fa.seller.panel.orders.loadError}</p>
              <button onClick={() => void orders.refetch()} className="min-h-11 rounded-xl border border-slate-600 light:border-slate-300 px-4 text-sm font-semibold text-slate-200 light:text-slate-800">
                {fa.seller.panel.orders.retry}
              </button>
            </div>
          )}

          {!orders.isError && orders.data?.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500">{search ? fa.seller.panel.orders.searchNotFound : fa.seller.panel.orders.empty}</p>
              {search && (
                <button onClick={() => setSearchInput('')} className="mt-2 min-h-11 text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline">
                  {fa.seller.panel.orders.searchClear}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {orders.data?.map(order => (
              <button
                key={order.id}
                onClick={() => setOpenOrder(order)}
                className={`flex items-center justify-between rounded-2xl border bg-slate-800/40 light:bg-white px-4 py-3.5 text-start hover:border-slate-600 light:hover:border-slate-300 ${
                  highlightId === order.id ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-slate-700/60 light:border-slate-200'
                }`}
              >
                <div>
                  <OrderCode order={order} />
                  <p className="mt-0.5 text-xs text-slate-400 light:text-slate-600">
                    {order.items.length.toLocaleString('fa-IR')} قلم
                    {order.recipientName ? ` · ${order.recipientName}` : ''}
                    {order.receiptType === 'MANUAL_INFO' ? ` · ${fa.seller.panel.orders.manualReceiptBadge}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {fa.shop.orderStatusLabels[order.status]} · {fa.shop.paymentMethodLabels[order.paymentMethod]}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{fa.seller.panel.orders.registeredAt(new Date(order.createdAt).toLocaleDateString('fa-IR'))}</p>
                </div>
                <span className="text-sm font-bold text-emerald-300 light:text-emerald-700">{order.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}</span>
              </button>
            ))}
          </div>
          {orders.hasNextPage && (
            <button
              type="button"
              onClick={() => void orders.fetchNextPage()}
              disabled={orders.isFetchingNextPage}
              className="mt-3 min-h-11 w-full rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700 disabled:opacity-50"
            >
              {fa.common.loadMore}
            </button>
          )}
        </>
      )}

      {openOrder && (
        <OrderDetailSheet
          order={openOrder}
          storeId={storeId}
          onClose={() => setOpenOrder(null)}
          onApproved={demoTour ? () => { setTourApproved(true); logDemoPanelEvent(storeId, 'demo_order_confirmed') } : undefined}
        />
      )}
    </div>
  )
}
