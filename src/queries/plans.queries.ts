import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import { isInAndroidApp } from '@/lib/android-bridge'
import { track } from '@/lib/events'
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
  modelType: 'CHAT' | 'IMAGE_GEN' | 'VIDEO_GEN'
  tier: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  supportsVision: boolean
  supportsImageGen: boolean
  sortOrder: number
  // docs/PRD-openrouter-migration.md §۱۳.۴/۱۴.۴ — صفحه‌ی انتخاب مدل بازطراحی‌شده
  description: string | null
  badges: string[]
  inputPricePerM: number
  outputPricePerM: number
  // docs/PRD-video-studio-chat-flow.md — فقط برای ردیف‌های modelType==='VIDEO_GEN' پر است؛
  // برای فیلترکردن گزینه‌های ابعاد ویدیو بر اساس مدل انتخاب‌شده (اختیاری، PRD اجازه‌ی سه گزینه‌ی
  // ثابت را هم می‌دهد)
  videoGenSupportedDurationsSec: number[]
  videoGenSupportedSizes: string[]
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
    mutationFn: ({ planId, gateway, discountCode }: { planId: string; gateway?: PaymentGatewayName; discountCode?: string; isUpgrade?: boolean }) =>
      api.post<{ paymentUrl: string }>('/payments/initiate', {
        planId,
        gateway,
        discountCode,
        source: isInAndroidApp() ? 'app' : undefined,
      }).then(r => r.data),
    onSuccess: (data, variables) => {
      track('checkout_initiated', {
        planId: variables.planId,
        gateway: variables.gateway,
        isUpgrade: variables.isUpgrade ?? false,
      })
      // مقصد فعلی کاربر (مثلاً /image/xxx) قبل از redirect سخت به درگاه ذخیره می‌شود تا
      // CallbackPage.tsx بعد از پرداخت بتواند دقیقاً به همان‌جا برگرداند، نه یک مقصد هاردکد
      sessionStorage.setItem('nivo:pendingReturnPath', window.location.pathname)
      window.location.href = data.paymentUrl
    },
  })
}

export function useInitiateWalletTopup() {
  return useMutation({
    mutationFn: ({ amountToman, gateway }: { amountToman: number; gateway?: PaymentGatewayName }) =>
      api.post<{ paymentUrl: string }>('/payments/initiate-wallet-topup', {
        amountToman,
        gateway,
        source: isInAndroidApp() ? 'app' : undefined,
      }).then(r => r.data),
    onSuccess: (data, variables) => {
      track('wallet_topup_initiated', { amountToman: variables.amountToman, gateway: variables.gateway })
      sessionStorage.setItem('nivo:pendingReturnPath', window.location.pathname)
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
