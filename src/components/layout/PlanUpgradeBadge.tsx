import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useCreditsBalance } from '@/queries/credits.queries'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'

// دیگر پلن ماهانه‌ی خرید‌شدنی نداریم — این نشان حالا میزان اعتبار (نیوو) فعلی کاربر را
// نشان می‌دهد و به شارژ اعتبار لینک می‌دهد (به‌جای «ارتقا پلن» قدیمی)
export function PlanUpgradeBadge() {
  const navigate = useNavigate()
  const { data: balance } = useCreditsBalance()

  const isCritical = (balance?.credits ?? 0) <= 0
  const isLow = (balance?.credits ?? 0) < 20

  function goToPricing() {
    track('credit_topup_badge_clicked', { credits: balance?.credits })
    navigate('/pricing')
  }

  const creditsText = balance ? balance.credits.toLocaleString('fa-IR') : '—'

  if (isLow) {
    return (
      <>
        <button onClick={goToPricing} className={clsx('nivo-shiny-upgrade', isCritical && 'nivo-shiny-upgrade--critical')}>
          <span className="nivo-shiny-upgrade__inner">
            <CreditCoinIcon className={clsx('size-3.5', isCritical ? 'text-red-400' : 'text-emerald-400')} />
            <span className="text-slate-300">اعتبار شما: <span className={clsx('font-semibold', isCritical ? 'text-red-400' : 'text-emerald-300')}>{creditsText}</span> {fa.credits.creditsUnit}</span>
            <span className={clsx('font-semibold', isCritical ? 'text-red-400' : 'text-emerald-300')}>{fa.plans.upgradeCta}</span>
          </span>
        </button>
        <style>{`
          .nivo-shiny-upgrade {
            position: relative;
            border-radius: 9999px;
            padding: 1.5px;
            background: linear-gradient(90deg, #10b981, #8b5cf6, #10b981);
            background-size: 200% 100%;
            animation: nivo-shine 3s linear infinite;
            cursor: pointer;
          }
          .nivo-shiny-upgrade--critical {
            background: linear-gradient(90deg, #ef4444, #f97316, #ef4444);
            background-size: 200% 100%;
            animation: nivo-shine 3s linear infinite, nivo-critical-pulse 1.6s ease-in-out infinite;
          }
          .nivo-shiny-upgrade__inner {
            display: flex;
            align-items: center;
            gap: 6px;
            border-radius: 9999px;
            background: #0f172a;
            padding: 5px 12px;
            font-size: 11px;
            white-space: nowrap;
          }
          @keyframes nivo-shine {
            to { background-position: -200% 0; }
          }
          @keyframes nivo-critical-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
            50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
          }
        `}</style>
      </>
    )
  }

  return (
    <button
      onClick={goToPricing}
      className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-colors whitespace-nowrap"
    >
      <CreditCoinIcon className="size-3.5 text-emerald-400" />
      <span className="text-slate-400">اعتبار شما:</span>
      <span className="font-semibold text-emerald-300">{creditsText}</span>
      <span className="text-slate-400">{fa.credits.creditsUnit}</span>
    </button>
  )
}

function CreditCoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4a.75.75 0 00-1.5 0v.29c-1.19.2-2.25 1-2.25 2.21 0 1.42 1.24 1.99 2.25 2.28.99.28 1.25.51 1.25.9 0 .43-.5.71-1.13.71-.6 0-1.1-.24-1.33-.6a.75.75 0 10-1.28.78c.42.68 1.14 1.1 1.99 1.24V14a.75.75 0 001.5 0v-.28c1.22-.19 2.25-.95 2.25-2.22 0-1.44-1.28-1.98-2.28-2.27-.98-.28-1.22-.53-1.22-.89 0-.39.44-.68 1.05-.68.5 0 .93.19 1.16.48a.75.75 0 101.18-.92c-.4-.51-1.03-.85-1.64-.98V6z" clipRule="evenodd" />
    </svg>
  )
}
