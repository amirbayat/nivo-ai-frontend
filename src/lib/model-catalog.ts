// docs/PRD-model-selection-modes.md — تنها حالت خودکار چت (تصمیم صریح کاربر، ۱۴۰۵/۰۶/۱۹: حالت
// «بهترین پاسخ» حذف شد چون کاتالوگ فعلی مدل flagship واقعی نداشت که این ادعا را توجیه کند — یا
// این حالت (مصرف بهینه) یا انتخاب دستی مدل توسط کاربر). سنتینل‌های قدیمی «optimal»/«best_answer»
// که قبلاً در localStorage/Conversation.model ذخیره شده‌اند همچنان توسط بک‌اند map می‌شوند
// (chat.service.ts) — هیچ migration دیتابیسی برای این حذف لازم نیست
export const COST_OPTIMIZED_MODE = 'cost_optimized'
export const COST_OPTIMIZED_DESCRIPTION =
  'ارزان‌ترین مدلِ توانا برای این پیام انتخاب می‌شود — کمترین نیوو از حسابت کم می‌شود.'

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

// همون پالت رنگی که برای بج قیمتی مدل‌های ویدیو استفاده می‌شود (curatedModels.ts، ارزان/متوسط/
// گران) — این‌جا دوباره برای بج «سطح» مدل‌های چت/عکس در مدال انتخاب مدل مشترک استفاده می‌شود تا
// زبان بصری هر سه (متن/عکس/ویدیو) یکسان بماند
export const TIER_COLOR: Record<ModelTier, { bg: string; border: string; text: string }> = {
  SIMPLE: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', text: '#6ee7b7' },
  MEDIUM: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', text: '#fde047' },
  COMPLEX: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#fca5a5' },
}
