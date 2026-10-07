import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  {
    title: 'Comment keyword replies',
    description: 'When someone comments a keyword on your post, automatically reply publicly and send them a DM.',
    accent: 'from-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 11-3.4-6.55M8.5 11.5h7M8.5 14.5h4.5" />
    ),
  },
  {
    title: 'Story reply automation',
    description: 'Catch replies to your stories and answer them automatically, instantly.',
    accent: 'from-sky-500/15 text-sky-400 ring-sky-500/20',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4.5 13.5H11L10 22l9-12.5h-7L13 2Z" />
    ),
  },
  {
    title: 'DM keyword automation',
    description: 'Detect keywords in incoming direct messages and send a ready-made answer.',
    accent: 'from-violet-500/15 text-violet-400 ring-violet-500/20',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 4 18 8-18 8 4-8-4-8Zm4 8h14" />
    ),
  },
]

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۷.۳ — لندینگ ساده‌ی محدود به همین
// محصول (دایرکت هوشمند)، نه معرفی کل نیوو؛ عمومی/بدون auth، صفحه‌ی اصلی nivoai.site
export function IntlLandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 light:bg-white" dir="ltr">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-[120px] light:opacity-20"
        style={{ background: 'radial-gradient(circle, #22E6A7 0%, #6D6BFF 45%, transparent 70%)' }}
      />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo variant="intl" className="h-7" />
        <Link to="/login">
          <Button variant="ghost" size="sm" className="ring-1 ring-slate-800 light:ring-slate-200">Sign in</Button>
        </Link>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-20 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Instagram automation
        </span>

        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-100 light:text-slate-900 sm:text-5xl">
          Nivo Smart DM
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-balance text-slate-400 light:text-slate-600">
          Automatically reply to Instagram comments, story replies, and direct messages with rules you set up in a couple of
          minutes — no bots to train, no code.
        </p>
        <Link to="/login">
          <Button className="mt-8 shadow-[0_0_30px_-8px_rgba(16,185,129,0.6)]" size="md">
            Get started
          </Button>
        </Link>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 p-5 transition-colors hover:border-slate-700 light:border-slate-200 light:hover:border-slate-300"
            >
              <div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-b ring-1 ${f.accent}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-5">
                  {f.icon}
                </svg>
              </div>
              <h2 className="mb-1.5 text-sm font-bold text-slate-100 light:text-slate-900">{f.title}</h2>
              <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative mx-auto max-w-2xl border-t border-slate-900 px-5 py-8 text-center text-xs text-slate-600 light:border-slate-100">
        <nav className="flex flex-wrap justify-center gap-4">
          <Link to="/privacy" className="hover:text-slate-400 light:hover:text-slate-700">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-400 light:hover:text-slate-700">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-slate-400 light:hover:text-slate-700">Data Deletion</Link>
        </nav>
      </footer>
    </div>
  )
}
