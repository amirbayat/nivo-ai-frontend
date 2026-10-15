import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  // دکمه‌های ثابت پایین (چسبیده به لبه، بالای safe-area)
  footer?: ReactNode
  // ارتفاع کامل (مثلاً پیش‌نمایش مشتری یا اولین محصول)
  full?: boolean
}

// docs/PRD-seller-panel-simplification.md §4.1 — شیت پایین مشترک برای همه‌ی شیت‌های جدید پنل
// فروشنده: بستن با لمس پس‌زمینه و Escape، padding امن پایین، اسکرول محتوای بلند، فوتر چسبان.
export function BottomSheet({ open, onClose, title, children, footer, full }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/60 light:bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full max-w-[640px] flex-col rounded-t-3xl border border-b-0 border-slate-800 bg-slate-900 light:border-slate-200 light:bg-white ${
          full ? 'h-[92dvh]' : 'max-h-[92dvh]'
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-700 light:bg-slate-300" />
        {title && (
          <h2 className="shrink-0 px-5 pb-1 pt-3 text-base font-bold text-slate-100 light:text-slate-900">{title}</h2>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-800 px-5 pt-3 light:border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]" />}
      </div>
    </div>
  )
}
