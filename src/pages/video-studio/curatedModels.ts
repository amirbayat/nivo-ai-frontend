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

// توضیح تخصصی هر مدل ویدیو برای کارت انتخاب مدل (VideoModelPickerModal.tsx) — چون ستون
// description در دیتابیس برای مدل‌های VIDEO_GEN فعلاً خالی است (prisma/seeds/models.seed.ts)
// و طبق قانون CLAUDE.md نباید مستقیم روی دیتابیس پروداکشن دیتا ست کرد؛ این متن‌ها فقط دانش
// فرانت هستند (دقیقاً همون الگوی آستانه‌های قیمتی بالا) و برای مدل جدیدی که این‌جا نیست، کارت
// از fallback عمومی (ساخته‌شده از provider/tier/duration) استفاده می‌کند
export const VIDEO_MODEL_BLURB: Record<string, string> = {
  'google/veo-3.1-fast': 'سریع و مقرون‌به‌صرفه — برای تست سریع ایده و تولید حجم بالا از کلیپ‌های کوتاه.',
  'google/veo-3.1': 'کیفیت سینمایی گوگل با صدای همگام؛ گزینه‌ی مناسب برای صحنه‌های نهایی و پروژه‌های حرفه‌ای.',
  'google/veo-3.1-lite': 'ارزان‌ترین گزینه‌ی خانواده‌ی Veo — برای پیش‌نویس سریع و امتحان‌کردن چند سناریوی مختلف.',
  'kwaivgi/kling-v3.0-pro': 'حرکت طبیعی و کنترل دقیق دوربین؛ تا ۱۵ ثانیه، مناسب صحنه‌های اکشن و روایت‌های طولانی‌تر.',
  'kwaivgi/kling-v3.0-std': 'نسخه‌ی اقتصادی‌تر Kling با همان کیفیت حرکت — برای تولید حجم بالا با بودجه‌ی محدودتر.',
  'bytedance/seedance-2.0': 'کیفیت تصویر بالا و ثبات چهره/کاراکتر در طول صحنه؛ مناسب محتوای تبلیغاتی و برندی.',
  'bytedance/seedance-1-5-pro': 'ارزان، سریع و با پشتیبانی صدا — انتخاب خوب برای محتوای شبکه‌های اجتماعی.',
  'bytedance/seedance-2.0-mini': 'نسخه‌ی سبک‌تر Seedance برای پیش‌نمایش سریع با کمترین هزینه.',
  'openai/sora-2-pro': 'طولانی‌ترین کلیپ ممکن (تا ۲۰ ثانیه) و درک روایی قوی از OpenAI؛ مناسب داستان‌گویی.',
  'runway/gen-4.5': 'کنترل هنری و سبک تصویری خاص Runway؛ مناسب پروژه‌های خلاقانه و هنری.',
}

export function getVideoModelBlurb(model: { name: string; description: string | null }): string {
  return model.description || VIDEO_MODEL_BLURB[model.name] || 'مدل تولید ویدیوی هوش مصنوعی، آماده‌ی استفاده در این پروژه.'
}

// «۴ تا ۸ ثانیه» یا اگر فقط یک عدد باشد «۴ ثانیه» — از روی videoGenSupportedDurationsSec
export function formatDurationRange(durations: number[]): string | null {
  if (!durations.length) return null
  const min = Math.min(...durations)
  const max = Math.max(...durations)
  return min === max ? `${min} ثانیه` : `${min} تا ${max} ثانیه`
}

// اندازه‌های خروجی (مثل «۱۲۸۰x۷۲۰») را به برچسب جهت (افقی/عمودی/مربع) تبدیل می‌کند تا کارت
// مدل به‌جای رشته‌های خام رزولوشن، قابلیت واقعی («این مدل عمودی هم می‌سازد») را نشان بدهد
export function formatOrientationTags(sizes: string[]): string[] {
  const tags = new Set<string>()
  for (const size of sizes) {
    const [w, h] = size.split('x').map(Number)
    if (!w || !h) continue
    if (w > h) tags.add('افقی')
    else if (w < h) tags.add('عمودی')
    else tags.add('مربع')
  }
  return Array.from(tags)
}
