import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { PublicProduct, PublicProductsPage } from '@/types/api'

const PAGE_SIZE = 24

export type ProductSort = 'newest' | 'popular' | 'price_asc' | 'price_desc'

// docs/PRD-buyer-chat-redesign.md B1/§6.3 — یک محصول (یا چند تا) با شناسه؛ برای شیت محصولی که از لینک یا
// کارت چت باز می‌شود. null یعنی محصول دیگر قابل‌نمایش نیست (پنهان/پیش‌نویس/حذف) یا خطای شبکه
export async function fetchPublicProductsByIds(slug: string, ids: string[]): Promise<PublicProduct[] | null> {
  if (ids.length === 0) return []
  try {
    const params = new URLSearchParams({ ids: ids.slice(0, 20).join(','), page: '1', pageSize: String(ids.length) })
    const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/public-products?${params}`)
    if (!res.ok) return null
    return ((await res.json()) as PublicProductsPage).items
  } catch {
    return null
  }
}

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — لیست محصولات فروشگاه؛ عمداً fetch ساده (نه axios
// مشترک) عیناً مثل useShopChat.ts، چون این صفحه مشتری ناشناس است، نه کاربر لاگین‌شده.
// docs/PRD-buyer-chat-redesign.md §6.2 — sort از سرور (B1)، جست‌وجوی debounce ۳۰۰ms، و فقط پاسخ آخرین
// درخواست اعمال می‌شود تا تایپ سریع نتیجه‌ی قدیمی را روی جدید ننشاند
export function useStoreProducts(slug: string, enabled: boolean) {
  const [items, setItems] = useState<PublicProduct[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ProductSort>('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shippingEstimate, setShippingEstimate] = useState<PublicProductsPage['shippingEstimate']>(null)
  const [shippingDaysText, setShippingDaysText] = useState<string | null>(null)
  const [popularSortAvailable, setPopularSortAvailable] = useState(false)
  const [requiresShipping, setRequiresShipping] = useState(true)
  // تعداد کل فروشگاه بدون جست‌وجو — تا «فروشگاه بدون محصول» از «جست‌وجوی بی‌نتیجه» تشخیص داده شود
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestRef = useRef(0)

  const fetchPage = useCallback(
    async (targetPage: number, q: string, nextSort: ProductSort, append: boolean) => {
      const requestId = ++requestRef.current
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ page: String(targetPage), pageSize: String(PAGE_SIZE), sort: nextSort })
        if (q.trim()) params.set('q', q.trim())
        // فیدبک کاربر ۱۴۰۵/۰۷/۱۲ — «public-products» نه «products»: قبلاً این مسیر با
        // StoreController::GET :id/products (پنل فروشنده) هم‌شکل بود و در عمل همیشه آن را
        // shadow می‌کرد (لیست محصولات پنل فروشنده همیشه ۴۰۴ می‌داد)
        const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/public-products?${params}`)
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as PublicProductsPage
        if (requestId !== requestRef.current) return
        setItems((prev) => (append ? [...prev, ...data.items] : data.items))
        setTotal(data.total)
        setPage(data.page)
        if (!append) {
          setShippingEstimate(data.shippingEstimate ?? null)
          setShippingDaysText(data.shippingDaysText ?? null)
          setPopularSortAvailable(!!data.popularSortAvailable)
          setRequiresShipping(data.requiresShipping ?? true)
          if (!q.trim()) setCatalogTotal(data.total)
        }
      } catch {
        if (requestId === requestRef.current) setError(fa.common.error)
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false)
          setLoaded(true)
        }
      }
    },
    [slug],
  )

  // جست‌وجو/مرتب‌سازی با debounce ساده (۳۰۰ms) — بدون کتابخانه‌ی خارجی. اولین بار بدون تأخیر
  const firstRef = useRef(true)
  useEffect(() => {
    if (!enabled) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = firstRef.current ? 0 : 300
    firstRef.current = false
    debounceRef.current = setTimeout(() => void fetchPage(1, query, sort, false), delay)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [enabled, query, sort, slug, fetchPage])

  const loadMore = useCallback(() => {
    if (loading) return
    // بعد از خطای بارگذاری اول (لیست خالی) «دوباره» باید صفحه‌ی ۱ را بگیرد، نه صفحه‌ی ۲
    if (items.length === 0) void fetchPage(1, query, sort, false)
    else void fetchPage(page + 1, query, sort, true)
  }, [fetchPage, items.length, loading, page, query, sort])

  return {
    items,
    query,
    setQuery,
    sort,
    setSort,
    loading,
    loaded,
    error,
    total,
    catalogTotal,
    hasMore: items.length < total,
    loadMore,
    shippingEstimate,
    shippingDaysText,
    popularSortAvailable,
    requiresShipping,
  }
}
