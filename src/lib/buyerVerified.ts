// docs/PRD-buyer-chat-redesign.md §6.7 — «شماره‌ت رو تایید کن» وقتی خریدار قبلاً تایید کرده نشان داده نمی‌شود.
// فقط یک نشانه‌ی راحتی در همین مرورگر؛ منبع حقیقت سرور است
const key = (slug: string) => `shop_buyer_verified_${slug}`

export function isBuyerVerified(slug: string): boolean {
  try {
    return localStorage.getItem(key(slug)) === '1'
  } catch {
    return false
  }
}

export function markBuyerVerified(slug: string): void {
  try {
    localStorage.setItem(key(slug), '1')
  } catch {
    // حالت خصوصی/بلاک: فقط پیشنهاد دوباره نشان داده می‌شود
  }
}
