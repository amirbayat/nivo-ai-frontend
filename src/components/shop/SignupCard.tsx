import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { api } from '@/lib/api'
import { toEnglishDigits } from '@/lib/digits'
import { useSendOtp, useVerifyOtp } from '@/queries/auth.queries'
import { useLeadSignup } from '@/components/shop/LeadSignupContext'
import { fa } from '@/locales/fa'

const PHONE_RE = /^(\+98|0)?9[0-9]{9}$/
const RESEND_SECONDS = 60
type Step = 'phone' | 'code' | 'done'
interface Saved {
  step: Step
  phone: string
  hasStore?: boolean
  gift?: boolean
}

const inputClass =
  'min-h-12 w-full rounded-xl border border-[var(--shop-border)] bg-[var(--shop-bg)] px-3.5 text-center text-base tracking-wider text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] focus:outline-none'
const primaryBtn =
  'min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-[15px] font-bold text-[var(--shop-accent-text)] disabled:opacity-40'

function storageKey(conversationId: string | null) {
  return `nivo:leadSignup:${conversationId ?? 'none'}`
}
function readSaved(conversationId: string | null): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(conversationId))
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}
function writeSaved(conversationId: string | null, value: Saved) {
  try {
    sessionStorage.setItem(storageKey(conversationId), JSON.stringify(value))
  } catch {
    /* بدون sessionStorage فقط رفرش از اول شروع می‌شود */
  }
}
function hasToken(): boolean {
  try {
    return !!localStorage.getItem('access_token')
  } catch {
    return false
  }
}
function maskPhone(phone: string): string {
  const p = toEnglishDigits(phone)
  return `${p.slice(0, 4)}•••${p.slice(-4)}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}
function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

// docs/PRD-nivo-lead-shop-seller-signup.md §4.3 — کارت ثبت‌نام داخل چت: شماره → کد → موفق
export function SignupCard({ prefillPhone, autoFocus, onClose }: { prefillPhone?: string; autoFocus?: boolean; onClose?: () => void }) {
  const lead = useLeadSignup()
  const navigate = useNavigate()
  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()
  const conversationId = lead?.conversationId ?? null

  const [initial] = useState<Saved>(() => {
    const saved = readSaved(conversationId)
    if (saved) return saved
    if (hasToken()) return { step: 'done', phone: '' }
    return { step: 'phone', phone: prefillPhone ?? '' }
  })
  const [step, setStep] = useState<Step>(initial.step)
  const [phone, setPhone] = useState(initial.phone)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [waitlist, setWaitlist] = useState<string | null>(null)
  const [hasStore, setHasStore] = useState(!!initial.hasStore)
  const [gift, setGift] = useState(!!initial.gift)
  const [countdown, setCountdown] = useState(0)
  const submittedCode = useRef<string | null>(null)
  const markedRef = useRef(false)

  // حالت «code» با رفرش از ابتدا شروع می‌شود (شمارش معکوس و کد ارسال‌شده از دست رفته؛ کاربر «ارسال دوباره» می‌زند)
  useEffect(() => {
    if (step === 'code') setCountdown((c) => (c > 0 ? c : 0))
  }, [step])
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // کاربر از قبل لاگین‌شده: مستقیم حالت ۳؛ فقط یک‌بار لید را به User وصل می‌کنیم
  useEffect(() => {
    if (step !== 'done' || markedRef.current || !lead) return
    markedRef.current = true
    void (async () => {
      await lead.markVerified().catch(() => undefined)
      try {
        const stores = await api.get<unknown[]>('/v2/stores/me').then((r) => r.data)
        if (stores.length > 0) setHasStore(true)
      } catch {
        /* حالت پیش‌فرض: ساخت فروشگاه */
      }
    })()
  }, [step, lead])

  useEffect(() => {
    if (step === 'done') lead?.onSignedUp?.(hasStore)
  }, [step, hasStore, lead])

  useEffect(() => {
    if (step === 'phone' && !phone && prefillPhone) setPhone(prefillPhone)
  }, [prefillPhone, step, phone])

  function persist(next: Saved) {
    writeSaved(conversationId, next)
  }

  async function requestCode(rawPhone: string): Promise<boolean> {
    try {
      await sendOtp.mutateAsync(toEnglishDigits(rawPhone))
      lead?.logEvent('lead_otp_sent')
      setCountdown(RESEND_SECONDS)
      return true
    } catch {
      setError(fa.shop.lead.card.sendFailed)
      return false
    }
  }

  async function submitPhone(e?: FormEvent) {
    e?.preventDefault()
    if (sendOtp.isPending) return
    const normalized = toEnglishDigits(phone).replace(/\s/g, '')
    if (!PHONE_RE.test(normalized)) {
      setError(fa.shop.lead.card.phoneInvalid)
      return
    }
    setError(null)
    lead?.logEvent('lead_phone_submit')
    if (!(await requestCode(normalized))) return
    // ثبت لید (D3) بهترین‌تلاش؛ شکستش جلوی OTP را نمی‌گیرد
    void lead?.submitPhone(normalized).catch(() => undefined)
    setPhone(normalized)
    setCode('')
    submittedCode.current = null
    setStep('code')
    persist({ step: 'code', phone: normalized })
  }

  async function submitCode(value: string) {
    if (verifyOtp.isPending) return
    submittedCode.current = value
    setError(null)
    try {
      const result = await verifyOtp.mutateAsync({ phone: toEnglishDigits(phone), code: value, leadConversationId: conversationId ?? undefined })
      if (result.waitlisted) {
        setWaitlist(result.waitlisted.message)
        return
      }
      lead?.logEvent('lead_verified')
      const hadGift = (result.signupBonusCredits ?? 0) > 0
      setGift(hadGift)
      await lead?.markVerified().catch(() => undefined)
      let stores = false
      try {
        const list = await api.get<unknown[]>('/v2/stores/me').then((r) => r.data)
        stores = list.length > 0
      } catch {
        /* ignore */
      }
      markedRef.current = true
      setHasStore(stores)
      setStep('done')
      persist({ step: 'done', phone, hasStore: stores, gift: hadGift })
    } catch {
      lead?.logEvent('lead_otp_fail')
      setError(fa.shop.lead.card.codeInvalid)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setCode('')
      submittedCode.current = null
    }
  }

  function onCodeChange(value: string) {
    setCode(value)
    if (value.length === 6 && submittedCode.current !== value) void submitCode(value)
  }

  function goNext() {
    lead?.logEvent('lead_go_onboarding')
    navigate(hasStore ? '/seller/panel/today' : '/seller/onboarding')
  }

  const t = fa.shop.lead.card
  return (
    <section aria-label={t.title} className="mt-2 w-full max-w-sm rounded-2xl border border-[var(--shop-border)] bg-[var(--shop-surface)] p-4 text-start">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-bold leading-7 text-[var(--shop-text)]">{step === 'done' ? t.doneTitle : t.title}</h2>
        {onClose && step !== 'done' && (
          <button type="button" onClick={onClose} aria-label={t.close} className="-mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--shop-text-2)]">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5" aria-hidden>
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        )}
      </div>

      {step === 'phone' && (
        <form onSubmit={(e) => void submitPhone(e)} className="mt-1 flex flex-col gap-3" noValidate>
          <p className="text-[13px] leading-6 text-[var(--shop-text-2)]">{t.subtitle}</p>
          <DigitsInput
            kind="phone"
            dir="ltr"
            value={phone}
            onChange={setPhone}
            aria-label={t.phoneLabel}
            placeholder={t.phonePlaceholder}
            autoComplete="tel"
            autoFocus={autoFocus}
            className={inputClass}
          />
          <p aria-live="polite" className="min-h-0 text-xs text-[var(--shop-danger)]">
            {error}
          </p>
          <button type="submit" disabled={sendOtp.isPending} className={primaryBtn}>
            {sendOtp.isPending ? t.sending : t.sendCode}
          </button>
          <p className="text-xs leading-6 text-[var(--shop-text-2)]">
            {t.termsBefore}
            <Link to="/terms" className="text-[var(--shop-accent)] underline">
              {t.termsLink}
            </Link>
            {t.termsAfter}
          </p>
        </form>
      )}

      {step === 'code' && (
        <div className="mt-1 flex flex-col gap-3">
          <p className="text-[13px] leading-6 text-[var(--shop-text-2)]">{t.codeSentBefore}
            <bdi dir="ltr">{maskPhone(phone)}</bdi>
            {t.codeSentAfter}
          </p>
          {waitlist ? (
            <p aria-live="polite" className="rounded-xl bg-[var(--shop-surface-2)] p-3 text-sm leading-7 text-[var(--shop-text)]">
              {waitlist}
            </p>
          ) : (
            <>
              <div className={shake ? 'animate-[nivo-otp-shake_0.4s]' : ''}>
                <DigitsInput
                  kind="otp"
                  dir="ltr"
                  value={code}
                  onChange={onCodeChange}
                  aria-label={t.codeLabel}
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={verifyOtp.isPending}
                  className={inputClass}
                />
              </div>
              <p aria-live="polite" className="min-h-0 text-xs text-[var(--shop-danger)]">
                {error}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--shop-text-2)]">
                {countdown > 0 ? (
                  <span className="inline-flex min-h-11 items-center tabular-nums">{t.resendIn(mmss(countdown))}</span>
                ) : (
                  <button type="button" onClick={() => void requestCode(phone)} className="min-h-11 text-[var(--shop-accent)] underline">
                    {t.resend}
                  </button>
                )}
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setError(null)
                    persist({ step: 'phone', phone })
                  }}
                  className="min-h-11 underline"
                >
                  {t.changePhone}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="mt-1 flex flex-col gap-3" aria-live="polite">
          <p className="flex items-center gap-2 text-sm text-[var(--shop-accent)]">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden>
              <circle cx="10" cy="10" r="8" />
              <path d="m6.5 10.3 2.4 2.4 4.6-4.9" />
            </svg>
            {hasStore ? t.doneBack : gift ? t.gift : t.doneReady}
          </p>
          <button type="button" onClick={goNext} className={`${primaryBtn} flex items-center justify-center gap-2`}>
            {hasStore ? t.goPanel : t.goOnboarding}
            {/* «ادامه/برو» در RTL: فلش رو به چپ (CLAUDE.md) */}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
              <path d="M16 10H4M8.5 5.5 4 10l4.5 4.5" />
            </svg>
          </button>
        </div>
      )}
    </section>
  )
}
