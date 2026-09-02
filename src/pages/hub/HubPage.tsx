import { useNavigate } from 'react-router-dom'

// docs/PRD-openrouter-migration.md §۱۳-۱۴ — نقطه‌ی ورود جدید بعد از لاگین (به‌جای ریدایرکت
// مستقیم به /chat). ویدیو عمداً غیرفعال/«به‌زودی» است — طبق تصمیم صریح کاربر، فلوی ویدیو باید
// جدا و با وفاداری بیشتر به Google Flow دوباره طراحی شود، فاز بعدی (docs/EXECUTION-PLAN.md).
export function HubPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute -right-24 -top-40 size-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 size-[360px] rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            امروز چیکار می‌تونم برات انجام بدم؟
          </h1>
          <p className="mt-2 text-sm text-slate-500">یکی از موارد زیر رو انتخاب کن تا شروع کنیم</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <HubCard
            title="تولید و ویرایش عکس"
            description="یه توصیف بنویس یا عکس آپلود کن؛ نتیجه رو در چند ثانیه ببین."
            accent="emerald"
            icon={<ImageIcon />}
            onClick={() => navigate('/image')}
          />
          <HubCard
            title="چت با هوش مصنوعی"
            description="سوال بپرس، متن بنویس یا با هم فکر کنیم — مثل یک دستیار متخصص."
            accent="violet"
            icon={<ChatIcon />}
            onClick={() => navigate('/chat')}
          />
          <HubCard
            title="تولید ویدیو"
            description="صحنه بساز، شخصیت بساز، ویدیوی کوتاه بگیر."
            accent="slate"
            icon={<VideoIcon />}
            badge="به‌زودی"
            disabled
          />
        </div>
      </div>
    </div>
  )
}

const ACCENTS = {
  emerald: {
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    glow: 'from-emerald-500/10',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    cta: 'text-emerald-400',
  },
  violet: {
    border: 'border-violet-500/30 hover:border-violet-500/50',
    glow: 'from-violet-500/10',
    iconBg: 'bg-violet-500/15 text-violet-300',
    cta: 'text-violet-300',
  },
  slate: {
    border: 'border-slate-700/60',
    glow: 'from-slate-500/5',
    iconBg: 'bg-slate-700/40 text-slate-500',
    cta: 'text-slate-500',
  },
} as const

function HubCard({ title, description, accent, icon, onClick, disabled, badge }: {
  title: string
  description: string
  accent: keyof typeof ACCENTS
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  badge?: string
}) {
  const a = ACCENTS[accent]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex flex-col gap-4 rounded-3xl border bg-gradient-to-b ${a.glow} to-transparent p-6 text-right transition-all ${a.border} ${
        disabled ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5'
      }`}
    >
      {badge && (
        <span className="absolute left-5 top-5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
          {badge}
        </span>
      )}
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${a.iconBg}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      {!disabled && (
        <div className={`mt-auto flex items-center gap-1.5 text-sm font-medium ${a.cta}`}>
          شروع کن
          {/* chevron-left — رفتن به جلو در RTL رو به چپ اشاره می‌کند (CLAUDE.md) */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
      <path d="M21 15.5l-5.2-5.2-9.3 9.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-4.5 7.4 8.5 8.5 0 0 1-8.9-.4L3 21l1.7-4.5a8.38 8.38 0 0 1-1.2-4.4 8.5 8.5 0 0 1 8.5-8.5h.3a8.48 8.48 0 0 1 8.5 8.4v.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <rect x="1.5" y="5.5" width="15" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <polygon points="22.5 7.5 16.5 12 22.5 16.5 22.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}
