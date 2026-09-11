// CreativePromptCatalogItem.aspectRatio با فرمت ادمین "W:H" (مثل "3:4"، "1:1"، "16:9") ذخیره
// می‌شود — برای گرید واترفال/masonify استودیو باید پیش از لود شدن خود عکس، ارتفاع درست کارت
// رزرو شود (وگرنه با لود تدریجی عکس‌ها کل گرید جابه‌جا می‌شود)؛ همین رشته را به عدد قابل‌مصرف
// در CSS aspect-ratio تبدیل می‌کند
export function parseAspectRatio(input: string | null | undefined, fallback = 1): number {
  if (!input) return fallback
  const match = input.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/)
  if (!match) return fallback
  const w = Number(match[1])
  const h = Number(match[2])
  if (!w || !h) return fallback
  return w / h
}

export function snapDisplayAspectRatio(width: number, height: number): '9:16' | '16:9' | '1:1' {
  if (height > width) return '9:16'
  if (width > height) return '16:9'
  return '1:1'
}

export function clampAspectRatioToOptions(detected: string, options: string[]): string {
  if (options.length === 0) return detected
  if (options.includes(detected)) return detected
  if (options.includes('16:9')) return '16:9'
  if (options.includes('9:16')) return '9:16'
  return options[0]
}
