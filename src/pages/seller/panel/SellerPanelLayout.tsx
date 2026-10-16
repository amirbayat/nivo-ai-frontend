import { createContext, useContext } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useMyStores, useStoreBadges, useStoreCompleteness } from '@/queries/seller.queries'
import { useSellerAlerts } from '@/hooks/useSellerAlerts'
import { useConvertDemoStoreToReal } from '@/queries/demo.queries'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { GoldPriceTicker } from '@/components/shop/GoldPriceTicker'
import type { SellerStore } from '@/types/api'

interface SellerStoreCtx {
  storeId: string
  storeName: string
  storeSlug: string
  instagramUrl: string | null
  telegramUrl: string | null
  websiteUrl: string | null
  // docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۴.۱ — وضعیت اتصال OAuth دایرکت هوشمند
  instagramBusinessId: string | null
  instagramConnectedAt: string | null
  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۱/۳.۳
  category: string | null
  businessType: 'PRODUCT_SALES' | 'APPOINTMENT_BOOKING'
  goldWageType: 'PERCENT' | 'FIXED_PER_GRAM' | null
  goldWageValue: number | null
  goldProfitPercent: number | null
  goldVatPercent: number
}

const SellerStoreContext = createContext<SellerStoreCtx | null>(null)

// همیشه از صفحات داخل پنل صدا زده می‌شود (زیر <SellerPanelLayout/>)، پس هیچ‌وقت null نیست
export function useSellerStore(): SellerStoreCtx {
  const ctx = useContext(SellerStoreContext)
  if (!ctx) throw new Error('useSellerStore must be used inside SellerPanelLayout')
  return ctx
}

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  )
}
function ProductsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path d="M10 2L3 6v8l7 4 7-4V6l-7-4zM5 7.5L10 10l5-2.5M10 10v6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
    </svg>
  )
}
function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-5h4v5" />
    </svg>
  )
}

// SP-6 — فقط این چهار صفحه‌ی اصلی نوار پایین دارند؛ بقیه (محصول، گفتگو، زیرصفحه‌های فروشگاه) تمام‌صفحه با
// دکمه‌ی ثابت پایین خودشان هستند و نوار پایین مزاحمشان نمی‌شود
const ROOT_TABS = ['today', 'orders', 'products', 'store']
function isRootTab(pathname: string): boolean {
  const seg = pathname.replace(/^\/seller\/panel\/?/, '').replace(/\/$/, '')
  return ROOT_TABS.includes(seg)
}

