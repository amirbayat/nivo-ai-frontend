// docs/PRD-seller-panel-simplification.md §4.2 — حرف‌نگاری نام فروشگاه؛ نسخه‌ی سرور:
// nivo-ai-backend/src/common/utils/slug-from-name.ts. قواعد و جدول تست باید با آن یکی بماند.
const LETTERS: Record<string, string> = {
  ا: 'a', آ: 'a', أ: 'a', إ: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch',
  ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's',
  ض: 'z', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ک: 'k', ك: 'k', گ: 'g',
  ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'h', ئ: 'i', ؤ: 'o', ء: '',
}

const DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const VOWEL_LETTERS = new Set(['ا', 'آ', 'أ', 'إ', 'ی', 'ي', 'ئ'])

// کلمه‌های پرتکرار نام فروشگاه که قاعده‌ی عمومی (بدون اعراب) خوانا درنمی‌آورد.
const WORDS: Record<string, string> = {
  و: 'va', استودیو: 'studio', سوپرمارکت: 'supermarket', هنر: 'honar', کودک: 'koodak', میوه: 'mive', عطر: 'atr', لوازم: 'lavazem', حیوانات: 'heyvanat', نانوایی: 'nanvaee', ویترین: 'vitrin',
  فروشگاه: 'forooshgah', فروش: 'foroosh', فروشی: 'foroshi', نیوو: 'nivo', نیو: 'nio', تست: 'test',
  لباس: 'lebas', بچه: 'bache', بچگانه: 'bachegane', پوشاک: 'pooshak', کیف: 'kif', کفش: 'kafsh',
  گالری: 'gallery', طلا: 'tala', زیبایی: 'zibaee', آرایشی: 'arayeshi', بهداشتی: 'behdashti',
  خانه: 'khane', مهتاب: 'mahtab', دیجیتال: 'digital', موبایل: 'mobile', اسباب: 'asbab',
  بازی: 'bazi', ایران: 'iran', نو: 'no', سنتی: 'sonati', هنری: 'honari', کتاب: 'ketab',
}

const isLetter = (c: string | undefined): boolean => !!c && (c in LETTERS || c === 'و' || c === 'ی' || c === 'ي')

// حرف‌نگاری یک کلمه‌ی فارسی. هدف خوانایی است، نه دقت آوایی.
function transliterateWord(word: string): string {
  const known = WORDS[word]
  if (known) return known
  const chars = Array.from(word)
  let out = ''
  chars.forEach((c, i) => {
    const prev = chars[i - 1]
    const next = chars[i + 1]
    const atStart = i === 0
    const atEnd = i === chars.length - 1
    let piece: string
    if (c === 'و') {
      if (atStart || (prev && VOWEL_LETTERS.has(prev))) piece = 'v'
      else if (prev === 'و') piece = 'o'
      else piece = atEnd ? 'o' : 'oo'
    } else if (c === 'ی' || c === 'ي') {
      piece = atStart ? 'y' : 'i'
    } else if (c === 'ه') {
      // ه‌ی پایانیِ بعد از همخوان صدای «e» دارد (بچه ← bache)
      piece = atEnd && prev && !VOWEL_LETTERS.has(prev) && prev !== 'و' && isLetter(prev) ? 'e' : 'h'
    } else {
      piece = LETTERS[c] ?? ''
      // خوشه‌ی همخوانیِ ابتدای کلمه (لباس ← lebas، تست ← test): بعد از حرف اول «e»
      if (atStart && piece && !VOWEL_LETTERS.has(c) && c !== 'ع' && next && isLetter(next) && next !== 'و' && !VOWEL_LETTERS.has(next) && next !== 'ع') {
        piece += 'e'
      }
    }
    out += piece
  })
  return out
}

export function slugFromName(name: string): string {
  let out = ''
  let word = ''
  const flush = () => {
    if (word) out += transliterateWord(word)
    word = ''
  }
  for (const raw of name.trim().toLowerCase()) {
    let char = raw
    const d = DIGITS.indexOf(char)
    const ad = ARABIC_DIGITS.indexOf(char)
    if (d >= 0) char = String(d)
    else if (ad >= 0) char = String(ad)
    if (/[a-z0-9]/.test(char)) {
      flush()
      out += char
    } else if (char === ' ' || char === '-' || char === '_' || char === '‌') {
      flush()
      out += '-'
    } else if (char in LETTERS || char === 'و' || char === 'ی' || char === 'ي') {
      word += char
    }
    // سایر نویسه‌ها (علامت‌ها، تطویل، اعراب) نادیده گرفته می‌شوند
  }
  flush()
  const slug = out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  return slug.length >= 3 ? slug : ''
}
