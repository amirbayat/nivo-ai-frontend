import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useCreateNutritionProfile } from '@/queries/nivoCal.queries'
import type { NivoCalActivityLevel, NivoCalGender, NivoCalGoal, NutritionProfile } from '@/types/api'

const TOTAL_STEPS = 4

const ACTIVITY_LEVELS: NivoCalActivityLevel[] = ['SEDENTARY', 'LIGHT', 'ACTIVE', 'VERY_ACTIVE']
const GOALS: NivoCalGoal[] = ['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_WEIGHT']
const PACE_LABELS = fa.nivoCalOnboarding.step4.paces

// فقط برای پیش‌نمایش قبل از ارسال — عدد نهایی همیشه از سرور می‌آید (docs/PRD-nivo-cal.md بخش ۳.۲)
const PACE_DEFICIT_KCAL: Record<number, number> = { 1: 300, 2: 500, 3: 750 }
const PACE_SURPLUS_KCAL: Record<number, number> = { 1: 300, 2: 400, 3: 500 }

const MOTIVATION_TEXT: Record<NivoCalGoal, string> = {
  LOSE_WEIGHT: 'بر اساس هدفت برای کاهش وزن، امروز رو با وعده‌های متعادل و کمی پروتئین بیشتر شروع کن. مسیر طولانی با قدم‌های کوچیک طی می‌شه 💪',
  MAINTAIN: 'هدفت حفظ وزن فعلیته — همین تعادل الان رو نگه دار و هر روز رو با ثبت وعده‌هات دنبال کن 🙌',
  GAIN_WEIGHT: 'برای افزایش وزن سالم، وعده‌های منظم‌تر و پروتئین کافی کلیدیه. قدم‌به‌قدم پیش می‌ریم 💪',
}

function BackChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ForwardChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8 flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className={clsx('h-1 flex-1 rounded-full', i < step ? 'bg-emerald-500' : 'bg-slate-800')} />
      ))}
    </div>
  )
}

function StepHeader({ onBack, step }: { onBack: () => void; step: number }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
        aria-label={fa.common.back}
      >
        <BackChevron />
      </button>
      <span className="text-[13px] font-medium text-slate-500">{fa.nivoCalOnboarding.stepOf(step, TOTAL_STEPS)}</span>
    </div>
  )
}

function NumberStepper({ value, onChange, min, max, step = 1, unit, decimals = 0 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string; decimals?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/40 px-5 py-[18px]">
      <button
        onClick={() => onChange(clamp(value - step))}
        className="flex size-10 items-center justify-center rounded-full border border-slate-700 text-slate-300"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4"><path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <div className="text-center">
        <span className="text-[34px] font-bold text-slate-100" dir="ltr">{decimals ? value.toFixed(decimals) : value}</span>
        <div className="mt-0.5 text-xs text-slate-500">{unit}</div>
      </div>
      <button
        onClick={() => onChange(clamp(value + step))}
        className="flex size-10 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500/10 text-emerald-400"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

function NextButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{children}</span>
      <ForwardChevron />
    </button>
  )
}

