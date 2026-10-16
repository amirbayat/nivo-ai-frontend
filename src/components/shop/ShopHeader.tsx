import { fa } from '@/locales/fa'
import { avatarInitials, storeLogoUrl } from '@/components/shop/shopUtils'

interface ShopHeaderProps {
  storeId: string | null | undefined
  storeName: string | null | undefined
  storeLogoKey: string | null | undefined
  viewingHistory: boolean
  sellerIsReplying: boolean
  // سبد فقط وقتی قابل‌ویرایش و غیرخالی است نمایش داده می‌شود (§6.1)
  cartCount: number
  onOpenCart: () => void
  onOpenMenu: () => void
}

// docs/PRD-buyer-chat-redesign.md §6.1 — لوگو، نام، خط «چه کسی جواب می‌دهد»، قرص سبد و ⋯.
// آیکون‌های تاریخچه/گفتگوی جدید/ثبت‌نام/حالت فروشگاه و عبارت ثابت «دستیار فروش» حذف شدند
export function ShopHeader({
  storeId,
  storeName,
  storeLogoKey,
  viewingHistory,
  sellerIsReplying,
  cartCount,
  onOpenCart,
  onOpenMenu,
}: ShopHeaderProps) {
  const subline = viewingHistory
    ? fa.shop.v2.readOnly
    : sellerIsReplying
      ? fa.shop.v2.answeringSeller(storeName ?? '')
      : fa.shop.v2.answeringAi
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--shop-border)] bg-[var(--shop-bg)] ps-4 pe-2 pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 items-center gap-2.5 py-2">
        {storeId && storeLogoKey ? (
          <img src={storeLogoUrl(storeId, storeLogoKey)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--shop-surface-2)] text-xs text-[var(--shop-text-2)]">
            {avatarInitials(storeName)}
          </div>
        )}
        <div className="min-w-0 text-start">
          <p className="truncate text-[15px] font-bold leading-6 text-[var(--shop-text)]">{storeName}</p>
          <p className="truncate text-xs leading-4 text-[var(--shop-text-2)]">{subline}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {cartCount > 0 && (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={fa.shop.v2.cartPillLabel}
            className="relative flex size-11 items-center justify-center rounded-xl text-[var(--shop-text)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden>
              <path d="M6 7h12l-1 12H7L6 7z" />
              <path d="M9 7V6a3 3 0 016 0v1" />
            </svg>
            <span className="absolute end-1 top-1 min-w-4 rounded-full bg-[var(--shop-accent-fill)] px-1 text-center text-[11px] font-bold leading-4 text-[var(--shop-accent-text)]">
              {cartCount.toLocaleString('fa-IR')}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={fa.shop.v2.menuLabel}
          className="flex size-11 items-center justify-center rounded-xl text-[var(--shop-text)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden>
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
      </div>
    </header>
  )
}
