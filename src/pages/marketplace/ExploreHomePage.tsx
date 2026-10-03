import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { MarketplaceStore } from '@/types/api'

// عمومی، بدون auth — عیناً همون الگوی storeLogoUrl در ShopChatPage.tsx
function storeLogoUrl(storeId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/stores/${storeId}/logo/${key}`
}

// عیناً همون الگوی avatarInitials در ShopChatPage.tsx/Sidebar.tsx
function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

// docs/PRD-marketplace-explore-cross-store.md بخش ۷ (فاز ۵ MVP) — فهرست ساده‌ی فروشگاه‌های
// فعال (گرید، بدون جست‌وجو/دسته‌بندی/AI — آن‌ها فاز ۲/۳ همون سند هستند)
export function ExploreHomePage() {
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${env.VITE_API_URL}/v2/marketplace/stores`)
      .then(res => {
        if (!res.ok) throw new Error('request failed')
        return res.json() as Promise<{ stores: MarketplaceStore[] }>
      })
      .then(data => {
        if (!cancelled) setStores(data.stores)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 light:bg-white" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{fa.marketplace.exploreTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">{fa.marketplace.exploreSubtitle}</p>
          </div>
          <Link
            to="/explore/orders"
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 light:border-slate-300 light:text-slate-800"
          >
            {fa.marketplace.myOrdersLink}
          </Link>
        </div>

        {loading && <p className="py-10 text-center text-sm text-slate-500">{fa.common.loading}</p>}
        {error && <p className="py-10 text-center text-sm text-red-400">{fa.common.error}</p>}
        {!loading && !error && stores.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">{fa.marketplace.exploreEmpty}</p>
        )}

        {!loading && !error && stores.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stores.map(store => (
              <Link
                key={store.id}
                to={`/shop/${store.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 text-center light:border-slate-200 light:bg-white"
              >
                {store.logoImageKey ? (
                  <img
                    src={storeLogoUrl(store.id, store.logoImageKey)}
                    alt={store.name}
                    className="size-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300 light:bg-slate-100 light:text-slate-600">
                    {avatarInitials(store.name)}
                  </div>
                )}
                <span className="truncate text-sm font-medium text-slate-200 light:text-slate-900">{store.name}</span>
                {store.category && <span className="text-[11px] text-slate-500">{store.category}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
