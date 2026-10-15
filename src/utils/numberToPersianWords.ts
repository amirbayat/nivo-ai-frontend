// docs/PRD-seller-panel-simplification.md §4.11.3 — مبلغ به حروف زیر فیلد قیمت («هشتصد و نود هزار»)؛
// رایج‌ترین اشتباه فروشنده صفر اضافه/کم است. فقط عدد صحیح نامنفی تا کمتر از ۱۰^۱۵.
const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد']

function threeDigits(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) parts.push(HUNDREDS[h])
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10])
  } else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t) parts.push(TENS[t])
    if (o) parts.push(ONES[o])
  }
  return parts.join(' و ')
}

export function numberToPersianWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  const value = Math.floor(n)
  if (value === 0) return 'صفر'
  if (value >= 1e15) return ''
  const groups: number[] = []
  let rest = value
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }
  const out: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (!g) continue
    const words = threeDigits(g)
    // «هزار» به‌تنهایی (نه «یک هزار»)؛ برای میلیون و بالاتر «یک» گفته می‌شود
    out.push(i === 1 && g === 1 ? SCALES[1] : SCALES[i] ? `${words} ${SCALES[i]}` : words)
  }
  return out.join(' و ')
}
