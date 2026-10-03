import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { HubPage } from '@/pages/hub/HubPage'
import { ImageStudioPage } from '@/pages/image-studio/ImageStudioPage'
import { CaptionStudioPage } from '@/pages/caption-studio/CaptionStudioPage'
import { VideoStudioPage } from '@/pages/video-edit/VideoStudioPage'
import { PricingPage } from '@/pages/pricing/PricingPage'
import { DiscoverPage } from '@/pages/discover/DiscoverPage'
import { PromptsPage } from '@/pages/prompts/PromptsPage'
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
import { SellerLandingPage } from '@/pages/seller/SellerLandingPage'
import { SellerLoginPage } from '@/pages/seller/SellerLoginPage'
import { SellerOtpPage } from '@/pages/seller/SellerOtpPage'
import { SellerOnboardingPage } from '@/pages/seller/SellerOnboardingPage'
import { SellerPanelLayout } from '@/pages/seller/panel/SellerPanelLayout'
import { SellerHomePage } from '@/pages/seller/panel/SellerHomePage'
import { SellerOrdersPage } from '@/pages/seller/panel/SellerOrdersPage'
import { SellerAttentionPage } from '@/pages/seller/panel/SellerAttentionPage'
import { SellerProductsPage } from '@/pages/seller/panel/SellerProductsPage'
import { SellerProductEditPage } from '@/pages/seller/panel/SellerProductEditPage'
import { SellerMorePage } from '@/pages/seller/panel/SellerMorePage'
import { SellerStoreSettingsPage } from '@/pages/seller/panel/SellerStoreSettingsPage'
import { SellerKnowledgePage } from '@/pages/seller/panel/SellerKnowledgePage'
import { SellerCreditPage } from '@/pages/seller/panel/SellerCreditPage'
import { SellerBankCardsPage } from '@/pages/seller/panel/SellerBankCardsPage'
import { SellerDiscountCodesPage } from '@/pages/seller/panel/SellerDiscountCodesPage'
import { SellerShippingPage } from '@/pages/seller/panel/SellerShippingPage'
import { SellerAdvertisingPage } from '@/pages/seller/panel/SellerAdvertisingPage'
import { SellerChannelStatsPage } from '@/pages/seller/panel/SellerChannelStatsPage'
import { SellerDashboardPage } from '@/pages/seller/panel/SellerDashboardPage'
import { SellerHelpCenterPage } from '@/pages/seller/panel/SellerHelpCenterPage'
import { ShopChatPage } from '@/pages/shop/ShopChatPage'
import { ExploreHomePage } from '@/pages/marketplace/ExploreHomePage'
import { MyOrdersPage } from '@/pages/marketplace/MyOrdersPage'
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