export function NivoCalOnboardingPage() {
  const navigate = useNavigate()
  const createProfile = useCreateNutritionProfile()

  const [step, setStep] = useState(1)
  const [gender, setGender] = useState<NivoCalGender | null>(null)
  const [age, setAge] = useState(28)
  const [heightCm, setHeightCm] = useState(175)
  const [weightKg, setWeightKg] = useState(75)
  const [activityLevel, setActivityLevel] = useState<NivoCalActivityLevel | null>(null)
  const [goal, setGoal] = useState<NivoCalGoal | null>(null)
  const [goalPaceLevel, setGoalPaceLevel] = useState(2)
  const [profile, setProfile] = useState<NutritionProfile | null>(null)

  function goBack() {
    if (step === 1) { navigate('/nivo-cal/scan'); return }
    setStep(s => s - 1)
  }

  function submit() {
    if (!gender || !activityLevel || !goal) return
    createProfile.mutate(
      { gender, age, heightCm, weightKg, activityLevel, goal, goalPaceLevel },
      { onSuccess: p => setProfile(p) },
    )
  }

  if (profile) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-8" dir="rtl">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <div className="mb-5 flex w-full">
            <button
              onClick={() => navigate(-1)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              aria-label={fa.common.back}
            >
              <BackChevron />
            </button>
          </div>
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" className="size-7">
              <path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mb-1 text-xl font-bold text-slate-100">{fa.nivoCalOnboarding.summary.heading}</h1>
          <p className="mb-7 text-[13.5px] text-slate-500">{fa.nivoCalOnboarding.summary.subheading}</p>

          <div className="mb-5 flex flex-col items-center">
            <span className="text-4xl font-extrabold text-slate-100" dir="ltr">{profile.dailyCalorieTarget.toLocaleString('en-US')}</span>
            <span className="text-xs text-slate-500">{fa.nivoCalOnboarding.summary.perDay}</span>
          </div>

          <div className="mb-6 flex gap-5">
            <MacroPill dotClass="bg-emerald-400" label={fa.nivoCalDashboard.macroLabels.protein} grams={profile.proteinTargetG} />
            <MacroPill dotClass="bg-amber-400" label={fa.nivoCalDashboard.macroLabels.carbs} grams={profile.carbsTargetG} />
            <MacroPill dotClass="bg-sky-400" label={fa.nivoCalDashboard.macroLabels.fat} grams={profile.fatTargetG} />
          </div>

          <div className="mb-4 w-full rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4 text-right">
            <p className="text-[13.5px] leading-[1.85] text-slate-300">{MOTIVATION_TEXT[profile.goal]}</p>
          </div>

          <p className="mb-7 text-[11.5px] leading-[1.7] text-slate-600">{fa.nivoCalOnboarding.summary.disclaimer}</p>

          <button
            onClick={() => navigate('/nivo-cal/dashboard')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600"
          >
            <span>{fa.nivoCalOnboarding.summary.cta}</span>
            <ForwardChevron />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        <StepHeader onBack={goBack} step={step} />
        <ProgressBar step={step} />

        {step === 1 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.nivoCalOnboarding.step1.heading}</h1>
            <p className="mb-8 text-sm leading-[1.7] text-slate-500">{fa.nivoCalOnboarding.step1.subheading}</p>

            <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.nivoCalOnboarding.step1.genderLabel}</label>
            <div className="mb-8 grid grid-cols-2 gap-3">
              <GenderCard label={fa.nivoCalOnboarding.step1.male} selected={gender === 'MALE'} onClick={() => setGender('MALE')} />
              <GenderCard label={fa.nivoCalOnboarding.step1.female} selected={gender === 'FEMALE'} onClick={() => setGender('FEMALE')} />
            </div>

            <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.nivoCalOnboarding.step1.ageLabel}</label>
            <NumberStepper value={age} onChange={setAge} min={10} max={100} unit={fa.nivoCalOnboarding.step1.ageUnit} />

            <NextButton onClick={() => setStep(2)} disabled={!gender}>{fa.nivoCalOnboarding.next}</NextButton>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.nivoCalOnboarding.step2.heading}</h1>
            <p className="mb-7 text-sm leading-[1.7] text-slate-500">{fa.nivoCalOnboarding.step2.subheading}</p>

            <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.nivoCalOnboarding.step2.heightLabel}</label>
            <div className="mb-6"><NumberStepper value={heightCm} onChange={setHeightCm} min={100} max={250} unit={fa.nivoCalOnboarding.step2.heightUnit} /></div>

            <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.nivoCalOnboarding.step2.weightLabel}</label>
            <NumberStepper value={weightKg} onChange={setWeightKg} min={30} max={300} step={0.5} decimals={1} unit={fa.nivoCalOnboarding.step2.weightUnit} />

            <NextButton onClick={() => setStep(3)}>{fa.nivoCalOnboarding.next}</NextButton>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.nivoCalOnboarding.step3.heading}</h1>
            <p className="mb-6 text-sm leading-[1.7] text-slate-500">{fa.nivoCalOnboarding.step3.subheading}</p>

            <div className="flex flex-col gap-3">
              {ACTIVITY_LEVELS.map(level => (
                <SelectRow
                  key={level}
                  title={fa.nivoCalOnboarding.step3.levels[level].title}
                  desc={fa.nivoCalOnboarding.step3.levels[level].desc}
                  selected={activityLevel === level}
                  onClick={() => setActivityLevel(level)}
                />
              ))}
            </div>

            <NextButton onClick={() => setStep(4)} disabled={!activityLevel}>{fa.nivoCalOnboarding.next}</NextButton>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{fa.nivoCalOnboarding.step4.heading}</h1>
            <p className="mb-6 text-sm leading-[1.7] text-slate-500">{fa.nivoCalOnboarding.step4.subheading}</p>

            <div className="mb-6 flex flex-col gap-3">
              {GOALS.map(g => (
                <SelectRow
                  key={g}
                  title={fa.nivoCalOnboarding.step4.goals[g]}
                  selected={goal === g}
                  onClick={() => setGoal(g)}
                />
              ))}
            </div>

            {goal && goal !== 'MAINTAIN' && (
              <>
                <label className="mb-3 block text-sm font-semibold text-slate-300">{fa.nivoCalOnboarding.step4.paceLabel}</label>
                <div className="mb-3.5 grid grid-cols-3 gap-2 rounded-[14px] border border-slate-700/60 bg-slate-800/40 p-[5px]">
                  {PACE_LABELS.map((label, i) => {
                    const level = i + 1
                    return (
                      <button
                        key={level}
                        onClick={() => setGoalPaceLevel(level)}
                        className={clsx(
                          'rounded-[10px] py-2.5 text-[13px] font-medium transition-colors',
                          goalPaceLevel === level ? 'bg-emerald-500 font-bold text-white' : 'text-slate-500',
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className="mb-6 flex items-center gap-2.5 rounded-[14px] border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3.5">
                  <svg viewBox="0 0 24 24" fill="none" className="size-[18px] shrink-0 text-emerald-400">
                    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <p className="text-[13px] leading-[1.6] text-emerald-200">
                    {goal === 'LOSE_WEIGHT'
                      ? fa.nivoCalOnboarding.step4.deficitNote(PACE_DEFICIT_KCAL[goalPaceLevel])
                      : fa.nivoCalOnboarding.step4.surplusNote(PACE_SURPLUS_KCAL[goalPaceLevel])}
                  </p>
                </div>
              </>
            )}

            {createProfile.isError && (
              <p className="mb-3 text-center text-xs text-red-400">{fa.nivoCalOnboarding.errorGeneric}</p>
            )}

            <NextButton onClick={submit} disabled={!goal || createProfile.isPending}>
              {fa.nivoCalOnboarding.calculate}
            </NextButton>
          </>
        )}
      </div>
    </div>
  )
}

function GenderCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-5 transition-colors',
        selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600',
      )}
    >
      {selected && (
        <span className="absolute left-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500">
          <svg viewBox="0 0 20 20" fill="white" className="size-3"><path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z" /></svg>
        </span>
      )}
      <div className={clsx('flex size-11 items-center justify-center rounded-full', selected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400')}>
        <svg viewBox="0 0 24 24" fill="none" className="size-6"><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" /></svg>
      </div>
      <span className="text-[15px] font-semibold text-slate-100">{label}</span>
    </button>
  )
}

function SelectRow({ title, desc, selected, onClick }: { title: string; desc?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-4 text-right transition-colors',
        selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold text-slate-100">{title}</div>
        {desc && <div className="mt-0.5 text-[12.5px] text-slate-500">{desc}</div>}
      </div>
      <div className={clsx('flex size-5 shrink-0 items-center justify-center rounded-full', selected ? 'bg-emerald-500' : 'border-2 border-slate-600')}>
        {selected && <svg viewBox="0 0 20 20" fill="white" className="size-3"><path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z" /></svg>}
      </div>
    </button>
  )
}

function MacroPill({ dotClass, label, grams }: { dotClass: string; label: string; grams: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5"><span className={clsx('size-2 rounded-full', dotClass)} /><span className="text-xs text-slate-400">{label}</span></div>
      <span className="text-sm font-bold text-slate-100" dir="ltr">{grams}g</span>
    </div>
  )
}
