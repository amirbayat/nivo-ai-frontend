import { useState } from 'react'
import { fa } from '@/locales/fa'
import {
  useAdPlacement,
  useProductAdPlacement,
  useProducts,
  usePurchaseAdPlacement,
  usePurchaseProductAdPlacement,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-advertising-placements.md — Boost فروشگاه در نتایج جستجوی نام تلگرام،
// خریداری‌شده مستقیم از همان اعتبار/کیف‌پول فروشگاهی (بدون درگاه پرداخت جدا)
export function SellerAdvertisingPage() {
  const { storeId } = useSellerStore()
  const status = useAdPlacement(storeId)
  const purchase = usePurchaseAdPlacement(storeId)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.advertising.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.advertising.subtitle}</p>

      <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <p className="text-sm font-semibold text-slate-200 light:text-slate-900">
          {status.data?.active
            ? fa.seller.panel.advertising.activeUntil(new Date(status.data.active.endsAt).toLocaleDateString('fa-IR'))
            : fa.seller.panel.advertising.noneActive}
        </p>
        {status.data?.active && (
          <p className="mt-1 text-xs text-slate-500">{fa.seller.panel.advertising.extendHint}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {status.data?.priceTiers.map(tier => (
          <button
            key={tier.durationDays}
            onClick={() => purchase.mutate(tier.durationDays)}
            disabled={purchase.isPending}
            className="flex items-center justify-between rounded-2xl border border-slate-700 light:border-slate-300 px-4 py-3.5 text-right disabled:opacity-40"
          >
            <span className="text-sm font-semibold text-slate-200 light:text-slate-900">
              {fa.seller.panel.advertising.durationLabel(tier.durationDays)}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{fa.seller.panel.advertising.priceLabel(tier.priceToman)}</span>
              <span className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 light:text-emerald-700">
                {purchase.isPending ? fa.seller.panel.advertising.buying : fa.seller.panel.advertising.buy}
              </span>
            </span>
          </button>
        ))}
      </div>

      {purchase.isError && (
        <p className="mt-4 text-xs text-red-400">{fa.seller.panel.advertising.purchaseError}</p>
      )}

      <ProductFeaturedPlacementSection storeId={storeId} />
    </div>
  )
}

// docs/PRD-product-display-focus-and-variations.md §۳ — جایگاه فاز ۲، مستقل از بخش
// سطح-فروشگاه بالا؛ فروشنده اول یک محصول انتخاب می‌کند، بعد وضعیت/خرید همان محصول را می‌بیند
function ProductFeaturedPlacementSection({ storeId }: { storeId: string }) {
  const products = useProducts(storeId)
  const [productId, setProductId] = useState('')
  const status = useProductAdPlacement(storeId, productId)
  const purchase = usePurchaseProductAdPlacement(storeId, productId)

  return (
    <div className="mt-10 border-t border-slate-700/60 light:border-slate-200 pt-6">
      <h2 className="mb-1.5 text-lg font-bold text-slate-100 light:text-slate-900">
        {fa.seller.panel.advertising.productSectionTitle}
      </h2>
      <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.advertising.productSectionSubtitle}</p>

      <select
        value={productId}
        onChange={e => setProductId(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2.5 text-sm text-slate-200 light:text-slate-900"
      >
        <option value="">{fa.seller.panel.advertising.productSelectPlaceholder}</option>
        {products.data?.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {productId && (
        <>
          <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-200 light:text-slate-900">
              {status.data?.active
                ? fa.seller.panel.advertising.activeUntil(new Date(status.data.active.endsAt).toLocaleDateString('fa-IR'))
                : fa.seller.panel.advertising.noneActive}
            </p>
            {status.data?.active && (
              <p className="mt-1 text-xs text-slate-500">{fa.seller.panel.advertising.extendHint}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {status.data?.priceTiers.map(tier => (
              <button
                key={tier.durationDays}
                onClick={() => purchase.mutate(tier.durationDays)}
                disabled={purchase.isPending}
                className="flex items-center justify-between rounded-2xl border border-slate-700 light:border-slate-300 px-4 py-3.5 text-right disabled:opacity-40"
              >
                <span className="text-sm font-semibold text-slate-200 light:text-slate-900">
                  {fa.seller.panel.advertising.durationLabel(tier.durationDays)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">{fa.seller.panel.advertising.priceLabel(tier.priceToman)}</span>
                  <span className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 light:text-emerald-700">
                    {purchase.isPending ? fa.seller.panel.advertising.buying : fa.seller.panel.advertising.buy}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {purchase.isError && (
            <p className="mt-4 text-xs text-red-400">{fa.seller.panel.advertising.purchaseError}</p>
          )}
        </>
      )}
    </div>
  )
}
