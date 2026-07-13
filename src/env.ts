const VITE_API_URL = import.meta.env.VITE_API_URL as string
const VITE_DEFAULT_MODEL = (import.meta.env.VITE_DEFAULT_MODEL as string | undefined) ?? 'gpt-4o-mini'
const VITE_ENAMAD_ID = import.meta.env.VITE_ENAMAD_ID as string | undefined
const VITE_ENAMAD_CODE = import.meta.env.VITE_ENAMAD_CODE as string | undefined
// فیچرفلگ موقت — ویجت ربات فروش هنوز کیفیتش نهایی نیست، تا آماده‌شدن کامل خاموش نگه داشته می‌شود
const VITE_SALES_BOT_ENABLED = (import.meta.env.VITE_SALES_BOT_ENABLED as string | undefined) !== 'false'
// فیچرفلگ موقت — آمار «کاربر فعال»/«درصد رضایت» توی لندینگ هنوز عدد واقعی و تاییدشده نیست، تا وقتی عدد واقعی آماده بشه خاموشه
const VITE_LANDING_STATS_ENABLED = (import.meta.env.VITE_LANDING_STATS_ENABLED as string | undefined) === 'true'

if (!VITE_API_URL) throw new Error('Missing env: VITE_API_URL')

export const env = {
  VITE_API_URL, VITE_DEFAULT_MODEL, VITE_ENAMAD_ID, VITE_ENAMAD_CODE,
  VITE_SALES_BOT_ENABLED, VITE_LANDING_STATS_ENABLED,
}
