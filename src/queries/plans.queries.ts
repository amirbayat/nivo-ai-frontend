import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { Plan } from '@/types/api'

export function usePlans() {
  return useQuery({
    queryKey: keys.plans.list(),
    queryFn: () => api.get<Plan[]>('/plans').then(r => r.data),
    staleTime: 10 * 60_000,
  })
}

export interface ModelCatalogEntry {
  name: string
  displayName: string
  provider: string
  tier: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  supportsVision: boolean
  sortOrder: number
}

export function useModelCatalog() {
  return useQuery({
    queryKey: keys.plans.modelCatalog(),
    queryFn: () => api.get<ModelCatalogEntry[]>('/plans/model-catalog').then(r => r.data),
    staleTime: 10 * 60_000,
  })
}

export type PaymentGatewayName = 'zarinpal' | 'vandar' | 'zibal'

export function useEnabledGateways() {
  return useQuery({
    queryKey: keys.pay.gateways(),
    queryFn: () =>
      api.get<{ gateways: PaymentGatewayName[] }>('/payments/gateways').then(r => r.data.gateways),
    staleTime: 10 * 60_000,
  })
}

export function useValidateDiscountCode() {
  return useMutation({
    mutationFn: (code: string) =>
      api.get<{ discountPercent: number }>('/payments/validate-discount', { params: { code } }).then(r => r.data),
  })
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: ({ planId, gateway, discountCode }: { planId: string; gateway?: PaymentGatewayName; discountCode?: string }) =>
      api.post<{ paymentUrl: string }>('/payments/initiate', { planId, gateway, discountCode }).then(r => r.data),
    onSuccess: data => {
      window.location.href = data.paymentUrl
    },
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: keys.sub.current(),
    queryFn: () => api.get('/subscriptions/me').then(r => r.data),
    retry: false,
  })
}
