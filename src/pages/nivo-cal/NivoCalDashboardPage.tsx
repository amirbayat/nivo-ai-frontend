import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { useDailySummary } from '@/queries/nivoCal.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { WeightTrendChart } from '@/components/nivo-cal/WeightTrendChart'
import { WeightLogSheet } from '@/components/nivo-cal/WeightLogSheet'
import { WeeklyAdherenceChart } from '@/components/nivo-cal/WeeklyAdherenceChart'
import { DeleteLogButton } from '@/components/nivo-cal/DeleteLogButton'
import { fa } from '@/locales/fa'
import type { NivoCalLog } from '@/types/api'

const RING_SIZE = 176
const RING_STROKE = 14
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function NivoCalDashboardPage() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const { data, isLoading, isError, refetch } = useDailySummary()
  const [weightSheetOpen, setWeightSheetOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center" dir="rtl">
        <p className="text-sm text-red-400">{fa.nivoCal.errorGeneric}</p>
        <button onClick={() => refetch()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100">
          {fa.nivoCal.retry}
        </button>
      </div>
    )
  }

  const { profile, consumed, remainingCalories, meals, weightTrend, streakDays, weeklyAdherence } = data
  const consumedFraction = Math.min(1, Math.max(0, consumed.calories / profile.dailyCalorieTarget))
  const ringDash = consumedFraction * RING_CIRCUMFERENCE

  const lastWeightKg = weightTrend.points.length > 0 ? weightTrend.points[weightTrend.points.length - 1].weightKg : null

  const feedback =
    remainingCalories > 30
      ? { text: fa.nivoCalDashboard.feedbackUnder(Math.round(remainingCalories)), tone: 'good' as const }
      : remainingCalories < -30
        ? { text: fa.nivoCalDashboard.feedbackOver(Math.round(-remainingCalories)), tone: 'warn' as const }
        : { text: fa.nivoCalDashboard.feedbackOnTarget, tone: 'good' as const }

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-28 pt-6" dir="rtl">
      <div className="relative mx-auto max-w-lg">

        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              aria-label={fa.common.back}
            >
              {/* chevron-right — دکمه‌ی «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[15px] font-bold text-emerald-950">
              {(me?.name ?? 'ن').charAt(0)}
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-slate-100">
                {me?.name ? fa.nivoCalDashboard.greeting(me.name) : fa.nivoCalDashboard.greetingGeneric}
              </div>
              <div className="text-xs text-slate-500">{new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
          </div>
          {streakDays > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5">
              <span className="text-[13px]">🔥</span>
              <span className="text-xs font-bold text-amber-400" dir="ltr">{streakDays}</span>
              <span className="text-xs text-amber-300">{fa.nivoCalDashboard.streakLabel}</span>
            </div>
          )}
        </div>

        {/* calorie ring */}
        <div className="mb-4 flex flex-col items-center rounded-[20px] border border-slate-700/60 bg-slate-800/40 px-5 py-6">
          <div className="relative mb-4" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="#1e293b" strokeWidth={RING_STROKE} />
              <circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none"
                stroke={remainingCalories < 0 ? '#fb7185' : '#10b981'}
                strokeWidth={RING_STROKE} strokeLinecap="round"
                strokeDasharray={`${ringDash} ${RING_CIRCUMFERENCE - ringDash}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-extrabold text-slate-100" dir="ltr">{Math.round(consumed.calories)}</span>
              <span className="text-xs text-slate-500">{fa.nivoCalDashboard.ofTarget(profile.dailyCalorieTarget)}</span>
            </div>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5"
            style={feedback.tone === 'good'
              ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' }
              : { background: 'rgba(244,63,94,0.12)', borderColor: 'rgba(244,63,94,0.3)' }}
          >
            <span className={feedback.tone === 'good' ? 'text-[12.5px] font-semibold text-emerald-300' : 'text-[12.5px] font-semibold text-rose-300'}>
              {remainingCalories >= 0 ? fa.nivoCalDashboard.remainingPositive(Math.round(remainingCalories)) : fa.nivoCalDashboard.remainingNegative(Math.round(-remainingCalories))}
            </span>
          </div>
        </div>

        {/* macro bars */}
        <div className="mb-4 flex flex-col gap-3.5 rounded-[20px] border border-slate-700/60 bg-slate-800/40 px-5 py-[18px]">
          <MacroBar label={fa.nivoCalDashboard.macroLabels.protein} value={consumed.proteinG} target={profile.proteinTargetG} colorClass="bg-emerald-400" />
          <MacroBar label={fa.nivoCalDashboard.macroLabels.carbs} value={consumed.carbsG} target={profile.carbsTargetG} colorClass="bg-amber-400" />
          <MacroBar label={fa.nivoCalDashboard.macroLabels.fat} value={consumed.fatG} target={profile.fatTargetG} colorClass="bg-sky-400" />
        </div>

        {/* feedback card */}
        <div
          className="mb-6 flex items-start gap-2.5 rounded-2xl border px-4 py-[15px]"
          style={feedback.tone === 'good'
            ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' }
            : { background: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.25)' }}
        >
          <p className={feedback.tone === 'good' ? 'text-[13px] leading-[1.7] text-emerald-200' : 'text-[13px] leading-[1.7] text-rose-200'}>{feedback.text}</p>
        </div>

        {/* weekly adherence */}
        <div className="mb-6"><WeeklyAdherenceChart days={weeklyAdherence} /></div>

        {/* weight trend */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14.5px] font-bold text-slate-100">{fa.nivoCalDashboard.weightTrendTitle}</h2>
          <button
            onClick={() => setWeightSheetOpen(true)}
            className="flex size-7 items-center justify-center rounded-full border-[1.5px] border-emerald-500 text-emerald-400"
            aria-label={fa.nivoCalWeightSheet.title}
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-3.5"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="mb-6"><WeightTrendChart trend={weightTrend} /></div>

        {/* meals */}
        <h2 className="mb-3 text-[14.5px] font-bold text-slate-100">{fa.nivoCalDashboard.mealsTitle}</h2>
        {meals.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-600">{fa.nivoCalDashboard.mealsEmpty}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {meals.map(meal => <MealRow key={meal.id} meal={meal} />)}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => navigate('/nivo-cal/scan')}
          className="fixed bottom-6 left-5 flex size-[58px] items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] hover:bg-emerald-600"
          aria-label={fa.nivoCalDashboard.scanNext}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-[26px]">
            <path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>

      {weightSheetOpen && (
        <WeightLogSheet lastWeightKg={lastWeightKg} onClose={() => setWeightSheetOpen(false)} />
      )}
    </div>
  )
}

function MacroBar({ label, value, target, colorClass }: { label: string; value: number; target: number; colorClass: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] text-slate-400">{label}</span>
        <span className="text-[12.5px] font-semibold text-slate-300" dir="ltr">{Math.round(value)} / {target}g</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MealRow({ meal }: { meal: NivoCalLog }) {
  const imageUrl = useAuthedImageUrl(meal.imageUrl)
  const title = meal.isFood ? meal.items.map(it => it.nameFa).join('، ') : fa.nivoCal.notFoodTitle
  const time = new Date(meal.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-slate-700/60 bg-slate-800/40 p-2.5">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="size-11 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <div className="size-11 shrink-0 rounded-[10px] bg-slate-700/50" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-slate-200">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-slate-500" dir="ltr">{time}</p>
      </div>
      {meal.isFood && <span className="shrink-0 text-[13.5px] font-bold text-slate-100" dir="ltr">~{meal.totalCalories}</span>}
      <DeleteLogButton id={meal.id} />
    </div>
  )
}
