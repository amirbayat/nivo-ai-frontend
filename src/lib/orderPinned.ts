import type { ShopMessage } from '@/types/api'

// docs/PRD-buyer-chat-redesign.md §6.9 و §12 (نگاشت وضعیت) — کارت سنجاق‌شده‌ی سفارش
export type PinnedVariant = 'continue' | 'payment' | 'progress' | 'rejected'

export interface PinnedOrder {
  variant: PinnedVariant
  // ۰=ثبت شد ۱=پرداخت ۲=تایید شد ۳=ارسال شد
  step: number
  orderCode: string | null
  // «کارت بازگشت پول رو وارد کن» وقتی فرم بازپرداخت باز است
  refundOpen: boolean
  // متن آخرین پیام ایجنت (دلیل رد سفارش)
  reason: string | null
  statusLabelKey: 'awaitingPayment' | 'awaitingApproval' | 'approved' | 'shipped' | 'fillAddress'
}

const SHIPPED = ['SHIPPED', 'DELIVERED']

// نگاشت: AWAITING_PAYMENT/PENDING_PAYMENT → ثبت شد؛ RECEIPT_SUBMITTED/AWAITING_SELLER_APPROVAL → پرداخت؛
// APPROVED → تایید شد؛ SHIPPED و بعد از آن → ارسال شد. اگر ORDER_STATUS در نخ هست، همان مقدم است
export function orderStepOf(state: string, orderStatus: string | null): number {
  if (orderStatus && SHIPPED.includes(orderStatus)) return 3
  if (orderStatus === 'APPROVED') return 2
  if (orderStatus === 'RECEIPT_SUBMITTED') return 1
  if (orderStatus === 'PENDING_PAYMENT') return 0
  if (state === 'RECEIPT_SUBMITTED' || state === 'AWAITING_SELLER_APPROVAL') return 1
  return 0
}

export function computePinnedOrder(messages: ShopMessage[], state: string): PinnedOrder | null {
  let orderCode: string | null = null
  let orderStatus: string | null = null
  let refundOpen = false
  let refundSeen = false
  let reason: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    const b = m.uiBlock
    if (!reason && m.role === 'agent' && m.text && !b) reason = m.text
    if (!b) continue
    if (b.type === 'ORDER_STATUS') {
      orderStatus ??= b.status
      orderCode ??= b.orderCode ?? null
    } else if (b.type === 'PAYMENT_INSTRUCTIONS' || b.type === 'SNAPPPAY_PAYMENT_INSTRUCTIONS') {
      orderCode ??= b.orderCode ?? null
    } else if (b.type === 'REFUND_DESTINATION_FORM' && !refundSeen) {
      // F16: تازه‌ترین فرم تعیین‌کننده است؛ فرم ذخیره‌شده‌ی جدیدتر یعنی خریدار کارتش را داده
      refundSeen = true
      refundOpen = b.status === 'OPEN'
    }
  }
  if (state === 'ADDRESS_COLLECTION' || state === 'PAYMENT_METHOD_SELECTION') {
    return { variant: 'continue', step: 0, orderCode, refundOpen: false, reason: null, statusLabelKey: 'fillAddress' }
  }
  if (state === 'AWAITING_PAYMENT') {
    return { variant: 'payment', step: 0, orderCode, refundOpen: false, reason: null, statusLabelKey: 'awaitingPayment' }
  }
  if (state === 'RECEIPT_SUBMITTED' || state === 'AWAITING_SELLER_APPROVAL') {
    const step = orderStepOf(state, orderStatus)
    return { variant: 'progress', step, orderCode, refundOpen: false, reason: null, statusLabelKey: step >= 3 ? 'shipped' : step === 2 ? 'approved' : 'awaitingApproval' }
  }
  if (state === 'REJECTED') {
    return { variant: 'rejected', step: 1, orderCode, refundOpen, reason, statusLabelKey: 'awaitingApproval' }
  }
  return null
}
