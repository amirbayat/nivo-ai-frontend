import { createContext, useContext } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useMyStores, useNeededAttention, useProducts } from '@/queries/seller.queries'

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۲.۱
const LOW_STOCK_THRESHOLD = 3

interface SellerStoreCtx {
  storeId: string
  storeName: string
  storeSlug: string
  instagramUrl: string | null
  telegramUrl: string | null
  websiteUrl: string | null
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

export function SellerPanelLayout() {
  const { data: stores, isLoading } = useMyStores()
  const store = stores?.[0]
  const attention = useNeededAttention(store?.id ?? '')
  const products = useProducts(store?.id ?? '')
  const lowStockCount = products.data?.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length ?? 0
  const attentionBadge = (attention.data?.length ?? 0) + lowStockCount

  if (isLoading) return <div className="min-h-screen bg-slate-950 light:bg-white" />
  if (!store) return <Navigate to="/seller/onboarding" replace />

  return (
    <SellerStoreContext.Provider
      value={{
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        instagramUrl: store.instagramUrl,
        telegramUrl: store.telegramUrl,
        websiteUrl: store.websiteUrl,
      }}
    >
      <div className="flex min-h-screen flex-col lg:flex-row bg-slate-950 light:bg-white" dir="rtl">
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
    </SellerStoreContext.Provider>
  )
}
