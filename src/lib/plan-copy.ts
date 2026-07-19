import type { Plan } from '@/types/api'
import type { ModelCatalogEntry } from '@/queries/plans.queries'

// متن‌های بازاریابی کارت‌های پلن — به ترتیب پلن (۰=رایگان، ۱=اکو، ۲=پلاس).
// این‌ها فقط توضیح کیفی مدل‌ها هستند؛ اعداد واقعی (محدودیت پیام، پشتیبانی) از خودِ Plan خوانده می‌شوند.
export const PLAN_TIER_MODEL_DESCRIPTIONS = [
  'آخرین و ساده‌ترین مدل‌های هوش مصنوعی',
  'آخرین و به‌روزترین مدل‌های هوش مصنوعی از خانواده‌ی ChatGPT، Claude، Gemini، Grok و ...',
  'آخرین و به‌روزترین و قوی‌ترین مدل‌های هوش مصنوعی دنیا از خانواده‌ی GPT، Claude، Gemini، Grok و ...',
]

// محدودیت پیام روزانه، مستقیم از دیتابیس (Plan.dailyMessageLimit) — null یعنی نامحدود، که به‌عنوان
// یک مزیت فروش («پیام نامحدود») نمایش داده می‌شود، نه اینکه بولت اصلاً حذف شود.
export function dailyLimitText(plan: Plan): string | null {
  if (plan.dailyMessageLimit === null) return 'پیام نامحدود در روز'
  return `${plan.dailyMessageLimit.toLocaleString('fa-IR')} پیام در روز`
}

const SUPPORT_LABELS: Record<string, string> = {
  email: 'پشتیبانی ایمیلی',
  priority: 'پشتیبانی اولویت‌دار',
}

// فقط برای پلن‌های پولی معنا دارد — پلن رایگان (community) عمداً چیزی برنمی‌گرداند.
export function supportText(plan: Plan): string | null {
  const support = (plan.features as { support?: string } | undefined)?.support
  return support ? (SUPPORT_LABELS[support] ?? null) : null
}

export interface ImageGenSupport {
  supported: boolean
  maxPerDay: number | null
  maxPerWindow: number | null
  windowHours: number | null
}

// قابلیت تولید عکس یک پلن فیلد مستقیمی روی Plan نیست — از تقاطع allowedModels با کاتالوگ
// مدل‌ها (supportsImageGen) استخراج می‌شود، دقیقاً همان منطق بک‌اند (chat.service.ts).
export function imageGenSupport(plan: Plan, modelCatalog: ModelCatalogEntry[] | undefined): ImageGenSupport {
  const supported = Boolean(
    modelCatalog?.some(m => plan.allowedModels.includes(m.name) && m.supportsImageGen),
  )
  return {
    supported,
    maxPerDay: supported ? plan.maxImageGenPerDay : null,
    maxPerWindow: supported ? plan.maxImageGenPerWindow : null,
    windowHours: supported ? plan.imageGenWindowHours : null,
  }
}

// بولت کارت پلن — فقط وقتی پلن قابلیت را دارد نمایش داده می‌شود (مثل limitText/supportText).
export function imageGenCardText(support: ImageGenSupport): string | null {
  if (!support.supported) return null
  return support.maxPerDay != null
    ? `تولید عکس (تا ${support.maxPerDay.toLocaleString('fa-IR')} عکس در روز)`
    : 'تولید عکس (نامحدود)'
}

const SUBSCRIPTION_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// پیش‌نمایش مبلغ ارتقا — همان فرمول بک‌اند (payments.service.ts → computeUpgradeCredit)،
// docs/PRD-plan-image-capability-and-upgrade.md بخش ۶.۲. فقط برای نمایش روی دکمه است؛
// مبلغ نهایی و واقعی همیشه سمت سرور (initiate) دوباره محاسبه و اعمال می‌شود.
export function upgradePreviewAmount(targetPlan: Plan, currentPlan: Plan, currentPeriodEnd: string): number {
  const remainingMs = Math.min(
    SUBSCRIPTION_DAYS_MS,
    Math.max(0, new Date(currentPeriodEnd).getTime() - Date.now()),
  )
  const credit = Math.round(currentPlan.priceMonthly * (remainingMs / SUBSCRIPTION_DAYS_MS))
  return Math.max(0, targetPlan.priceMonthly - credit)
}
