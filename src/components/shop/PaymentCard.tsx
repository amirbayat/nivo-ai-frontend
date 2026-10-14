import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { copyText, selectElementText } from '@/lib/clipboard'
import { formatCardNumberGroups } from '@/lib/digits'
import { bankNameFromCard } from '@/lib/iranBanks'

// docs/PRD-nivo-sales-unified.md 3.8 — کارت پرداخت واحد برای کارت‌به‌کارت و لینک اسنپ‌پی (جایگزین
// PaymentInstructionsBlock/SnapppayPaymentInstructionsBlock). مبلغ برجسته با کپی (عدد بدون
// جداکننده)، شماره کارت گروه‌بندی‌شده LTR با نام بانک و صاحب حساب، مهلت پرداخت، دو قدم، کپی با
// fallback، آپلود با پیش‌نمایش/«عوض کردن»، و «رسید ندارم».

export interface ManualReceiptInfo {
  cardLast4: string
  approxTime: string
  trackingCode?: string
}

type PaymentCardProps = {
  amount: number
  orderCode?: string
  dueAt?: string
  disabled: boolean
  onUploadReceipt: (file: File) => void
} & (
  | { variant: 'CARD'; cardNumber: string; ownerName: string; onSubmitManualReceipt: (info: ManualReceiptInfo) => void }
  | { variant: 'SNAPPPAY'; link: string }
)

const tehranTime = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' })
const tehranDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' })

function deadlineText(dueAt?: string): string | null {
  if (!dueAt) return null
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime()) || due.getTime() < Date.now()) return null
  const time = tehranTime.format(due)
  return tehranDay.format(due) === tehranDay.format(new Date())
    ? fa.shop.payment.deadlineToday(time)
    : fa.shop.payment.deadlineLater(time)
}

function CopyButton({
  label,
  doneLabel,
  getText,
  onFailed,
  className,
}: {
  label: string
  doneLabel: string
  getText: () => string
  onFailed: () => void
  className?: string
}) {
  const [done, setDone] = useState(false)
  async function copy() {
    const result = await copyText(getText())
    if (result === 'ok') {
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } else {
      onFailed()
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={
        className ??
        'min-h-11 rounded-lg border border-slate-600/60 light:border-slate-300 px-3 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400'
      }
    >
      {done ? doneLabel : label}
    </button>
  )
}

function ReceiptPicker({ disabled, onUploadReceipt }: { disabled: boolean; onUploadReceipt: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const picked = e.target.files?.[0]
          if (picked) setFile(picked)
          e.target.value = ''
        }}
      />
      {file && previewUrl ? (
        <div className="flex flex-col gap-2">
          <img src={previewUrl} alt={fa.shop.payment.previewAlt} className="max-h-48 w-full rounded-lg bg-slate-900/40 object-contain" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={disabled}
              className="min-h-11 flex-1 rounded-lg border border-slate-600/60 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
            >
              {fa.shop.payment.changeReceipt}
            </button>
            <button
              type="button"
              onClick={() => {
                onUploadReceipt(file)
                setFile(null)
              }}
              disabled={disabled}
              className="min-h-11 flex-1 rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
            >
              {fa.shop.payment.sendReceipt}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="min-h-11 w-full rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
        >
          {fa.shop.payment.pickReceipt}
        </button>
      )}
    </div>
  )
}

function ManualReceiptForm({
  disabled,
  onSubmit,
  onCancel,
}: {
  disabled: boolean
  onSubmit: (info: ManualReceiptInfo) => void
  onCancel: () => void
}) {
  const t = fa.shop.payment.manual
  const [cardLast4, setCardLast4] = useState('')
  const [approxTime, setApproxTime] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (cardLast4.length !== 4) return setError(t.last4Invalid)
    if (!approxTime.trim()) return setError(t.timeRequired)
    setError(null)
    onSubmit({ cardLast4, approxTime: approxTime.trim(), trackingCode: trackingCode || undefined })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-600/60 light:border-slate-300 p-3">
      <p className="text-xs font-semibold text-slate-200 light:text-slate-900">{t.title}</p>
      <p className="text-[11px] text-slate-500">{t.hint}</p>
      <label className="text-[11px] text-slate-400 light:text-slate-600">{t.last4Label}</label>
      <DigitsInput
        kind="int"
        value={cardLast4}
        onChange={setCardLast4}
        maxLength={4}
        placeholder="1234"
        className="w-full rounded-lg border border-slate-700 light:border-slate-300 bg-slate-800/80 light:bg-white px-3 text-slate-100 light:text-slate-900"
      />
      <label className="text-[11px] text-slate-400 light:text-slate-600">{t.timeLabel}</label>
      <input
        type="text"
        value={approxTime}
        onChange={e => setApproxTime(e.target.value.slice(0, 40))}
        placeholder={t.timePlaceholder}
        style={{ fontSize: 16, minHeight: 44 }}
        className="w-full rounded-lg border border-slate-700 light:border-slate-300 bg-slate-800/80 light:bg-white px-3 text-slate-100 light:text-slate-900 placeholder:text-slate-500"
      />
      <label className="text-[11px] text-slate-400 light:text-slate-600">{t.trackingLabel}</label>
      <DigitsInput
        kind="int"
        value={trackingCode}
        onChange={setTrackingCode}
        maxLength={32}
        className="w-full rounded-lg border border-slate-700 light:border-slate-300 bg-slate-800/80 light:bg-white px-3 text-slate-100 light:text-slate-900"
      />
      {error && <p className="text-[11px] text-red-400 light:text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 rounded-lg border border-slate-600/60 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="min-h-11 flex-1 rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
        >
          {t.submit}
        </button>
      </div>
    </div>
  )
}

