import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SiteFooter } from '@/components/layout/SiteFooter'

// Main entry for logged-in users and guests (router/index.tsx: HomeRoute).
// Card order: video studio, image studio, chat, auto captions, Nivo Cal.
// Video studio goes to VideoStudioPage at /video. Nivo Cal opens cal.nivoai.ir
// (separate app, own auth) and does not send guests through this domain's /login.
export function HubPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navigate = useNavigate()

  // کاربر مهمان با کلیک روی هر کارت باید اول لاگین کند و بعد دقیقاً همان مقصد را ببیند —
  // مسیر مقصد را قبل از رفتن به /login نگه می‌داریم (همان کلید و الگوی pendingReturnPath که
  // برای بازگشت بعد از درگاه پرداخت در CallbackPage.tsx استفاده می‌شود)؛ OtpPage بعد از ورود
  // موفق آن را می‌خواند و کاربر را به همان‌جا برمی‌گرداند.
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
        style={{ width: 640, height: 640, top: -260, left: -120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.20), transparent 70%)', filter: 'blur(10px)' }}
      />
      <div
        className="pointer-events-none absolute"
        style={{ width: 560, height: 560, bottom: -220, right: -140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.16), transparent 70%)', filter: 'blur(10px)' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(var(--neutral-rgb),0.10) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 900px 500px at 50% 30%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 900px 500px at 50% 30%, #000 0%, transparent 70%)',
        }}
      />

      {/* header */}
      <div className="relative flex items-center justify-between px-6 pt-8 sm:px-16">
        <div className="flex items-center gap-2.5">
          <Logo className="h-11 w-auto sm:h-14" />
        </div>
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

      {/* hero copy */}
      <div className="relative flex flex-col items-center px-6 pt-16 text-center sm:pt-[88px]">
        <h1 className="text-[28px] font-extrabold text-white light:text-slate-900 sm:text-[46px]" style={{ letterSpacing: '-0.5px' }}>
          امروز چیکار می‌تونم برات انجام بدم؟
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px]" style={{ color: 'var(--text-secondary)' }}>
          یکی از موارد زیر رو انتخاب کن تا شروع کنیم
        </p>
      </div>

      {/* cards */}
      <div className="relative flex flex-col flex-wrap items-center justify-center gap-5 px-6 pt-12 pb-16 sm:flex-row sm:gap-7 sm:pt-16">
        <HubCard
          title="استودیو فیلم"
          description="یه ویدیو از پرامپت و عکس بساز، یا یه ویدیوی موجود رو ویرایش کن — همه با یه فرم واحد."
          accentColor="var(--rose-soft-text)"
          borderColor="rgba(244,63,94,0.28)"
          glowColor="rgba(244,63,94,0.07)"
          gradientColor="rgba(244,63,94,0.10)"
          iconBg="rgba(244,63,94,0.16)"
          iconColor="var(--rose-soft-text)"
          icon={<VideoEditIcon />}
          onClick={() => goToSection('/video')}
        />
        <HubCard
          title="استودیو عکس"
          description="یه توصیف بنویس یا عکس آپلود کن؛ نتیجه رو در چند ثانیه ببین."
          accentColor="var(--brand)"
          borderColor="rgba(16,185,129,0.30)"
          glowColor="rgba(16,185,129,0.08)"
          gradientColor="rgba(16,185,129,0.10)"
          iconBg="rgba(16,185,129,0.14)"
          iconColor="var(--brand)"
          icon={<ImageIcon />}
          onClick={() => goToSection('/image')}
        />
        <HubCard
          title="چت"
          description="سوال بپرس، متن بنویس یا با هم فکر کنیم — مثل یک دستیار متخصص."
          accentColor="var(--purple-soft-text)"
          borderColor="rgba(124,58,237,0.28)"
          glowColor="rgba(124,58,237,0.07)"
          gradientColor="rgba(124,58,237,0.10)"
          iconBg="rgba(124,58,237,0.16)"
          iconColor="var(--purple-soft-text)"
          icon={<ChatIcon />}
          onClick={() => goToSection('/chat')}
        />
        <HubCard
          title="کپشن اتوماتیک"
          description="ویدیوت رو آپلود کن، زیرنویس خودکار با استایل دلخواه بگیر."
          accentColor="var(--amber-text)"
          borderColor="rgba(245,158,11,0.28)"
          glowColor="rgba(245,158,11,0.07)"
          gradientColor="rgba(245,158,11,0.10)"
          iconBg="rgba(245,158,11,0.16)"
          iconColor="var(--amber-text)"
          icon={<CaptionsIcon />}
          onClick={() => goToSection('/captions')}
        />
        <HubCard
          title="پرامپت‌های روز"
          description="هر روز چند پرامپت خوب از سراسر وب — عکس و ویدیو، آماده‌ی امتحان‌کردن."
          accentColor="var(--sky-soft-text)"
          borderColor="rgba(14,165,233,0.28)"
          glowColor="rgba(14,165,233,0.08)"
          gradientColor="rgba(14,165,233,0.10)"
          iconBg="rgba(14,165,233,0.16)"
          iconColor="var(--sky-soft-text)"
          icon={<PromptsIcon />}
          onClick={() => navigate('/prompts')}
        />
        <HubCard
          title="نیوو کالری"
          description="از غذات عکس بگیر تا کالری و مواد مغذیش رو دقیق ببینی."
          accentColor="var(--cyan-soft-text)"
          borderColor="rgba(6,182,212,0.28)"
          glowColor="rgba(6,182,212,0.07)"
          gradientColor="rgba(6,182,212,0.10)"
          iconBg="rgba(6,182,212,0.16)"
          iconColor="var(--cyan-soft-text)"
          icon={<CalorieIcon />}
          href="https://cal.nivoai.ir"
          onClick={() => track('nivo_cal_nav_clicked')}
        />
      </div>

      <SiteFooter pricingHref="/landing#pricing" />
    </div>
  )
}

