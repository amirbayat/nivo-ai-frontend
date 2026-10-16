import { fa } from '@/locales/fa'

export type ShopView = 'products' | 'chat'

interface ShopViewSwitchProps {
  view: ShopView
  onChange: (view: ShopView) => void
  // پیام تازه‌ای که وقتی روی «محصولات» بودیم رسیده (همان منطق storeModeUnread قبلی)
  chatUnread: boolean
}

// docs/PRD-buyer-chat-redesign.md §4/§5 — کنترل دوحالتی «محصولات | گفتگو»؛ جایگزین آیکون حالت فروشگاه
// و حباب شناور. (حفظ در URL با ?view= در BC-2 اضافه می‌شود)
export function ShopViewSwitch({ view, onChange, chatUnread }: ShopViewSwitchProps) {
  const tab = (value: ShopView, label: string, dot: boolean) => {
    const active = view === value
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => onChange(value)}
        className={`relative min-h-10 flex-1 rounded-lg text-sm font-semibold transition-colors ${
          active
            ? 'bg-[var(--shop-bg)] text-[var(--shop-text)] shadow-sm'
            : 'text-[var(--shop-text-2)]'
        }`}
      >
        {label}
        {dot && <span className="absolute end-3 top-2 size-2 rounded-full bg-[var(--shop-danger)]" aria-hidden />}
      </button>
    )
  }
  return (
    <div className="border-b border-[var(--shop-border)] bg-[var(--shop-bg)] px-4 py-2">
      <div role="tablist" className="flex gap-1 rounded-xl bg-[var(--shop-surface-2)] p-1">
        {tab('products', fa.shop.v2.viewProducts, false)}
        {tab('chat', fa.shop.v2.viewChat, chatUnread && view !== 'chat')}
      </div>
    </div>
  )
}
