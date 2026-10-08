import { createContext, useContext } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useMyStores, useNeededAttention, useProducts } from '@/queries/seller.queries'
import { useConvertDemoStoreToReal } from '@/queries/demo.queries'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { GoldPriceTicker } from '@/components/shop/GoldPriceTicker'
import type { SellerStore } from '@/types/api'

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۲.۱
const LOW_STOCK_THRESHOLD = 3

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

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3H9v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" />
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
function AttentionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 16a1.5 1.5 0 003 0h-3z" clipRule="evenodd" />
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
function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path d="M4 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    </svg>
  )
}

function NavItem({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
          isActive ? 'text-emerald-400 light:text-emerald-600' : 'text-slate-500 hover:text-slate-300 light:hover:text-slate-700',
        )
      }
    >
      {icon}
      {label}
      {!!badge && (
        <span className="absolute top-1 right-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۵ — همان ۵ مقصد، فقط چیدمان افقی سایدبار به‌جای bottom nav
function SidebarItem({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
          isActive
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
// فیدبک کاربر ۱۴۰۵/۰۷/۱۷ — تبدیل باید دقیقاً مثل ساخت یک فروشگاه تازه از صفر باشد: بعد از
// flip کردن isDemo روی همین فروشگاه دمو (تا دیگر جزو سهمیه‌ی دمو حساب نشود)، کاربر مستقیم به
// ویزارد خالی /seller/onboarding می‌رود — هیچ داده‌ای از فروشگاه دمو pre-fill نمی‌شود؛ فروشگاه
// واقعی جدیدی از همان ویزارد معمولی ساخته می‌شود (فروشگاه دمو قبلی دست‌نخورده می‌ماند، فقط
// isDemo آن خاموش است و دیگر در پنل اول نشان داده نمی‌شود چون useMyStores جدیدترین را اول می‌دهد)
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
            onClick={() => window.open(`/shop/${store.slug}`, '_blank', 'noopener,noreferrer')}
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
                onSuccess: () => navigate('/seller/onboarding'),
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

export function SellerPanelLayout() {
  const { data: stores, isLoading } = useMyStores()
  const store = stores?.[0]
  const attention = useNeededAttention(store?.id ?? '')
  const products = useProducts(store?.id ?? '')
  const lowStockCount = products.data?.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length ?? 0
  const attentionBadge = (attention.data?.length ?? 0) + lowStockCount

  if (isLoading) return <div className="min-h-screen bg-slate-950 light:bg-white" />
  if (!store) return <Navigate to="/seller/onboarding" replace />

  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۴.۲ — فیدبک کاربر
  // ۱۴۰۵/۰۷/۱۵: نوار قیمت لحظه‌ای طلا یک نوار واحد بالای کل پنل باشد، نه فقط داخل فرم محصول.
  // همان شرط SellerStoreSettingsPage.tsx:99 — دسته‌بندی طلا/جواهر یا حداقل یک محصول وزنی موجود
  const showGoldTicker =
    store.category === 'جواهرات و اکسسوری' ||
    (products.data?.some(p => p.pricingModel === 'WEIGHT_BASED_FORMULA') ?? false)

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
        {showGoldTicker && <GoldPriceTicker />}

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۲.۵ — از lg به بالا، سایدبار سمت راست جایگزین bottom nav */}
          <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:gap-1 lg:border-l lg:border-slate-800 light:lg:border-slate-200 lg:px-3 lg:py-6">
            <SidebarItem to="/seller/panel/home" icon={<HomeIcon />} label={fa.seller.panel.nav.home} />
            <SidebarItem to="/seller/panel/orders" icon={<OrdersIcon />} label={fa.seller.panel.nav.orders} />
            <SidebarItem
              to="/seller/panel/attention"
              icon={<AttentionIcon />}
              label={fa.seller.panel.nav.attention}
              badge={attentionBadge}
            />
            <SidebarItem to="/seller/panel/products" icon={<ProductsIcon />} label={fa.seller.panel.nav.products} />
            <SidebarItem to="/seller/panel/more" icon={<MoreIcon />} label={fa.seller.panel.nav.more} />
          </aside>

          <div className="flex-1 pb-16 lg:pb-0">
            <div className="lg:mx-auto lg:max-w-4xl">
              <Outlet />
            </div>
          </div>

          <nav className="fixed inset-x-0 bottom-0 flex lg:hidden border-t border-slate-800 light:border-slate-200 bg-slate-900/95 light:bg-white/95 backdrop-blur">
            <NavItem to="/seller/panel/home" icon={<HomeIcon />} label={fa.seller.panel.nav.home} />
            <NavItem to="/seller/panel/orders" icon={<OrdersIcon />} label={fa.seller.panel.nav.orders} />
            <NavItem
              to="/seller/panel/attention"
              icon={<AttentionIcon />}
              label={fa.seller.panel.nav.attention}
              badge={attentionBadge}
            />
            <NavItem to="/seller/panel/products" icon={<ProductsIcon />} label={fa.seller.panel.nav.products} />
            <NavItem to="/seller/panel/more" icon={<MoreIcon />} label={fa.seller.panel.nav.more} />
          </nav>
        </div>
      </div>
    </SellerStoreContext.Provider>
  )
}
