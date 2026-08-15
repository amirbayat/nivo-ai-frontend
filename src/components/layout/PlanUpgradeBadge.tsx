import { useNavigate } from 'react-router-dom'
import { useCreditsBalance } from '@/queries/credits.queries'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'

// دیگر پلن ماهانه‌ی خرید‌شدنی نداریم — این نشان حالا میزان اعتبار (نیوو) فعلی کاربر را
// نشان می‌دهد و به شارژ اعتبار لینک می‌دهد (به‌جای «ارتقا پلن» قدیمی)
export function PlanUpgradeBadge() {
  const navigate = useNavigate()
  const { data: balance } = useCreditsBalance()

  const isLow = (balance?.credits ?? 0) < 20

  function goToPricing() {
    track('credit_topup_badge_clicked', { credits: balance?.credits })
    navigate('/pricing')
  }

  if (isLow) {
    return (
      <>
        <button onClick={goToPricing} className="nivo-shiny-upgrade">
          <span className="nivo-shiny-upgrade__inner">
            <span className="text-slate-300">{fa.credits.creditsUnit}: {balance?.credits.toLocaleString('fa-IR') ?? '—'}</span>
            <span className="font-semibold text-emerald-300">{fa.plans.upgradeCta}</span>
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
        `}</style>
      </>
    )
  }

  return (
    <button
      onClick={goToPricing}
      className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-colors whitespace-nowrap"
    >
      {fa.credits.creditsUnit}: {balance?.credits.toLocaleString('fa-IR') ?? '—'}
    </button>
  )
}
