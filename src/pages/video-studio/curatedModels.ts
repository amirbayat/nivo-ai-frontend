// دستور صریح کاربر: چیپ «مدل چت»/«مدل عکس» استودیوی ویدیو نباید کل کاتالوگ عمومی سایت (ده‌ها
// مدل، مخصوص چت اصلی) را نشان بدهد. این فیلتر با یک allowlist هاردکد در کد فرانت انجام نمی‌شود
// (کاربر صریحاً همین را رد کرد) — به‌جایش هر مدل CHAT/IMAGE_GEN یک فیلد `videoStudioEligible`
// در پنل ادمین دارد که خودِ ادمین روشن/خاموش می‌کند (ModelCatalogEntry.videoStudioEligible،
// plans.service.ts). فیلتر واقعی توی VideoStudioPage.tsx است: `m.videoStudioEligible`.

export type VideoPriceTier = 'cheap' | 'medium' | 'expensive'

// آستانه‌ها بر اساس قیمت واقعی OpenRouter مدل‌های ویدیوی امروز (۰.۰۳ تا ۰.۳ دلار/ثانیه) —
// دستور صریح کاربر: «دسته‌بندی مدل فیلم رو بزن که کدوم گرونه کدوم متوسطه کدوم ارزونه»
export function getVideoPriceTier(pricePerSecondUsd: number | null | undefined): VideoPriceTier | null {
  if (pricePerSecondUsd == null) return null
  if (pricePerSecondUsd <= 0.07) return 'cheap'
  if (pricePerSecondUsd <= 0.16) return 'medium'
  return 'expensive'
}

export const VIDEO_PRICE_TIER_LABEL: Record<VideoPriceTier, string> = {
  cheap: 'ارزان',
  medium: 'متوسط',
  expensive: 'گران',
}

export const VIDEO_PRICE_TIER_COLOR: Record<VideoPriceTier, { bg: string; border: string; text: string }> = {
  cheap: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', text: '#6ee7b7' },
  medium: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', text: '#fde047' },
  expensive: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#fca5a5' },
}
