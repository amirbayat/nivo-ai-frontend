import { fa } from '@/locales/fa'
import { useGoldPrices } from '@/hooks/useGoldPrices'

// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۴.۲ — نمایش کامل (تصمیم
// کاربر، نه فقط ۱۸/۲۴ عیار): تمام آیتم‌های طلا/سکه که market-prices/gold برمی‌گرداند، بدون
// فیلتر. فقط وقتی فروشگاه حداقل یک محصول WEIGHT_BASED_FORMULA دارد رندر می‌شود (کنترل‌شده
// توسط parent، نه این کامپوننت)
export function GoldPriceTicker() {
  const result = useGoldPrices(true)
  if (!result || result.source === 'unavailable' || result.items.length === 0) return null

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-amber-400">{fa.shop.goldPriceTickerTitle}</span>
        <span className="text-[10px] text-slate-500">{fa.shop.goldPriceTickerUpdatedAt}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-0.5">
        {result.items.map((item) => (
          <div key={item.symbol} className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg bg-slate-900/40 px-2.5 py-1 light:bg-white">
            <span className="whitespace-nowrap text-[10px] text-slate-400 light:text-slate-600">{item.name}</span>
            <span className="whitespace-nowrap text-xs font-bold text-slate-100 light:text-slate-900">
              {item.price.toLocaleString('fa-IR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