// "/" همیشه هاب است — چه کاربر لاگین‌کرده باشد چه مهمان (دیگر AnonChatPage/تجربه‌ی چت
// بدون ثبت‌نام در اینجا نشان داده نمی‌شود). کارت‌ها خودشان (HubPage) بر اساس isLoggedIn
// تصمیم می‌گیرند: کاربر مهمان با کلیک روی هر کارت، اول به /login فرستاده می‌شود (مسیر مقصد در
// sessionStorage['nivo:pendingReturnPath'] ذخیره می‌شود، همان الگوی بازگشت بعد از درگاه پرداخت
// در CallbackPage.tsx) و OtpPage بعد از ورود موفق او را به همان مقصد برمی‌گرداند.
// صرفاً وجود access_token در localStorage کافی نیست — ممکن است منقضی/نامعتبر باشد، برای همین
// useMe() واقعاً اعتبار توکن را چک می‌کند؛ تا وقتی مشخص نشده، یک صفحه‌ی خالی موقت نشان داده
// می‌شود تا از فلش نامناسب (مثلاً نمایش کوتاه دکمه‌ی ورود به کاربر لاگین‌کرده) جلوگیری شود.
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
  return <HubPage isLoggedIn={!!me} />
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

      {/* docs/PRD-mvp-launch-plan.md گام ۰ — مسیر ورودی جدا از پنل چت اصلی، برای فروشنده‌های
          ایجنت فروش دایرکت/تلگرام. عمداً GuestRoute نیست: کاربر لاگین‌کرده‌ی چت اصلی هم باید
          بتواند از اینجا فروشنده شود، نه اینکه به /chat ریدایرکت شود (SellerLoginPage خودش
          بر اساس وجود توکن/فروشگاه شاخه می‌زند) */}
      <Route path="/seller" element={<SellerLandingPage />} />
      <Route path="/seller/login" element={<SellerLoginPage />} />
      <Route path="/seller/otp" element={<SellerOtpPage />} />
      <Route path="/seller/onboarding" element={<ProtectedRoute><SellerOnboardingPage /></ProtectedRoute>} />

      {/* docs/PRD-mvp-launch-plan.md گام ۳ — پنل فروشنده mobile-first، ناوبری پایین با ۵ تب */}
      <Route path="/seller/panel" element={<ProtectedRoute><SellerPanelLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<SellerHomePage />} />
        <Route path="orders" element={<SellerOrdersPage />} />
        <Route path="attention" element={<SellerAttentionPage />} />
        <Route path="products" element={<SellerProductsPage />} />
        <Route path="products/new" element={<SellerProductEditPage />} />
        <Route path="products/:id" element={<SellerProductEditPage />} />
        <Route path="more" element={<SellerMorePage />} />
        <Route path="store-settings" element={<SellerStoreSettingsPage />} />
        <Route path="knowledge" element={<SellerKnowledgePage />} />
        <Route path="credit" element={<SellerCreditPage />} />
        <Route path="bank-cards" element={<SellerBankCardsPage />} />
        <Route path="discount-codes" element={<SellerDiscountCodesPage />} />
        <Route path="shipping-rules" element={<SellerShippingPage />} />
        <Route path="advertising" element={<SellerAdvertisingPage />} />
        <Route path="channel-stats" element={<SellerChannelStatsPage />} />
        <Route path="dashboard" element={<SellerDashboardPage />} />
        <Route path="help" element={<SellerHelpCenterPage />} />
      </Route>
      {/* بازگشت‌سازگار: جایگزین گام۲ (SellerDashboardPlaceholderPage حذف شد) */}
      <Route path="/seller/dashboard-placeholder" element={<Navigate to="/seller/panel/home" replace />} />

      {/* docs/PRD-mvp-launch-plan.md گام ۲ — چت عمومی مشتری، کاملاً بدون لاگین؛ نمی‌شود
          /chat/:slug باشد چون آن مسیر از قبل برای چت لاگین‌شده‌ی نیوو گرفته شده (پایین‌تر) */}
      <Route path="/shop/:slug" element={<ShopChatPage />} />

      {/* docs/PRD-marketplace-explore-cross-store.md بخش ۷ (فاز ۵ MVP) — لایه‌ی اکسپلور،
          بدون لاگین، جدا از چت تک‌فروشگاهی بالا */}
      <Route path="/explore" element={<ExploreHomePage />} />
      <Route path="/explore/orders" element={<MyOrdersPage />} />

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
        element={<ProtectedRoute><ChatLayout collapsedByDefault><ImageStudioPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/image/:id"
        element={<ProtectedRoute><ChatLayout collapsedByDefault><ImageStudioPage /></ChatLayout></ProtectedRoute>}
      />
      {/* استودیوی زیرنویس خودکار — docs/PRD-video-auto-captions.md §۱۸، همان الگوی /video */}
      <Route
        path="/captions"
        element={<ProtectedRoute><ChatLayout collapsedByDefault><CaptionStudioPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/captions/:id"
        element={<ProtectedRoute><ChatLayout collapsedByDefault><CaptionStudioPage /></ChatLayout></ProtectedRoute>}
      />
      {/* استودیوی ویدیو (تولید + ویرایش، یک فرم واحد با Kie.ai) — docs/PRD-video-edit-omni-kie.md،
          تک‌صفحه (گالری+فرم)، بدون :id — قبلاً روی /video-edit بود، حالا مسیر اصلی /video است
          و مسیر قدیمی /video به فلوی چت‌محور اشاره داشت (حذف شد، آن فیچر جایگزین این شد) */}
      <Route
        path="/video"
        element={<ProtectedRoute><ChatLayout collapsedByDefault><VideoStudioPage /></ChatLayout></ProtectedRoute>}
      />
      {/* بازگشت‌سازگار: بوکمارک/لینک قدیمی به /video-edit همچنان باید کار کند */}
      <Route path="/video-edit" element={<Navigate to="/video" replace />} />
      <Route
        path="/pricing"
        element={<ProtectedRoute><PricingPage /></ProtectedRoute>}
      />
      {/* بدون ProtectedRoute — کاربر مهمان هم باید بتواند استودیو محتوا را اکسپلور کند؛
          DiscoverPage خودش بر اساس access_token شاخه می‌زند (ساخت Conversation واقعی
          فقط برای کاربر لاگین‌شده) */}
      <Route path="/discover" element={<DiscoverPage />} />
      {/* بخش عمومی «پرامپت‌های روز» — docs/PRD-daily-content-prompt-agent.md بخش ۷، بدون
          ProtectedRoute، هم‌الگوی /discover و /studio */}
      <Route path="/prompts" element={<PromptsPage />} />
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
