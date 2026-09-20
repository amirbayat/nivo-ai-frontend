import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fireAnonCtaClick } from '@/queries/anonChat.queries'
import { fa } from '@/locales/fa'
import type { AnonChatStatus } from '@/types/api'

// بنر بالای اینپوت چت مهمان — سه حالت رنگی بر اساس status.stage (نرمال/emerald ملایم،
// limited/amber پررنگ‌تر، blocked/red شدیدترین حالت). بنر حالت «نرمال» (تشویق ملایم به
// ثبت‌نام) عمداً تا رسیدن به signupBannerAfterMessages پیام کاربر نمایش داده نمی‌شود —
// کاربری که تازه رسیده، قبل از تجربه‌ی محصول نباید فشار ثبت‌نام ببیند. حالت‌های
// limited/blocked واقعی هستند (کاربر واقعاً به سقف رسیده) و همیشه نمایش داده می‌شوند.
export function AnonSignupBanner({ status, userMessageCount = 0 }: { status?: AnonChatStatus; userMessageCount?: number }) {
  const navigate = useNavigate()
  if (!status) return null
  if (status.stage === 'normal' && userMessageCount < status.signupBannerAfterMessages) return null

  const stage = status.stage

  const onSignup = () => {
    fireAnonCtaClick()
    navigate('/login')
  }

  return (
    <div
      className={clsx(
        'mx-4 mb-2 flex items-start gap-3 rounded-xl border px-4 py-3',
        stage === 'blocked'
          ? 'border-red-500/30 bg-red-500/10'
          : stage === 'limited'
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-emerald-500/30 bg-emerald-500/10',
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={clsx(
          'mt-0.5 size-4 shrink-0',
          stage === 'blocked' ? 'text-red-500' : stage === 'limited' ? 'text-amber-500' : 'text-emerald-500',
        )}
      >
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'text-sm font-medium',
            stage === 'blocked'
              ? 'text-red-300 light:text-red-700'
              : stage === 'limited'
                ? 'text-amber-300 light:text-amber-700'
                : 'text-emerald-300 light:text-emerald-700',
          )}
        >
          {status.message}
        </p>
      </div>

      <button
        onClick={onSignup}
        className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
      >
        {fa.anonChat.signupCta}
      </button>
    </div>
  )
}
