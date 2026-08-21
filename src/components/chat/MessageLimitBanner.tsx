import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useCreditsBalance } from '@/queries/credits.queries'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'

// در مدل اعتباری، تنها محدودکننده‌ی واقعی موجودی نیوو است — نه سهمیه‌ی روزانه/ساعتی قدیمی.
// این بنر فقط وقتی اعتبار کم یا صفر شده نمایش داده می‌شود (بدون دکمه‌ی بستن، چون نباید بعد
// از یک بار بستن دیگر برنگردد)
const LOW_BALANCE_THRESHOLD = 20

export function MessageLimitBanner() {
  const navigate = useNavigate()
  const { data: balance } = useCreditsBalance()

  if (!balance) return null

  const isExhausted = balance.credits <= 0
  const isLow = !isExhausted && balance.credits <= LOW_BALANCE_THRESHOLD

  if (!isExhausted && !isLow) return null

  function goToPricing() {
    track('usage_limit_upgrade_clicked', { limitType: isExhausted ? 'credit_exhausted' : 'credit_low' })
    navigate('/pricing')
  }

  return (
    <div className={clsx(
      'mx-4 mb-2 rounded-xl border px-4 py-3',
      isExhausted ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30',
    )}>
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className={clsx(
          'mt-0.5 size-4 flex-shrink-0',
          isExhausted ? 'text-red-500' : 'text-amber-500',
        )}>
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium', isExhausted ? 'text-red-400' : 'text-amber-400')}>
            {isExhausted ? fa.chat.creditExhausted : fa.chat.creditLowWarning(balance.credits)}
          </p>
        </div>

        <button
          onClick={goToPricing}
          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
        >
          {fa.plans.upgradeCta}
        </button>
      </div>
    </div>
  )
}
