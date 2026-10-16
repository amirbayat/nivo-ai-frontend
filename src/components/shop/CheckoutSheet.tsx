import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { BuyerPhoneForm } from '@/components/shop/BuyerPhoneForm'
import { PaymentCard, type ManualReceiptInfo } from '@/components/shop/PaymentCard'
import { copyText } from '@/lib/clipboard'
import { fa } from '@/locales/fa'
import type { PublicStoreAbout, ShopAction, ShopMessage, ShopUiBlock } from '@/types/api'

type AddressBlock = Extract<ShopUiBlock, { type: 'ADDRESS_PROMPT' }>
type Step = 'address' | 'method' | 'payment' | 'done'

// وضعیت‌هایی که شیت پرداخت برایشان معنا دارد؛ سرور منبع حقیقت است و ماشین‌حالت سمت کلاینت نداریم
export const CHECKOUT_STATES = ['ADDRESS_COLLECTION', 'PAYMENT_METHOD_SELECTION', 'AWAITING_PAYMENT']
export const DONE_STATES = ['RECEIPT_SUBMITTED', 'AWAITING_SELLER_APPROVAL']

export function checkoutStepFor(state: string, doneStep: boolean): Step | null {
  if (doneStep && DONE_STATES.includes(state)) return 'done'
  if (state === 'ADDRESS_COLLECTION') return 'address'
  if (state === 'PAYMENT_METHOD_SELECTION') return 'method'
  if (state === 'AWAITING_PAYMENT') return 'payment'
  return null
}

function latestBlock<T extends ShopUiBlock['type']>(messages: ShopMessage[], type: T): { block: Extract<ShopUiBlock, { type: T }>; message: ShopMessage } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const block = messages[i].uiBlock
    if (block?.type === type) return { block: block as Extract<ShopUiBlock, { type: T }>, message: messages[i] }
  }
  return null
}

const labelCls = 'mb-1 block text-sm text-[var(--shop-text-2)]'
const fieldCls =
  'min-h-11 w-full rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3 text-[15px] text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] focus:outline-none'
const errCls = 'mt-1 text-xs text-[var(--shop-danger)]'
const primaryCls = 'min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-[15px] font-bold text-[var(--shop-accent-text)] disabled:opacity-50'
const outlineCls = 'min-h-12 w-full rounded-xl border border-[var(--shop-border)] text-[15px] font-semibold text-[var(--shop-text)] disabled:opacity-50'

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
      {error && <p className={errCls}>{error}</p>}
    </div>
  )
}

const FORM_ID = 'checkout-address-form'

