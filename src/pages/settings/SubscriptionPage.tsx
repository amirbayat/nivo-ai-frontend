import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useSettingsSubscription } from '@/queries/settings.queries'
import { fa } from '@/locales/fa'

export function SubscriptionPage() {
  const { data: sub, isLoading } = useSettingsSubscription()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 text-center light:border-slate-200 light:bg-slate-50">
        <p className="text-slate-400 light:text-slate-500">{fa.settings.noSubYet}</p>
        <Link
          to="/pricing"
          className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          {fa.settings.upgradePlan}
        </Link>
      </div>
    )
  }

  const isActive = sub.status === 'ACTIVE'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-4 light:border-slate-200 light:bg-slate-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 light:text-slate-400">{fa.settings.currentPlan}</p>
            <p className="mt-0.5 text-lg font-bold text-slate-100 light:text-slate-900">{sub.plan.name}</p>
          </div>
          <span
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium',
              isActive
                ? 'bg-emerald-500/15 text-emerald-400 light:text-emerald-700'
                : 'bg-slate-700/60 text-slate-400 light:bg-slate-200 light:text-slate-600',
            )}
          >
            {fa.settings.subscriptionStatus[sub.status]}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {sub.plan.dailyFreeTokens > 0 && (
            <div>
              <p className="text-xs text-slate-500 light:text-slate-400">{fa.settings.dailyGiftTokens}</p>
              <p className="mt-0.5 text-sm text-slate-200 light:text-slate-800">
                {sub.plan.dailyFreeTokens.toLocaleString('fa-IR')}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 light:text-slate-400">{fa.settings.periodEnd}</p>
            <p className="mt-0.5 text-sm text-slate-200 light:text-slate-800">
              {new Date(sub.periodEnd).toLocaleDateString('fa-IR')}
            </p>
          </div>
        </div>

        {sub.cancelAtPeriodEnd && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-400 light:text-amber-700">{fa.settings.cancelAtEnd}</p>
          </div>
        )}
      </div>
    </div>
  )
}
