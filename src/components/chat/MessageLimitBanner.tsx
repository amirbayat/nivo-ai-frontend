import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { useMessageQuota } from '@/queries/usage.queries'
import { fa } from '@/locales/fa'

// شمارش معکوس زنده تا لحظه‌ی ریست (HH:MM:SS) — برای هر سه نوع محدودیت (روزانه/پنجره‌ی لغزان/بودجه) یکسان است
function useCountdown(resetAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!resetAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [resetAt])

  if (!resetAt) return null
  const diffMs = Math.max(0, new Date(resetAt).getTime() - now)
  const totalSec = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// باکس «به محدودیت رسیدید» — همیشه نمایش داده می‌شود تا زمانی که واقعاً ریست شود
// (بدون دکمه‌ی بستن؛ چون نباید بعد از یک بار بستن دیگر برنگردد)
function HardLimitBox({ heading, message, resetAt, planTier }: {
  heading: string
  message: string
  resetAt: string | null
  planTier: string
}) {
  const navigate = useNavigate()
  const countdown = useCountdown(resetAt)

  return (
    <div className="mx-4 mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-4 flex-shrink-0 text-red-500">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-400">{heading}</p>
          <p className="mt-0.5 text-xs text-red-300/80">{message}</p>
          {countdown && (
            <p dir="ltr" className="mt-1 text-xs text-slate-400 text-right" style={{ direction: 'rtl' }}>
              زمان باقی‌مانده تا ریست: <span dir="ltr" className="font-mono text-slate-300">{countdown}</span>
            </p>
          )}
        </div>
        {planTier !== 'premium' && (
          <button
            onClick={() => navigate('/pricing')}
            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
          >
            {fa.chat.limitUpgrade}
          </button>
        )}
      </div>
    </div>
  )
}

export function MessageLimitBanner() {
  const navigate = useNavigate()
  const { messageStage, remainingNormal, remainingThrottled } = useChatStore()
  const { data: quota } = useMessageQuota()

  if (!quota) return null

  const planTier = quota.planTier

  // اولویت با محدودیت‌های «سخت» (blocked) است — هر کدوم زودتر رخ داده باشه همون نشون داده می‌شه
  if (quota.rollingWindow?.blocked) {
    return (
      <HardLimitBox
        heading="به محدودیت رسیدید"
        message={fa.chat.limitRollingWindowBlocked}
        resetAt={quota.rollingWindow.resetAt}
        planTier={planTier}
      />
    )
  }

  if (quota.budget.blocked) {
    return (
      <HardLimitBox
        heading="به محدودیت رسیدید"
        message={fa.chat.limitBudgetBlocked}
        resetAt={quota.budget.resetAt}
        planTier={planTier}
      />
    )
  }

  if (quota.tokenQuota.blocked) {
    return (
      <HardLimitBox
        heading="به محدودیت رسیدید"
        message={fa.chat.limitQuotaExceeded}
        resetAt={quota.tokenQuota.resetAt}
        planTier={planTier}
      />
    )
  }

  // determine effective soft-stage (prefer store — به‌روزشده از SSE حین استریم — وگرنه از پول کوئری)
  const stage = messageStage !== 'normal' ? messageStage : quota.stage
  const remNormal = remainingNormal ?? quota.remainingNormal
  const remThrottled = remainingThrottled ?? quota.remainingThrottled

  if (stage === 'blocked') {
    return (
      <HardLimitBox
        heading="به محدودیت رسیدید"
        message={fa.chat.limitBlocked}
        resetAt={quota.resetAt}
        planTier={planTier}
      />
    )
  }

  const showSoftWarning =
    stage === 'throttled' || (remNormal !== null && remNormal <= 3 && remNormal > 0)
  if (!showSoftWarning) return null

  const message =
    stage === 'throttled' && remThrottled !== null
      ? fa.chat.limitThrottled(remThrottled)
      : remNormal !== null && remNormal > 0
      ? fa.chat.limitNormalWarning(remNormal)
      : null

  if (!message) return null

  return (
    <div className={clsx(
      'mx-4 mb-2 rounded-xl border px-4 py-3',
      stage === 'throttled' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-amber-500/10 border-amber-500/30',
    )}>
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className={clsx(
          'mt-0.5 size-4 flex-shrink-0',
          stage === 'throttled' ? 'text-orange-500' : 'text-amber-500',
        )}>
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-medium', stage === 'throttled' ? 'text-orange-400' : 'text-amber-400')}>
            {message}
          </p>
          {stage === 'throttled' && quota.throttledInputTokens && (
            <p className="mt-0.5 text-xs text-slate-500">
              محدودیت: {quota.throttledInputTokens} توکن ورودی · {quota.throttledOutputTokens ?? '—'} توکن خروجی
            </p>
          )}
        </div>

        {planTier !== 'premium' && (
          <button
            onClick={() => navigate('/pricing')}
            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
          >
            {fa.chat.limitUpgrade}
          </button>
        )}
      </div>
    </div>
  )
}
