import { fa } from '@/locales/fa'

// QA-19 — تعریف مشترک مرحله‌های چک‌اوت برای نوار بالای چت و شیت پرداخت (سبد / آدرس / پرداخت / تأیید)؛
// مرحله‌ی «رسید» زیرمجموعه‌ی «پرداخت» است و در نوار دوم هم با همین برچسب‌ها دیده می‌شود
export const CHECKOUT_STEP_KEYS = ['cart', 'address', 'payment', 'confirm'] as const
export type CheckoutStepKey = (typeof CHECKOUT_STEP_KEYS)[number]

export function checkoutStepLabel(key: CheckoutStepKey): string {
  return fa.shop.checkoutSteps[CHECKOUT_STEP_KEYS.indexOf(key)]
}
