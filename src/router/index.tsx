import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { PricingPage } from '@/pages/pricing/PricingPage'
import { DiscoverPage } from '@/pages/discover/DiscoverPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { GalleryPage } from '@/pages/gallery/GalleryPage'
import { ModelsPage } from '@/pages/models/ModelsPage'
import { CallbackPage } from '@/pages/payment/CallbackPage'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { SubscriptionPage } from '@/pages/settings/SubscriptionPage'
import { UsagePage } from '@/pages/settings/UsagePage'
import { WalletPage } from '@/pages/settings/WalletPage'
import { TicketsPage } from '@/pages/settings/TicketsPage'
import { TicketDetailPage } from '@/pages/settings/TicketDetailPage'
import { InvoicesPage } from '@/pages/settings/InvoicesPage'
import { InvoiceDetailPage } from '@/pages/settings/InvoiceDetailPage'
import { LandingPage } from '@/pages/landing/LandingPage'
import { ContactPage } from '@/pages/contact/ContactPage'
import { AnonChatLayout } from '@/components/layout/AnonChatLayout'
import { AnonChatPage } from '@/pages/anon-chat/AnonChatPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const hasToken = !!localStorage.getItem('access_token')
  if (!hasToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { data } = useMe()
  if (data) return <Navigate to="/chat" replace />
  return <>{children}</>
}

// کاربر لاگین‌کرده که سر می‌زند به "/" باید همچنان به تجربه‌ی /chat فعلی (دست‌نخورده) برود؛
// کاربر مهمان همان‌جا در "/" با تجربه‌ی چت بدون ثبت‌نام (تبلیغات/لندینگ جدید) روبه‌رو می‌شود.
// صرفاً وجود access_token در localStorage کافی نیست — ممکن است منقضی/نامعتبر باشد (مثلاً
// از یک session قدیمی)، که قبلاً باعث می‌شد کاربر مهمان یک لحظه به /chat برود، آنجا درخواست
// ۴۰۱ بخورد، و توسط اینترسپتور (api.ts) به‌جای دیدن تجربه‌ی مهمان به /login پرتاب شود. اینجا
// با useMe() واقعاً اعتبار توکن چک می‌شود؛ تا وقتی مشخص نشده، یک صفحه‌ی خالی موقت (مثل الگوی
// مشابه در LandingPage.tsx) نشان داده می‌شود تا از فلش نامناسب جلوگیری شود
function HomeRoute() {
  const hasToken = !!localStorage.getItem('access_token')
  const { data: me, isLoading } = useMe()
  if (hasToken && isLoading) return <div className="min-h-screen bg-slate-900" />
  if (me) return <Navigate to="/chat" replace />
  return (
    <AnonChatLayout>
      <AnonChatPage />
    </AnonChatLayout>
  )
}

export function AppRouter() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* guest */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/otp"   element={<GuestRoute><OtpPage /></GuestRoute>} />

      {/* protected */}
      <Route
        path="/chat"
        element={<ProtectedRoute><ChatLayout><ChatPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/chat/:id"
        element={<ProtectedRoute><ChatLayout><ChatPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/pricing"
        element={<ProtectedRoute><PricingPage /></ProtectedRoute>}
      />
      {/* بدون ProtectedRoute — کاربر مهمان هم باید بتواند استودیو محتوا را اکسپلور کند؛
          DiscoverPage خودش بر اساس access_token شاخه می‌زند (ساخت Conversation واقعی
          فقط برای کاربر لاگین‌شده) */}
      <Route path="/discover" element={<DiscoverPage />} />
      <Route
        path="/projects"
        element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>}
      />
      <Route
        path="/gallery"
        element={<ProtectedRoute><GalleryPage /></ProtectedRoute>}
      />
      <Route
        path="/models"
        element={<ProtectedRoute><ModelsPage /></ProtectedRoute>}
      />
      <Route path="/payment" element={<CallbackPage />} />

      <Route
        path="/settings"
        element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="/settings/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
      </Route>

      {/* default */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
