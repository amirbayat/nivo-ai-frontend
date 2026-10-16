import { useState, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { fa } from '@/locales/fa'
import type { ShopHistoryEntry } from '@/types/api'

type OtpResult = Promise<{ ok: boolean; message: string }>

interface ShopMenuSheetProps {
  open: boolean
  onClose: () => void
  history: ShopHistoryEntry[]
  // «صحبت با خود فروشنده» وقتی گفتگو همین الان دست فروشنده است پنهان می‌شود (§6.11)
  hideTalkToSeller: boolean
  talkToSellerDisabled: boolean
  onOrders: () => void
  onTalkToSeller: () => void
  onSelectHistory: (entry: ShopHistoryEntry) => void
  onNewChat: () => void
  storeName: string | null | undefined
  onAbout: () => void
  onSendOtp: (phone: string) => OtpResult
  onVerifyOtp: (phone: string, code: string, fullName?: string) => OtpResult
}

const HISTORY_STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/15 text-[var(--shop-accent)]',
  REJECTED: 'bg-rose-500/15 text-[var(--shop-danger)]',
  IN_PROGRESS: 'bg-sky-500/15 text-sky-500',
  NEEDS_ATTENTION: 'bg-amber-500/15 text-[var(--shop-warning)]',
}

const ICON = 'size-5 shrink-0 text-[var(--shop-text-2)]'
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', className: ICON, 'aria-hidden': true } as const

function MenuRow({ icon, label, hint, onClick, disabled }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-start text-[var(--shop-text)] disabled:opacity-40"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {hint && <span className="block text-xs text-[var(--shop-text-2)]">{hint}</span>}
      </span>
    </button>
  )
}

const inputClass =
  'min-h-11 rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3.5 text-[15px] text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] focus:outline-none'
const primaryBtn =
  'min-h-11 rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)] disabled:opacity-40'

// docs/PRD-buyer-phone-otp-registration.md — ثبت‌نام اختیاری با شماره+OTP (شماره → کد+اسم → موفقیت)،
// که قبلاً RegisterModal جدا بود و حالا یکی از نماهای شیت منو است
function RegisterForm({ onSendOtp, onVerifyOtp }: { onSendOtp: ShopMenuSheetProps['onSendOtp']; onVerifyOtp: ShopMenuSheetProps['onVerifyOtp'] }) {
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
    if (res.ok) setStep('done')
    else setError(res.message)
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

function HistoryList({ entries, onSelect }: { entries: ShopHistoryEntry[]; onSelect: (entry: ShopHistoryEntry) => void }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--shop-text-2)]">{fa.shop.v2.historyEmpty}</p>
  }
  return (
    <ul className="divide-y divide-[var(--shop-border)]">
      {entries.map((entry) => (
        <li key={entry.conversationId}>
          <button type="button" onClick={() => onSelect(entry)} className="flex min-h-14 w-full flex-col gap-1 py-3 text-start">
            <span className="text-[15px] font-semibold text-[var(--shop-text)]">{entry.storeName}</span>
            <span className="text-xs text-[var(--shop-text-2)]">{entry.lastProductName ?? fa.shop.historyNoProduct}</span>
            <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${HISTORY_STATUS_STYLES[entry.status] ?? 'bg-slate-500/15 text-[var(--shop-text-2)]'}`}>
              {fa.shop.historyStatusLabels[entry.status] ?? entry.status}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// docs/PRD-buyer-chat-redesign.md §6.11 — منوی ⋯: همه‌ی کارهای کم‌کاربرد که قبلاً پنج آیکون هدر بودند.
// تاریخچه و ثبت‌نام نماهای داخلی همین شیت‌اند (یک history entry، یک «بازگشت»). گزینه‌ی «درباره‌ی
// فروشگاه» (BC-3، B4) آخرین ردیف است
export function ShopMenuSheet(props: ShopMenuSheetProps) {
  const { open, onClose, history, hideTalkToSeller, talkToSellerDisabled } = props
  const [view, setView] = useState<'menu' | 'history' | 'login'>('menu')

  function close() {
    setView('menu')
    onClose()
  }

  const title = view === 'history' ? fa.shop.v2.historyTitle : view === 'login' ? fa.shop.registerTitle : fa.shop.v2.menuTitle

  return (
    <BottomSheet open={open} onClose={close} title={title} closeOnBack>
      {view !== 'menu' && (
        <button type="button" onClick={() => setView('menu')} className="mb-2 flex min-h-11 items-center gap-1 text-sm text-[var(--shop-text-2)]">
          {/* «بازگشت» در RTL: شورون رو به راست (CLAUDE.md) */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          {fa.shop.v2.back}
        </button>
      )}
      {view === 'menu' && (
        <div className="flex flex-col">
          <MenuRow
            icon={<svg {...svgProps}><path d="M5 8l7-4 7 4v8l-7 4-7-4V8z" /><path d="M5 8l7 4 7-4M12 12v8" /></svg>}
            label={fa.shop.v2.menuOrders}
            onClick={() => {
              close()
              props.onOrders()
            }}
          />
          {!hideTalkToSeller && (
            <MenuRow
              icon={<svg {...svgProps}><path d="M5 5h14v10H10l-4 4v-4H5V5z" /></svg>}
              label={fa.shop.v2.menuSeller}
              disabled={talkToSellerDisabled}
              onClick={() => {
                close()
                props.onTalkToSeller()
              }}
            />
          )}
          <MenuRow
            icon={<svg {...svgProps}><path d="M4 5v5h5M5 10a8 8 0 112.3 6" /><path d="M12 8v4l3 2" /></svg>}
            label={fa.shop.v2.menuHistory}
            onClick={() => setView('history')}
          />
          <MenuRow
            icon={<svg {...svgProps}><path d="M12 5v14M5 12h14" /></svg>}
            label={fa.shop.v2.menuNewChat}
            onClick={() => {
              close()
              props.onNewChat()
            }}
          />
          <MenuRow
            icon={<svg {...svgProps}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>}
            label={fa.shop.v2.menuLogin}
            hint={fa.shop.v2.loginValue}
            onClick={() => setView('login')}
          />
          <MenuRow
            icon={<svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>}
            label={fa.shop.v2.aboutTitle(props.storeName ?? '')}
            onClick={() => {
              close()
              props.onAbout()
            }}
          />
        </div>
      )}
      {view === 'history' && (
        <HistoryList
          entries={history}
          onSelect={(entry) => {
            close()
            props.onSelectHistory(entry)
          }}
        />
      )}
      {view === 'login' && <RegisterForm onSendOtp={props.onSendOtp} onVerifyOtp={props.onVerifyOtp} />}
    </BottomSheet>
  )
}
