import { useState } from 'react'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { fa } from '@/locales/fa'

type OtpSend = (phone: string) => Promise<{ ok: boolean; message: string }>
type OtpVerify = (phone: string, code: string, fullName?: string) => Promise<{ ok: boolean; message: string }>

const inputClass =
  'min-h-11 rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3.5 text-[15px] text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] focus:outline-none'
const primaryBtn =
  'min-h-11 rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)] disabled:opacity-40'

// docs/PRD-buyer-phone-otp-registration.md — ثبت‌نام اختیاری با شماره+OTP (شماره → کد+اسم → موفقیت)،
// که قبلاً RegisterModal جدا بود و حالا یکی از نماهای شیت منو است
export function BuyerPhoneForm({ onSendOtp, onVerifyOtp, onVerified }: { onSendOtp: OtpSend; onVerifyOtp: OtpVerify; onVerified?: () => void }) {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitPhone() {
    if (!phone.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await onSendOtp(phone.trim())
    setBusy(false)
    if (res.ok) setStep('code')
    else setError(res.message)
  }

  async function submitCode() {
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await onVerifyOtp(phone.trim(), code.trim(), fullName.trim() || undefined)
    setBusy(false)
    if (res.ok) {
      setStep('done')
      onVerified?.()
    } else setError(res.message)
  }

  if (step === 'done') {
    return <p className="py-6 text-center text-[15px] font-semibold text-[var(--shop-accent)]">{fa.shop.registerSuccess}</p>
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-2 text-xs leading-6 text-[var(--shop-text-2)]">{fa.shop.registerIntro}</p>
      {step === 'phone' && (
        <>
          <DigitsInput kind="phone" value={phone} onChange={setPhone} placeholder={fa.shop.registerPhonePlaceholder} className={inputClass} />
          {error && <p className="text-xs text-[var(--shop-danger)]">{error}</p>}
          <button type="button" onClick={() => void submitPhone()} disabled={busy || !phone.trim()} className={primaryBtn}>
            {fa.shop.registerSendCodeButton}
          </button>
        </>
      )}
      {step === 'code' && (
        <>
          <DigitsInput kind="otp" value={code} onChange={setCode} placeholder={fa.shop.registerCodePlaceholder} className={inputClass} />
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={fa.shop.registerNamePlaceholder} className={inputClass} />
          {error && <p className="text-xs text-[var(--shop-danger)]">{error}</p>}
          <button type="button" onClick={() => void submitCode()} disabled={busy || !code.trim()} className={primaryBtn}>
            {fa.shop.registerConfirmButton}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('phone')
              setError(null)
            }}
            className="min-h-11 text-xs text-[var(--shop-text-2)] underline"
          >
            {fa.shop.registerChangePhone}
          </button>
        </>
      )}
    </div>
  )
}