// ── مرحله‌ی آدرس: فرم تک‌ستونه با برچسب بالای هر فیلد؛ خطاها و مقادیر تایپ‌شده (از سرور) حفظ می‌شوند ─────
function AddressForm({ block, disabled, onSendAction }: { block: AddressBlock; disabled: boolean; onSendAction: (a: ShopAction) => void }) {
  const v = block.values
  const [name, setName] = useState(v?.recipientName || block.prefillName || '')
  const [phone, setPhone] = useState(v?.recipientPhone || block.prefillPhone || '')
  const [province, setProvince] = useState(v?.province ?? '')
  const [city, setCity] = useState(v?.city ?? '')
  const [street, setStreet] = useState(v?.addressText ?? '')
  const [postal, setPostal] = useState(v?.postalCode ?? '')
  const [plaque, setPlaque] = useState(v?.plaque ?? '')
  const [unit, setUnit] = useState(v?.unit ?? '')
  const e = block.fieldErrors
  return (
    <form
      id={FORM_ID}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled) return
        onSendAction({
          type: 'SUBMIT_ADDRESS',
          recipientName: name.trim(),
          recipientPhone: phone,
          province,
          city: city.trim(),
          addressText: street.trim(),
          postalCode: postal,
          plaque: plaque.trim() || undefined,
          unit: unit.trim() || undefined,
        })
      }}
    >
      <Field id="ad-name" label={fa.shop.v2.fieldName} error={e?.name}>
        <input id="ad-name" value={name} onChange={(ev) => setName(ev.target.value)} autoComplete="name" className={fieldCls} />
      </Field>
      <Field id="ad-phone" label={fa.shop.v2.fieldPhone} error={e?.phone}>
        <DigitsInput id="ad-phone" kind="phone" allowIntl value={phone} onChange={setPhone} autoComplete="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" className={fieldCls} />
      </Field>
      <Field id="ad-province" label={fa.shop.v2.fieldProvince} error={e?.province}>
        <select id="ad-province" value={province} onChange={(ev) => setProvince(ev.target.value)} className={fieldCls}>
          <option value="">{fa.shop.v2.choose}</option>
          {(block.provinces ?? []).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Field>
      <Field id="ad-city" label={fa.shop.v2.fieldCity} error={e?.city}>
        <input id="ad-city" value={city} onChange={(ev) => setCity(ev.target.value)} autoComplete="address-level2" className={fieldCls} />
      </Field>
      <Field id="ad-street" label={fa.shop.v2.fieldAddress} error={e?.street}>
        <input id="ad-street" value={street} onChange={(ev) => setStreet(ev.target.value)} autoComplete="street-address" className={fieldCls} />
      </Field>
      <Field id="ad-postal" label={fa.shop.v2.fieldPostal} error={e?.postal}>
        <DigitsInput id="ad-postal" kind="postal" value={postal} onChange={setPostal} autoComplete="postal-code" placeholder="۱۲۳۴۵۶۷۸۹۰" className={fieldCls} />
      </Field>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="ad-plaque" className={labelCls}>
            {fa.shop.v2.fieldPlaque}
          </label>
          <input id="ad-plaque" value={plaque} onChange={(ev) => setPlaque(ev.target.value)} className={fieldCls} />
        </div>
        <div className="flex-1">
          <label htmlFor="ad-unit" className={labelCls}>
            {fa.shop.v2.fieldUnit}
          </label>
          <input id="ad-unit" value={unit} onChange={(ev) => setUnit(ev.target.value)} className={fieldCls} />
        </div>
      </div>
    </form>
  )
}

