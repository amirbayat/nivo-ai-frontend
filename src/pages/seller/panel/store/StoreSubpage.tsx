import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

function BackChevron() {
  // قانون RTL پروژه: «بازگشت» رو به راست (CLAUDE.md)
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// docs/PRD-seller-panel-simplification.md §4.9 — قالب مشترک زیرصفحه‌های «فروشگاه»: هدر با شورون
// بازگشت (رو به راست)، محتوا، و دکمه‌ی ثابت پایین (اگر فرم دارد).
// legacy: صفحه‌های قدیمی که خودشان h1 و padding دارند (اعتبار، تخفیف، راهنما، گزارش‌ها)؛ h1 تکراری مخفی می‌شود.
export function StoreSubpage({
  title,
  children,
  footer,
  legacy = false,
  back = '/seller/panel/store',
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
  legacy?: boolean
  back?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[640px] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-slate-800 bg-slate-950 px-2 py-2 light:border-slate-200 light:bg-white">
        <button type="button" onClick={() => navigate(back)} aria-label="بازگشت" className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 light:hover:bg-slate-100">
          <BackChevron />
        </button>
        <h1 className="flex-1 text-base font-extrabold text-slate-100 light:text-slate-900">{title}</h1>
      </header>
      <div className={legacy ? 'flex-1 [&_h1]:hidden' : 'flex flex-1 flex-col gap-5 px-4 py-4'}>{children}</div>
      {footer && (
        <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 light:border-slate-200 light:bg-white">{footer}</div>
      )}
    </div>
  )
}

export function SaveBar({ onSave, pending, dirty = true, saved, error }: { onSave: () => void; pending?: boolean; dirty?: boolean; saved?: boolean; error?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="button" onClick={onSave} disabled={!dirty || pending} className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-40">
        {saved ? 'ذخیره شد ✓' : 'ذخیره'}
      </button>
    </div>
  )
}
