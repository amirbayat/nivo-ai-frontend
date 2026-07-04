import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { usePlans, useInitiatePayment } from '@/queries/plans.queries'
import { useMe } from '@/queries/auth.queries'
import { SalesChatbot } from '@/components/sales/SalesChatbot'
import { ExitIntentModal } from '@/components/sales/ExitIntentModal'
import { fa } from '@/locales/fa'

export function PricingPage() {
  const { data: plans, isLoading } = usePlans()
  const { data: me } = useMe()
  const initPayment = useInitiatePayment()
  const navigate = useNavigate()

  const currentPlanId = me?.subscription?.planId

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-slate-100">{fa.plans.title}</h1>
          <p className="mt-2 text-slate-500">{fa.plans.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3" role="list" aria-label="پلن‌های اشتراک">
          {plans?.map(plan => {
            const isCurrent = plan.id === currentPlanId
            const isFree = plan.priceMonthly === 0

            return (
              <div
                key={plan.id}
                className={clsx(
                  'relative flex flex-col rounded-2xl border p-6 transition-all',
                  isCurrent
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-medium text-white">
                    {fa.plans.current}
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-3xl font-bold text-emerald-400">{fa.plans.free}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-slate-100">
                          {(plan.priceMonthly / 10).toLocaleString('fa-IR')}
                        </span>
                        <span className="text-sm text-slate-500">{fa.plans.perMonth}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mb-8 space-y-3 flex-1">
                  <li className="flex items-center gap-2 text-sm text-slate-300">
                    <Check />
                    {fa.plans.dailyFree(plan.dailyFreeTokens)}
                  </li>
                  {plan.monthlyTotalTokens > 0 && (
                    <li className="flex items-center gap-2 text-sm text-slate-300">
                      <Check />
                      {fa.plans.monthly(plan.monthlyTotalTokens)}
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-sm text-slate-400">
                    <Check dim />
                    {fa.plans.models}: {(plan.allowedModels as string[]).join('، ')}
                  </li>
                </ul>

                {isCurrent ? (
                  <button
                    onClick={() => navigate('/chat')}
                    className="rounded-xl border border-emerald-500/40 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    {fa.common.back}
                  </button>
                ) : isFree ? (
                  <button
                    onClick={() => navigate('/chat')}
                    className="rounded-xl border border-slate-600 py-2.5 text-sm text-slate-400 hover:border-slate-500 transition-colors"
                  >
                    {fa.plans.startFree}
                  </button>
                ) : (
                  <button
                    onClick={() => initPayment.mutate(plan.id)}
                    disabled={initPayment.isPending}
                    className="rounded-xl bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {initPayment.isPending ? fa.payment.redirecting : fa.plans.buy}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {/* Sales chatbot below plan cards */}
        <div className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-100">نمیدونی کدوم پلن مناسبته؟</h2>
            <p className="mt-1 text-sm text-slate-500">از دستیار هوشمند نیوو بپرس</p>
          </div>
          <div className="mx-auto max-w-lg">
            <SalesChatbot source="pricing_page" />
          </div>
        </div>
      </div>

      <ExitIntentModal />
    </div>
  )
}

function Check({ dim }: { dim?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={clsx('size-4 shrink-0', dim ? 'text-slate-600' : 'text-emerald-500')}>
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
