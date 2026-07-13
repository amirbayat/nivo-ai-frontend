import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useGiftStatus, useClaimGift } from '@/queries/growth.queries'
import { useCountdown } from '@/hooks/useCountdown'
import type { OnboardingGiftStatus } from '@/types/api'

// docs/PRD-growth-traction-features.md بخش ۳.۵ — دو فاز: «trial» (کاربر هنوز زیر آستانه‌ی
// پیام‌های آزمایشی است) و «grace» (trial تازه تمام شده، ولی هنوز postTrialGraceHours ساعت
// فرصت claim/استفاده از کد هدیه دارد). واجدشرایط‌بودن کامل سمت سرور چک می‌شود، نه اینجا.
export function GiftBanner() {
  const { data: status } = useGiftStatus()
  const [open, setOpen] = useState(false)

  if (!status?.eligible || !status.gift) return null
  const isGrace = status.phase === 'grace'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'mx-4 mb-2 flex w-[calc(100%-2rem)] items-center justify-between rounded-xl border px-4 py-3 text-right transition-colors',
          isGrace
            ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
            : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15',
        )}
      >
        <span className={clsx('flex items-center gap-2 text-sm font-medium', isGrace ? 'text-amber-300' : 'text-emerald-300')}>
          <span>{isGrace ? '⏳' : '🎁'}</span>
          {isGrace
            ? 'فرصت محدود: کد تخفیف هدیه رو از دست نده'
            : 'هدیه ویژه نیوو به کاربران تازه (پادکست صوتی آموزش هوش مصنوعی رایگان + کد تخفیف ارتقا حساب)'}
        </span>
        <svg viewBox="0 0 16 16" fill="none" className={clsx('size-4 rotate-180', isGrace ? 'text-amber-400' : 'text-emerald-400')}>
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <GiftModal
          title={status.gift.title}
          description={status.gift.description}
          audioUrl={status.gift.audioUrl}
          phase={status.phase}
          graceDeadline={status.graceDeadline}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function GiftModal({
  title, description, audioUrl, phase, graceDeadline, onClose,
}: {
  title: string
  description: string
  audioUrl: string | null
  phase: OnboardingGiftStatus['phase']
  graceDeadline: string | null
  onClose: () => void
}) {
  const claimGift = useClaimGift()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const countdown = useCountdown(phase === 'grace' ? graceDeadline : null)
  const isGrace = phase === 'grace'

  function copyCode() {
    if (!claimGift.data) return
    void navigator.clipboard.writeText(claimGift.data.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        <div className="text-center">
          <div className="mx-auto mb-3 text-3xl">{isGrace ? '⏳' : '🎁'}</div>
          {isGrace ? (
            <>
              <h3 className="text-base font-bold text-slate-100">دوره‌ی آزمایشی شما تمام شد</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                می‌توانید همچنان به‌صورت رایگان از نیوو استفاده کنید — اما اگر می‌خواهید ارتقا بدهید،
                هنوز فرصت دارید از کد تخفیف هدیه استفاده کنید.
              </p>
              {countdown && (
                <p dir="ltr" className="mt-2 text-xs text-amber-400" style={{ direction: 'rtl' }}>
                  زمان باقی‌مانده: <span dir="ltr" className="font-mono text-amber-300">{countdown}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            </>
          )}
        </div>

        {audioUrl && (
          <a
            href={audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-600 py-3 text-sm font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-4">
              <path d="M8 1v9m0 0l-3-3m3 3l3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            دانلود آموزش صوتی
          </a>
        )}

        <div className="mt-3">
          {!claimGift.data ? (
            <button
              onClick={() => claimGift.mutate()}
              disabled={claimGift.isPending}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {claimGift.isPending ? 'در حال ساخت کد...' : 'دریافت کد تخفیف'}
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <p className="text-xs text-emerald-300">
                {claimGift.data.discountPercent}٪ تخفیف برای اولین خرید — کدت رو موقع خرید وارد کن
              </p>
              <button
                onClick={copyCode}
                dir="ltr"
                className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-600 py-2 text-sm font-mono text-emerald-300 hover:border-emerald-500/50 transition-colors"
              >
                {copied ? 'کپی شد ✓' : claimGift.data.code}
              </button>
              {claimGift.data.expiresAt && (
                <p className="mt-2 text-[11px] text-slate-500">
                  اعتبار تا {new Date(claimGift.data.expiresAt).toLocaleString('fa-IR')}
                </p>
              )}
              <button
                onClick={() => navigate('/pricing')}
                className="mt-3 w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-[0.98] transition-all"
              >
                ارتقا پلن
              </button>
            </div>
          )}
          {claimGift.isError && (
            <p className="mt-2 text-center text-xs text-red-400">مشکلی پیش آمد، دوباره امتحان کن</p>
          )}
        </div>
      </div>
    </div>
  )
}
