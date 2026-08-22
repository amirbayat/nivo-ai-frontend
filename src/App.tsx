import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AppRouter } from '@/router'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { env } from '@/env'
import { initEvents, pageView, track } from '@/lib/events'
import { initClarity } from '@/lib/clarity'
import { fa } from '@/locales/fa'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ۴۲۹ یعنی سرور صریحاً گفته «کندتر بزن» (Retry-After) — ریترای فوری react-query دقیقاً
      // خلاف همین است و می‌تواند حالت throttled را طولانی‌تر هم بکند؛ فقط خطاهای دیگر
      // (شبکه، ۵xx) یک‌بار ریترای می‌شوند
      retry: (failureCount, error) =>
        failureCount < 1 && !(isAxiosError(error) && error.response?.status === 429),
      staleTime: 60_000,
    },
  },
})

// docs/PRD-growth-traction-features.md بخش ۶.۳ — کاربر ممکن است از لینک معرفی
// (nivoai.ir/?ref=CODE) وارد شود ولی تا لحظه‌ی ثبت‌نام واقعی (تایید OTP) خیلی بعدتر
// اتفاق بیفتد؛ پس همین ابتدا (یک‌بار، در بارگذاری اپ) در localStorage نگه می‌داریم
function captureReferralCode() {
  const ref = new URLSearchParams(window.location.search).get('ref')
  if (ref) {
    localStorage.setItem('nivo:referralCode', ref)
    track('referral_code_captured', { hasReferralCode: true })
  }
}

// events-backend یک سرویس کاملاً مجزا و اختیاری است — بدون این envها فقط تراکینگ خاموش می‌ماند
if (env.VITE_EVENTS_API_URL && env.VITE_EVENTS_WRITE_KEY) {
  initEvents({ endpoint: `${env.VITE_EVENTS_API_URL}/ingest/events`, writeKey: env.VITE_EVENTS_WRITE_KEY })
}

// باید بعد از initEvents صدا زده شود — وگرنه track() داخلش no-op می‌ماند (config هنوز null است)
captureReferralCode()

// Microsoft Clarity — بدون این env فقط heatmap/session-recording غیرفعال می‌ماند
if (env.VITE_CLARITY_PROJECT_ID) {
  initClarity(env.VITE_CLARITY_PROJECT_ID)
}

// نام صفحه هم برای document.title و هم برای property مربوط به page_view استفاده می‌شود —
// تا هم در تب مرورگر عنوان درست دیده شود و هم در گزارش‌های ادمین (funnel/explorer) بشود
// فهمید هر page_view مربوط به کدام صفحه بوده (نه فقط URL خام)
const PAGE_TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/$/, title: fa.landing.heroTitle },
  { pattern: /^\/contact$/, title: 'تماس با ما' },
  { pattern: /^\/login$/, title: fa.auth.login },
  { pattern: /^\/otp$/, title: 'تایید کد ورود' },
  { pattern: /^\/chat\/[^/]+$/, title: fa.nav.chat },
  { pattern: /^\/chat$/, title: fa.nav.chat },
  { pattern: /^\/pricing$/, title: fa.plans.title },
  { pattern: /^\/models$/, title: 'مدل‌ها' },
  { pattern: /^\/payment$/, title: 'نتیجه پرداخت' },
  { pattern: /^\/settings\/profile$/, title: fa.settings.profile },
  { pattern: /^\/settings\/subscription$/, title: fa.settings.subscription },
  { pattern: /^\/settings\/usage$/, title: fa.settings.usage },
  { pattern: /^\/settings\/wallet$/, title: fa.settings.wallet },
  { pattern: /^\/settings\/invoices\/[^/]+$/, title: 'جزئیات فاکتور' },
  { pattern: /^\/settings\/invoices$/, title: fa.settings.invoices },
  { pattern: /^\/settings\/tickets\/[^/]+$/, title: 'جزئیات تیکت' },
  { pattern: /^\/settings\/tickets$/, title: fa.settings.tickets },
]

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find((p) => p.pattern.test(pathname))?.title ?? fa.nav.chat
}

function EventsPageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname)
    document.title = `${pageTitle} | نیوو`
    pageView(pageTitle)
  }, [location.pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EventsPageViewTracker />
        <AppRouter />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
