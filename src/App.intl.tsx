import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { IntlAppRouter } from '@/router/intlRouter'
import { ToastContainer } from '@/components/ui/ToastContainer'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱ — معادل سبک‌شده‌ی App.tsx برای
// REGION=INTL: بدون events/Clarity/Sentry/referral-code/page-title (هیچ‌کدام برای مینی‌پنل
// رایگان فاز ۱ موضوعیت ندارند؛ در صورت نیاز بعداً جدا اضافه می‌شوند، نه با import از App.tsx)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 && !(isAxiosError(error) && error.response?.status === 429),
      staleTime: 60_000,
    },
  },
})

export default function IntlApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <IntlAppRouter />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
