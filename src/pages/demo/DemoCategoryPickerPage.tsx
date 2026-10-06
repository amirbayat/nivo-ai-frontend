import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { DEMO_CATEGORY_LABELS } from '@/lib/demoCategories'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۷.۱/۷.۲/فاز ۴ —
// صفحه‌ی میانی انتخاب دسته، بین کارت Hub/ردیف Sidebar و فرم شماره‌ی DemoEntryPage.
// فقط نقش فروشنده (هر دو مقصد فعلی — کارت Hub و ردیف Sidebar — برای «برای فروشنده‌ها» هستند).
export function DemoCategoryPickerPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 light:bg-white px-4 pb-16 pt-10" dir="rtl">
      <Logo className="mb-8 w-36" />
      <div className="w-full max-w-xl text-center">
        <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{fa.demo.pickerHeading}</h1>
        <p className="mt-2 text-sm text-slate-500">{fa.demo.pickerSubheading}</p>
      </div>

      <div className="mt-8 flex w-full max-w-xl flex-wrap justify-center gap-2.5">
        {Object.entries(DEMO_CATEGORY_LABELS).map(([slug, label]) => (
          <button
            key={slug}
            type="button"
            onClick={() => {
              track('demo_category_picked', { category: slug })
              navigate(`/demo/seller/${slug}`)
            }}
            className="rounded-full border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-300 light:text-slate-700 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 light:hover:text-emerald-700"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
