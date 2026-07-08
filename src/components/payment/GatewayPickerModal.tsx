import { clsx } from 'clsx'
import type { PaymentGatewayName } from '@/queries/plans.queries'
import { fa } from '@/locales/fa'

interface GatewayPickerModalProps {
  gateways: PaymentGatewayName[]
  loading?: boolean
  onSelect: (gateway: PaymentGatewayName) => void
  onClose: () => void
}

export function GatewayPickerModal({ gateways, loading, onSelect, onClose }: GatewayPickerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={fa.payment.chooseGateway}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
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

        <h3 className="mb-5 text-center text-base font-bold text-slate-100">{fa.payment.chooseGateway}</h3>

        <div className="flex flex-col gap-3">
          {gateways.map(gateway => (
            <button
              key={gateway}
              onClick={() => onSelect(gateway)}
              disabled={loading}
              className={clsx(
                'rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-medium text-slate-200',
                'hover:border-emerald-500/60 hover:bg-slate-700/60 active:scale-[0.98] transition-all',
                'disabled:opacity-50',
              )}
            >
              {fa.payment.gateways[gateway]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
