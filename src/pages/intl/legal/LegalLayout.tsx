import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { LEGAL } from './legalContent'

// پوسته‌ی مشترک ۴ صفحه‌ی عمومی حقوقی/اطلاعاتی (Privacy/Terms/Data Deletion/Status) — انگلیسی/LTR
export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 light:bg-white" dir="ltr">
      <header className="border-b border-slate-800 light:border-slate-200 px-5 py-3">
        <Link to="/" className="inline-block">
          <Logo variant="intl" className="h-7" />
        </Link>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="mb-1 text-2xl font-bold text-slate-100 light:text-slate-900">{title}</h1>
        <p className="mb-8 text-sm text-slate-500">Last updated: {LEGAL.lastUpdated}</p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-300 light:text-slate-700 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:light:text-slate-900 [&_a]:text-emerald-400 [&_a]:light:text-emerald-600 [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>

        <nav className="mt-12 flex flex-wrap gap-4 border-t border-slate-800 light:border-slate-200 pt-6 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-slate-300 light:hover:text-slate-700">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-300 light:hover:text-slate-700">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-slate-300 light:hover:text-slate-700">Data Deletion</Link>
          <Link to="/" className="hover:text-slate-300 light:hover:text-slate-700">Home</Link>
        </nav>
      </div>
    </div>
  )
}
