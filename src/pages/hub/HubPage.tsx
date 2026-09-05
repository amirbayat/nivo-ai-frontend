import { useNavigate } from 'react-router-dom'
import logoUrl from '@/assets/brand/horizontal-dark.svg'

// docs/PRD-openrouter-migration.md §۱۳-۱۴ — نقطه‌ی ورود جدید بعد از لاگین (به‌جای ریدایرکت
// مستقیم به /chat). پیکسل‌به‌پیکسل مطابق آرتبورد Main.dc.html در دیزاین‌کنوس — شامل کارت
// ویدیو که به فلوی چت‌محور واقعی استودیوی ویدیو لینک می‌شود (docs/PRD-video-studio-chat-flow.md،
// VideoStudioPage روی مسیر /video).
export function HubPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#020C18', color: '#e2e8f0' }} dir="rtl">
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
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.10) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 900px 500px at 50% 30%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 900px 500px at 50% 30%, #000 0%, transparent 70%)',
        }}
      />

      {/* header */}
      <div className="relative flex items-center justify-between px-6 pt-8 sm:px-16">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="نیوو" className="h-8 w-auto" />
        </div>
      </div>

      {/* hero copy */}
      <div className="relative flex flex-col items-center px-6 pt-16 text-center sm:pt-[88px]">
        <h1 className="text-[28px] font-extrabold text-white sm:text-[46px]" style={{ letterSpacing: '-0.5px' }}>
          امروز چیکار می‌تونم برات انجام بدم؟
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px]" style={{ color: '#94a3b8' }}>
          یکی از موارد زیر رو انتخاب کن تا شروع کنیم
        </p>
      </div>

      {/* cards */}
      <div className="relative flex flex-col flex-wrap items-center justify-center gap-5 px-6 pt-12 pb-16 sm:flex-row sm:gap-7 sm:pt-16">
        <HubCard
          title="تولید و ویرایش عکس"
          description="یه توصیف بنویس یا عکس آپلود کن؛ نتیجه رو در چند ثانیه ببین."
          accentColor="#10b981"
          borderColor="rgba(16,185,129,0.30)"
          glowColor="rgba(16,185,129,0.08)"
          gradientColor="rgba(16,185,129,0.10)"
          iconBg="rgba(16,185,129,0.14)"
          iconColor="#34d399"
          icon={<ImageIcon />}
          onClick={() => navigate('/image')}
        />
        <HubCard
          title="چت با هوش مصنوعی"
          description="سوال بپرس، متن بنویس یا با هم فکر کنیم — مثل یک دستیار متخصص."
          accentColor="#a78bfa"
          borderColor="rgba(124,58,237,0.28)"
          glowColor="rgba(124,58,237,0.07)"
          gradientColor="rgba(124,58,237,0.10)"
          iconBg="rgba(124,58,237,0.16)"
          iconColor="#a78bfa"
          icon={<ChatIcon />}
          onClick={() => navigate('/chat')}
        />
        <HubCard
          title="تولید ویدیو"
          description="داستانتو بگو، کاراکتر بساز، استوری‌برد بچین و ویدیوی هر صحنه رو بگیر."
          accentColor="#38bdf8"
          borderColor="rgba(14,165,233,0.28)"
          glowColor="rgba(14,165,233,0.07)"
          gradientColor="rgba(14,165,233,0.10)"
          iconBg="rgba(14,165,233,0.16)"
          iconColor="#38bdf8"
          icon={<VideoIcon />}
          onClick={() => navigate('/video')}
        />
        <HubCard
          title="زیرنویس خودکار ویدیو"
          description="ویدیوت رو آپلود کن، زیرنویس خودکار با استایل دلخواه بگیر."
          accentColor="#f59e0b"
          borderColor="rgba(245,158,11,0.28)"
          glowColor="rgba(245,158,11,0.07)"
          gradientColor="rgba(245,158,11,0.10)"
          iconBg="rgba(245,158,11,0.16)"
          iconColor="#fbbf24"
          icon={<CaptionsIcon />}
          onClick={() => navigate('/captions')}
        />
      </div>
    </div>
  )
}

function HubCard({ title, description, accentColor, borderColor, glowColor, gradientColor, iconBg, iconColor, icon, onClick }: {
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-[18px] text-right transition-transform hover:-translate-y-0.5 sm:w-[360px]"
      style={{
        borderRadius: 28,
        padding: '36px 30px',
        background: `linear-gradient(180deg, ${gradientColor}, rgba(2,12,24,0))`,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 50px ${glowColor}`,
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: 56, height: 56, borderRadius: 16, background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[21px] font-bold text-white">{title}</div>
        <div className="mt-2 text-[14.5px] leading-[1.9]" style={{ color: '#94a3b8' }}>{description}</div>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold" style={{ color: accentColor }}>
        شروع کن
        {/* chevron-left — رفتن به جلو در RTL رو به چپ اشاره می‌کند (CLAUDE.md) */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
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

function VideoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="5.5" width="15" height="13" rx="2.5" /><polygon points="22.5 7.5 16.5 12 22.5 16.5 22.5 7.5" />
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
