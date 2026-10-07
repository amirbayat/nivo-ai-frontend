import { createContext, useContext } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import { en } from '@/locales/en'
import { Logo } from '@/components/ui/Logo'
import { useIntlInstagramStatus } from '@/queries/intlInstagram.queries'
import { useIntlLogout } from '@/queries/intlAuth.queries'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱/۴.۴ — معادل سبک‌شده‌ی
// SellerPanelLayout.tsx برای REGION=INTL: فقط وضعیت اتصال اینستاگرام در context، بدون هیچ‌کدام
// از داده‌های پنل کامل (محصول/سفارش/طلا/...)
interface IntlStoreCtx {
  instagramBusinessId: string | null
  instagramConnectedAt: string | null
}

const IntlStoreContext = createContext<IntlStoreCtx | null>(null)

export function useIntlStore(): IntlStoreCtx {
  const ctx = useContext(IntlStoreContext)
  if (!ctx) throw new Error('useIntlStore must be used inside IntlPanelLayout')
  return ctx
}

export function IntlPanelLayout() {
  const status = useIntlInstagramStatus()
  const logout = useIntlLogout()

  if (status.isLoading) return <div className="min-h-screen bg-slate-950 light:bg-white" />

  return (
    <IntlStoreContext.Provider
      value={{
        instagramBusinessId: status.data?.instagramBusinessId ?? null,
        instagramConnectedAt: status.data?.instagramConnectedAt ?? null,
      }}
    >
      <div className="min-h-screen bg-slate-950 light:bg-white" dir="ltr">
        <header className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 px-5 py-3">
          <Logo variant="intl" className="h-7" />
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/app/instagram"
              end
              className={({ isActive }) =>
                clsx('font-medium transition-colors', isActive ? 'text-emerald-400 light:text-emerald-600' : 'text-slate-400 hover:text-slate-200')
              }
            >
              {en.instagram.connectTitle}
            </NavLink>
            <NavLink
              to="/app/instagram/rules"
              className={({ isActive }) =>
                clsx('font-medium transition-colors', isActive ? 'text-emerald-400 light:text-emerald-600' : 'text-slate-400 hover:text-slate-200')
              }
            >
              {en.instagram.rulesTitle}
            </NavLink>
            <button
              onClick={() => logout.mutate()}
              className="text-slate-500 hover:text-red-400 font-medium"
            >
              {en.auth.logout}
            </button>
          </nav>
        </header>

        <div className="mx-auto max-w-lg">
          <Outlet />
        </div>
      </div>
    </IntlStoreContext.Provider>
  )
}
