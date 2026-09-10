import { useState } from 'react'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { useModelCatalog } from '@/queries/plans.queries'
import { COST_OPTIMIZED_MODE } from '@/lib/model-catalog'
import { track } from '@/lib/events'

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

// توگل «جستجوی وب» کنار دکمه‌ی ارسال (docs/PRD-chat-models-web-search-and-files.md §۳.۱) —
// پیش‌فرض خاموش، bool ساده (نه dropdown مثل ThinkingModeToggle). وقتی کاربر یک مدل مشخص
// (نه «خودکار») انتخاب کرده که supportsWebSearch=false دارد، غیرفعال می‌شود با تولتیپ — برای
// حالت «خودکار» همیشه فعال می‌ماند چون Router خودش بین مدل‌های ساپورت‌کننده انتخاب می‌کند
// (و اگر هیچ‌کدام نبود، بک‌اند بی‌صدا/با یک اطلاع کوتاه ادامه می‌دهد، نه خطای سخت)
export function WebSearchToggle({ disabled }: { disabled?: boolean }) {
  const { webSearchEnabled, setWebSearchEnabled, selectedModel } = useChatStore()
  const { data: catalog } = useModelCatalog()
  const [showTooltip, setShowTooltip] = useState(false)

  const isAutoMode = selectedModel === COST_OPTIMIZED_MODE
  const modelEntry = catalog?.find(m => m.name === selectedModel)
  const unsupported = !isAutoMode && modelEntry ? !modelEntry.supportsWebSearch : false
  const isDisabled = disabled || unsupported

  function toggle() {
    if (isDisabled) return
    const next = !webSearchEnabled
    track('web_search_toggled', { enabled: next })
    setWebSearchEnabled(next)
  }

  return (
    <div className="relative shrink-0" dir="rtl">
      <button
        type="button"
        disabled={isDisabled}
        onClick={toggle}
        onMouseEnter={() => unsupported && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={clsx(
          'flex items-center gap-1 h-7 rounded-lg px-2 text-xs transition-colors',
          isDisabled
            ? 'text-slate-600 cursor-not-allowed'
            : webSearchEnabled
              ? 'text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15'
              : 'text-slate-400 hover:bg-slate-700',
        )}
        aria-pressed={webSearchEnabled}
        aria-label="جستجوی وب"
      >
        <GlobeIcon className="size-3.5" />
        <span>جستجوی وب</span>
      </button>

      {showTooltip && unsupported && (
        <div className="absolute bottom-full right-0 mb-1.5 z-50 w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 shadow-xl">
          این مدل جستجوی وب را پشتیبانی نمی‌کند — یک مدل دیگر یا «خودکار» را انتخاب کن
        </div>
      )}
    </div>
  )
}
