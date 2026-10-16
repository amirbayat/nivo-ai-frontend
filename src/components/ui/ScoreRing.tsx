import { clsx } from 'clsx'

export type ScoreLevel = 'weak' | 'ok' | 'good' | 'great'

const SIZE = 56
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

const COLOR: Record<ScoreLevel, string> = {
  weak: 'stroke-red-400 light:stroke-red-500',
  ok: 'stroke-amber-400 light:stroke-amber-500',
  good: 'stroke-emerald-400 light:stroke-emerald-500',
  great: 'stroke-emerald-500 light:stroke-emerald-600',
}

// حلقه‌ی امتیاز آمادگی (الگوی MacroRing)؛ عدد با ارقام فارسی
export function ScoreRing({ score, level, className }: { score: number; level: ScoreLevel; className?: string }) {
  const pct = Math.max(0, Math.min(100, score))
  return (
    <div className={clsx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: SIZE, height: SIZE }} role="img" aria-label={pct.toLocaleString('fa-IR')}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-slate-800 light:stroke-slate-200" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct / 100)}
          className={clsx('transition-all', COLOR[level])}
        />
      </svg>
      <span className="absolute text-sm font-extrabold text-slate-100 light:text-slate-900">{pct.toLocaleString('fa-IR')}</span>
    </div>
  )
}
