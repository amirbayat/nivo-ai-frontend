import { useLayoutEffect, useRef } from 'react'
import type { ClipboardEvent, ChangeEvent, InputHTMLAttributes, KeyboardEvent } from 'react'
import { toEnglishDigits, formatThousands, formatCardNumberGroups } from '@/lib/digits'
import { Input } from './Input'

export type DigitsKind = 'phone' | 'otp' | 'price' | 'int' | 'card' | 'sheba' | 'postal' | 'decimal'

const MAX_LENGTH: Partial<Record<DigitsKind, number>> = {
  otp: 6,
  card: 16,
  postal: 10,
}

const INPUT_MODE: Record<DigitsKind, 'numeric' | 'decimal' | 'tel'> = {
  phone: 'tel',
  otp: 'numeric',
  price: 'numeric',
  int: 'numeric',
  card: 'numeric',
  sheba: 'numeric',
  postal: 'numeric',
  decimal: 'decimal',
}

// جداکننده‌ها: کاما (انگلیسی/فارسی/عربی)، فاصله، خط تیره، نیم‌فاصله و کاراکترهای جهت‌دهی
const SEPARATORS = /[,٬،\s\-‌‎‏ ]/g

/** ورودی خام (هر نوع رقم/جداکننده) ← رشته‌ی تمیز با رقم انگلیسی مطابق kind. */
function sanitizeDigits(kind: DigitsKind, input: string, maxLength?: number, allowIntl = false): string {
  const s = toEnglishDigits(input).replace(/٫/g, '.').replace(SEPARATORS, '')
  let out: string
  switch (kind) {
    case 'phone': {
      const digits = s.replace(/\D/g, '')
      if (!allowIntl) {
        // سایر فیلدهای تلفن: همان ۱۱ رقم موبایل
        out = digits.slice(0, 11)
        break
      }
      // +98 / 0098 / 98 / 09 — فقط فرم آدرس (allowIntl)؛ سرور نرمال می‌کند
      const plus = s.startsWith('+')
      const max = plus ? 12 : digits.startsWith('00') ? 14 : digits.startsWith('98') ? 12 : 11
      out = plus ? '+' + digits.slice(0, max) : digits.slice(0, max)
      break
    }
    case 'sheba': {
      const m = s.match(/^[iI][rR]?/)
      const prefix = m ? m[0].toUpperCase() : ''
      out = prefix + s.slice(m ? m[0].length : 0).replace(/\D/g, '').slice(0, 24)
      break
    }
    case 'decimal': {
      const cleaned = s.replace(/[^\d.]/g, '')
      const dot = cleaned.indexOf('.')
      out = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
      break
    }
    default: {
      out = s.replace(/\D/g, '')
      const max = MAX_LENGTH[kind]
      if (max) out = out.slice(0, max)
    }
  }
  return maxLength != null && maxLength > 0 ? out.slice(0, maxLength) : out
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

function formatForDisplay(kind: DigitsKind, raw: string, persian = false): string {
  if (kind === 'price') {
    const grouped = formatThousands(raw)
    // SP-4 §4.11.3 — نمایش فارسی: ارقام فارسی و جداکننده‌ی «٬» (مقدار ذخیره‌شده همچنان رقم انگلیسی)
    return persian ? grouped.replace(/\d/g, d => FA_DIGITS[Number(d)]).replace(/,/g, '٬') : grouped
  }
  if (kind === 'card') return formatCardNumberGroups(raw)
  return raw
}

interface DigitsInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  kind: DigitsKind
  value: string
  /** همیشه رشته‌ی خام با رقم انگلیسی (بدون جداکننده) */
  onChange: (rawValue: string) => void
  label?: string
  error?: string
  /** فقط kind="phone": پذیرش +98 / 0098 / 98 (مثلاً فرم آدرس)؛ پیش‌فرض فقط ۱۱ رقم */
  allowIntl?: boolean
  /** فقط kind="price": نمایش با ارقام و جداکننده‌ی فارسی (۸۹۰٬۰۰۰) با حفظ جای مکان‌نما */
  persianDisplay?: boolean
}

const isDigitChar = (c: string) => /[0-9۰-۹٠-٩]/.test(c)

export function DigitsInput({
  kind,
  value,
  onChange,
  label,
  error,
  allowIntl,
  persianDisplay,
  maxLength,
  onPaste,
  onKeyDown,
  autoComplete,
  style,
  ...rest
}: DigitsInputProps) {
  const ref = useRef<HTMLInputElement | null>(null)
  // تعداد رقم‌های قبل از مکان‌نما بعد از هر تغییر؛ بعد از رندر مجدد مکان‌نما همان‌جا برمی‌گردد
  const digitsBeforeCaret = useRef<number | null>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (persianDisplay && kind === 'price') {
      const el = e.target
      const caret = el.selectionStart ?? el.value.length
      digitsBeforeCaret.current = [...el.value.slice(0, caret)].filter(isDigitChar).length
    }
    onChange(sanitizeDigits(kind, e.target.value, maxLength, allowIntl))
  }

  // Backspace/Delete کنار «٬»: جداکننده با پاک‌کردن خودش تغییری در مقدار نمی‌داد و مکان‌نما می‌پرید؛
  // این‌جا رقم کنار جداکننده پاک می‌شود
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented || !(persianDisplay && kind === 'price')) return
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const el = e.currentTarget
    if (el.selectionStart !== el.selectionEnd || el.selectionStart == null) return
    const pos = el.selectionStart
    const adjacent = e.key === 'Backspace' ? el.value[pos - 1] : el.value[pos]
    if (adjacent !== '٬') return
    e.preventDefault()
    const digitsBefore = [...el.value.slice(0, pos)].filter(isDigitChar).length
    const idx = e.key === 'Backspace' ? digitsBefore - 1 : digitsBefore
    if (idx < 0 || idx >= value.length) return
    digitsBeforeCaret.current = idx
    onChange(value.slice(0, idx) + value.slice(idx + 1))
  }

  useLayoutEffect(() => {
    const el = ref.current
    const n = digitsBeforeCaret.current
    if (!el || n === null) return
    digitsBeforeCaret.current = null
    if (document.activeElement !== el) return
    let seen = 0
    let pos = 0
    const text = el.value
    while (pos < text.length && seen < n) {
      if (isDigitChar(text[pos])) seen++
      pos++
    }
    el.setSelectionRange(pos, pos)
  }, [value])

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(e)
    if (e.defaultPrevented) return
    const text = e.clipboardData.getData('text')
    if (!text) return
    e.preventDefault()
    const el = e.currentTarget
    const allSelected = el.selectionStart === 0 && el.selectionEnd === el.value.length
    const base = allSelected ? '' : value
    onChange(sanitizeDigits(kind, base + text, maxLength, allowIntl))
  }

  const props = {
    ...rest,
    type: 'text' as const,
    dir: 'ltr' as const,
    inputMode: INPUT_MODE[kind],
    autoComplete: autoComplete ?? (kind === 'otp' ? 'one-time-code' : kind === 'phone' ? 'tel' : 'off'),
    value: formatForDisplay(kind, value, persianDisplay),
    ref,
    onChange: handleChange,
    onPaste: handlePaste,
    onKeyDown: handleKeyDown,
    // ≥۱۶px تا iOS زوم نکند؛ هدف لمسی ≥۴۴px
    style: { fontSize: 16, minHeight: 44, ...style },
  }

  // error='' (state خالیِ صفحه‌های لاگین/OTP) هم باید Input استایل‌دار بگیرد، نه <input> خام
  if (label || error !== undefined) return <Input label={label} error={error} {...props} />
  return <input {...props} />
}
