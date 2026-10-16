import { useState } from 'react'
import { fa } from '@/locales/fa'
import type { PinnedOrder } from '@/lib/orderPinned'

interface OrderPinnedCardProps {
  order: PinnedOrder
  highlight: boolean
  onContinue: () => void
  onTrack: () => void
  onScrollToRefund: () => void
}

const NEXT_LINE: Record<PinnedOrder['statusLabelKey'], string> = {
  awaitingPayment: fa.shop.v2.nextAwaitingPayment,
  awaitingApproval: fa.shop.v2.nextAwaitingApproval,
  approved: fa.shop.v2.nextApproved,
  shipped: fa.shop.v2.nextShipped,
  fillAddress: fa.shop.v2.nextFillAddress,
}

// docs/PRD-buyer-chat-redesign.md §6.9 — کارت فشرده زیر کنترل نما (فقط نمای گفتگو)؛ با یک لمس به یک خط جمع می‌شود
export function OrderPinnedCard({ order, highlight, onContinue, onTrack, onScrollToRefund }: OrderPinnedCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const title = order.variant === 'rejected' ? fa.shop.v2.orderRejected : order.orderCode ? fa.shop.v2.orderTitle(order.orderCode) : fa.shop.v2.orderTitleNoCode
  const primary =
    order.variant === 'continue'
      ? { label: fa.shop.v2.continueOrder, run: onContinue }
      : order.variant === 'payment'
        ? { label: fa.shop.v2.continuePayment, run: onContinue }
        : order.variant === 'rejected' && order.refundOpen
          ? { label: fa.shop.v2.enterRefundCard, run: onScrollToRefund }
          : { label: fa.shop.v2.track, run: onTrack }

  return (
    <section
      id="pinned-order"
      aria-label={title}
      className={`border-b border-[var(--shop-border)] bg-[var(--shop-surface)] px-4 py-2 transition-shadow ${highlight ? 'ring-2 ring-inset ring-[var(--shop-accent)]' : ''}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? fa.shop.v2.expandOrder : fa.shop.v2.collapseOrder}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-start"
      >
        <span className="min-w-0 truncate text-[15px] font-bold text-[var(--shop-text)]">{title}</span>
        {collapsed && <span className="shrink-0 text-xs text-[var(--shop-text-2)]">{order.variant === 'rejected' ? '' : fa.shop.v2.orderSteps[order.step]}</span>}
      </button>
      {!collapsed && (
        <div className="pb-1">
          {order.variant !== 'rejected' && order.variant !== 'continue' && (
            <ol className="mb-2 flex items-center gap-1" aria-label={fa.shop.v2.orderSteps.join(' ← ')}>
              {fa.shop.v2.orderSteps.map((label, i) => (
                <li key={label} className="flex flex-1 flex-col gap-1" aria-current={i === order.step ? 'step' : undefined}>
                  <span className={`h-1 rounded-full ${i <= order.step ? 'bg-[var(--shop-accent-fill)]' : 'bg-[var(--shop-surface-2)]'}`} />
                  <span className={`text-xs ${i === order.step ? 'font-bold text-[var(--shop-text)]' : 'text-[var(--shop-text-2)]'}`}>{label}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm leading-6 text-[var(--shop-text-2)]">
              {order.variant === 'rejected' ? (order.reason ?? '') : NEXT_LINE[order.statusLabelKey]}
            </p>
            <button type="button" onClick={primary.run} className="min-h-11 shrink-0 rounded-xl bg-[var(--shop-accent-fill)] px-4 text-sm font-bold text-[var(--shop-accent-text)]">
              {primary.label}
            </button>
          </div>
          {order.variant === 'payment' && order.orderCode && (
            <button type="button" onClick={onTrack} className="min-h-11 text-sm text-[var(--shop-accent)] underline">
              {fa.shop.v2.track}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
