const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, ch => {
    const persianIndex = PERSIAN_DIGITS.indexOf(ch)
    if (persianIndex !== -1) return String(persianIndex)
    const arabicIndex = ARABIC_DIGITS.indexOf(ch)
    return arabicIndex !== -1 ? String(arabicIndex) : ch
  })
}

// فیدبک اول پایلوت — نمایش خوانا برای ورودی قیمت («۱۲۵۰۰۰» → «125,000»)؛ ورودی باید از قبل
// فقط رقم انگلیسی باشد (بعد از toEnglishDigits + replace(/\D/g,''))
export function formatThousands(digitsOnly: string): string {
  if (!digitsOnly) return ''
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// فیدبک اول پایلوت — گروه‌بندی ۴رقمی شماره‌کارت («6037xxxxxxxxxxxx» → «6037 xxxx xxxx xxxx»)
export function formatCardNumberGroups(digitsOnly: string): string {
  return digitsOnly.slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}
