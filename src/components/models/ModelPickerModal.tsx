import { clsx } from 'clsx'
import type { ReactNode } from 'react'

// کامپوننت مشترک انتخاب مدل — استخراج‌شده از VideoModelPickerModal.tsx (که خودش طبق دستور صریح
// کاربر بازطراحی شد: نه یک دراپ‌دون کوچک، یک مدال بزرگ با کارت‌های توضیح‌دار). حالا همین ظاهر/
// رفتار برای مدل‌های چت/متن و تولید عکس هم استفاده می‌شود، نه فقط ویدیو — روی موبایل bottom-sheet
// تمام‌صفحه با اسلاید، روی دسکتاپ دیالوگ وسط‌صفحه با فید/اسکیل.

export interface ModelPickerTier {
  label: string
  bg: string
  border: string
  text: string
}

export interface ModelPickerItem {
  key: string
  icon: ReactNode
  name: string
  blurb: string
  chips?: string[]
  tier?: ModelPickerTier | null
}

function ModelCapabilityChips({ chips }: { chips: string[] }) {
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <span
          key={chip}
          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-slate-300"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.2)' }}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}

function ModelCard({ item, selected, onSelect }: { item: ModelPickerItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex flex-col gap-2.5 rounded-3xl p-4 text-right transition-colors',
        selected ? 'bg-emerald-500/[0.08]' : 'bg-white/[0.02] hover:bg-white/[0.04]',
      )}
      style={{ border: selected ? '1.5px solid rgba(16,185,129,0.55)' : '1px solid rgba(148,163,184,0.18)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5">
            {item.icon}
          </span>
          <span className="text-[14px] font-bold text-slate-100">{item.name}</span>
        </div>
        {selected && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#02170f]">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {item.blurb && <p className="text-[12.5px] leading-relaxed text-slate-400">{item.blurb}</p>}

      {((item.chips && item.chips.length > 0) || item.tier) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ModelCapabilityChips chips={item.chips ?? []} />
          {item.tier && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
              style={{ background: item.tier.bg, border: `1px solid ${item.tier.border}`, color: item.tier.text }}
            >
              {item.tier.label}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

export function ModelPickerModal({
  open,
  onClose,
  items,
  selectedKey,
  onSelect,
  title,
  subtitle,
  emptyText = 'مدلی موجود نیست',
  footer,
}: {
  open: boolean
  onClose: () => void
  items: ModelPickerItem[]
  selectedKey: string | null
  onSelect: (key: string) => void
  title: string
  subtitle?: string
  emptyText?: string
  footer?: ReactNode
}) {
  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300 ease-out sm:items-center sm:justify-center sm:p-6',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/70 sm:backdrop-blur-sm" onClick={onClose} />

      <div
        className={clsx(
          'relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#020C18] transition-all duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          'sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:translate-y-0 sm:rounded-3xl sm:border sm:shadow-2xl',
          open ? 'sm:scale-100 sm:opacity-100' : 'sm:scale-95 sm:opacity-0',
        )}
        style={{ borderColor: 'rgba(148,163,184,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/50 px-5 pb-4"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
        >
          <div>
            <span className="block text-[15px] font-bold text-white">{title}</span>
            {subtitle && <span className="block text-[11.5px] text-slate-500">{subtitle}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
            aria-label="بستن"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 sm:p-5"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map(item => (
              <ModelCard
                key={item.key}
                item={item}
                selected={item.key === selectedKey}
                onSelect={() => { onSelect(item.key); onClose() }}
              />
            ))}
          </div>
          {items.length === 0 && (
            <p className="py-10 text-center text-[12.5px] text-slate-500">{emptyText}</p>
          )}
          {footer}
        </div>
      </div>
    </div>
  )
}
