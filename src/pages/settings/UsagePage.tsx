import { useMemo } from 'react'
import { clsx } from 'clsx'
import { useUsageHistory, usePaymentHistory } from '@/queries/settings.queries'
import { useFeatureFlags } from '@/queries/config.queries'
import { fa } from '@/locales/fa'

function currentMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function UsagePage() {
  const month = useMemo(() => currentMonth(), [])
  const { data: flags } = useFeatureFlags()
  const { data: history, isLoading: loadingHistory } = useUsageHistory(month)
  const { data: payments, isLoading: loadingPayments } = usePaymentHistory()

  const maxTokens = useMemo(() => {
    if (!history?.length) return 1
    return Math.max(...history.map(h => h.freeTokensUsed + h.paidTokensUsed), 1)
  }, [history])

  function statusLabel(status: string) {
    if (status === 'COMPLETED') return fa.settings.paymentCompleted
    if (status === 'FAILED') return fa.settings.paymentFailed
    return fa.settings.paymentPending
  }

  function statusClass(status: string) {
    if (status === 'COMPLETED') return 'text-emerald-400 bg-emerald-500/10 light:text-emerald-700'
    if (status === 'FAILED') return 'text-red-400 bg-red-500/10 light:text-red-700'
    return 'text-amber-400 bg-amber-500/10 light:text-amber-700'
  }

  return (
    <div className="space-y-6">
      {flags?.showMonthlyTokenUsage && (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 light:border-slate-200 light:bg-slate-50">
        <h2 className="mb-4 text-sm font-medium text-slate-300 light:text-slate-700">{fa.settings.usageChart}</h2>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : !history?.length ? (
          <p className="py-6 text-center text-sm text-slate-500 light:text-slate-400">{fa.settings.noUsage}</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_2fr_2fr_auto] gap-2 pb-1 text-xs text-slate-500 light:text-slate-400">
              <span>تاریخ</span>
              <span>{fa.settings.freeTokens}</span>
              <span>{fa.settings.paidTokens}</span>
              <span>{fa.settings.requests}</span>
            </div>
            {history.map(row => {
              const freeWidth = (row.freeTokensUsed / maxTokens) * 100
              const paidWidth = (row.paidTokensUsed / maxTokens) * 100
              return (
                <div
                  key={row.date}
                  className="grid grid-cols-[1fr_2fr_2fr_auto] items-center gap-2"
                >
                  <span className="text-xs text-slate-500 light:text-slate-400">
                    {new Date(row.date).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700 light:bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500/70 transition-all"
                        style={{ width: `${freeWidth}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-slate-400 light:text-slate-500">
                      {row.freeTokensUsed.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700 light:bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-500/70 transition-all"
                        style={{ width: `${paidWidth}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-slate-400 light:text-slate-500">
                      {row.paidTokensUsed.toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 light:text-slate-500">
                    {row.requestsCount.toLocaleString('fa-IR')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 light:border-slate-200 light:bg-slate-50">
        <h2 className="mb-4 text-sm font-medium text-slate-300 light:text-slate-700">{fa.settings.paymentHistory}</h2>

        {loadingPayments ? (
          <div className="flex justify-center py-8">
            <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : !payments?.length ? (
          <p className="py-6 text-center text-sm text-slate-500 light:text-slate-400">{fa.settings.noPayments}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs text-slate-500 light:border-slate-200 light:text-slate-400">
                  <th className="pb-2 text-right font-normal">تاریخ</th>
                  <th className="pb-2 text-right font-normal">پلن</th>
                  <th className="pb-2 text-right font-normal">مبلغ</th>
                  <th className="pb-2 text-right font-normal">وضعیت</th>
                  <th className="pb-2 text-right font-normal">پیگیری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 light:divide-slate-200">
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 text-slate-400 light:text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="py-3 text-slate-300 light:text-slate-700">{p.plan.name}</td>
                    <td className="py-3 text-slate-300 light:text-slate-700">
                      {p.amount.toLocaleString('fa-IR')} {fa.common.toman}
                    </td>
                    <td className="py-3">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs', statusClass(p.status))}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500 light:text-slate-400">
                      {p.refId ? fa.settings.refId(p.refId) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
