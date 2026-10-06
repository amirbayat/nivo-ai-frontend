import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { SellerStore } from '@/types/api'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۵.۲ — پیدا یا کپی فروشگاه
// قالب همین دسته‌بندی برای کاربر تازه‌OTPشده (فروشنده یا خریدار دمو)
export function useEnsureDemoStore() {
  return useMutation({
    mutationFn: (category: string) =>
      api.post<{ storeId: string; slug: string }>('/v2/demo/stores/ensure', { category }).then(r => r.data),
  })
}

// بخش ۵.۳ — دکمه‌ی «این رو فروشگاه واقعی من کن» در تنظیمات فروشگاه؛ همان Store می‌ماند،
// فقط isDemo برداشته می‌شود
export function useConvertDemoStoreToReal(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<SellerStore>(`/v2/demo/stores/${storeId}/convert-to-real`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
  })
}
