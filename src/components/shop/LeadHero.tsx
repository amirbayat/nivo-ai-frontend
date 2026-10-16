import { fa } from '@/locales/fa'

// docs/PRD-nivo-lead-shop-seller-signup.md §4.1 — صفحه‌ی اول حالت لید (قبل از هر پیام). ثابت در fa.shop.lead؛ بدون فراخوانی مدل
export function LeadHero() {
  const t = fa.shop.lead
  return (
    <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-5 pb-4 pt-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--shop-surface-2)]">
        <img src="/brand2/favicon.svg" alt="" className="h-7 w-9" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold leading-8 text-[var(--shop-text)]">{t.heroTitle}</h1>
        <p className="max-w-sm text-[15px] leading-7 text-[var(--shop-text-2)]">{t.heroSub}</p>
      </div>
      <ul className="flex w-full max-w-sm flex-col gap-2.5 text-start text-sm text-[var(--shop-text)]">
        {t.heroBullets.map((line) => (
          <li key={line} className="flex items-start gap-2.5">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 size-5 shrink-0 text-[var(--shop-accent)]" aria-hidden>
              <path d="m5 10.5 3.2 3.2L15 6.8" />
            </svg>
            <span className="leading-6">{line}</span>
          </li>
        ))}
      </ul>
      <div className="w-full max-w-sm rounded-2xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-4 py-3 text-start">
        <p className="text-sm font-bold text-[var(--shop-text)]">{t.guideTitle}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--shop-text-2)]">{t.guideBody}</p>
      </div>
    </div>
  )
}
