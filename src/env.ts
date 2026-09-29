const VITE_API_URL = import.meta.env.VITE_API_URL as string
const VITE_DEFAULT_MODEL = (import.meta.env.VITE_DEFAULT_MODEL as string | undefined) ?? 'gpt-4o-mini'
const VITE_ENAMAD_ID = import.meta.env.VITE_ENAMAD_ID as string | undefined
const VITE_ENAMAD_CODE = import.meta.env.VITE_ENAMAD_CODE as string | undefined
// فیچرفلگ موقت — ویجت ربات فروش هنوز کیفیتش نهایی نیست، تا آماده‌شدن کامل خاموش نگه داشته می‌شود
const VITE_SALES_BOT_ENABLED = (import.meta.env.VITE_SALES_BOT_ENABLED as string | undefined) !== 'false'
// فیچرفلگ موقت — آمار «کاربر فعال»/«درصد رضایت» توی لندینگ هنوز عدد واقعی و تاییدشده نیست، تا وقتی عدد واقعی آماده بشه خاموشه
const VITE_LANDING_STATS_ENABLED = (import.meta.env.VITE_LANDING_STATS_ENABLED as string | undefined) === 'true'
// سرویس events-backend مجزا — عمداً اختیاری، بدون آن فقط ایونت‌تراکینگ غیرفعال می‌ماند
const VITE_EVENTS_API_URL = import.meta.env.VITE_EVENTS_API_URL as string | undefined
const VITE_EVENTS_WRITE_KEY = import.meta.env.VITE_EVENTS_WRITE_KEY as string | undefined
// Microsoft Clarity — عمداً اختیاری، بدون این env فقط heatmap/session-recording غیرفعال می‌ماند
const VITE_CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined
// docs/PRD-telegram-bot-channel.md — یوزرنیم بات مشترک تلگرام (بدون @). تا وقتی ست نشده،
// لینک تلگرام در تب «بیشتر»/قدم۴ ویزارد نمایش داده نمی‌شود (نه یک لینک شکسته)
const VITE_TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

if (!VITE_API_URL) throw new Error('Missing env: VITE_API_URL')

export const env = {
  VITE_API_URL, VITE_DEFAULT_MODEL, VITE_ENAMAD_ID, VITE_ENAMAD_CODE,
  VITE_SALES_BOT_ENABLED, VITE_LANDING_STATS_ENABLED,
  VITE_EVENTS_API_URL, VITE_EVENTS_WRITE_KEY,
  VITE_CLARITY_PROJECT_ID, VITE_TELEGRAM_BOT_USERNAME,
}
