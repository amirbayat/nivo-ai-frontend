// docs/PRD-seller-panel-simplification.md §4.12.1 — اشتراک‌گذاری: navigator.share اگر هست، وگرنه کپی
export async function shareOrCopy(opts: { url: string; text: string }): Promise<'native' | 'copy'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url: opts.url, text: opts.text })
      return 'native'
    } catch (err) {
      // انصراف کاربر (AbortError) خطا نیست و کپی هم نمی‌خواهیم
      if ((err as DOMException)?.name === 'AbortError') return 'native'
    }
  }
  await navigator.clipboard.writeText(opts.text.includes(opts.url) ? opts.text : `${opts.text}\n${opts.url}`)
  return 'copy'
}

export const productShareUrl = (slug: string, productId: string) =>
  `${window.location.origin}/shop/${slug}?product=${productId}`
