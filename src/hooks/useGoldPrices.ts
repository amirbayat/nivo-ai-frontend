import { useEffect, useState } from 'react'
import { env } from '@/env'
import type { GoldPricesResult } from '@/types/api'

// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۴.۲ — نوار قیمت لحظه‌ای
// بالای صفحه‌ی فروشگاه خریدار؛ عمداً fetch ساده (نه axios مشترک)، عیناً الگوی
// useStoreProducts.ts، چون این صفحه مشتری ناشناس است، نه کاربر لاگین‌شده
export function useGoldPrices(enabled: boolean) {
  const [result, setResult] = useState<GoldPricesResult | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetch(`${env.VITE_API_URL}/market-prices/gold`)
      .then((res) => res.json() as Promise<GoldPricesResult>)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch(() => {
        if (!cancelled) setResult({ items: [], updatedAt: null, source: 'unavailable' })
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return result
}
