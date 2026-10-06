import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { IntlLandingPage } from '@/pages/intl/IntlLandingPage'
import { IntlLoginPage } from '@/pages/intl/IntlLoginPage'
import { IntlVerifyCodePage } from '@/pages/intl/IntlVerifyCodePage'
import { IntlPanelLayout } from '@/pages/intl/IntlPanelLayout'
import { IntlInstagramConnectPage } from '@/pages/intl/IntlInstagramConnectPage'
import { IntlInstagramAutomationPage } from '@/pages/intl/IntlInstagramAutomationPage'
import { IntlPrivacyPolicyPage } from '@/pages/intl/legal/IntlPrivacyPolicyPage'
import { IntlTermsPage } from '@/pages/intl/legal/IntlTermsPage'
import { IntlDataDeletionPage } from '@/pages/intl/legal/IntlDataDeletionPage'
import { IntlDataDeletionStatusPage } from '@/pages/intl/legal/IntlDataDeletionStatusPage'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱/۷.۳ — router سبک‌شده‌ی مینی‌پنل
// INTL: لندینگ + صفحات عمومی حقوقی (بدون auth) روی مسیرهای ریشه، ورود ایمیلی + دو صفحه‌ی
// دایرکت هوشمند زیر `/app` (نیازمند توکن). هیچ import از ماژول‌های چت/تصویر/ویدیو/نیوو
// کال/Orders/Products (router/index.tsx) اینجا وجود ندارد — این فایل build خودش را دارد
// (main.intl.tsx/index.intl.html)
function IntlProtectedRoute({ children }: { children: ReactNode }) {
  const hasToken = !!localStorage.getItem('access_token')
  if (!hasToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function IntlAppRouter() {
  return (
    <Routes>
      <Route path="/" element={<IntlLandingPage />} />
      <Route path="/login" element={<IntlLoginPage />} />
      <Route path="/verify" element={<IntlVerifyCodePage />} />
      <Route path="/privacy" element={<IntlPrivacyPolicyPage />} />
      <Route path="/terms" element={<IntlTermsPage />} />
      <Route path="/data-deletion" element={<IntlDataDeletionPage />} />
      <Route path="/data-deletion-status" element={<IntlDataDeletionStatusPage />} />

      <Route path="/app" element={<IntlProtectedRoute><IntlPanelLayout /></IntlProtectedRoute>}>
        <Route index element={<Navigate to="/app/instagram" replace />} />
        <Route path="instagram" element={<IntlInstagramConnectPage />} />
        <Route path="instagram/rules" element={<IntlInstagramAutomationPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
