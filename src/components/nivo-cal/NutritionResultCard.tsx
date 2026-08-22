import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { MacroRing } from './MacroRing'
import type { NivoCalScanResult } from '@/types/api'

const HEALTH_STYLES: Record<NivoCalScanResult['healthScore'], string> = {
  healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  moderate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unhealthy: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

interface NutritionResultCardProps {
  result: NivoCalScanResult
  imageUrl?: string
}

// خروجی اصلی محصول — همه چیز از فیلدهای ساخت‌یافته‌ی NivoCalScanResult رندر می‌شود، هیچ
// متن خام مدل مستقیم نمایش داده نمی‌شود (docs/PRD-nivo-cal.md بخش ۲.۱)
export function NutritionResultCard({ result, imageUrl }: NutritionResultCardProps) {
  if (!result.isFood) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <p className="text-lg font-medium text-slate-200">{fa.nivoCal.notFoodTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{fa.nivoCal.notFoodHint}</p>
      </div>
    )
  }

  const totalProtein = result.items.reduce((s, it) => s + it.proteinG, 0)
  const totalCarbs = result.items.reduce((s, it) => s + it.carbsG, 0)
  const totalFat = result.items.reduce((s, it) => s + it.fatG, 0)
  const totalFiber = result.items.reduce((s, it) => s + (it.fiberG ?? 0), 0)
  const totalSugar = result.items.reduce((s, it) => s + (it.sugarG ?? 0), 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
      {imageUrl && (
        <img src={imageUrl} alt={result.items[0]?.nameFa} className="h-48 w-full object-cover" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-100">
              {result.items.map(it => it.nameFa).join('، ')}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {fa.nivoCal.confidence[result.confidence]}
            </p>
          </div>
          <span
            className={clsx(
              'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
              HEALTH_STYLES[result.healthScore],
            )}
          >
            {fa.nivoCal.healthScore[result.healthScore]}
          </span>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          <MacroRing
            proteinG={totalProtein}
            carbsG={totalCarbs}
            fatG={totalFat}
            totalCalories={result.totalCalories}
          />
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-1 sm:text-right">
            <MacroLegend dotClass="bg-emerald-400" label={fa.nivoCal.macros.protein} grams={totalProtein} />
            <MacroLegend dotClass="bg-amber-400" label={fa.nivoCal.macros.carbs} grams={totalCarbs} />
            <MacroLegend dotClass="bg-sky-400" label={fa.nivoCal.macros.fat} grams={totalFat} />
          </div>
        </div>

        {(totalFiber > 0 || totalSugar > 0) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {totalFiber > 0 && (
              <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs text-slate-300">
                {fa.nivoCal.macros.fiber}: {totalFiber} g
              </span>
            )}
            {totalSugar > 0 && (
              <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs text-slate-300">
                {fa.nivoCal.macros.sugar}: {totalSugar} g
              </span>
            )}
          </div>
        )}

        {result.healthNotes.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-slate-700/50 pt-4">
            {result.healthNotes.map((note, i) => (
              <li key={i} className="text-sm text-slate-300">
                {note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MacroLegend({ dotClass, label, grams }: { dotClass: string; label: string; grams: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
      <span className={clsx('size-2.5 shrink-0 rounded-full', dotClass)} />
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-200" dir="ltr">{grams}g</span>
    </div>
  )
}
