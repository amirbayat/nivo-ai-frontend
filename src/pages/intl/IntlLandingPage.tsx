import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  {
    title: 'Comment keyword replies',
    description: 'When someone comments a keyword on your post, automatically reply publicly and send them a DM.',
  },
  {
    title: 'Story reply automation',
    description: 'Catch replies to your stories and answer them automatically, instantly.',
  },
  {
    title: 'DM keyword automation',
    description: 'Detect keywords in incoming direct messages and send a ready-made answer.',
  },
]

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۷.۳ — لندینگ ساده‌ی محدود به همین
// محصول (دایرکت هوشمند)، نه معرفی کل نیوو؛ عمومی/بدون auth، صفحه‌ی اصلی nivoai.site
export function IntlLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 light:bg-white" dir="ltr">
      <header className="flex items-center justify-between px-5 py-4">
        <Logo className="h-7" />
        <Link to="/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-100 light:text-slate-900">Nivo Smart DM</h1>
        <p className="mx-auto mt-4 max-w-lg text-slate-400 light:text-slate-600">
          Automatically reply to Instagram comments, story replies, and direct messages with rules you set up in a couple of
          minutes — no bots to train, no code.
        </p>
        <Link to="/login">
          <Button className="mt-8">Get started</Button>
        </Link>

        <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border border-slate-800 light:border-slate-200 p-5">
              <h2 className="mb-1.5 text-sm font-bold text-slate-100 light:text-slate-900">{f.title}</h2>
              <p className="text-sm text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-2xl px-5 py-8 text-center text-xs text-slate-600">
        <nav className="flex flex-wrap justify-center gap-4">
          <Link to="/privacy" className="hover:text-slate-400 light:hover:text-slate-700">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-400 light:hover:text-slate-700">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-slate-400 light:hover:text-slate-700">Data Deletion</Link>
        </nav>
      </footer>
    </div>
  )
}
