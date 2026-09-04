import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ProviderIcon } from '@/components/models/ProviderIcon'
import type { ModelCatalogEntry } from '@/queries/plans.queries'
import type { StudioAspectRatio } from '@/types/api'

// docs/PRD-video-studio-chat-flow.md §۲ — سه چیپ مدل جدا (چت/عکس/ویدیو) که همیشه در دسترسند،
// نه بخشی از یک wizard. روی دسکتاپ یک dropdown ساده‌ی خودش (نه navigate به /models، چون این
// فیچر صفحه‌ی جدا برای هر مدل نمی‌خواهد)؛ روی موبایل همین کامپوننت به‌صورت یک لیست رادیویی
// داخل مدال تمام‌صفحه‌ی VideoStudioSettingsModal دوباره استفاده می‌شود.

export function ModelDropdownChip({
  label,
  models,
  selectedName,
  onSelect,
}: {
  label: string
  models: ModelCatalogEntry[]
  selectedName: string | null
  onSelect: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = models.find(m => m.name === selectedName) ?? models[0]

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px]"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.24)', color: '#d1fae5' }}
      >
        {current && <ProviderIcon provider={current.provider} size={14} />}
        <span className="font-semibold">{current?.displayName ?? label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-2xl p-1.5"
          style={{ background: '#0b1626', border: '1px solid rgba(148,163,184,0.22)', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}
        >
          {models.map(m => (
            <button
              key={m.name}
              type="button"
              onClick={() => { onSelect(m.name); setOpen(false) }}
              className={clsx(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-[12.5px]',
                m.name === selectedName ? 'bg-emerald-500/10 text-emerald-100' : 'text-slate-200 hover:bg-white/5',
              )}
            >
              <ProviderIcon provider={m.provider} size={14} />
              <span className="flex-1 truncate font-semibold">{m.displayName}</span>
              {m.name === selectedName && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-500">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
          {models.length === 0 && (
            <p className="px-2.5 py-3 text-center text-[12px] text-slate-500">مدلی موجود نیست</p>
          )}
        </div>
      )}
    </div>
  )
}

// لیست رادیویی مدل — برای استفاده‌ی مجدد داخل مدال تمام‌صفحه‌ی موبایل (همون الگوی پنل مدل
// StudioComposer.tsx، فقط بدون navigate/mobileView چون این‌جا خودِ صفحه هندلش می‌کند)
export function ModelRadioList({
  models,
  selectedName,
  onSelect,
}: {
  models: ModelCatalogEntry[]
  selectedName: string | null
  onSelect: (name: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {models.map(model => (
        <button
          key={model.name}
          type="button"
          onClick={() => onSelect(model.name)}
          className={clsx(
            'flex items-center gap-3 rounded-2xl border p-3.5 text-right',
            selectedName === model.name ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700/60 bg-slate-800/40',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">
            <ProviderIcon provider={model.provider} size={16} />
          </span>
          <span className="flex-1">
            <span className="block text-[13px] font-bold text-slate-100">{model.displayName}</span>
            {model.description && <span className="block text-[11px] text-slate-500">{model.description}</span>}
          </span>
          {selectedName === model.name && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-500">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
      {models.length === 0 && <p className="py-4 text-center text-[12px] text-slate-500">مدلی موجود نیست</p>}
    </div>
  )
}

export const ASPECT_RATIOS: { value: StudioAspectRatio; label: string; w: number; h: number }[] = [
  { value: '16:9', label: '۱۶:۹', w: 20, h: 11.25 },
  { value: '1:1', label: '۱:۱', w: 16, h: 16 },
  { value: '9:16', label: '۹:۱۶', w: 11.25, h: 20 },
]

export function AspectRatioSegmented({
  value,
  onChange,
  size = 'md',
}: {
  value: string | null
  onChange: (v: StudioAspectRatio) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full p-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)' }}
    >
      {ASPECT_RATIOS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={clsx(
            'flex items-center gap-1.5 rounded-full font-semibold transition-colors',
            size === 'sm' ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.5 text-[12px]',
            value === opt.value ? 'bg-emerald-500 text-[#02170f]' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <span
            className="block shrink-0 rounded-[2px]"
            style={{
              width: size === 'sm' ? opt.w * 0.6 : opt.w,
              height: size === 'sm' ? opt.h * 0.6 : opt.h,
              border: `1.4px solid ${value === opt.value ? '#02170f' : 'currentColor'}`,
            }}
          />
          {opt.label}
        </button>
      ))}
    </div>
  )
}
