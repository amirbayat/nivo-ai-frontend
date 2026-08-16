import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { UsageGuideModal } from '@/components/chat/UsageGuideModal'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { AnonSidebar } from '@/components/layout/AnonSidebar'
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight'
import { fa } from '@/locales/fa'
import logoUrl from '@/assets/brand/horizontal-dark.svg'

interface AnonChatLayoutProps {
  children: ReactNode
}

// لایوت سبک برای کاربر مهمان (بدون ثبت‌نام) — بدون سایدبار لیست مکالمات (چون کاربر مهمان
// همیشه دقیقاً یک مکالمه‌ی در حال انجام دارد)، اما با یک منوی کشویی سمت راست مشابه Sidebar.tsx
// کاربر لاگین‌کرده تا بشود بدون ثبت‌نام هم استودیوی محتوا/قیمت‌گذاری را اکسپلور کرد
// (AnonSidebar.tsx — بدون هیچ داده‌ی نیازمند لاگین)
//
// فوتر (شامل لینک /blog) همیشه در DOM زیر صفحه‌ی چت قرار دارد — برای ربات‌های گوگل
// قابل ایندکس است — اما چون کانتینر بیرونی overflow-y-hidden است، کاربر با اسکرول
// عادی (ویل/تاچ) به آن نمی‌رسد؛ فقط با کلیک روی دکمه‌ی شورون پایین scrollTo برنامه‌ای اجرا می‌شود.
export function AnonChatLayout({ children }: AnonChatLayoutProps) {
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { height, offsetTop } = useVisualViewportHeight()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [footerRevealed, setFooterRevealed] = useState(false)

  const revealFooter = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setFooterRevealed(true)
  }

  const scrollToTop = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: 'smooth' })
    setFooterRevealed(false)
  }

  return (
    // fixed (نه در جریان عادی سند) تا سافاری آیفون با فوکوس روی input چیزی برای اسکرول‌کردن
    // خود سند نداشته باشد — وگرنه آن اسکرول native با تغییر height بر اساس visualViewport
    // تداخل می‌کند و کل لایوت به‌هم می‌ریزد؛ اسکرول واقعی (نمایش فوتر) همچنان با scrollTo
    // برنامه‌ای روی همین عنصر انجام می‌شود
    <div
      ref={scrollRef}
      className="fixed inset-x-0 overflow-y-hidden bg-slate-900"
      style={{ top: offsetTop, height }}
    >
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50"
          aria-hidden="true"
        />
      )}

      <div
        className={clsx(
          'fixed inset-y-0 right-0 z-40 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <AnonSidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-col overflow-hidden" style={{ height }}>
        <header className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700/60 hover:text-emerald-400"
            aria-label="باز کردن منو"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <img src={logoUrl} alt="نیوو" className="w-28 h-auto" />

          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={() => navigate('/discover')}
              className="hidden rounded-lg px-3 py-1.5 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors sm:block"
            >
              {fa.chat.discover}
            </button>
            <button
              onClick={() => setGuideOpen(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors"
            >
              {fa.anonChat.usageGuide}
            </button>
            <Link
              to="/login"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              {fa.anonChat.loginSignup}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>

        {/* آیتم عادی فلکس (نه absolute) — با گرفتن جای خودش، main (و input داخلش)
            را کمی بالاتر جمع می‌کند تا هیچ‌وقت روی input overlap نشود */}
        {!footerRevealed && (
          <button
            onClick={revealFooter}
            aria-label="نمایش وبلاگ و اطلاعات بیشتر"
            className="flex h-8 w-full shrink-0 items-center justify-center text-slate-500 animate-bounce hover:text-emerald-400 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={scrollToTop}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
          بازگشت به گفتگو
        </button>
        <SiteFooter pricingHref="/landing#pricing" />
      </div>

      <UsageGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
