import type { AxiosRequestConfig } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QualityReview, QualityRules, QualitySuggestion } from '@/queries/quality.queries'

// SQ-2/SQ-3 — کارت «آمادگی فروشگاه»
export interface StoreQualityRules {
  items: { key: string; label: string; target: string; status: 'ok' | 'missing' | 'unknown' }[]
}
export interface StoreQualityReview extends Omit<QualityReview, 'suggestions'> {
  suggestions: QualitySuggestion[]
  trustLines?: string[]
}
export interface StoreQualityResponse {
  status: 'pending' | 'ready' | 'rules_only'
  review: StoreQualityReview | null
  rules: StoreQualityRules
}
export interface StoreQualityApplyPreview {
  field: 'brandIntro' | 'returnPolicy' | 'shippingInfo'
  newText: string
  suggestedReturnWindowDays: number | null
  suggestedReturnShippingPaidBy: 'BUYER' | 'SELLER' | null
}

export function useStoreQualityReview(storeId: string, enabled: boolean, pollSince: number | null) {
  return useQuery({
    queryKey: ['seller', 'store-quality', storeId] as const,
    queryFn: () => api.get<StoreQualityResponse>(`/v2/stores/${storeId}/quality-review`).then(r => r.data),
    enabled: !!storeId && enabled,
    refetchInterval: q => (pollSince && q.state.data?.status === 'pending' && Date.now() - pollSince < 30_000 ? 3000 : false),
  })
}

export function useApplyStoreQuality(storeId: string) {
  return useMutation({
    mutationFn: (body: { key: string; answer: string }) =>
      api.post<StoreQualityApplyPreview>(`/v2/stores/${storeId}/quality-apply`, body, { quietRateLimit: true } as AxiosRequestConfig).then(r => r.data),
  })
}

export function useRefreshStoreQuality(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<StoreQualityResponse>(`/v2/stores/${storeId}/quality-review/refresh`).then(r => r.data),
    onSuccess: d => qc.setQueryData(['seller', 'store-quality', storeId], d),
  })
}

export type { QualityRules }
