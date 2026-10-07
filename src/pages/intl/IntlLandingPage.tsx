import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  {
    title: 'Comment replies',
    description: 'Someone comments a keyword on your post — Nivo replies publicly and follows up with a DM.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 11-3.4-6.55M8.5 11.5h7M8.5 14.5h4.5" />,
  },
  {
    title: 'Story replies',
    description: 'Someone replies to your story — Nivo catches it and answers instantly, before you even open the app.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4.5 13.5H11L10 22l9-12.5h-7L13 2Z" />,
  },
  {
    title: 'Direct messages',
    description: 'A keyword shows up in a DM — Nivo sends the right answer back, around the clock.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m3 4 18 8-18 8 4-8-4-8Zm4 8h14" />,
  },
]

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۷.۳ — لندینگ ساده‌ی محدود به همین
// محصول (دایرکت هوشمند)، نه معرفی کل نیوو؛ عمومی/بدون auth، صفحه‌ی اصلی nivoai.site
export function IntlLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 light:bg-white" dir="ltr">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo variant="intl" className="h-7" />
        <Link to="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:pt-16">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nivo Smart DM</p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-slate-100 light:text-slate-900 sm:text-5xl">
              Reply to Instagram instantly — automatically.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-400 light:text-slate-600">
              Set keyword-based rules once. Nivo replies to comments, story mentions, and direct messages the moment
              they come in — no bots to train, no code to write.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link to="/login">
                <Button size="md">Get started</Button>
              </Link>
              <span className="text-xs text-slate-500">Free to try · 2-minute setup</span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 light:border-slate-200 light:bg-slate-50">
              <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-3 light:border-slate-200">
                <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#22E6A7] via-[#6D6BFF] to-[#A257FF] text-[11px] font-semibold text-white">
                  C
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-200 light:text-slate-800">customer.ig</p>
                  <p className="text-[11px] text-slate-500">Instagram DM</p>
                </div>
              </div>

              <div className="space-y-3 px-4 py-5">
                <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-slate-800 px-3.5 py-2 text-[13px] leading-snug text-slate-200 light:bg-slate-200 light:text-slate-800">
                  Hey! Do you ship worldwide?
                </div>

                <div className="flex items-center gap-1.5 pl-1 text-[11px] text-slate-500">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                    <path d="M13 2 4.5 13.5H11L10 22l9-12.5h-7L13 2Z" />
                  </svg>
                  keyword "shipping" detected
                </div>

                <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-emerald-500 px-3.5 py-2 text-[13px] leading-snug text-white">
                  Yes — we ship to 30+ countries. Free shipping over $50!
                </div>
                <p className="pr-1 text-right text-[11px] text-slate-600">Replied automatically in 1.2s</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-x-10 gap-y-12 border-t border-slate-900 pt-16 sm:grid-cols-3 light:border-slate-200">
          {FEATURES.map(f => (
            <div key={f.title}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="size-5 text-slate-500">
                {f.icon}
              </svg>
              <h2 className="mt-3 text-[15px] font-semibold text-slate-100 light:text-slate-900">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-slate-900 px-6 py-8 text-xs text-slate-600 light:border-slate-200">
        <nav className="flex flex-wrap gap-5">
          <Link to="/privacy" className="hover:text-slate-400 light:hover:text-slate-700">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-400 light:hover:text-slate-700">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-slate-400 light:hover:text-slate-700">Data Deletion</Link>
        </nav>
      </footer>
    </div>
  )
}
