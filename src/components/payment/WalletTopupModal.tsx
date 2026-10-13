import { useState } from 'react'
import { clsx } from 'clsx'
import { useEnabledGateways, useInitiateWalletTopup, type PaymentGatewayName } from '@/queries/plans.queries'
import { GatewayPickerModal } from './GatewayPickerModal'
import { DigitsInput } from '@/components/ui/DigitsInput'

interface Props {
  presets: number[]
  minActivation: number
  minTopup: number
  onClose: () => void
}

// docs/PRD-pay-as-you-go-wallet.md بخش ۶.۱ — پریست‌ها/حداقل‌ها از پلن PAYG می‌آیند (ادمین‌قابل‌تغییر)؛
// تشخیص «اولین شارژ یا نه» عمداً اینجا حدس زده نمی‌شود — سرور خودش اعتبارسنجی نهایی را انجام می‌دهد
export function WalletTopupModal({ presets, minActivation, minTopup, onClose }: Props) {
  const { data: gateways } = useEnabledGateways()
  const initiateTopup = useInitiateWalletTopup()
  const [amount, setAmount] = useState<number | null>(presets[0] ?? null)
  const [custom, setCustom] = useState('')
  const [pendingGatewaySelect, setPendingGatewaySelect] = useState(false)
  const [error, setError] = useState('')

  const finalAmount = custom.trim() ? Number(custom) : amount

  function submit(gateway?: PaymentGatewayName) {
    if (!finalAmount || finalAmount < minTopup) {
      setError(`حداقل مبلغ شارژ ${minTopup.toLocaleString('fa-IR')} تومان است`)
      return
    }
    initiateTopup.mutate(
      { amountToman: finalAmount, gateway },
      { onError: () => setError('شارژ ناموفق بود، دوباره تلاش کنید') },
    )
  }

  function handleSubmit() {
    if (!finalAmount || finalAmount < minTopup) {
      setError(`حداقل مبلغ شارژ ${minTopup.toLocaleString('fa-IR')} تومان است`)
      return
    }
    if ((gateways?.length ?? 0) > 1) {
      setPendingGatewaySelect(true)
      return
    }
    submit(gateways?.[0])
  }

  if (pendingGatewaySelect && gateways) {
    return (
      <GatewayPickerModal
        gateways={gateways}
        loading={initiateTopup.isPending}
        onSelect={(g) => submit(g)}
        onClose={() => setPendingGatewaySelect(false)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-600 hover:text-slate-400 transition-colors"
          aria-label="بستن"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="mb-1 text-center text-base font-bold text-slate-100">شارژ کیف‌پول</h3>
        <p className="mb-5 text-center text-xs text-slate-500">
          اولین شارژ حداقل {minActivation.toLocaleString('fa-IR')} تومان — شارژهای بعدی حداقل {minTopup.toLocaleString('fa-IR')} تومان
        </p>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p); setCustom(''); setError('') }}
              className={clsx(
                'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                amount === p && !custom
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-600 text-slate-300 hover:border-slate-500',
              )}
            >
              {(p / 1_000_000).toLocaleString('fa-IR')} میلیون
            </button>
          ))}
        </div>

        <DigitsInput
          kind="price"
          value={custom}
          onChange={(v) => { setCustom(v); setError('') }}
          placeholder="مبلغ دلخواه (تومان)"
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-center text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
        />

        {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={initiateTopup.isPending}
          className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {initiateTopup.isPending ? 'در حال انتقال به درگاه...' : 'پرداخت'}
        </button>
      </div>
    </div>
  )
}