function NavItem({
  to,
  icon,
  label,
  badge,
  forceActive,
  dot,
}: {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
  forceActive?: boolean
  dot?: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
          isActive || forceActive ? 'text-emerald-400 light:text-emerald-600' : 'text-slate-500 hover:text-slate-300 light:hover:text-slate-700',
        )
      }
    >
      {icon}
      {label}
      {dot && <span className="absolute top-2 right-[calc(50%-14px)] size-2.5 rounded-full bg-red-500" aria-label="!" />}
      {!!badge && (
        <span className="absolute top-1 right-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۵ — همان ۵ مقصد، فقط چیدمان افقی سایدبار به‌جای bottom nav
function SidebarItem({
  to,
  icon,
  label,
  badge,
  forceActive,
}: {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
  forceActive?: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
          isActive || forceActive
            ? 'bg-emerald-500/10 text-emerald-400 light:bg-emerald-50 light:text-emerald-600'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 light:hover:bg-slate-100 light:hover:text-slate-800',
        )
      }
    >
      {icon}
      {label}
      {!!badge && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md — نوار ثابت بالای کل پنل دمو؛
// قبلاً این پیام فقط داخل تنظیمات بود (فیدبک کاربر ۱۴۰۵/۰۷/۱۷: باید همه‌جا دیده بشه).
// دکمه‌ی تبدیل همون mutation صفحه‌ی تنظیمات رو مستقیم از همینجا صدا می‌زنه، بدون نیاز به
// رفتن به تنظیمات؛ دکمه‌ی «تست پنل خریدار» صرفاً صفحه‌ی واقعی /shop/:slug همین فروشگاه رو در
// تب جدید باز می‌کند — پنل خریداری جدا و جدیدی در کار نیست، همون تجربه‌ی واقعی مشتری است.
// R3.5 / D-1 — هر فروشنده یک فروشگاه واقعی: تبدیل همین رکورد را از دمو بیرون می‌آورد (isDemo=false)
// و کاربر به خانه‌ی پنل می‌رود؛ دیگر فروشگاه دوم از ویزارد ساخته نمی‌شود (بک‌اند هم 409 می‌دهد).
// قبلاً (فیدبک ۱۴۰۵/۰۷/۱۷) بعد از تبدیل ویزارد خالی باز می‌شد و یک فروشگاه جدید می‌ساخت.
function DemoBanner({ store }: { store: SellerStore }) {
  const navigate = useNavigate()
  const convertToReal = useConvertDemoStoreToReal(store.id)

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:mx-auto lg:max-w-4xl">
        <p className="text-sm text-amber-300 light:text-amber-700">{fa.seller.panel.demoBanner.text}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/shop/${store.slug}?demoTour=1`)}
            className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-300 light:text-amber-700 hover:bg-amber-500/10"
          >
            {fa.seller.panel.demoBanner.testBuyerButton}
          </button>
          <button
            type="button"
            disabled={convertToReal.isPending}
            onClick={() => {
              if (!window.confirm(fa.seller.panel.demoBanner.convertConfirm)) return
              convertToReal.mutate(undefined, {
                onSuccess: () => navigate('/seller/panel/today?setup=1'),
              })
            }}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {fa.seller.panel.demoBanner.convertButton}
          </button>
        </div>
      </div>
      {convertToReal.isError && (
        <p className="mt-1.5 text-xs text-red-400 lg:mx-auto lg:max-w-4xl">
          {extractErrorMessage(convertToReal.error, fa.seller.panel.demoBanner.convertError)}
        </p>
      )}
    </div>
  )
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۶.۷ (فیدبک کاربر ۱۴۰۵/۰۷/۱۷) —
// همان شرط BLOCKED در credit.service.ts's decideBillingMode، سمت فرانت: نه اعتبار آزمایشی
// فعال مانده نه اعتبار واقعی. وقتی این باشد، ایجنت فروش دیگر به خریدار جدید جواب نمی‌دهد و
// مکالمه مستقیم HANDOFF می‌شود — فروشنده باید همین‌جا، نه فقط با پوش تلگرام، متوجه شود
function isCreditExhausted(store: SellerStore): boolean {
  const trialActive =
    !!store.trialEndsAt &&
    new Date(store.trialEndsAt) > new Date() &&
    store.trialCreditRemainingToman > 0
  return !trialActive && store.creditBalanceToman <= 0
}

function CreditExhaustedBanner() {
  return (
    <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:mx-auto lg:max-w-4xl">
        <p className="text-sm text-red-300 light:text-red-700">{fa.seller.panel.creditExhaustedBanner.text}</p>
        <NavLink
          to="/seller/panel/store/credit"
          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-400"
        >
          {fa.seller.panel.creditExhaustedBanner.cta}
        </NavLink>
      </div>
    </div>
  )
}

export function SellerPanelLayout() {
  const { pathname } = useLocation()
  const rootTab = isRootTab(pathname)
  const { data: stores, isLoading, isError, refetch } = useMyStores()
  const store = stores?.[0]
  // R2.1 — شمارنده‌ها از endpoint سبک (نه بار کردن کل لیست محصولات/مکالمه‌ها فقط برای شمردن)
  const badges = useStoreBadges(store?.id ?? '')
  // SP-6 — «امروز» = رسیدها + مشتری‌های منتظر + مشکل‌ها + بازپرداخت عقب‌افتاده؛ کم‌بودن موجودی دیگر
  // در هیچ نشانی نیست (فوری نیست و نشان را باد می‌کرد)
  const todayBadge = (badges.data?.receipts ?? 0) + (badges.data?.attention ?? 0) + (badges.data?.issues ?? 0) + (badges.data?.refundsOverdue ?? 0)
  const completeness = useStoreCompleteness(store?.id ?? '')
  const noPayment = completeness.data ? !completeness.data.launch.hasPaymentMethod : false
  useSellerAlerts(badges.data?.receipts, badges.data?.attention)

  if (isLoading) return <div className="min-h-screen bg-slate-950 light:bg-white" />
  // 0.13g — خطای لود (شبکه/۵۰۰) با «بدون فروشگاه» فرق دارد؛ فروشنده‌ی موجود نباید به ویزارد
  // ساخت فروشگاه پرت شود
  if (isError) {
    return (
      <div className="min-h-screen bg-slate-950 light:bg-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-slate-300 light:text-slate-700">{fa.seller.panel.storeLoadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium"
        >
          {fa.common.retry}
        </button>
      </div>
    )
  }
  if (!stores || stores.length === 0 || !store)
    return <Navigate to="/seller/onboarding" replace />

  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۴.۲ — فیدبک کاربر
  // ۱۴۰۵/۰۷/۱۵: نوار قیمت لحظه‌ای طلا یک نوار واحد بالای کل پنل باشد، نه فقط داخل فرم محصول.
  // همان شرط SellerStoreSettingsPage.tsx:99 — دسته‌بندی طلا/جواهر یا حداقل یک محصول وزنی موجود
  const showGoldTicker =
    store.category === 'جواهرات و اکسسوری' ||
    (badges.data?.hasWeightProducts ?? false)

  return (
    <SellerStoreContext.Provider
      value={{
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        instagramUrl: store.instagramUrl,
        telegramUrl: store.telegramUrl,
        websiteUrl: store.websiteUrl,
        instagramBusinessId: store.instagramBusinessId,
        instagramConnectedAt: store.instagramConnectedAt,
        category: store.category,
        businessType: store.businessType,
        goldWageType: store.goldWageType,
        goldWageValue: store.goldWageValue,
        goldProfitPercent: store.goldProfitPercent,
        goldVatPercent: store.goldVatPercent,
      }}
    >
      <div className="flex min-h-screen flex-col bg-slate-950 light:bg-white" dir="rtl">
        {store.isDemo && <DemoBanner store={store} />}
        {store.status === 'SUSPENDED' && (
          <div role="alert" className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 light:text-red-700">
            <p className="font-semibold">{fa.seller.panel.suspendedBanner.title}</p>
            {store.suspendedReason && <p className="mt-0.5 text-xs">{store.suspendedReason}</p>}
          </div>
        )}
        {!store.isDemo && isCreditExhausted(store) && <CreditExhaustedBanner />}
        {showGoldTicker && <GoldPriceTicker />}

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۵ — از lg به بالا، سایدبار سمت راست جایگزین bottom nav */}
          <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-l lg:border-slate-800 light:lg:border-slate-200 lg:px-3 lg:py-6">
            <SidebarItem to="/seller/panel/today" icon={<TodayIcon />} label={fa.seller.v2.today.title} badge={todayBadge} />
            <SidebarItem to="/seller/panel/orders" icon={<OrdersIcon />} label={fa.seller.panel.nav.orders} />
            <SidebarItem to="/seller/panel/products" icon={<ProductsIcon />} label={fa.seller.panel.nav.products} />
            <SidebarItem to="/seller/panel/store" icon={<StoreIcon />} label={fa.seller.v2.store.title} />
          </aside>

          <div className={clsx('flex-1 lg:pb-0', rootTab ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : 'pb-0')}>
            <div className="lg:mx-auto lg:max-w-4xl">
              <Outlet />
            </div>
          </div>

          {rootTab && (
            <nav className="fixed inset-x-0 bottom-0 z-30 flex lg:hidden border-t border-slate-800 light:border-slate-200 bg-slate-900/95 light:bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
              {/* در RTL اولین آیتم سمت راست است: «امروز» راست‌ترین تب */}
              <NavItem to="/seller/panel/today" icon={<TodayIcon />} label={fa.seller.v2.today.title} badge={todayBadge} />
              <NavItem to="/seller/panel/orders" icon={<OrdersIcon />} label={fa.seller.panel.nav.orders} />
              <NavItem to="/seller/panel/products" icon={<ProductsIcon />} label={fa.seller.panel.nav.products} />
              <NavItem to="/seller/panel/store" icon={<StoreIcon />} label={fa.seller.v2.store.title} dot={noPayment} />
            </nav>
          )}
        </div>
      </div>
    </SellerStoreContext.Provider>
  )
}
