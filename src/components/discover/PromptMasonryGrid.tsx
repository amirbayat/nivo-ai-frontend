import { useState } from 'react'
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

// ضریب بزرگ‌کردن ارتفاع کارت‌های نمونه — روی نسبت تصویر/متن (که یا از تنظیمات ادمین
// می‌آید یا مقدار پیش‌فرض بالاست) ضرب می‌شود؛ عددی کمتر از ۱ یعنی کارت کشیده‌تر/بلندتر
// (aspect-ratio = عرض/ارتفاع، پس برای بلندتر شدن باید کوچک‌تر شود)
const CARD_HEIGHT_BOOST = 0.75

function PromptMasonryCard({ item, onSelect, disabled, selectLabel }: {
  item: CreativePromptCatalogItem
  onSelect: (item: CreativePromptCatalogItem) => void
  disabled?: boolean
  selectLabel?: string
}) {
  const ratio = parseAspectRatio(item.aspectRatio, item.outputType === 'TEXT' ? 4 / 3 : 1) * CARD_HEIGHT_BOOST
  const [copied, setCopied] = useState(false)

  // لینک دیپ‌لینک عمومی این سبک (StudioLinkPage) — Web Share API روی موبایل (شیت اشتراک‌گذاری
  // بومی)، وگرنه فقط لینک را در کلیپ‌بورد کپی می‌کند
  async function handleShare() {
    const url = `${window.location.origin}/studio?id=${item.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url })
      } catch {
        // کاربر شیت اشتراک‌گذاری را بسته — چیزی برای انجام نیست
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // کلیپ‌بورد در دسترس نبود (مثلاً context غیر-https) — بی‌صدا نادیده می‌گیریم
    }
  }

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

        <button
          type="button"
          onClick={handleShare}
          aria-label={fa.discover.shareStyle}
          title={fa.discover.shareStyle}
          className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-emerald-500"
        >
          {copied ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.44-9.766a.75.75 0 011.09-.144z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
          )}
        </button>

        {copied && (
          <span className="absolute top-10 left-2 rounded-full bg-slate-950/90 px-2 py-0.5 text-[10px] text-emerald-400 backdrop-blur-sm">
            {fa.discover.linkCopied}
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