function ProvincePicker({ provinces, disabled, onPick }: { provinces: string[]; disabled: boolean; onPick: (p: string) => void }) {
  const [q, setQ] = useState('')
  const shown = provinces.filter((p) => !q.trim() || p.includes(q.trim()))
  return (
    <div className="flex flex-col gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={fa.shop.v2.searchProvince} aria-label={fa.shop.v2.searchProvince} className={fieldCls} />
      <div className="grid grid-cols-2 gap-2">
        {shown.map((p) => (
          <button key={p} type="button" disabled={disabled} onClick={() => onPick(p)} className="min-h-11 rounded-xl border border-[var(--shop-border)] px-2 text-sm text-[var(--shop-text)] disabled:opacity-40">
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function SaveAddressAsk({ disabled, onSendAction }: { disabled: boolean; onSendAction: (a: ShopAction) => void }) {
  const [keep, setKeep] = useState(true)
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--shop-text)]">
        <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-5 accent-[var(--shop-accent-fill)]" />
        {fa.shop.v2.keepAddress}
      </label>
      <button type="button" disabled={disabled} onClick={() => onSendAction({ type: keep ? 'SAVE_ADDRESS' : 'SKIP_SAVE_ADDRESS' })} className={primaryCls}>
        {fa.shop.v2.continueLabel}
      </button>
    </div>
  )
}

function OptionCard({ title, hint, disabled, onClick }: { title: string; hint: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-20 w-full flex-col items-start gap-1 rounded-2xl border border-[var(--shop-border)] p-4 text-start disabled:opacity-40">
      <span className="text-base font-bold text-[var(--shop-text)]">{title}</span>
      <span className="text-sm leading-6 text-[var(--shop-text-2)]">{hint}</span>
    </button>
  )
}

function Steps({ requiresShipping, current }: { requiresShipping: boolean; current: 'address' | 'payment' | 'receipt' }) {
  const steps = [
    ...(requiresShipping ? [{ key: 'address', label: fa.shop.v2.stepAddress }] : []),
    { key: 'payment', label: fa.shop.v2.stepPayment },
    { key: 'receipt', label: fa.shop.v2.stepReceipt },
  ]
  const index = steps.findIndex((s) => s.key === current)
  return (
    <ol className="mb-3 flex items-center gap-2" aria-label={fa.shop.v2.checkoutTitle}>
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 flex-col gap-1" aria-current={i === index ? 'step' : undefined}>
          <span className={`h-1 rounded-full ${i <= index ? 'bg-[var(--shop-accent-fill)]' : 'bg-[var(--shop-surface-2)]'}`} />
          <span className={`text-xs ${i === index ? 'font-bold text-[var(--shop-text)]' : 'text-[var(--shop-text-2)]'}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

interface CheckoutSheetProps {
  open: boolean
  onClose: () => void
  state: string
  doneStep: boolean
  messages: ShopMessage[]
  requiresShipping: boolean
  storeName: string | null | undefined
  about: PublicStoreAbout | null
  disabled: boolean
  // پیام خطای یک‌خطی سرور بعد از اکشن ناموفق
  error: string | null | undefined
  verified: boolean
  onVerified: () => void
  onSendAction: (action: ShopAction) => void
  onUploadReceipt: (file: File) => void
  onSubmitManualReceipt: (info: ManualReceiptInfo) => void
  onSendOtp: (phone: string) => Promise<{ ok: boolean; message: string }>
  onVerifyOtp: (phone: string, code: string, fullName?: string) => Promise<{ ok: boolean; message: string }>
  onAsk: () => void
  onBackToChat: () => void
}

// docs/PRD-buyer-chat-redesign.md §6.7 — شیت تمرکز روی پرداخت. محتوا از state فعلی + آخرین بلاک همان مرحله
// می‌آید؛ سرور منبع حقیقت است و ماشین مرحله‌ی کلاینتی نداریم
export function CheckoutSheet(props: CheckoutSheetProps) {
  const step = checkoutStepFor(props.state, props.doneStep)
  const address = useMemo(() => latestBlock(props.messages, 'ADDRESS_PROMPT'), [props.messages])
  const instructions = useMemo(() => latestBlock(props.messages, 'PAYMENT_INSTRUCTIONS'), [props.messages])
  const snapp = useMemo(() => latestBlock(props.messages, 'SNAPPPAY_PAYMENT_INSTRUCTIONS'), [props.messages])
  const [copied, setCopied] = useState(false)
  const [phoneOffer, setPhoneOffer] = useState(true)
  useEffect(() => setCopied(false), [step])

  // وقتی وضعیت از مراحل چک‌اوت بیرون رفت (مثلاً سفارش تایید/رد شد) شیت باز نمی‌ماند
  useEffect(() => {
    if (props.open && step == null) props.onClose()
  }, [props, step])
  if (!props.open || step == null) return null

  // کد سفارش و مبلغ: از بلاک پرداخت فعلی؛ در مرحله‌ی «رسید» هم همان آخرین بلاک
  const payBlock = snapp && (!instructions || props.messages.indexOf(snapp.message) > props.messages.indexOf(instructions.message)) ? { kind: 'SNAPPPAY' as const, ...snapp } : instructions ? { kind: 'CARD' as const, ...instructions } : null
  const orderCode = payBlock?.block.orderCode ?? null
  const stepperCurrent: 'address' | 'payment' | 'receipt' = step === 'address' ? 'address' : step === 'done' ? 'receipt' : 'payment'

  let body: ReactNode = null
  let footer: ReactNode = null

  if (step === 'address') {
    const ab = address?.block
    if (!ab) {
      body = <p className="py-6 text-center text-sm text-[var(--shop-text-2)]">{fa.common.loading}</p>
    } else if (ab.mode === 'FORM') {
      // کلید با شناسه‌ی پیام: بلاک جدید (با خطا) فرم را با مقادیر سرور دوباره می‌سازد
      body = <AddressForm key={address.message.id} block={ab} disabled={props.disabled} onSendAction={props.onSendAction} />
      footer = (
        <button type="submit" form={FORM_ID} disabled={props.disabled} className={primaryCls}>
          {fa.shop.v2.addressSubmit}
        </button>
      )
    } else if (ab.mode === 'CHOOSE_SAVED') {
      body = (
        <div className="flex flex-col gap-2" role="radiogroup">
          {(ab.addresses ?? []).map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={false} disabled={props.disabled} onClick={() => props.onSendAction({ type: 'SELECT_ADDRESS', addressId: a.id })} className="min-h-14 rounded-2xl border border-[var(--shop-border)] px-4 py-3 text-start text-[15px] leading-6 text-[var(--shop-text)] disabled:opacity-40">
              {a.summary}
            </button>
          ))}
          <button type="button" disabled={props.disabled} onClick={() => props.onSendAction({ type: 'NEW_ADDRESS' })} className="min-h-14 rounded-2xl border border-dashed border-[var(--shop-border)] px-4 text-[15px] font-semibold text-[var(--shop-accent)] disabled:opacity-40">
            {fa.shop.v2.addressNew}
          </button>
        </div>
      )
    } else if (ab.mode === 'CHOOSE_PROVINCE') {
      body = <ProvincePicker provinces={ab.provinces ?? []} disabled={props.disabled} onPick={(province) => props.onSendAction({ type: 'SELECT_PROVINCE', province })} />
    } else if (ab.mode === 'CONFIRM') {
      body = (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[var(--shop-border)] p-4">
            <p className="whitespace-pre-line text-[15px] leading-7 text-[var(--shop-text)]">{ab.summary}</p>
          </div>
          {ab.provinceCovered === false ? (
            <p className="text-sm text-[var(--shop-warning)]">{address.message.text}</p>
          ) : ab.shippingCostToman != null ? (
            <p className="text-sm text-[var(--shop-text-2)]">
              {fa.shop.v2.shippingCost(ab.shippingCostToman === 0 ? fa.shop.v2.aboutFree : `${ab.shippingCostToman.toLocaleString('fa-IR')} تومان`)}
            </p>
          ) : null}
        </div>
      )
      footer = (
        <div className="flex gap-2">
          <button type="button" disabled={props.disabled} onClick={() => props.onSendAction({ type: 'EDIT_ADDRESS' })} className={outlineCls}>
            {fa.shop.v2.addressEdit}
          </button>
          <button type="button" disabled={props.disabled} onClick={() => props.onSendAction({ type: 'CONFIRM_ADDRESS' })} className={primaryCls}>
            {fa.shop.v2.addressOk}
          </button>
        </div>
      )
    } else {
      body = <SaveAddressAsk disabled={props.disabled} onSendAction={props.onSendAction} />
    }
  } else if (step === 'method') {
    body = (
      <div className="flex flex-col gap-3">
        <OptionCard title={fa.shop.v2.methodCard} hint={fa.shop.v2.methodCardHint} disabled={props.disabled} onClick={() => props.onSendAction({ type: 'SELECT_PAYMENT_METHOD', paymentMethod: 'CARD_TO_CARD' })} />
        <OptionCard title={fa.shop.v2.methodSnapp} hint={fa.shop.v2.methodSnappHint} disabled={props.disabled} onClick={() => props.onSendAction({ type: 'SELECT_PAYMENT_METHOD', paymentMethod: 'SNAPPPAY' })} />
      </div>
    )
  } else if (step === 'payment') {
    body = payBlock ? (
      <div className="flex flex-col gap-3">
        <p className="rounded-xl bg-[var(--shop-surface-2)] px-3 py-2 text-sm leading-6 text-[var(--shop-text)]">
          {payBlock.kind === 'CARD' ? fa.shop.v2.trustStrip(payBlock.block.ownerName, orderCode ?? '—') : fa.shop.v2.trustStripSnapp(orderCode ?? '—')}
        </p>
        {payBlock.kind === 'CARD' ? (
          <PaymentCard
            variant="CARD"
            cardNumber={payBlock.block.cardNumber}
            ownerName={payBlock.block.ownerName}
            amount={payBlock.block.amount}
            orderCode={payBlock.block.orderCode}
            dueAt={payBlock.block.dueAt}
            disabled={props.disabled}
            onUploadReceipt={props.onUploadReceipt}
            onSubmitManualReceipt={props.onSubmitManualReceipt}
          />
        ) : (
          <PaymentCard variant="SNAPPPAY" link={payBlock.block.link} amount={payBlock.block.amount} orderCode={payBlock.block.orderCode} dueAt={payBlock.block.dueAt} disabled={props.disabled} onUploadReceipt={props.onUploadReceipt} />
        )}
      </div>
    ) : (
      <p className="py-6 text-center text-sm text-[var(--shop-text-2)]">{fa.common.loading}</p>
    )
  } else {
    body = (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-xl font-bold text-[var(--shop-text)]">{fa.shop.v2.receiptDone}</p>
        {props.about?.approvalEtaLabel && <p className="text-sm text-[var(--shop-text-2)]">{fa.shop.v2.approvalEta(props.storeName ?? '', props.about.approvalEtaLabel)}</p>}
        {orderCode && (
          <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--shop-border)] px-3 py-2">
            <span className="text-sm text-[var(--shop-text-2)]">{fa.shop.v2.orderCode}</span>
            <span dir="ltr" className="font-mono text-base font-bold text-[var(--shop-text)]">
              {orderCode}
            </span>
            <button
              type="button"
              onClick={async () => setCopied((await copyText(orderCode)) === 'ok')}
              className="min-h-11 px-2 text-sm text-[var(--shop-accent)]"
            >
              {copied ? fa.shop.v2.copied : fa.shop.v2.copy}
            </button>
          </div>
        )}
        {!props.verified && phoneOffer && (
          <div className="w-full rounded-2xl border border-[var(--shop-border)] p-3 text-start">
            <p className="mb-2 text-sm leading-6 text-[var(--shop-text)]">{fa.shop.v2.savePhoneOffer}</p>
            <BuyerPhoneForm onSendOtp={props.onSendOtp} onVerifyOtp={props.onVerifyOtp} onVerified={props.onVerified} />
            <button type="button" onClick={() => setPhoneOffer(false)} className="mt-1 min-h-11 text-sm text-[var(--shop-text-2)] underline">
              {fa.shop.v2.notNow}
            </button>
          </div>
        )}
      </div>
    )
    footer = (
      <button type="button" onClick={props.onBackToChat} className={primaryCls}>
        {fa.shop.v2.backToChatShort}
      </button>
    )
  }

  return (
    <BottomSheet
      open
      onClose={props.onClose}
      closeOnBack
      full
      title={fa.shop.v2.checkoutTitle}
      footer={footer ?? undefined}
    >
      <Steps requiresShipping={props.requiresShipping} current={stepperCurrent} />
      {props.error && <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-[var(--shop-danger)]" role="alert">{props.error}</p>}
      {body}
      {step !== 'done' && (
        <button type="button" onClick={props.onAsk} className="mt-4 min-h-11 w-full text-center text-sm text-[var(--shop-accent)] underline">
          {fa.shop.v2.haveQuestionLink}
        </button>
      )}
    </BottomSheet>
  )
}
