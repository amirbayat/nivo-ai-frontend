import { useState } from 'react'
import { clsx } from 'clsx'
import { useWallet } from '@/queries/usage.queries'
import { usePlans } from '@/queries/plans.queries'
import { useCreditsBalance } from '@/queries/credits.queries'
import { WalletTopupModal } from '@/components/payment/WalletTopupModal'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'

const DEFAULT_PRESETS = [1_000_000, 2_000_000, 5_000_000]

export function WalletPage() {
  const { data: wallet, isLoading } = useWallet()
  const { data: creditsBalance } = useCreditsBalance()
  const { data: plans } = usePlans()
  const [topupOpen, setTopupOpen] = useState(false)

  // برای نمایش نیوو معادلِ هر تراکنش (تومان → نیوو) — همون tomanPerCredit که سرور برای
  // موجودی هم استفاده می‌کند؛ اگر هنوز نیامده، فقط تومان نشان داده می‌شود (بدون خط دوم)
  const tomanPerCredit = creditsBalance?.tomanPerCredit

  const paygPlan = plans?.find((p) => p.isPayAsYouGo)
  const presets = paygPlan?.payAsYouGoTopupPresets ?? DEFAULT_PRESETS
  const minActivation = paygPlan?.payAsYouGoMinActivationToman ?? 1_000_000
  const minTopup = paygPlan?.payAsYouGoMinTopupToman ?? 500_000

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-300">{fa.settings.creditsBalance}</h2>
            {isLoading ? (
              <div className="mt-2 h-8 w-32 animate-pulse rounded-lg bg-slate-700/50" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {(creditsBalance?.credits ?? 0).toLocaleString('fa-IR')} <span className="text-sm font-normal text-slate-500">نیوو</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {(wallet?.balanceToman ?? 0).toLocaleString('fa-IR')} تومان
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => {
              track('wallet_topup_modal_opened', { entryPoint: 'wallet_page' })
              setTopupOpen(true)
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.98] transition-all"
          >
            شارژ کیف‌پول
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-300">تاریخچه‌ی تراکنش‌ها</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : !wallet?.transactions.length ? (
          <p className="py-6 text-center text-sm text-slate-500">هنوز تراکنشی ثبت نشده</p>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-200">{tx.description ?? (tx.type === 'CREDIT' ? 'واریز' : 'برداشت')}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('fa-IR')}</p>
                </div>
                <div className="text-left">
                  <span className={clsx('text-sm font-medium', tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-400')}>
                    {tx.type === 'CREDIT' ? '+' : '−'}{tx.amountToman.toLocaleString('fa-IR')} تومان
                  </span>
                  {tomanPerCredit ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fa.settings.creditsEquivalent(Math.round(tx.amountToman / tomanPerCredit))}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {topupOpen && (
        <WalletTopupModal
          presets={presets}
          minActivation={minActivation}
          minTopup={minTopup}
          onClose={() => setTopupOpen(false)}
        />
      )}
    </div>
  )
}
