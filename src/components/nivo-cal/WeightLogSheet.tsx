import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useLogWeight } from '@/queries/nivoCal.queries'

interface WeightLogSheetProps {
  lastWeightKg: number | null
  onClose: () => void
}

export function WeightLogSheet({ lastWeightKg, onClose }: WeightLogSheetProps) {
  const [weight, setWeight] = useState(lastWeightKg ?? 70)
  const [result, setResult] = useState<{ deltaKg: number | null } | null>(null)
  const logWeight = useLogWeight()

  function submit() {
    logWeight.mutate(weight, { onSuccess: r => setResult({ deltaKg: r.deltaKg }) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label={fa.common.back}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70"
      />
      <div className="relative w-full max-w-lg rounded-t-3xl border-t border-slate-700/60 bg-slate-900 px-6 pb-8 pt-3.5 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-700" />

        <h2 className="text-center text-[16.5px] font-bold text-slate-100">{fa.nivoCalWeightSheet.title}</h2>
        <p className="mb-5 text-center text-xs text-slate-500">{fa.nivoCalWeightSheet.subtitle}</p>

        {result ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" className="size-7">
                <path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {result.deltaKg != null && result.deltaKg !== 0 && (
              <p className="text-sm font-semibold text-emerald-300">
                {result.deltaKg < 0
                  ? fa.nivoCalWeightSheet.deltaDown(`${result.deltaKg}`)
                  : fa.nivoCalWeightSheet.deltaUp(`+${result.deltaKg}`)}
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              {fa.common.back}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setWeight(w => Math.round((w - 0.1) * 10) / 10)}
                aria-label={fa.common.decrease}
                className="flex size-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-transform active:scale-90 active:bg-slate-700/60"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-5"><path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
              <div className="min-w-[120px] text-center">
                <span className="text-4xl font-extrabold text-slate-100" dir="ltr">{weight.toFixed(1)}</span>
                <div className="mt-0.5 text-xs text-slate-500">{fa.nivoCalWeightSheet.unit}</div>
              </div>
              <button
                type="button"
                onClick={() => setWeight(w => Math.round((w + 0.1) * 10) / 10)}
                aria-label={fa.common.increase}
                className="flex size-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-emerald-500 bg-emerald-500/10 text-emerald-400 transition-transform active:scale-90 active:bg-emerald-500/25"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-5"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* پله‌ی ۰.۱ کیلوگرمی با دکمه یعنی برای تغییر ۲-۳ کیلویی باید ده‌ها بار کلیک کنی —
                اسلایدر برای جهش سریع روی بازه‌ی بزرگ، دکمه‌ها برای ریزتنظیم نهایی */}
            <input
              type="range"
              dir="ltr"
              min={30}
              max={300}
              step={0.1}
              value={weight}
              onChange={e => setWeight(Math.round(Number(e.target.value) * 10) / 10)}
              aria-label={fa.nivoCalWeightSheet.unit}
              className="mb-3.5 h-2 w-full touch-manipulation appearance-none rounded-full bg-slate-700 accent-emerald-500"
            />

            {logWeight.isError && (
              <p className="mb-3 text-center text-xs text-red-400">{fa.nivoCalWeightSheet.errorGeneric}</p>
            )}

            <button
              onClick={submit}
              disabled={logWeight.isPending}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {fa.nivoCalWeightSheet.submit}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
