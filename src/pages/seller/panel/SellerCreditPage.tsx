import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useStoreCredit, useStoreCreditPackages, usePurchaseStoreCredit } from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-credit-billing.md بخش ۴/۷ — نمایش موجودی + خرید self-serve از همان درگاه
// پرداخت واقعی موجود؛ بعد از انتخاب بسته مستقیم به paymentUrl ریدایرکت می‌شود (همون الگوی
// خرید نیوو در فرانت اصلی nivo-ai-frontend)
export function SellerCreditPage() {
  const { storeId } = useSellerStore()
  const credit = useStoreCredit(storeId)
  const packages = useStoreCreditPackages()
  const purchase = usePurchaseStoreCredit(storeId)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  function buy(packageId: string) {
    setPurchasingId(packageId)
    purchase.mutate(packageId, {
      onSuccess: ({ paymentUrl }) => {
        window.location.href = paymentUrl
      },
      onError: () => setPurchasingId(null),
    })
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.credit.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.credit.subtitle}</p>

      <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        <p className="text-xs text-slate-500">{fa.seller.panel.credit.currentBalance}</p>
        <p className="mt-1 text-2xl font-bold text-emerald-400 light:text-emerald-600">
          {fa.seller.panel.home.creditBalanceToman(credit.data?.balanceToman ?? 0)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {fa.seller.panel.credit.freeQuotaToday(credit.data?.freeQuotaUsedToday ?? 0, credit.data?.freeQuotaLimit ?? 10)}
        </p>
      </div>

      <h2 className="mb-3 text-sm font-bold text-slate-200 light:text-slate-900">{fa.seller.panel.credit.packagesTitle}</h2>

      {purchase.isError && <p className="mb-4 text-xs text-red-400">{fa.seller.panel.credit.purchaseError}</p>}

      {packages.data?.length === 0 && (
        <p className="text-sm text-slate-500">{fa.seller.panel.credit.packagesEmpty}</p>
      )}

      <div className="flex flex-col gap-3">
        {packages.data?.map(pkg => (
          <div
            key={pkg.id}
            className="flex items-center justify-between rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4"
          >
            <div>
              <p className="text-base font-bold text-slate-100 light:text-slate-900">
                {fa.seller.panel.home.creditBalanceToman(pkg.creditToman)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {fa.seller.panel.credit.priceLabel(pkg.priceToman)}
              </p>
              {pkg.discountPercent > 0 && (
                <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400 light:text-amber-700">
                  {fa.seller.panel.credit.discountBadge(pkg.discountPercent)}
                </span>
              )}
            </div>
            <button
              onClick={() => buy(pkg.id)}
              disabled={purchase.isPending}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {purchase.isPending && purchasingId === pkg.id ? fa.seller.panel.credit.redirecting : fa.seller.panel.credit.buy}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
