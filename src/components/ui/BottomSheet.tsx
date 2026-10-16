import { useEffect, useRef, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  // دکمه‌های ثابت پایین (چسبیده به لبه، بالای safe-area)
  footer?: ReactNode
  // ارتفاع کامل (مثلاً پیش‌نمایش مشتری یا اولین محصول)
  full?: boolean
  // docs/PRD-buyer-chat-redesign.md §5 — باز شدن یک history entry می‌گذارد و حرکت «بازگشت» (دکمه‌ی
  // برگشت اندروید/سوایپ iOS) شیت بالایی را می‌بندد، نه صفحه را. پیش‌فرض خاموش تا صفحه‌های فروشنده
  // تغییری نکنند
  closeOnBack?: boolean
}

// ── مدیریت history برای closeOnBack ─────────────────────────────────────────────────────────
// چند شیت می‌توانند هم‌زمان (روی هم) یا پشت‌سرِ‌هم در یک tick باز/بسته شوند (مثلاً منو بسته و تایید باز).
// history.back() ناهمزمان است؛ اگر هر شیت جدا push/back کند، back شیت قبلی entry شیت تازه را می‌خورد.
// پس entryها را مرکزی نگه می‌داریم: به تعداد شیت‌های باز entry لازم است، و entry اضافه فقط یک‌بار
// بعد از تثبیت (setTimeout 0) با یک history.go(-n) برداشته می‌شود
interface BackEntry {
  close: () => void
}
const backStack: BackEntry[] = []
let pushedEntries = 0
let ignorePops = 0
let popListenerAttached = false

function onPopState() {
  if (ignorePops > 0) {
    ignorePops -= 1
    return
  }
  if (pushedEntries > 0) pushedEntries -= 1
  const top = backStack.pop()
  top?.close()
}

function registerBackEntry(entry: BackEntry) {
  backStack.push(entry)
  if (!popListenerAttached) {
    window.addEventListener('popstate', onPopState)
    popListenerAttached = true
  }
  if (pushedEntries < backStack.length) {
    // state فعلی (کلیدهای react-router) حفظ می‌شود تا روتر موقع بازگشت گیج نشود
    window.history.pushState({ ...(window.history.state ?? {}), nivoSheet: true }, '')
    pushedEntries += 1
  }
}

function unregisterBackEntry(entry: BackEntry) {
  const i = backStack.indexOf(entry)
  if (i >= 0) backStack.splice(i, 1)
  setTimeout(() => {
    const extra = pushedEntries - backStack.length
    if (extra > 0) {
      pushedEntries -= extra
      // اگر بین بسته‌شدن شیت و اینجا صفحه عوض شده (navigate با replace روی entry شیت)، دیگر روی
      // entry شیت نیستیم و برگشتن، صفحه‌ی تازه را می‌پراند
      if (window.history.state?.nivoSheet) {
        ignorePops += 1
        window.history.go(-extra)
      }
    }
  }, 0)
}

// docs/PRD-seller-panel-simplification.md §4.1 — شیت پایین مشترک برای همه‌ی شیت‌های جدید پنل
// فروشنده: بستن با لمس پس‌زمینه و Escape، padding امن پایین، اسکرول محتوای بلند، فوتر چسبان.
// docs/PRD-buyer-chat-redesign.md §7 — فوکوس داخل شیت می‌ماند و بعد از بستن به عنصر قبلی برمی‌گردد.
export function BottomSheet({ open, onClose, title, children, footer, full, closeOnBack }: BottomSheetProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || !closeOnBack) return
    const entry: BackEntry = { close: () => onCloseRef.current() }
    registerBackEntry(entry)
    return () => unregisterBackEntry(entry)
  }, [open, closeOnBack])

  // تله‌ی فوکوس ساده: فوکوس اولیه روی خود دیالوگ، Tab داخل آن می‌چرخد، بعد از بستن فوکوس برمی‌گردد
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => previous?.focus?.()
  }, [open])

  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const root = dialogRef.current
    if (!root) return
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    )
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/60 light:bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`sheet-in relative flex w-full max-w-[640px] flex-col rounded-t-3xl border border-b-0 border-slate-800 bg-slate-900 outline-none light:border-slate-200 light:bg-white ${
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