export function PaymentCard(props: PaymentCardProps) {
  const { amount, orderCode, dueAt, disabled, onUploadReceipt } = props
  const [copyFailed, setCopyFailed] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const cardRef = useRef<HTMLParagraphElement>(null)
  const amountRef = useRef<HTMLParagraphElement>(null)
  const deadline = deadlineText(dueAt)
  const isCard = props.variant === 'CARD'
  const bank = isCard ? bankNameFromCard(props.cardNumber) : null

  return (
    <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
      {orderCode && (
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400 light:text-slate-600">
          <span>
            {fa.shop.payment.orderCodeLabel}: <span dir="ltr" className="font-mono font-semibold text-slate-200 light:text-slate-900">{orderCode}</span>
          </span>
          <CopyButton
            label={fa.shop.payment.copyCode}
            doneLabel={fa.shop.payment.copied}
            getText={() => orderCode}
            onFailed={() => setCopyFailed(true)}
            className="min-h-11 rounded-lg px-2 text-[11px] font-semibold text-emerald-400 light:text-emerald-700"
          />
        </div>
      )}

      <p className="text-xs text-slate-500">{fa.shop.payment.amountLabel}</p>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p ref={amountRef} className="text-xl font-bold text-emerald-300 light:text-emerald-700">
          {amount.toLocaleString('fa-IR')} {fa.common.toman}
        </p>
        <CopyButton
          label={fa.shop.payment.copyAmount}
          doneLabel={fa.shop.payment.amountCopied}
          getText={() => String(amount)}
          onFailed={() => {
            setCopyFailed(true)
            selectElementText(amountRef.current)
          }}
        />
      </div>
      {deadline && <p className="mb-3 text-[11px] text-amber-300 light:text-amber-700">{deadline}</p>}

      <p className="mb-2 text-xs font-semibold text-slate-200 light:text-slate-900">
        {isCard ? fa.shop.payment.step1Card : fa.shop.payment.step1Snapppay}
      </p>

      {props.variant === 'CARD' ? (
        <div className="mb-3 rounded-lg bg-slate-900/40 light:bg-slate-100 p-3 text-center">
          <p className="mb-1 text-[11px] text-slate-500">{fa.shop.payment.cardLabel}</p>
          <p ref={cardRef} dir="ltr" className="select-all break-all font-mono text-base tracking-wide text-slate-100 light:text-slate-900">
            {formatCardNumberGroups(props.cardNumber.replace(/\D/g, ''))}
          </p>
          <p className="mt-1 text-xs text-slate-400 light:text-slate-600">
            {fa.shop.payment.holderLabel} {props.ownerName}
            {bank ? ` · ${bank}` : ''}
          </p>
          <CopyButton
            label={fa.shop.payment.copyCard}
            doneLabel={fa.shop.payment.copied}
            getText={() => props.cardNumber.replace(/\D/g, '')}
            onFailed={() => {
              setCopyFailed(true)
              selectElementText(cardRef.current)
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-600/60 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400"
          />
        </div>
      ) : (
        <a
          href={props.link}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-500 text-center text-xs font-semibold text-white hover:bg-emerald-400"
        >
          {fa.shop.payWithSnapppayButton}
        </a>
      )}

      {copyFailed && <p className="mb-3 text-[11px] text-amber-300 light:text-amber-700">{fa.shop.payment.copyFailedHint}</p>}

      {orderCode && (
        <p className="mb-2 text-xs font-semibold text-slate-200 light:text-slate-900">
          {isCard ? fa.shop.payment.step2Card : fa.shop.payment.step2Snapppay}
        </p>
      )}

      {orderCode &&
        (showManual && props.variant === 'CARD' ? (
          <ManualReceiptForm
            disabled={disabled}
            onSubmit={info => {
              props.onSubmitManualReceipt(info)
              setShowManual(false)
            }}
            onCancel={() => setShowManual(false)}
          />
        ) : (
          <>
            <ReceiptPicker disabled={disabled} onUploadReceipt={onUploadReceipt} />
            {props.variant === 'CARD' && (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                disabled={disabled}
                className="mt-1 min-h-11 w-full text-center text-[11px] font-medium text-slate-400 light:text-slate-600 underline disabled:opacity-40"
              >
                {fa.shop.payment.noReceiptLink}
              </button>
            )}
          </>
        ))}

      <p className="mt-2 text-center text-[11px] text-slate-500">{fa.shop.payment.trustBar}</p>
    </div>
  )
}
