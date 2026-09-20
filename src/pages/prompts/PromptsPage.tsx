import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiscoveryCatalog } from '@/queries/discovery.queries'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SiteFooter } from '@/components/layout/SiteFooter'
import type { CreativePromptCatalogItem } from '@/types/api'

type Tab = 'ALL' | 'IMAGE' | 'VIDEO'

// docs/PRD-daily-content-prompt-agent.md بخش ۷ — بخش عمومی «پرامپت‌های روز»، بدون نیاز به
// لاگین قابل‌دیدن است. پرامپت‌های کشف‌شده‌ی ایجنت همان ردیف‌های CreativePrompt هستند
// (sourceType=AGENT_DISCOVERED)، پس همان GET /v2/discovery/catalog موجود با فیلتر
// sourceType استفاده می‌شود — نه endpoint جدا. هر کارت دو دکمه دارد: «کپی پرامپت» (کلیپ‌بورد) و
// «استفاده از پرامپت» که به /studio?id=... می‌رود، دقیقاً همان دیپ‌لینک عمومی تست‌شده‌ی
// StudioLinkPage (گارد لاگین/بازگشت خودش را دارد — مهمان به /login و بعد از OTP به همین پرامپت برمی‌گردد).
// فاز ۱ فقط عکس است — VIDEO در CreativeOutputType هنوز وجود ندارد (تصمیم کاربر)، پس تب
// «ویدیو» فعلاً یک حالت «به‌زودی» خالی نشان می‌دهد.
export function PromptsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ALL')
  const isLoggedIn = !!localStorage.getItem('access_token')

  const { data: prompts, isLoading } = useDiscoveryCatalog({
    outputType: tab === 'VIDEO' ? undefined : tab === 'IMAGE' ? 'IMAGE' : undefined,
    sourceType: 'AGENT_DISCOVERED',
  })
  const visiblePrompts = tab === 'VIDEO' ? [] : (prompts ?? [])

  // همان الگوی HubPage.goToSection — مقصد را قبل از رفتن به /login نگه می‌داریم تا OtpPage
  // بعد از ورود موفق کاربر را مستقیم به همان دیپ‌لینک پرامپت برگرداند
  function goToSection(path: string) {
    if (!isLoggedIn) {
      sessionStorage.setItem('nivo:pendingReturnPath', path)
      navigate('/login')
      return
    }
    navigate(path)
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--studio-bg)', color: 'var(--text-primary)' }} dir="rtl">
      <div
        className="pointer-events-none absolute"
        style={{ width: 640, height: 640, top: -260, left: -120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 70%)', filter: 'blur(10px)' }}
      />
      <div
        className="pointer-events-none absolute"
        style={{ width: 560, height: 560, bottom: -220, right: -140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.14), transparent 70%)', filter: 'blur(10px)' }}
      />

      {/* header */}
      <div className="relative flex items-center justify-between px-6 pt-8 sm:px-16">
        <Logo className="h-11 w-auto sm:h-14" />
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => { track('login_nav_clicked'); navigate('/login') }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              {fa.anonChat.loginSignup}
            </button>
          )}
        </div>
      </div>

      {/* hero */}
      <div className="relative flex flex-col items-center px-6 pt-14 text-center sm:pt-16">
        <div
          className="mb-5 flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(14,165,233,0.16)', color: 'var(--sky-soft-text)' }}
        >
          <PromptIcon />
        </div>
        <h1 className="text-[28px] font-extrabold text-white light:text-slate-900 sm:text-[36px]" style={{ letterSpacing: '-0.4px' }}>
          پرامپت‌های روز
        </h1>
        <p className="mt-3.5 max-w-[480px] text-[15px] leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
          هر روز چند پرامپت خوب از سراسر وب، برای عکس و ویدیو — بازنویسی‌شده و آماده‌ی امتحان‌کردن روی استودیوی نیوو.
        </p>
      </div>

      {/* tabs */}
      <div className="relative flex items-center justify-center gap-2.5 px-6 pt-8">
        {([
          ['ALL', 'همه'],
          ['IMAGE', 'عکس'],
          ['VIDEO', 'ویدیو'],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className="rounded-full px-5 py-2.5 text-sm font-bold transition-colors"
            style={
              tab === value
                ? { background: '#38bdf8', color: '#020C18', border: '1px solid #38bdf8' }
                : { background: 'rgba(var(--neutral-rgb),0.08)', color: 'var(--text-secondary)', border: '1px solid rgba(var(--neutral-rgb),0.16)', fontWeight: 600 }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="relative mx-auto max-w-[1312px] px-6 pb-16 pt-11 sm:px-16">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        ) : visiblePrompts.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {tab === 'VIDEO' ? 'پرامپت‌های ویدیو به‌زودی اضافه می‌شوند' : 'فعلاً پرامپتی ثبت نشده — به‌زودی برمی‌گردیم'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePrompts.map(item => (
              <PromptCard key={item.id} item={item} onTry={() => goToSection(`/studio?id=${item.id}`)} />
            ))}
          </div>
        )}
      </div>

      <SiteFooter pricingHref="/landing#pricing" />
    </div>
  )
}

function PromptCard({ item, onTry }: { item: CreativePromptCatalogItem; onTry: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    if (!item.userPromptTemplate) return
    try {
      await navigator.clipboard.writeText(item.userPromptTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // کلیپ‌بورد در دسترس نبود — چیزی برای انجام نیست
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[20px] transition-transform hover:-translate-y-1"
      style={{ border: '1px solid rgba(var(--neutral-rgb),0.14)', background: 'rgba(var(--neutral-rgb),0.02)' }}
    >
      <div className="relative flex h-[210px] items-center justify-center" style={{ background: 'linear-gradient(135deg, #fb7185, #6b1e35)' }}>
        {item.exampleImageUrl ? (
          <img src={item.exampleImageUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholderIcon />
        )}
        <div
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-white"
          style={{ background: 'rgba(2,12,24,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <span className="size-1.5 rounded-full" style={{ background: '#34d399' }} />
          عکس
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="text-[16px] font-bold text-white light:text-slate-900">{item.title}</div>
        {item.description && (
          <p className="-mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {item.description}
          </p>
        )}
        {item.userPromptTemplate && (
          <div
            className="rounded-xl p-3.5 text-[13px] leading-[1.8]"
            style={{ background: 'rgba(var(--neutral-rgb),0.06)', border: '1px solid rgba(var(--neutral-rgb),0.12)', color: 'var(--studio-icon-text)' }}
          >
            {item.userPromptTemplate}
          </div>
        )}
        <div className="mt-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!item.userPromptTemplate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl p-3 text-sm font-bold transition-colors disabled:opacity-40"
            style={{ background: 'rgba(var(--neutral-rgb),0.1)', color: copied ? 'var(--brand)' : 'var(--text-primary)', border: '1px solid rgba(var(--neutral-rgb),0.18)' }}
          >
            <CopyIcon />
            {copied ? 'کپی شد' : 'کپی پرامپت'}
          </button>
          <button
            type="button"
            onClick={onTry}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl p-3 text-sm font-bold transition-[filter] hover:brightness-110"
            style={{ background: '#38bdf8', color: '#020C18' }}
          >
            استفاده از پرامپت
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function PromptIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.7L18 9l-4.4 1.7L12 15l-1.6-4.3L6 9l4.4-1.3L12 3z" />
      <path d="M18.5 15l.8 2.3L21.5 18l-2.2.9-.8 2.1-.8-2.1L16.5 18l2.2-.7.8-2.3z" />
    </svg>
  )
}

function ImagePlaceholderIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15.5l-5.2-5.2-9.3 9.3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}
