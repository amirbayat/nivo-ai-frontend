import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import type { WeeklyAdherenceDay } from '@/types/api'

const BAR_COLOR: Record<WeeklyAdherenceDay['status'], string> = {
  under: 'bg-emerald-400',
  onTarget: 'bg-emerald-400',
  over: 'bg-rose-400',
  noData: 'bg-slate-700',
}

interface WeeklyAdherenceChartProps {
  days: WeeklyAdherenceDay[]
}

// نمودار میله‌ای هفته‌ی اخیر — هدف (ثابت) در برابر کالری واقعاً مصرف‌شده‌ی هر روز؛ گذشته
// چپ، امروز راست (dir="ltr" عمدی، هم‌راستا با WeightTrendChart) — هیچ کتابخانه‌ی چارتی در
// پروژه نیست، پس Tailwind-only با میله‌های div
export function WeeklyAdherenceChart({ days }: WeeklyAdherenceChartProps) {
  const tracked = days.filter(d => d.status !== 'noData')
  const success = tracked.filter(d => d.status === 'under' || d.status === 'onTarget').length

  const target = days[0]?.targetCalories ?? 0
  const maxVal = Math.max(target, ...days.map(d => d.consumedCalories), 1)
  const targetPct = Math.min(100, (target / maxVal) * 100)

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 px-[18px] py-[18px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold text-slate-100">{fa.nivoCalDashboard.weeklyAdherenceTitle}</h2>
        <span className="text-xs text-slate-500">
          {tracked.length > 0 ? fa.nivoCalDashboard.weeklyAdherenceSummary(success, tracked.length) : fa.nivoCalDashboard.weeklyAdherenceEmpty}
        </span>
      </div>

      <div dir="ltr" className="relative h-24">
        <div className="absolute inset-x-0 border-t border-dashed border-slate-500/40" style={{ bottom: `${targetPct}%` }} />
        <div className="flex h-full items-end gap-2">
          {days.map(d => (
            <div key={d.date} className="flex h-full flex-1 items-end">
              <div
                className={clsx('w-full rounded-t-[5px] transition-all', BAR_COLOR[d.status])}
                style={{ height: d.status === 'noData' ? '3px' : `${Math.max(4, (d.consumedCalories / maxVal) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div dir="ltr" className="mt-2 flex gap-2">
        {days.map(d => (
          <span key={d.date} className="flex-1 text-center text-[10px] text-slate-600">
            {new Date(d.date).toLocaleDateString('fa-IR', { weekday: 'short' })}
          </span>
        ))}
      </div>
    </div>
  )
}
