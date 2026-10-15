import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { SellerProduct } from '@/types/api'

// docs/PRD-seller-panel-simplification.md — هوک‌های endpointهای تازه‌ی سادهٔ پنل

// فقط یک محصول (پیش‌نویس هم) برای صفحه‌ی ویرایش؛ با گزینه‌ها و مدل‌ها
export function useProduct(storeId: string, productId: string | null) {
  return useQuery({
    queryKey: [...keys.seller.products(storeId), 'one', productId] as const,
    queryFn: () => api.get<SellerProduct>(`/v2/stores/${storeId}/products/${productId}`).then(r => r.data),
    enabled: !!storeId && !!productId,
    staleTime: 0,
  })
}

export interface AiFillResult {
  name?: string
  basePrice?: number
  stock?: number
  trackStock?: boolean
  description?: string
  specs?: { label: string; value: string }[]
  weightGrams?: number
  purityKarat?: number
  variantOptions?: { name: string; values: { value: string; stock?: number }[] }[]
  missing: ('name' | 'price' | 'stock')[]
  assumptions: string[]
}

// «عکس + یک جمله ← فیلدها»؛ چیزی در سرور ذخیره نمی‌کند
export function useAiFill(storeId: string) {
  return useMutation({
    mutationFn: ({ productId, text }: { productId: string; text?: string }) =>
      api
        .post<AiFillResult>(`/v2/stores/${storeId}/products/${productId}/ai-fill`, { text }, { timeout: 40_000 })
        .then(r => r.data),
  })
}

export function usePublishProducts(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api
        .post<{ published: string[]; failed: { id: string; missing: string[] }[] }>(
          `/v2/stores/${storeId}/products/publish`,
          { ids },
        )
        .then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) })
      void qc.invalidateQueries({ queryKey: keys.seller.completeness(storeId) })
    },
  })
}

export function useDuplicateProduct(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) =>
      api.post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/duplicate`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useSetCoverImage(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, key }: { productId: string; key: string }) =>
      api.post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/images/${key}/cover`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

// «لینک فروشگاه را فرستادم» (کارت راه‌اندازی)
export function useMarkLaunchShared(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/v2/stores/${storeId}/launch/shared`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.completeness(storeId) }),
  })
}

// فقط آمار اشتراک لینک محصول
export function useLogProductLinkShared(storeId: string) {
  return useMutation({
    mutationFn: ({ productId, channel }: { productId: string; channel: 'native' | 'copy' | 'telegram' }) =>
      api.post(`/v2/stores/${storeId}/products/${productId}/link-shared`, { channel }).then(r => r.data),
  })
}

export function useDismissAttentionTopic(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (topic: string) =>
      api.post(`/v2/stores/${storeId}/attention-suggestions/dismiss`, { topic }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.attentionSuggestions(storeId) }),
  })
}

// لینک اتصال تلگرام فروشنده با یک تپ (توکن یک‌بارمصرف، ۱۵ دقیقه)
export function useSellerBotConnectToken(storeId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<{ url: string }>(`/v2/seller-bot/stores/${storeId}/connect-token`).then(r => r.data),
  })
}
