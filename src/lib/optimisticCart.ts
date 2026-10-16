// docs/PRD-buyer-chat-redesign.md §8 — سبد خوش‌بینانه: عملیات «در انتظار» روی آخرین CART_SUMMARY سرور اعمال
// می‌شود تا سرور جواب بدهد؛ بعد از جواب (یا خطا) عملیات حذف می‌شود و نمایش دوباره کاملاً از سرور می‌آید.

export interface CartLineView {
  productId: string
  variantId?: string
  name: string
  variantLabel?: string
  unitPrice: number
  qty: number
}

export type CartOp =
  | { id: string; kind: 'add'; productId: string; variantId?: string; name: string; variantLabel?: string; unitPrice: number; startedAt: number }
  | { id: string; kind: 'qty'; productId: string; variantId?: string; qty: number; startedAt: number }
  | { id: string; kind: 'remove'; productId: string; variantId?: string; startedAt: number }

const same = (line: { productId: string; variantId?: string }, op: { productId: string; variantId?: string }) =>
  line.productId === op.productId && (line.variantId ?? '') === (op.variantId ?? '')

export function applyCartOps(items: CartLineView[], ops: CartOp[]): CartLineView[] {
  let cart = items.map((line) => ({ ...line }))
  for (const op of ops) {
    const line = cart.find((item) => same(item, op))
    if (op.kind === 'add') {
      if (line) line.qty += 1
      else cart.push({ productId: op.productId, variantId: op.variantId, name: op.name, variantLabel: op.variantLabel, unitPrice: op.unitPrice, qty: 1 })
    } else if (op.kind === 'qty') {
      if (line) line.qty = op.qty
    } else {
      cart = cart.filter((item) => !same(item, op))
    }
  }
  return cart.filter((line) => line.qty > 0)
}

export function cartCountOf(items: CartLineView[]): number {
  return items.reduce((sum, line) => sum + line.qty, 0)
}

// جمع نمایشی: جمع تاییدشده‌ی سرور (با تخفیف) + اثر عملیات در انتظار روی جمع خام. تخفیف دوباره محاسبه نمی‌شود
export function optimisticTotal(serverItems: CartLineView[], serverTotal: number, ops: CartOp[]): number {
  const raw = (items: CartLineView[]) => items.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  return serverTotal + raw(applyCartOps(serverItems, ops)) - raw(serverItems)
}

// بیش از ۵ ثانیه بدون جواب سرور → نوار «در حال به‌روزرسانی…» (§8)
export const CART_STALE_AFTER_MS = 5000
export function isCartStale(ops: CartOp[], now: number): boolean {
  return ops.some((op) => now - op.startedAt > CART_STALE_AFTER_MS)
}
