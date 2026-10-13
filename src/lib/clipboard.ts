// docs/PRD-nivo-sales-unified.md 3.8 — کپی با fallback. مرورگر داخل‌برنامه‌ای اینستاگرام/تلگرام
// اغلب navigator.clipboard را ندارد یا رد می‌کند (قبلاً بی‌صدا شکست می‌خورد). ترتیب:
//   ۱) navigator.clipboard  ۲) execCommand('copy') با textarea موقت  ۳) 'failed' → UI متن را
//   انتخاب می‌کند و راهنمای «نگه دار و کپی کن» نشان می‌دهد.
export type CopyResult = 'ok' | 'failed'

export async function copyText(text: string): Promise<CopyResult> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'ok'
    }
  } catch {
    // ادامه با fallback
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    el.style.top = '0'
    document.body.appendChild(el)
    el.select()
    el.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

// انتخاب محتوای یک عنصر برای کپی دستی (وقتی copyText شکست خورد)
export function selectElementText(el: HTMLElement | null): void {
  if (!el) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)
}
