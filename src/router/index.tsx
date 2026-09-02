import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { HubPage } from '@/pages/hub/HubPage'
import { ImageStudioPage } from '@/pages/image-studio/ImageStudioPage'
import { PricingPage } from '@/pages/pricing/PricingPage'
import { DiscoverPage } from '@/pages/discover/DiscoverPage'
import { StudioLinkPage } from '@/pages/discover/StudioLinkPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { GalleryPage } from '@/pages/gallery/GalleryPage'
import { NivoCalIntroPage } from '@/pages/nivo-cal/NivoCalIntroPage'
import { NivoCalPage } from '@/pages/nivo-cal/NivoCalPage'
import { NivoCalOnboardingPage } from '@/pages/nivo-cal/NivoCalOnboardingPage'
import { NivoCalDashboardPage } from '@/pages/nivo-cal/NivoCalDashboardPage'
import { useNutritionProfile } from '@/queries/nivoCal.queries'
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

// docs/PRD-openrouter-migration.md §۱۳-۱۴ — کاربر لاگین‌کرده که سر می‌زند به "/" حالا هاب
// (کارت‌های بزرگ: عکس/چت/ویدیوی-به‌زودی) می‌بیند، نه ریدایرکت مستقیم به /chat. مسیرهای
// /chat و /chat/:id خودشان دست‌نخورده و جدا مانده‌اند — کاربر لاگین‌کرده هنوز می‌تواند مستقیم
// به آن‌ها لینک بگیرد/برود، فقط دیگر مقصد پیش‌فرض "/" نیستند.
// کاربر مهمان همچنان در "/" با تجربه‌ی چت بدون ثبت‌نام (تبلیغات/لندینگ جدید) روبه‌رو می‌شود.
// صرفاً وجود access_token در localStorage کافی نیست — ممکن است منقضی/نامعتبر باشد (مثلاً
// از یک session قدیمی)، که قبلاً باعث می‌شد کاربر مهمان یک لحظه به /chat برود، آنجا درخواست
// ۴۰۱ بخورد، و توسط اینترسپتور (api.ts) به‌جای دیدن تجربه‌ی مهمان به /login پرتاب شود. اینجا
// با useMe() واقعاً اعتبار توکن چک می‌شود؛ تا وقتی مشخص نشده، یک صفحه‌ی خالی موقت (مثل الگوی
// مشابه در LandingPage.tsx) نشان داده می‌شود تا از فلش نامناسب جلوگیری شود
// «/nivo-cal» یک مقصد ثابت نیست — بسته به وجود پروفایل تغذیه، یا صفحه‌ی اسکن فعلی (فاز ۱ + CTA
// ساخت پروفایل) یا داشبورد روزانه‌ی جدید (فاز ۲) را نشان می‌دهد؛ همان الگوی HomeRoute بالا برای
// شاخه‌زدن روی یک مسیر ثابت بر اساس یک query. لینک مستقیم به «/nivo-cal/scan» (مثل FAB داشبورد)
// همیشه صفحه‌ی اسکن را نشان می‌دهد، مستقل از این تصمیم — از این حلقه رد نمی‌شود.
function NivoCalRootRoute() {
  const { data: profile, isLoading } = useNutritionProfile()
  if (isLoading) return <div className="min-h-screen bg-slate-950" />
  return <Navigate to={profile ? '/nivo-cal/dashboard' : '/nivo-cal/scan'} replace />
}

function HomeRoute() {
  const hasToken = !!localStorage.getItem('access_token')
  const { data: me, isLoading } = useMe()
  if (hasToken && isLoading) return <div className="min-h-screen bg-slate-900" />
  if (me) return <HubPage />
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
      {/* لندینگ عمومی/مارکتینگ nivo-cal — حتی کاربر لاگین‌نکرده هم باید ویدیوی معرفی را ببیند،
          برخلاف «/nivo-cal» که پشت ProtectedRoute است و مقصد ثابت داشبورد/اسکن کاربر لاگین‌کرده است */}
      <Route path="/nivo-cal/intro" element={<NivoCalIntroPage />} />

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
      {/* استودیوی تولید/ویرایش عکس — همان الگوی /chat و /chat/:id، چون هر دو روی یک
          Conversation کار می‌کنند (docs/PRD-openrouter-migration.md §۱۴.۲/۱۴.۳) */}
      <Route
        path="/image"
        element={<ProtectedRoute><ChatLayout><ImageStudioPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/image/:id"
        element={<ProtectedRoute><ChatLayout><ImageStudioPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/pricing"
        element={<ProtectedRoute><PricingPage /></ProtectedRoute>}
      />
      {/* بدون ProtectedRoute — کاربر مهمان هم باید بتواند استودیو محتوا را اکسپلور کند؛
          DiscoverPage خودش بر اساس access_token شاخه می‌زند (ساخت Conversation واقعی
          فقط برای کاربر لاگین‌شده) */}
      <Route path="/discover" element={<DiscoverPage />} />
      {/* دیپ‌لینک عمومی یک سبک استودیو — nivoai.ir/studio?id=... — بدون ProtectedRoute،
          خودش بر اساس access_token شاخه می‌زند (StudioLinkPage) */}
      <Route path="/studio" element={<StudioLinkPage />} />
      <Route
        path="/projects"
        element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>}
      />
      <Route
        path="/projects/:id"
        element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/gallery"
        element={<ProtectedRoute><GalleryPage /></ProtectedRoute>}
      />
      <Route
        path="/nivo-cal"
        element={<ProtectedRoute><NivoCalRootRoute /></ProtectedRoute>}
      />
      <Route
        path="/nivo-cal/scan"
        element={<ProtectedRoute><NivoCalPage /></ProtectedRoute>}
      />
      <Route
        path="/nivo-cal/onboarding"
        element={<ProtectedRoute><NivoCalOnboardingPage /></ProtectedRoute>}
      />
      <Route
        path="/nivo-cal/dashboard"
        element={<ProtectedRoute><NivoCalDashboardPage /></ProtectedRoute>}
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
