import { clsx } from 'clsx'
import { fa } from '@/locales/fa'

interface UsageGuideModalProps {
  open: boolean
  onClose: () => void
}

// برخلاف GatewayPickerModal/GiftModal، این کامپوننت وقتی بسته است هم return null نمی‌کند —
// محتوا (راهنما/نکات/FAQ) باید همیشه در DOM اولیه‌ی صفحه باشد تا کراولرها آن را ببینند؛
// نمایش/عدم‌نمایش فقط از طریق opacity/pointer-events کنترل می‌شود، نه mount/unmount.
export function UsageGuideModal({ open, onClose }: UsageGuideModalProps) {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: fa.anonChat.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: open ? 'blur(4px)' : undefined }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={fa.anonChat.modalTitle}
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 light:border-slate-200 light:bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-600 hover:text-slate-400 light:text-slate-400 light:hover:text-slate-600 transition-colors"
          aria-label={fa.anonChat.closeAria}
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="mb-4 text-base font-bold text-slate-100 light:text-slate-900">{fa.anonChat.modalTitle}</h3>

        <section className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-emerald-400 light:text-emerald-600">{fa.anonChat.howToTitle}</h4>
          <ol className="list-decimal space-y-1.5 pr-5 text-sm leading-relaxed text-slate-300 light:text-slate-700">
            {fa.anonChat.howToSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-emerald-400 light:text-emerald-600">{fa.anonChat.tipsTitle}</h4>
          <ul className="list-disc space-y-1.5 pr-5 text-sm leading-relaxed text-slate-300 light:text-slate-700">
            {fa.anonChat.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold text-emerald-400 light:text-emerald-600">{fa.anonChat.faqTitle}</h4>
          <div className="space-y-3">
            {fa.anonChat.faq.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-700/60 bg-slate-800/40 light:border-slate-200 light:bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-200 light:text-slate-900">{item.q}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 light:text-slate-500">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ساختار داده‌ی FAQPage — دقیقاً منطبق با محتوای بالا، بدون هیچ محتوای پنهان/متفاوت */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </div>
    </div>
  )
}
