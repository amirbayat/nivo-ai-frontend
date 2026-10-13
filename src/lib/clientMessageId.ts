// 2.1 — کلید یکتای هر ارسال پیام (Idempotency-Key سمت سرور). ارسال مجدد همان پیام
// (دبل‌تپ، retry مرورگر/شبکه) نباید turn دوم اجرا کند و دوباره هزینه بسازد.
export function newClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // مرورگرهای قدیمی/بدون secure context
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}
