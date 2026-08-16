import { useNavigate } from 'react-router-dom'
import { useTrendingImagePrompts } from '@/hooks/useTrendingImagePrompts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem } from '@/types/api'

// روی صفحه‌ی خالی چت (هم ChatPage برای کاربر لاگین‌کرده، هم AnonChatPage برای مهمان)،
// سبک‌های آماده‌ی عکسی (اول ترندها، بعد جدیدترین‌ها از کاتالوگ واقعی دیسکاوری) را به‌جای
// راهنمای صرفاً متنی نشان می‌دهیم — کلیک دکمه‌ی «استفاده از این سبک» دقیقاً مثل انتخاب همان
// سبک از استودیوی محتواست. دسکتاپ ۳ آیتم در یک ردیف، موبایل ۴ آیتم در شبکه‌ی ۲×۲ (درخواست
// صریح کاربر — نه برعکسِ الگوی معمول)
export function TrendingPromptGrid({ onSelect, disabled }: {
  onSelect: (item: CreativePromptCatalogItem) => void
  disabled?: boolean
}) {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const count = isDesktop ? 3 : 4
  const { items: allItems, isLoading } = useTrendingImagePrompts(4)
  const items = allItems.slice(0, count)

  if (!isLoading && items.length === 0) return null

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <p className="text-xs font-medium text-slate-500">سبک‌های ترند عکس</p>
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="text-xs font-medium text-emerald-400/80 hover:text-emerald-400 transition-colors"
        >
          {fa.chat.discover}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {isLoading
          ? Array.from({ length: count }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-slate-800/60" />
            ))
          : items.map(item => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-700/60 transition-colors hover:border-emerald-500/40"
              >
                {item.exampleImageUrl ? (
                  <img
                    src={item.exampleImageUrl}
                    alt={item.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent" />
                {item.isTrending && (
                  <span className="absolute top-2 right-2 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    {fa.discover.trending}
                  </span>
                )}
                <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
                  <span className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
                    {item.title}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(item)}
                    className="w-full truncate rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                  >
                    استفاده از این سبک
                  </button>
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
