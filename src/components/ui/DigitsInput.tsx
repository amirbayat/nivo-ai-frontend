import type { ClipboardEvent, ChangeEvent, InputHTMLAttributes } from 'react'
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
function sanitizeDigits(kind: DigitsKind, input: string, maxLength?: number): string {
  const s = toEnglishDigits(input).replace(/٫/g, '.').replace(SEPARATORS, '')
  let out: string
  switch (kind) {
    case 'phone': {
      const plus = s.startsWith('+')
      const digits = s.replace(/\D/g, '')
      // +98XXXXXXXXXX (۱۲ رقم) یا 09XXXXXXXXX (۱۱ رقم)
      out = plus ? '+' + digits.slice(0, 12) : digits.slice(0, 11)
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

function formatForDisplay(kind: DigitsKind, raw: string): string {
  if (kind === 'price') return formatThousands(raw)
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
}

export function DigitsInput({
  kind,
  value,
  onChange,
  label,
  error,
  maxLength,
  onPaste,
  autoComplete,
  style,
  ...rest
}: DigitsInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(sanitizeDigits(kind, e.target.value, maxLength))
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(e)
    if (e.defaultPrevented) return
    const text = e.clipboardData.getData('text')
    if (!text) return
    e.preventDefault()
    const el = e.currentTarget
    const allSelected = el.selectionStart === 0 && el.selectionEnd === el.value.length
    const base = allSelected ? '' : value
    onChange(sanitizeDigits(kind, base + text, maxLength))
  }

  const props = {
    ...rest,
    type: 'text' as const,
    dir: 'ltr' as const,
    inputMode: INPUT_MODE[kind],
    autoComplete: autoComplete ?? (kind === 'otp' ? 'one-time-code' : kind === 'phone' ? 'tel' : 'off'),
    value: formatForDisplay(kind, value),
    onChange: handleChange,
    onPaste: handlePaste,
    // ≥۱۶px تا iOS زوم نکند؛ هدف لمسی ≥۴۴px
    style: { fontSize: 16, minHeight: 44, ...style },
  }

  // error='' (state خالیِ صفحه‌های لاگین/OTP) هم باید Input استایل‌دار بگیرد، نه <input> خام
  if (label || error !== undefined) return <Input label={label} error={error} {...props} />
  return <input {...props} />
}
