import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// PQ-2/PQ-3 — کارت بررسی کیفیت توضیح محصول
export type QualityLevel = 'weak' | 'ok' | 'good' | 'great'
export interface QualitySuggestion {
  key: string
  title: string
  why: string
  askPrompt: string
  exampleText: string
  // SQ — فیلد مقصد ساخت‌یافته (دکمه‌ی «تنظیم») و پیشنهاد برداشته‌شده از یادداشت
  target?: string
  fromNotes?: boolean
}
export interface QualityReview {
  score: number
  level: QualityLevel
  summary: string | null
  items: { key: string; status: 'ok' | 'missing' | 'weak'; note: string | null }[]
  suggestions: QualitySuggestion[]
  buyerQuestionsUnanswered: string[]
}
export interface QualityRules {
  items: { key: string; label: string; status: 'ok' | 'unknown' }[]
}
export interface QualityReviewResponse {
  status: 'pending' | 'ready' | 'rules_only'
  review: QualityReview | null
  rules: QualityRules
}
export interface QualityApplyPreview {
  description: string
  specs: { label: string; value: string }[]
}

const POLL_MS = 3000
const POLL_MAX_MS = 30_000

// polling هر ۳ ثانیه تا ۳۰ ثانیه بعد از ذخیره (وقتی status هنوز pending است)
export function useProductQualityReview(storeId: string, productId: string | null, pollSince: number | null) {
  return useQuery({
    queryKey: ['seller', 'product-quality', storeId, productId] as const,
    queryFn: () => api.get<QualityReviewResponse>(`/v2/stores/${storeId}/products/${productId}/quality-review`).then(r => r.data),
    enabled: !!storeId && !!productId,
    refetchInterval: q =>
      pollSince && q.state.data?.status === 'pending' && Date.now() - pollSince < POLL_MAX_MS ? POLL_MS : false,
  })
}

export function useRefreshProductQuality(storeId: string, productId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<QualityReviewResponse>(`/v2/stores/${storeId}/products/${productId}/quality-review/refresh`).then(r => r.data),
    onSuccess: data => qc.setQueryData(['seller', 'product-quality', storeId, productId], data),
  })
}

export function useApplyProductQuality(storeId: string, productId: string | null) {
  return useMutation({
    mutationFn: (body: { key: string; answer: string }) =>
      api.post<QualityApplyPreview>(`/v2/stores/${storeId}/products/${productId}/quality-apply`, body).then(r => r.data),
  })
}
