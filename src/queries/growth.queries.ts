import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { ClaimGiftResult, MyDiscountCode, OnboardingGiftStatus } from '@/types/api'

export function useGiftStatus() {
  return useQuery({
    queryKey: keys.growth.giftStatus(),
    queryFn: () => api.get<OnboardingGiftStatus>('/growth/onboarding-gift/status').then(r => r.data),
    enabled: !!localStorage.getItem('access_token'),
    staleTime: 5 * 60_000,
  })
}

export function useClaimGift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<ClaimGiftResult>('/growth/onboarding-gift/claim').then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.growth.giftStatus() }),
  })
}

export function useMyDiscountCodes() {
  return useQuery({
    queryKey: keys.growth.myDiscountCodes(),
    queryFn: () => api.get<MyDiscountCode[]>('/growth/my-discount-codes').then(r => r.data),
    enabled: !!localStorage.getItem('access_token'),
    staleTime: 60_000,
  })
}
