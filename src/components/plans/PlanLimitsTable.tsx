import type { Plan } from '@/types/api'
import type { ModelCatalogEntry } from '@/queries/plans.queries'
import { imageGenSupport } from '@/lib/plan-copy'

function fmt(n: number): string {
  return n.toLocaleString('fa-IR')
}

interface Row {
  label: string
  render: (plan: Plan, modelCatalog: ModelCatalogEntry[] | undefined) => string
}

const ROWS: Row[] = [
  {
    label: 'قیمت ماهانه',
    render: p => (p.priceMonthly === 0 ? 'رایگان' : `${fmt(p.priceMonthly)} تومان`),
  },
  {
    label: 'توکن رایگان روزانه',
    render: p => (p.dailyFreeTokens > 0 ? fmt(p.dailyFreeTokens) : '—'),
  },
  {
    label: 'توکن ماهانه',
    render: p => (p.monthlyTotalTokens > 0 ? fmt(p.monthlyTotalTokens) : '—'),
  },
  {
    label: 'تعداد مدل‌های مجاز',
    render: p => `${p.allowedModels.length} مدل`,
  },
  {
    label: 'سقف پیام روزانه (عادی)',
    render: p => (p.dailyMessageLimit != null ? `${fmt(p.dailyMessageLimit)} پیام` : 'نامحدود'),
  },
  {
    label: 'محدودیت پنجره‌ی لغزان',
    render: p => (p.rollingWindowLimit != null
      ? `محدودیت هر ${fmt(p.rollingWindowHours)} ساعت ${fmt(p.rollingWindowLimit)} پیام`
      : 'غیرفعال'),
  },
  {
    label: 'تولید عکس روزانه',
    render: (p, modelCatalog) => {
      const support = imageGenSupport(p, modelCatalog)
      if (!support.supported) return '—'
      return support.maxPerDay != null ? `${fmt(support.maxPerDay)} عکس` : 'نامحدود'
    },
  },
]

export function PlanLimitsTable({ plans, modelCatalog }: { plans: Plan[]; modelCatalog: ModelCatalogEntry[] | undefined }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800" dir="rtl">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-800/60">
            <th className="p-4 text-right font-medium text-slate-400">ویژگی</th>
            {plans.map(p => (
              <th key={p.id} className="p-4 text-right font-bold text-slate-100">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'}>
              <td className="p-4 text-right text-slate-400">{row.label}</td>
              {plans.map(p => (
                <td key={p.id} className="p-4 text-right text-slate-200">{row.render(p, modelCatalog)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
