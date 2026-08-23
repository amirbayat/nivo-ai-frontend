import { Link } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { env } from '@/env'
import { fa } from '@/locales/fa'

function IconScan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconMacros() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12l4-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconStreak() {
  return <span className="text-[19px] leading-none">🔥</span>
}

const FEATURES = [
  { icon: <IconScan />, key: 'scan' as const },
  { icon: <IconMacros />, key: 'macros' as const },
  { icon: <IconDashboard />, key: 'dashboard' as const },
  { icon: <IconStreak />, key: 'streak' as const },
]

export function NivoCalIntroPage() {
  // useMe فقط وقتی توکن هست فعال می‌شود (auth.queries.ts) — برای بازدیدکننده‌ی مهمان
  // درخواستی زده نمی‌شود؛ صرفاً برای تشخیص «کاربر لاگین‌کرده» تا CTA مقصد درستی داشته باشد
  const { data: me } = useMe()
  const isLoggedIn = !!me
  const t = fa.nivoCalIntro

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-16 pt-8 text-slate-100" dir="rtl">
      <div className="mx-auto max-w-lg">

        <div className="mb-8 flex items-center justify-center">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
            <span className="text-emerald-400">ni</span>vo
          </Link>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-400">
            {t.eyebrow}
          </span>
          <h1 className="mt-4 text-2xl font-extrabold leading-relaxed text-white">
            {t.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {t.subtitle}
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-[20px] border border-slate-700/60 bg-black">
          <video
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            src={`${env.VITE_API_URL}/nivo-cal/public/tutorial-video`}
          >
            {t.videoFallback}
          </video>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div key={f.key} className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                {f.icon}
              </div>
              <h3 className="text-[13.5px] font-bold text-slate-100">{t.features[f.key].title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{t.features[f.key].desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center">
          <Link
            to={isLoggedIn ? '/nivo-cal' : '/login'}
            data-track="nivo_cal_intro_cta_click"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-base font-semibold text-white transition-all active:scale-95 hover:bg-emerald-400"
          >
            {isLoggedIn ? t.ctaLoggedIn : t.ctaLoggedOut}
          </Link>
          {!isLoggedIn && (
            <Link to="/login" className="mt-4 text-sm text-slate-400 underline underline-offset-4">
              {t.secondaryCta}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
