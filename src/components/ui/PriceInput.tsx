import { DigitsInput } from './DigitsInput'
import { numberToPersianWords } from '@/utils/numberToPersianWords'
import { fa } from '@/locales/fa'

interface PriceInputProps {
  /** رقم‌های خالص انگلیسی (بدون جداکننده) */
  value: string
  onChange: (raw: string) => void
  label?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  /** مبلغ به حروف زیر فیلد (پیش‌فرض روشن) */
  showWords?: boolean
  'aria-label'?: string
  onBlur?: () => void
}

// docs/PRD-seller-panel-simplification.md §4.11.3 — تنها فیلد مبلغ تومان در پنل فروشنده:
// جداکننده‌ی هزارگان فارسی هنگام تایپ + مبلغ به حروف زیرش («هشتصد و نود هزار تومان») تا
// صفر اضافه/کم یا اشتباه تومان/ریال سریع دیده شود.
export function PriceInput({ value, onChange, label, error, placeholder, disabled, id, className, showWords = true, 'aria-label': ariaLabel, onBlur }: PriceInputProps) {
  const amount = value ? Number(value) : 0
  const words = showWords && amount > 0 ? numberToPersianWords(amount) : ''
  return (
    <div className="flex flex-col gap-1">
      <DigitsInput
        kind="price"
        persianDisplay
        styled
        id={id}
        value={value}
        onChange={onChange}
        label={label}
        error={error}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        maxLength={12}
        aria-label={ariaLabel}
        onBlur={onBlur}
      />
      {words && (
        <p className="text-xs text-slate-400 light:text-slate-500">
          {words} {fa.common.toman}
        </p>
      )}
    </div>
  )
}
