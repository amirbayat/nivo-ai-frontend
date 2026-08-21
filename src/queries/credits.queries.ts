import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import { track } from '@/lib/events'
import type { CreditsBalance, CreditPackage } from '@/types/api'
import type { PaymentGatewayName } from '@/queries/plans.queries'

// docs/PRD-discovery-and-credits.md بخش ۵.۲ — موجودی «نیوو» کاربر (نمایش برندشده‌ی همان Wallet)
export function useCreditsBalance(enabled = true) {
  return useQuery({
    queryKey: keys.credits.balance(),
    queryFn: () => api.get<CreditsBalance>('/v2/credits/balance').then(r => r.data),
    enabled,
  })
}

// بسته‌های خرید نیوو — تعریف‌شده از پنل ادمین (۳ بسته‌ی ثابت + یک کارت مبلغ دلخواه)
export function useCreditPackages() {
  return useQuery({
    queryKey: keys.credits.packages(),
    queryFn: () => api.get<CreditPackage[]>('/v2/credits/packages').then(r => r.data),
  })
}

// قیمت زنده‌ی کارت «مبلغ دلخواه» — debounce شده در PricingPage (خود این هوک debounce نمی‌کند،
// فقط enabled را وقتی مقدار معتبر است true نگه می‌دارد). فرمول واقعی (purchaseMarkup و ...) فقط
// سمت بک‌اند است — CreditsService.quoteCustomPrice — تا اینجا duplicate نشود
export function useCreditQuote(credits: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.credits.quote(credits),
    queryFn: () => api.get<{ priceToman: number }>('/v2/credits/quote', { params: { credits } }).then(r => r.data),
    enabled: enabled && credits > 0,
  })
}

// خرید یک بسته — دقیقاً هم‌الگوی useInitiateWalletTopup: سرور paymentUrl برمی‌گرداند،
// کاربر مستقیم به درگاه هدایت می‌شود (بازگشت از درگاه همان مسیر callback موجود کیف‌پول است)
export function usePurchaseCreditPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      packageId,
      customCredits,
      gateway,
    }: {
      packageId: string
      customCredits?: number
      gateway?: PaymentGatewayName
    }) =>
      api.post<{ paymentUrl: string }>('/v2/credits/purchase', {
        packageId,
        customCredits,
        gateway,
      }).then(r => r.data),
    onSuccess: (data, variables) => {
      track('credit_package_purchase_initiated', {
        packageId: variables.packageId,
        customCredits: variables.customCredits,
        gateway: variables.gateway,
      })
      // مقدار نیووی این خرید را قبل از رفتن به درگاه ذخیره می‌کنیم تا صفحه‌ی callback بعد از
      // برگشت بتواند دقیقاً بگوید «N نیوو اضافه شد» (همون الگوی nivo:signupBonusCredits در OtpPage)
      const packages = qc.getQueryData<CreditPackage[]>(keys.credits.packages())
      const purchasedCredits = variables.customCredits
        ?? packages?.find(p => p.id === variables.packageId)?.credits
      if (purchasedCredits) {
        sessionStorage.setItem('nivo:pendingPurchaseCredits', String(purchasedCredits))
      }
      window.location.href = data.paymentUrl
    },
  })
}
