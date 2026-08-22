interface MacroRingProps {
  proteinG: number
  carbsG: number
  fatG: number
  totalCalories: number
}

const SIZE = 140
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// دونات یک‌حلقه‌ای، تفکیک‌شده بر اساس سهم کالری هر ماکرو (نه گرم خام) — پروتئین/کربوهیدرات
// ۴ کالری به‌ازای هر گرم، چربی ۹ کالری به‌ازای هر گرم؛ سهم واقعی از کل کالری معنادارتر از
// مقایسه‌ی مستقیم گرم‌هاست (docs/PRD-nivo-cal.md بخش ۲.۱ — «حلقه‌ی سه‌رنگ ماکرو»)
export function MacroRing({ proteinG, carbsG, fatG, totalCalories }: MacroRingProps) {
  const proteinKcal = proteinG * 4
  const carbsKcal = carbsG * 4
  const fatKcal = fatG * 9
  const sum = proteinKcal + carbsKcal + fatKcal || 1

  const segments = [
    { kcal: proteinKcal, color: 'stroke-emerald-400' },
    { kcal: carbsKcal, color: 'stroke-amber-400' },
    { kcal: fatKcal, color: 'stroke-sky-400' },
  ]

  let offsetSoFar = 0

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-slate-800"
        />
        {segments.map((seg, i) => {
          const fraction = seg.kcal / sum
          const dash = fraction * CIRCUMFERENCE
          const gap = CIRCUMFERENCE - dash
          const dashoffset = -offsetSoFar
          offsetSoFar += dash
          if (dash <= 0) return null
          return (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={dashoffset}
              className={seg.color}
            />
          )
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-100" dir="ltr">~{totalCalories}</span>
        <span className="text-[11px] text-slate-500">کالری</span>
      </div>
    </div>
  )
}
