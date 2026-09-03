import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMe, useLogout } from '@/queries/auth.queries'
import { useUpdateProfile } from '@/queries/settings.queries'
import { useMyDiscountCodes } from '@/queries/growth.queries'
import { useCreditsBalance } from '@/queries/credits.queries'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'
import type { MyDiscountCode } from '@/types/api'

const DISCOUNT_SOURCE_LABEL: Record<MyDiscountCode['source'], string> = {
  WELCOME_GIFT: 'هدیه‌ی خوش‌آمد',
  REFERRAL: 'پاداش معرفی دوستان',
  EXPIRY_REMINDER: 'یادآوری تمدید',
  MANUAL: 'کمپین ویژه',
}

export function ProfilePage() {
  const { data: me } = useMe()
  const update = useUpdateProfile()
  const logoutMut = useLogout()
  const { data: myCodes } = useMyDiscountCodes()
  const { data: creditsBalance } = useCreditsBalance()
  const [name, setName] = useState(me?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const referralUrl = me?.referralCode ? `${window.location.origin}/?ref=${me.referralCode}` : ''

  function copyReferralUrl() {
    if (!referralUrl) return
    void navigator.clipboard.writeText(referralUrl)
    setReferralCopied(true)
    track('referral_link_copied')
    setTimeout(() => setReferralCopied(false), 2000)
  }

  function copyDiscountCode(id: string, code: string, source?: MyDiscountCode['source']) {
    void navigator.clipboard.writeText(code)
    setCopiedCodeId(id)
    track('discount_code_copied', source ? { source } : undefined)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  useEffect(() => {
    if (me?.name) setName(me.name)
  }, [me?.name])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate(name, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      },
    })
  }

  return (
    <div className="space-y-5">
      {/* profile form */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm text-slate-400">{fa.settings.phone}</label>
            <p className="mt-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-400" dir="ltr">
              {me?.phone ?? '—'}
            </p>
          </div>
          <Input
            label={fa.settings.name}
            placeholder={fa.settings.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={update.isPending}>{fa.settings.saveProfile}</Button>
            {saved && <span className="text-sm text-emerald-400">{fa.settings.profileSaved}</span>}
            {update.isError && <span className="text-sm text-red-400">{fa.common.error}</span>}
          </div>
        </form>
      </div>

      {/* اعتبار — دیگه اشتراک/پلن ماهانه نیست، فقط موجودی نیوو + خرید اعتبار */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">{fa.settings.creditsBalance}</h3>
          <Link
            to="/pricing"
            className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            {fa.settings.buyCredits}
          </Link>
        </div>
        <p className={clsx('text-2xl font-bold', (creditsBalance?.credits ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400')}>
          {(creditsBalance?.credits ?? 0).toLocaleString('fa-IR')} <span className="text-sm font-normal text-slate-500">نیوو</span>
        </p>
        <Link
          to="/settings/invoices"
          className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-4">
            <path d="M6 2h6l4 4v12H6V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 10h4M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {fa.settings.viewInvoices}
        </Link>
      </div>

      {/* معرفی دوستان — docs/PRD-growth-traction-features.md بخش ۶ */}
      {me?.referralCode && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">🤝 معرفی دوستان</h3>
          <p className="mb-4 text-sm text-slate-400">
            لینکت رو برای دوستات بفرست — به ازای هر دوستی که با لینک تو ثبت‌نام کنه، ۴۰ نیوو
            هدیه می‌گیری. بدون محدودیت در تعداد دفعات.
          </p>
          <button
            onClick={copyReferralUrl}
            dir="ltr"
            className="w-full truncate rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-start text-sm text-emerald-400 hover:border-emerald-500/50 transition-colors"
          >
            {referralCopied ? 'کپی شد ✓' : referralUrl}
          </button>

          {myCodes && myCodes.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-700/40 pt-4">
              <p className="text-xs text-slate-500">کدهای تخفیف فعال شما:</p>
              {myCodes.map(c => (
                <button
                  key={c.id}
                  onClick={() => copyDiscountCode(c.id, c.code, c.source)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-start hover:border-emerald-500/50 transition-colors"
                >
                  <span className="flex flex-col items-start">
                    <span dir="ltr" className="font-mono text-sm text-emerald-400">
                      {copiedCodeId === c.id ? 'کپی شد ✓' : c.code}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {DISCOUNT_SOURCE_LABEL[c.source]} · {c.discountPercent}٪ تخفیف
                      {c.expiresAt && ` · تا ${new Date(c.expiresAt).toLocaleDateString('fa-IR')}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => logoutMut.mutate()}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/20 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-4">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {fa.nav.logout}
      </button>
    </div>
  )
}
