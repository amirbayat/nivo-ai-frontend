// legacy — قبل از معرفی دو حالت خودکار زیر، این تنها سنتینل «خودکار» بود؛ مقادیر قدیمی
// ذخیره‌شده توی localStorage/DB معادل BEST_ANSWER_MODE فعلی در نظر گرفته می‌شوند (chat.store.ts)
export const OPTIMAL_MODE = 'optimal'
export const OPTIMAL_DESCRIPTION =
  'بر اساس سوال شما، در خانواده مدل‌های GPT-5، Gemini، Grok و DeepSeek، بهترین مدل برای بهترین پاسخ انتخاب می‌شود.'

// docs/PRD-model-selection-modes.md — دو حالت خودکار برای کاربران اعتباری (نیوو)؛ در هر دو حالت،
// نیوو بر اساس هزینه‌ی واقعی مدلی که واقعاً استفاده شده کم می‌شود (نه یک نرخ ثابت)
export const COST_OPTIMIZED_MODE = 'cost_optimized'
export const COST_OPTIMIZED_DESCRIPTION =
  'ارزان‌ترین مدلِ توانا برای این پیام انتخاب می‌شود — کمترین نیوو از حسابت کم می‌شود.'

export const BEST_ANSWER_MODE = 'best_answer'
export const BEST_ANSWER_DESCRIPTION =
  'بدون توجه به قیمت، قوی‌ترین مدل برای بهترین پاسخ ممکن انتخاب می‌شود.'

export type ModelTier = 'SIMPLE' | 'MEDIUM' | 'COMPLEX'

const TIER_DESCRIPTIONS: Record<ModelTier, string> = {
  SIMPLE: 'سریع و مقرون‌به‌صرفه — مناسب سوال‌های روزمره، ترجمه و خلاصه‌سازی کوتاه.',
  MEDIUM: 'تعادل خوب بین سرعت و کیفیت — مناسب نوشتن حرفه‌ای، تحلیل و کدنویسی متوسط.',
  COMPLEX: 'قوی‌ترین سطح — مناسب استدلال پیچیده، کد چندفایلی و تحلیل عمیق.',
}

export function tierDescription(tier: ModelTier): string {
  return TIER_DESCRIPTIONS[tier] ?? TIER_DESCRIPTIONS.MEDIUM
}

const TIER_LABELS: Record<ModelTier, string> = {
  SIMPLE: 'ساده',
  MEDIUM: 'متوسط',
  COMPLEX: 'پیشرفته',
}

export function tierLabel(tier: ModelTier): string {
  return TIER_LABELS[tier] ?? tier
}

// همون enum کیفیت مسیریاب چت، برای مدل‌های تولید عکس به‌عنوان سطح کیفیت/قیمت دوباره استفاده می‌شود
const IMAGE_QUALITY_LABELS: Record<ModelTier, string> = {
  SIMPLE: 'ساده و اقتصادی',
  MEDIUM: 'متوسط',
  COMPLEX: 'کیفیت بالا',
}

export function imageQualityLabel(tier: ModelTier): string {
  return IMAGE_QUALITY_LABELS[tier] ?? tier
}
