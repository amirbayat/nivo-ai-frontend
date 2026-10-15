// docs/PRD-seller-panel-simplification.md §4.4/§4.11.4 — متن مقادیر مدل (رنگ/سایز) ← چیپ‌ها.
// جداکننده‌ها: ویرگول فارسی و انگلیسی، خط جدید، دو فاصله‌ی پشت‌سرهم؛ ارقام فارسی نرمال و
// تکراری‌ها حذف می‌شوند (مقدارها همیشه با ارقام فارسی نمایش داده می‌شوند، مثل بقیه‌ی پنل).
const FA = '۰۱۲۳۴۵۶۷۸۹'
const toFaDigits = (s: string) => s.replace(/\d/g, d => FA[Number(d)])
const toEnDigits = (s: string) =>
  s.replace(/[۰-۹]/g, d => String(FA.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

export function splitVariantValues(input: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map(v => toEnDigits(v).trim().toLowerCase()))
  const out: string[] = []
  for (const raw of toEnDigits(input).split(/[،,\n]|\s{2,}/)) {
    const value = raw.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(toFaDigits(value))
  }
  return out
}
