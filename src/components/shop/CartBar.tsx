import { fa } from '@/locales/fa'

interface CartBarProps {
  count: number
  total: number
  // بیش از ۵ ثانیه بدون تایید سرور → «در حال به‌روزرسانی…» به‌جای جمع (§8)
  stale: boolean
  onOpen: () => void
}

// docs/PRD-buyer-chat-redesign.md §6.6 — نوار سبد ۵۶px بالای نوار پرسش؛ با کیبورد باز مخفی می‌شود (parent)
export function CartBar({ count, total, stale, onOpen }: CartBarProps) {
  return (
    <div className="cart-bar-in flex min-h-14 items-center justify-between gap-3 border-t border-[var(--shop-border)] bg-[var(--shop-surface)] px-4">
      <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--shop-text)]" aria-live="polite">
        {stale ? fa.shop.v2.cartUpdating : fa.shop.v2.cartBar(count, total.toLocaleString('fa-IR'))}
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 shrink-0 rounded-xl bg-[var(--shop-accent-fill)] px-4 text-sm font-bold text-[var(--shop-accent-text)]"
      >
        {fa.shop.v2.continueShopping}
      </button>
    </div>
  )
}
