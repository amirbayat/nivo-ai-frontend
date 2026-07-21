import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { useChatStore, type ThinkingMode } from '@/store/chat.store'
import { track } from '@/lib/events'

const OPTIONS: { value: ThinkingMode; label: string; description: string }[] = [
  { value: 'fast', label: 'سریع', description: 'بدون فکر کردن — سریع‌ترین پاسخ' },
  { value: 'smart', label: 'هوشمند', description: 'با کمی فکر کردن — پاسخ دقیق‌تر' },
]

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M18.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" fill="currentColor" />
    </svg>
  )
}

// دراپ‌دون «سریع/هوشمند» کنار دکمه‌ی ارسال — فقط روی reasoning effort اثر دارد، انتخاب مدل را
// عوض نمی‌کند (chat.service.ts streamChat). نگاشت هر گزینه به effort واقعی در پنل ادمین
// (per-plan: fastReasoningEffort/smartReasoningEffort) قابل تنظیم است.
export function ThinkingModeToggle({ disabled }: { disabled?: boolean }) {
  const { thinkingMode, setThinkingMode } = useChatStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(mode: ThinkingMode) {
    track('thinking_mode_selected', { mode, previousMode: thinkingMode })
    setThinkingMode(mode)
    setOpen(false)
  }

  const active = OPTIONS.find(o => o.value === thinkingMode) ?? OPTIONS[1]

  return (
    <div ref={ref} className="relative shrink-0" dir="rtl">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'flex items-center gap-1 h-7 rounded-lg px-2 text-xs transition-colors',
          disabled
            ? 'text-slate-600 cursor-not-allowed'
            : active.value === 'fast'
              ? 'text-amber-300/80 hover:bg-slate-700'
              : 'text-sky-300/80 hover:bg-slate-700',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="میزان فکر کردن مدل"
      >
        {active.value === 'fast' ? <BoltIcon className="size-3.5" /> : <SparkleIcon className="size-3.5" />}
        <span>{active.label}</span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          className={clsx('size-2 text-slate-600 transition-transform', open && 'rotate-180')}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 z-50 w-52 rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={clsx(
                'w-full flex flex-col gap-0.5 px-3 py-2 text-right transition-colors',
                opt.value === active.value
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300',
              )}
            >
              <span className="flex items-center gap-1.5 text-sm">
                {opt.value === 'fast' ? <BoltIcon className="size-3.5" /> : <SparkleIcon className="size-3.5" />}
                {opt.label}
                {opt.value === active.value && (
                  <svg viewBox="0 0 12 12" fill="none" className="mr-auto size-3 text-emerald-500 shrink-0">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[11px] text-slate-500">{opt.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
