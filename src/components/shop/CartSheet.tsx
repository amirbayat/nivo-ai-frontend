import { fa } from '@/locales/fa'

interface CartItem {
  productId: string
  variantId?: string
  name: string
  variantLabel?: string
  unitPrice: number
  qty: number
}

interface CartSheetProps {
  items: CartItem[]
  total: number
  disabled: boolean
  onClose: () => void
  onSetQty: (item: CartItem, qty: number) => void
  onRemove: (item: CartItem) => void
  onConfirm: () => void
}

// docs/PRD-buyer-chat-redesign.md §5 — سبد (فعلاً همان پوشش تمام‌صفحه‌ی قبلی، فقط به فایل خودش منتقل
// شد و رنگ‌ها از توکن‌ها می‌آید). نوار سبد، شیت واقعی و خوش‌بینانه (optimistic) در BC-4 ساخته می‌شود
export function CartSheet({ items, total, disabled, onClose, onSetQty, onRemove, onConfirm }: CartSheetProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[var(--shop-bg)]">
      <div className="flex items-center gap-2 border-b border-[var(--shop-border)] px-2 py-1 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="flex size-11 items-center justify-center text-[var(--shop-text)]" aria-label={fa.shop.backToCurrentChat}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <p className="text-[17px] font-bold text-[var(--shop-text)]">{fa.shop.cartSheetTitle}</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.length === 0 && <p className="text-center text-sm text-[var(--shop-text-2)]">{fa.shop.cartEmptySheet}</p>}
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId ?? ''}`} className="rounded-2xl border border-[var(--shop-border)] p-3">
            <p className="text-[15px] text-[var(--shop-text)]">
              {item.name}
              {item.variantLabel ? <span className="text-[var(--shop-text-2)]"> ({item.variantLabel})</span> : null}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[var(--shop-text-2)]">{(item.unitPrice * item.qty).toLocaleString('fa-IR')} تومان</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={fa.shop.cartRemove}
                  onClick={() => (item.qty <= 1 ? onRemove(item) : onSetQty(item, item.qty - 1))}
                  className="flex size-11 items-center justify-center rounded-xl border border-[var(--shop-border)] text-lg text-[var(--shop-text)] disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-6 text-center text-[15px] text-[var(--shop-text)]">{item.qty.toLocaleString('fa-IR')}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSetQty(item, item.qty + 1)}
                  className="flex size-11 items-center justify-center rounded-xl border border-[var(--shop-border)] text-lg text-[var(--shop-text)] disabled:opacity-40"
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(item)}
                  className="min-h-11 px-2 text-xs text-[var(--shop-danger)] disabled:opacity-40"
                >
                  {fa.shop.cartRemove}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--shop-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="mb-3 text-[15px] font-bold text-[var(--shop-text)]">{total.toLocaleString('fa-IR')} تومان</p>
        <button
          type="button"
          disabled={disabled || items.length === 0}
          onClick={onConfirm}
          className="min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)] disabled:opacity-40"
        >
          {fa.shop.confirmAndPay}
        </button>
      </div>
    </div>
  )
}
