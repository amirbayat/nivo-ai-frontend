import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { PublicProduct } from '@/types/api'

const PAGE_SIZE = 24

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — حالت «فروشگاه»؛ عمداً fetch ساده (نه axios
// مشترک) عیناً مثل useShopChat.ts، چون این صفحه مشتری ناشناس است، نه کاربر لاگین‌شده
export function useStoreProducts(slug: string, enabled: boolean) {
  const [items, setItems] = useState<PublicProduct[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPage = useCallback(
    async (targetPage: number, q: string, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE) })
        if (q.trim()) params.set('q', q.trim())
        // فیدبک کاربر ۱۴۰۵/۰۷/۱۲ — «public-products» نه «products»: قبلاً این مسیر با
        // StoreController::GET :id/products (پنل فروشنده) هم‌شکل بود و در عمل همیشه آن را
        // shadow می‌کرد (لیست محصولات پنل فروشنده همیشه ۴۰۴ می‌داد)
        const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/public-products?${params}`)
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as { items: PublicProduct[]; total: number; page: number }
        setItems((prev) => (append ? [...prev, ...data.items] : data.items))
        setTotal(data.total)
        setPage(data.page)
      } catch {
        setError(fa.common.error)
      } finally {
        setLoading(false)
      }
    },
    [slug],
  )

  // جست‌وجو با debounce ساده (۳۰۰ms) — بدون کتابخانه‌ی خارجی، عیناً الگوی تصمیم carousel در
  // ShopUiBlocks.tsx (سند بخش ۴ — بدون وابستگی تازه وقتی یک useEffect/setTimeout کافی است)
  useEffect(() => {
    if (!enabled) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchPage(1, query, false), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, query, slug])

  const loadMore = useCallback(() => void fetchPage(page + 1, query, true), [fetchPage, page, query])

  return {
    items,
    query,
    setQuery,
    loading,
    error,
    hasMore: items.length < total,
    loadMore,
  }
}
