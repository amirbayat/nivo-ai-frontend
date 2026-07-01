import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { useMessageQuota } from '@/queries/usage.queries'
import { useMe } from '@/queries/auth.queries'
import { fa } from '@/locales/fa'

export function MessageLimitBanner() {
  const navigate = useNavigate()
  const { messageStage, remainingNormal, remainingThrottled } = useChatStore()
  const { data: quota } = useMessageQuota()
  const { data: me } = useMe()

  // determine effective stage (prefer store — updated from SSE — else fallback to query)
  const stage = messageStage !== 'normal' ? messageStage : (quota?.stage ?? 'normal')
  const remNormal = remainingNormal ?? quota?.remainingNormal ?? null
  const remThrottled = remainingThrottled ?? quota?.remainingThrottled ?? null

  // show banner when approaching or past limit
  const showBanner =
    stage !== 'normal' ||
    (remNormal !== null && remNormal <= 3 && remNormal > 0)

  if (!showBanner) return null

  const planTier = me?.subscription?.plan
    ? detectTier(me.subscription.plan.name)
    : 'free'

  const bgColor =
    stage === 'blocked' ? 'bg-red-500/10 border-red-500/30' :
    stage === 'throttled' ? 'bg-orange-500/10 border-orange-500/30' :
    'bg-amber-500/10 border-amber-500/30'

  const textColor =
    stage === 'blocked' ? 'text-red-400' :
    stage === 'throttled' ? 'text-orange-400' :
    'text-amber-400'

  const iconColor =
    stage === 'blocked' ? 'text-red-500' :
    stage === 'throttled' ? 'text-orange-500' :
    'text-amber-500'

  const message =
    stage === 'blocked'
      ? fa.chat.limitBlocked
      : stage === 'throttled' && remThrottled !== null
      ? fa.chat.limitThrottled(remThrottled)
      : remNormal !== null && remNormal > 0
      ? fa.chat.limitNormalWarning(remNormal)
      : null

  if (!message) return null

  return (
    <div className={clsx(
      'mx-4 mb-2 rounded-xl border px-4 py-3',
      bgColor,
    )}>
      <div className="flex items-start gap-3">
        {/* icon */}
        <svg viewBox="0 0 20 20" fill="currentColor" className={clsx('mt-0.5 size-4 flex-shrink-0', iconColor)}>
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>

        {/* text */}
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium', textColor)}>{message}</p>
          {stage === 'throttled' && quota?.throttledInputTokens && (
            <p className="mt-0.5 text-xs text-slate-500">
              محدودیت: {quota.throttledInputTokens} توکن ورودی · {quota.throttledOutputTokens ?? '—'} توکن خروجی
            </p>
          )}
          {stage !== 'blocked' && quota?.resetAt && (
            <p className="mt-0.5 text-xs text-slate-600">
              ریست: {new Date(quota.resetAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-2 flex-shrink-0">
          {planTier === 'free' && (
            <>
              <button
                onClick={() => navigate('/pricing')}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
              >
                {fa.chat.limitUpgradePro}
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {fa.chat.limitViewPlans}
              </button>
            </>
          )}
          {planTier === 'pro' && (
            <button
              onClick={() => navigate('/pricing')}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
            >
              {fa.chat.limitUpgradePremium}
            </button>
          )}
          {/* wallet CTAs disabled
          {planTier === 'pro' && (
            <button
              onClick={() => navigate('/settings/profile')}
              className="rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {fa.chat.limitWallet}
            </button>
          )}
          {planTier === 'premium' && (
            <button
              onClick={() => navigate('/settings/profile')}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
            >
              {fa.chat.limitWallet}
            </button>
          )}
          */}
        </div>
      </div>
    </div>
  )
}

function detectTier(planName: string): 'free' | 'pro' | 'premium' {
  const lower = planName.toLowerCase()
  if (lower.includes('ویژه') || lower.includes('premium') || lower.includes('gold')) return 'premium'
  if (lower.includes('حرفه') || lower.includes('pro') || lower.includes('silver')) return 'pro'
  return 'free'
}
