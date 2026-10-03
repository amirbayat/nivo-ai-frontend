import { useState } from 'react'
import { fa } from '@/locales/fa'

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۲.۳ — فقط یک صفحه‌ی FAQ ثابت،
// بدون جستجو/دسته‌بندی/بک‌اند — محتوا در fa.seller.panel.helpCenter.faq
export function SellerHelpCenterPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.helpCenter.title}</h1>

      <div className="flex flex-col gap-2.5">
        {fa.seller.panel.helpCenter.faq.map((item, i) => {
          const open = openIndex === i
          return (
            <div key={i} className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white">
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start"
              >
                <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{item.q}</span>
                <ChevronDown open={open} />
              </button>
              {open && (
                <p className="px-4 pb-4 text-[13px] leading-relaxed text-slate-400 light:text-slate-600">{item.a}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
