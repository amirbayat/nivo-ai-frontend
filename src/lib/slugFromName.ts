const LETTERS: Record<string, string> = {
  ا: 'a',
  آ: 'a',
  أ: 'a',
  إ: 'a',
  ب: 'b',
  پ: 'p',
  ت: 't',
  ث: 's',
  ج: 'j',
  چ: 'ch',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  ژ: 'zh',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'z',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ک: 'k',
  ك: 'k',
  گ: 'g',
  ل: 'l',
  م: 'm',
  ن: 'n',
  و: 'o',
  ه: 'h',
  ة: 'h',
  ی: 'i',
  ي: 'i',
  ئ: 'i',
  ء: '',
}

export function slugFromName(name: string): string {
  let out = ''
  for (const char of name.trim().toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      out += char
      continue
    }
    if (char === ' ' || char === '-' || char === '_' || char === '\u200c') {
      out += '-'
      continue
    }
    const mapped = LETTERS[char]
    if (mapped) out += mapped
  }
  const slug = out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  return slug.length >= 3 ? slug : ''
}
