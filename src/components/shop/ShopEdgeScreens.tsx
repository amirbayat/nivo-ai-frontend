import { fa } from '@/locales/fa'
import { avatarInitials, storeLogoUrl } from '@/components/shop/shopUtils'

// docs/PRD-buyer-chat-redesign.md §6.14 — اسکلت لودینگ به شکل چیدمان واقعی: هدر، کنترل نما، گرید ۲×۲ و نوار پرسش
export function ShopLoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--shop-bg)]" dir="rtl" aria-busy="true">
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--shop-border)] px-4">
        <div className="size-9 animate-pulse rounded-full bg-[var(--shop-surface-2)]" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-[var(--shop-surface-2)]" />
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--shop-surface-2)]" />
        </div>
      </div>
      <div className="border-b border-[var(--shop-border)] px-4 py-2">
        <div className="h-10 animate-pulse rounded-xl bg-[var(--shop-surface-2)]" />
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[var(--shop-border)]">
            <div className="aspect-[4/5] bg-[var(--shop-surface-2)]" />
            <div className="space-y-2 p-2.5">
              <div className="h-4 rounded bg-[var(--shop-surface-2)]" />
              <div className="h-4 w-1/2 rounded bg-[var(--shop-surface-2)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--shop-border)] p-3">
        <div className="h-11 animate-pulse rounded-xl bg-[var(--shop-surface-2)]" />
      </div>
    </div>
  )
}

// «پیدا نشد» / «غیرفعال» — متن امروز، وسط‌چین، با لوگوی فروشگاه اگر معلوم باشد و لینک «برگشت»
export function ShopMessageScreen({
  heading,
  body,
  storeId,
  storeName,
  storeLogoKey,
  onBack,
}: {
  heading: string
  body: string
  storeId?: string | null
  storeName?: string | null
  storeLogoKey?: string | null
  onBack: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--shop-bg)] p-4" dir="rtl">
      <div className="flex flex-col items-center text-center">
        {storeId && storeLogoKey ? (
          <img src={storeLogoUrl(storeId, storeLogoKey)} alt="" className="mb-4 size-16 rounded-full object-cover" />
        ) : storeName ? (
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--shop-surface-2)] text-xl text-[var(--shop-text-2)]" aria-hidden>
            {avatarInitials(storeName)}
          </div>
        ) : null}
        <h1 className="mb-1.5 text-xl font-bold text-[var(--shop-text)]">{heading}</h1>
        <p className="text-sm leading-7 text-[var(--shop-text-2)]">{body}</p>
        <button type="button" onClick={onBack} className="mt-3 min-h-11 px-4 text-sm font-semibold text-[var(--shop-accent)] underline">
          {fa.shop.v2.back}
        </button>
      </div>
    </div>
  )
}

// §6.10 — به‌جای نوار پرسش قفل‌شده بعد از اتمام سفارش
export function ChatEndPanel({ onNewOrder, onMyOrders }: { onNewOrder: () => void; onMyOrders: () => void }) {
  return (
    <div className="border-t border-[var(--shop-border)] bg-[var(--shop-bg)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center">
      <p className="mb-3 text-base font-bold text-[var(--shop-text)]">{fa.shop.v2.endTitle}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onNewOrder} className="min-h-12 flex-1 rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)]">
          {fa.shop.v2.newOrder}
        </button>
        <button type="button" onClick={onMyOrders} className="min-h-12 flex-1 rounded-xl border border-[var(--shop-border)] text-sm font-semibold text-[var(--shop-text)]">
          {fa.shop.v2.myOrders}
        </button>
      </div>
    </div>
  )
}

// §6.13 — فقط‌خواندنی: نوار پرسش با یک دکمه‌ی تمام‌عرض عوض می‌شود
export function ReadOnlyBar({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="border-t border-[var(--shop-border)] bg-[var(--shop-bg)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button type="button" onClick={onReturn} className="min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)]">
        {fa.shop.v2.backToChat}
      </button>
    </div>
  )
}
