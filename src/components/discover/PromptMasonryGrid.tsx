import { clsx } from 'clsx'
import { parseAspectRatio } from '@/lib/aspectRatio'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem } from '@/types/api'

// گرید واترفال (masonry) استودیوی محتوا — با columns خام CSS به‌جای grid با ارتفاع ثابت،
// دقیقاً هم‌تم بخش گالری meigen.ai (ارجاع طراحی کاربر) اما در پالت دارک خودمان: عکس با
// نسبت طبیعی (نه crop شده در یک کادر مربع)، گرادیان پایین با عنوان روی خود عکس، بج ترند،
// و دکمه‌ی CTA «استفاده از این سبک» به‌جای کپی‌کردن پرامپت (فرق اصلی مدل محصول ما با meigen)
export function PromptMasonryGrid({
  items,
  onSelect,
  disabled,
  columns = 'columns-2 sm:columns-3 lg:columns-4',
  selectLabel,
}: {
  items: CreativePromptCatalogItem[]
  onSelect: (item: CreativePromptCatalogItem) => void
  disabled?: boolean
  columns?: string
  // متن دکمه‌ی CTA روی هر کارت — پیش‌فرض «استفاده از این سبک» (استودیوی محتوا)، اما جای پین‌کردن
  // سبک روی یک پروژه (ProjectModal/ProjectDetailPage) با «پین کردن این سبک» جایگزین می‌شه
  selectLabel?: string
}) {
  return (
    <div className={clsx(columns, 'gap-3 [column-fill:balance]')}>
      {items.map(item => (
        <PromptMasonryCard key={item.id} item={item} onSelect={onSelect} disabled={disabled} selectLabel={selectLabel} />
      ))}
    </div>
  )
}

function PromptMasonryCard({ item, onSelect, disabled, selectLabel }: {
  item: CreativePromptCatalogItem
  onSelect: (item: CreativePromptCatalogItem) => void
  disabled?: boolean
  selectLabel?: string
}) {
  const ratio = parseAspectRatio(item.aspectRatio, item.outputType === 'TEXT' ? 4 / 3 : 1)

  return (
    <div className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-emerald-500/40">
      <div className="relative w-full" style={{ aspectRatio: ratio }}>
        {item.outputType === 'IMAGE' && item.exampleImageUrl ? (
          <img
            src={item.exampleImageUrl}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
            <p className="line-clamp-4 text-center text-xs leading-relaxed text-slate-500">
              {item.description}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent" />

        {item.isTrending && (
          <span className="absolute top-2 right-2 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {fa.discover.trending}
          </span>
        )}

        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
          <div>
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-emerald-400/90">{fa.discover.creditCost(item.creditCost)}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item)}
            className="w-full truncate rounded-lg bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
          >
            {selectLabel ?? 'استفاده از این سبک'}
          </button>
        </div>
      </div>
    </div>
  )
}
