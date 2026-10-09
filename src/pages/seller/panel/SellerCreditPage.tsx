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
  const packages = useStoreCreditPackages(storeId)
  const purchase = usePurchaseStoreCredit(storeId)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  function buy(packageId: string) {
    setPurchasingId(packageId)
    purchase.mutate(packageId, {
      onSuccess: ({ paymentUrl }) => {
        // فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — بدون این خط، CallbackPage.tsx بعد از پرداخت فروشنده را
        // به فال‌بک `/chat` می‌فرستاد (همان الگوی موجود در plans.queries.ts برای خریدار)
        sessionStorage.setItem('nivo:pendingReturnPath', window.location.pathname)
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
      </div>

      {/* docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۶ — فقط وقتی واقعاً فعال است نمایش داده شود */}
      {!!credit.data?.trialCreditRemainingToman && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold text-emerald-300 light:text-emerald-700">{fa.seller.panel.credit.trialTitle}</p>
          <p className="mt-1 text-xl font-bold text-emerald-400 light:text-emerald-600">
            {fa.seller.panel.home.creditBalanceToman(credit.data.trialCreditRemainingToman)}
          </p>
          {credit.data.trialEndsAt && (
            <p className="mt-1 text-xs text-emerald-400/80 light:text-emerald-700/80">
              {fa.seller.panel.credit.trialEndsAt(new Date(credit.data.trialEndsAt).toLocaleDateString('fa-IR'))}
            </p>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold text-slate-200 light:text-slate-900">{fa.seller.panel.credit.packagesTitle}</h2>

      {purchase.isError && <p className="mb-4 text-xs text-red-400">{fa.seller.panel.credit.purchaseError}</p>}

      {packages.data?.length === 0 && (
        <p className="text-sm text-slate-500">{fa.seller.panel.credit.packagesEmpty}</p>
      )}

      <div className="flex flex-col gap-4">
        {packages.data?.map(pkg => {
          const highlighted = pkg.isPopular || pkg.isBestValue
          return (
            <div
              key={pkg.id}
              className={`relative overflow-hidden rounded-2xl border px-5 py-5 transition-colors ${
                highlighted
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-transparent light:from-emerald-50'
                  : 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white'
              }`}
            >
              {highlighted && (
                <span className="absolute left-0 top-0 rounded-bl-xl bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white">
                  {pkg.isBestValue ? fa.seller.panel.credit.bestValueBadge : fa.seller.panel.credit.popularBadge}
                </span>
              )}

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-extrabold text-slate-100 light:text-slate-900">
                    {fa.seller.panel.home.creditBalanceToman(pkg.creditToman)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-slate-500">{fa.seller.panel.credit.priceLabel(pkg.priceToman)}</p>
                    {pkg.discountPercent > 0 && (
                      <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400 light:text-amber-700">
                        {fa.seller.panel.credit.discountBadge(pkg.discountPercent)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {pkg.estimatedChats !== undefined && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-400 light:text-emerald-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a9.06 9.06 0 01-2.219-.272c-.499.498-1.414 1.052-2.608 1.247a.5.5 0 01-.482-.788A4.7 4.7 0 005.5 15.272C3.357 13.927 2 12.082 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                  </svg>
                  {fa.seller.panel.credit.estimatedChats(pkg.estimatedChats)}
                </p>
              )}

              <button
                onClick={() => buy(pkg.id)}
                disabled={purchase.isPending}
                className="mt-4 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 active:scale-[0.99] transition-all disabled:opacity-40"
              >
                {purchase.isPending && purchasingId === pkg.id ? fa.seller.panel.credit.redirecting : fa.seller.panel.credit.buy}
              </button>
            </div>
          )
        })}
      </div>

      {packages.data?.some(p => p.estimatedChats !== undefined) && (
        <p className="mt-3 text-[11px] text-slate-500">{fa.seller.panel.credit.estimatedChatsFootnote}</p>
      )}
    </div>
  )
}
