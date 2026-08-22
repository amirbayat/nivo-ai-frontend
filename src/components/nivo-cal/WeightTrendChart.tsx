import { fa } from '@/locales/fa'
import type { WeightTrend } from '@/types/api'

const VIEW_W = 370
const VIEW_H = 95
const PAD_TOP = 15
const PAD_BOTTOM = 20
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM

interface WeightTrendChartProps {
  trend: WeightTrend
}

// نمودار خطی ساده‌ی SVG — بدون گرید سنگین، سازگار با پالت تیره (docs/PRD-nivo-cal.md
// بخش ۳.۳)؛ فاصله‌ی نقاط روی محور x بر اساس ایندکس است نه تاریخ واقعی (ساده‌سازی عمدی،
// چون فاصله‌ی ثبت وزن کاربر می‌تواند نامنظم باشد)
export function WeightTrendChart({ trend }: WeightTrendChartProps) {
  const { points, deltaKg, periodDays } = trend

  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 px-5 py-8 text-center">
        <p className="text-sm text-slate-500">{fa.nivoCalDashboard.weightTrendEmpty}</p>
      </div>
    )
  }

  const weights = points.map(p => p.weightKg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? VIEW_W / 2 : (i / (points.length - 1)) * VIEW_W
    const y = PAD_TOP + ((p.weightKg - min) / range) * PLOT_H
    return { x, y }
  })

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ')
  const areaPath = `M${coords[0].x},${VIEW_H - PAD_BOTTOM + 5} L${polylinePoints.split(' ').join(' L')} L${coords[coords.length - 1].x},${VIEW_H - PAD_BOTTOM + 5} Z`

  const improving = deltaKg <= 0

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 px-[18px] pb-3.5 pt-[18px]">
      {deltaKg !== 0 && (
        <div
          className="mb-3.5 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: improving ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)' }}
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-3" style={{ color: improving ? '#34d399' : '#fb7185' }}>
            <path
              d={improving ? 'M10 4v12M10 16l4-4M10 16l-4-4' : 'M10 16V4M10 4l4 4M10 4l-4 4'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-semibold" style={{ color: improving ? '#6ee7b7' : '#fda4af' }}>
            {fa.nivoCalDashboard.weightTrendDelta(deltaKg > 0 ? `+${deltaKg}` : `${deltaKg}`, periodDays)}
          </span>
        </div>
      )}
      <div dir="ltr" className="relative">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" className="block overflow-visible">
          <defs>
            <linearGradient id="weight-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#weight-trend-fill)" stroke="none" />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === coords.length - 1 ? 4 : 3}
              fill={i === coords.length - 1 ? '#34d399' : '#020617'}
              stroke="#34d399"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      {/* dir="ltr" عمدی — گذشته باید هم‌جهت با خط نمودار (چپ) باشد، امروز راست؛ بدون این override
          کانتینر RTL صفحه ترتیب این دو برچسب را برعکس نمودار نشان می‌داد */}
      <div dir="ltr" className="mt-1 flex justify-between">
        <span className="text-[11px] text-slate-600">{fa.nivoCalDashboard.periodStart(periodDays)}</span>
        <span className="text-[11px] text-slate-600">{fa.nivoCalDashboard.today}</span>
      </div>
    </div>
  )
}
