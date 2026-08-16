import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import logoUrl from '@/assets/brand/horizontal-dark.svg'

// نسخه‌ی سبک Sidebar.tsx برای کاربر مهمان — بدون هیچ داده‌ی نیازمند لاگین (useMe/useWallet/
// useConversations)، فقط لینک‌های عمومی که کاربر مهمان واقعاً می‌تواند ببیندشان: استودیوی
// محتوا (/discover — بدون ProtectedRoute)، قیمت‌گذاری (بخش عمومی لندینگ، نه /pricing که
// پشت ProtectedRoute است — دقیقاً همان الگوی SiteFooter در همین لایوت)، و ورود/ثبت‌نام
export function AnonSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const navigate = useNavigate()

  const go = (path: string, eventName?: string) => {
    if (eventName) track(eventName)
    navigate(path)
    onNavigate?.()
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-slate-700/50 bg-slate-900">
      <div className="flex items-center px-4 py-4 border-b border-slate-700/50">
        <img src={logoUrl} alt="نیوو" className="w-28 h-auto" />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <button
          onClick={() => go('/discover', 'discover_button_clicked')}
          className="flex w-full items-center gap-2.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/[0.06] px-3 py-2.5 text-right transition-colors hover:bg-fuchsia-500/10"
        >
          <div className="size-8 shrink-0 rounded-full bg-fuchsia-500/15 flex items-center justify-center text-fuchsia-300">
            <svg viewBox="0 0 20 20" fill="none" className="size-4">
              <path d="M10 2.5l1.4 4.2 4.2 1.4-4.2 1.4L10 13.7l-1.4-4.2-4.2-1.4 4.2-1.4L10 2.5z" fill="currentColor" />
              <path d="M15.5 12.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-sm font-medium text-fuchsia-200">{fa.chat.discover}</span>
        </button>

        <button
          onClick={() => go('/landing#pricing', 'pricing_nav_clicked')}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-slate-200"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700/50 text-slate-400">
            <svg viewBox="0 0 20 20" fill="none" className="size-4">
              <path
                d="M6 13.5v-7A1.5 1.5 0 017.5 5h5A1.5 1.5 0 0114 6.5v7"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
              />
              <path d="M4 13.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm">قیمت‌گذاری</span>
        </button>

        <button
          onClick={() => go('/landing', 'landing_nav_clicked')}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-slate-200"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-700/50 text-slate-400">
            <svg viewBox="0 0 20 20" fill="none" className="size-4">
              <path d="M3 10l7-6 7 6M5 8.5V16h10V8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm">درباره‌ی نیوو</span>
        </button>
      </div>

      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={() => go('/login', 'login_nav_clicked')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          {fa.anonChat.loginSignup}
        </button>
      </div>
    </aside>
  )
}
