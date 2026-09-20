import { Link } from 'react-router-dom'
import { env } from '@/env'

function EnamadBadge() {
  const { VITE_ENAMAD_ID: id, VITE_ENAMAD_CODE: code } = env
  if (!id || !code) return null

  const href = `https://trustseal.enamad.ir/?id=${id}&Code=${code}`
  const src = `https://trustseal.enamad.ir/logo.aspx?id=${id}&Code=${code}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      referrerPolicy="origin"
      className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm"
    >
      <img
        referrerPolicy="origin"
        src={src}
        alt="نماد اعتماد الکترونیکی"
        data-code={code}
        width={56}
        height={56}
        className="h-14 w-14 cursor-pointer object-contain"
      />
    </a>
  )
}

// فوتر مشترک لندینگ و چت مهمان — لینک /blog همیشه در DOM حاضر است (حتی وقتی
// این بخش با overflow-hidden از دید کاربر پنهان است) تا ربات‌های گوگل آن را ایندکس کنند.
export function SiteFooter({ pricingHref = '#pricing' }: { pricingHref?: string }) {
  return (
    <footer className="border-t border-white/5 light:border-slate-200 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
        <span>
          <span className="text-emerald-400/70 light:text-emerald-600 font-bold">ni</span>
          <span className="font-bold light:text-slate-900">vo</span>
          {' '}· دستیار هوش مصنوعی
        </span>
        <div className="flex items-center gap-6">
          <a href={pricingHref} className="hover:text-slate-400 light:hover:text-slate-900 transition-colors">قیمت‌ها</a>
          <a href="/blog" className="hover:text-slate-400 light:hover:text-slate-900 transition-colors">وبلاگ</a>
          <Link to="/login" className="hover:text-slate-400 light:hover:text-slate-900 transition-colors">ورود</Link>
          <Link
            to="/contact"
            data-track="landing_contact_click"
            className="rounded-full border border-white/10 light:border-slate-300 px-4 py-1.5 text-slate-400 light:text-slate-600 hover:border-emerald-500/50 hover:text-emerald-400 light:hover:text-emerald-600 transition-colors"
          >
            تماس با ما
          </Link>
        </div>
        <EnamadBadge />
      </div>
    </footer>
  )
}
