import { toEnglishDigits } from './digits.ts'

// QA-12 — اعتبارسنجی موجودی سمت کلاینت، قبل از هر درخواست (انتشار یا ذخیره)؛ تا PATCH ۴۰۰ در مسیر عادی نرود
export function stockDigitsOf(raw: string): string {
  return toEnglishDigits(raw).replace(/\D/g, '')
}

// true یعنی موجودی ناقص است: محصول «موجودی‌دار» بدون مدل و بدون عدد
export function isStockMissing(input: { always: boolean; hasVariants: boolean; stock: string }): boolean {
  return !input.always && !input.hasVariants && stockDigitsOf(input.stock) === ''
}

// تغییر trackStock از false به true بدون عدد موجودی را سرور رد می‌کند (۴۰۰)؛ در این حالت فیلد را نفرست
export function canSendTrackStock(input: { always: boolean; hasVariants: boolean; stock: string; wasTracked: boolean }): boolean {
  const turningOn = !input.always && !input.wasTracked
  return !(turningOn && isStockMissing(input))
}