function HubCard({ title, description, accentColor, borderColor, glowColor, gradientColor, iconBg, iconColor, icon, onClick, href }: {
  title: string
  description: string
  accentColor: string
  borderColor: string
  glowColor: string
  gradientColor: string
  iconBg: string
  iconColor: string
  icon: React.ReactNode
  onClick: () => void
  href?: string
}) {
  const className = 'group flex w-full flex-col gap-[18px] text-right transition-transform hover:-translate-y-0.5 sm:w-[360px]'
  const style = {
    borderRadius: 28,
    padding: '36px 30px',
    background: `linear-gradient(180deg, ${gradientColor}, rgba(2,12,24,0))`,
    border: `1px solid ${borderColor}`,
    boxShadow: `0 0 50px ${glowColor}`,
  }
  const body = (
    <>
      <div
        className="flex items-center justify-center"
        style={{ width: 56, height: 56, borderRadius: 16, background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[21px] font-bold text-white light:text-slate-900">{title}</div>
        <div className="mt-2 text-[14.5px] leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>{description}</div>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: accentColor }}>
        شروع کن
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className} style={style}>
        {body}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {body}
    </button>
  )
}

function ImageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15.5l-5.2-5.2-9.3 9.3" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-4.5 7.4 8.5 8.5 0 0 1-8.9-.4L3 21l1.7-4.5a8.38 8.38 0 0 1-1.2-4.4 8.5 8.5 0 0 1 8.5-8.5h.3a8.48 8.48 0 0 1 8.5 8.4v.5z" />
    </svg>
  )
}

function CaptionsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4.5" width="20" height="15" rx="2.5" /><path d="M6.5 15h4M13 15h4.5M6.5 11.5h11" />
    </svg>
  )
}

function VideoEditIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="15" height="14" rx="2.5" />
      <path d="M18 9.5l3.5-2v9L18 14.5" />
    </svg>
  )
}

function PromptsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.7L18 9l-4.4 1.7L12 15l-1.6-4.3L6 9l4.4-1.3L12 3z" />
      <path d="M18.5 15l.8 2.3L21.5 18l-2.2.9-.8 2.1-.8-2.1L16.5 18l2.2-.7.8-2.3z" />
    </svg>
  )
}

function CalorieIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  )
}
