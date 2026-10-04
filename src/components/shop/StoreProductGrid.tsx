import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { productImageUrl } from './ShopUiBlocks'
import type { PublicProduct } from '@/types/api'

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — حالت «فروشگاه»، «فاز ۱»: فقط گرید ساده
// (عکس/نام/قیمت) + جست‌وجو، بدون درخت دسته‌بندی (آن بخشِ بزرگ‌تر مارکت‌پلیس بین‌فروشگاهی است)
interface StoreProductGridProps {
  slug: string
  disabled: boolean
  onAddToCart: (productId: string) => void
  onAskSeller: (product: PublicProduct) => void
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»
  savedProductIds: Set<string>
  onToggleSave: (productId: string) => void
  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
  onWriteReview: (product: PublicProduct) => void
}

export function StoreProductGrid({
  slug,
  disabled,
  onAddToCart,
  onAskSeller,
  savedProductIds,
  onToggleSave,
  onWriteReview,
}: StoreProductGridProps) {
  const { items, query, setQuery, loading, error, hasMore, loadMore } = useStoreProducts(slug, true)
  const [selected, setSelected] = useState<PublicProduct | null>(null)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur light:border-slate-200 light:bg-white/95">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fa.shop.storeModeSearchPlaceholder}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
        />
      </div>

      <div className="flex-1 p-3">
        {items.length === 0 && !loading ? (
          <p className="py-10 text-center text-sm text-slate-500">{fa.shop.storeModeEmpty}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="relative">
                <button
                  onClick={() => setSelected(p)}
                  className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/60 text-right light:border-slate-200 light:bg-white"
                >
                  {p.images[0] ? (
                    <img src={productImageUrl(p.id, p.images[0])} alt={p.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="aspect-square w-full bg-slate-800 light:bg-slate-100" />
                  )}
                  <div className="flex flex-col gap-0.5 p-2">
                    <span className="truncate text-xs font-medium text-slate-200 light:text-slate-900">{p.name}</span>
                    <span className="text-[11px] text-slate-400 light:text-slate-600">
                      {p.basePrice.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </button>
                {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد» */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSave(p.id)
                  }}
                  title={savedProductIds.has(p.id) ? fa.shop.removeFromSaved : fa.shop.saveForLater}
                  className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/40 text-white"
                >
                  <svg viewBox="0 0 20 20" fill={savedProductIds.has(p.id) ? 'currentColor' : 'none'} className={`size-3.5 ${savedProductIds.has(p.id) ? 'text-emerald-400' : ''}`}>
                    <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-red-400">{error}</p>}
        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="mx-auto mt-4 block rounded-lg px-4 py-2 text-xs font-medium text-emerald-400"
          >
            {fa.shop.storeModeLoadMore}
          </button>
        )}
        {loading && <p className="py-4 text-center text-xs text-slate-500">{fa.common.loading}</p>}
      </div>

      {selected && (
        <ProductDetailSheet
          product={selected}
          disabled={disabled}
          onClose={() => setSelected(null)}
          onAddToCart={(id) => {
            onAddToCart(id)
            setSelected(null)
          }}
          onAskSeller={(p) => {
            onAskSeller(p)
            setSelected(null)
          }}
          saved={savedProductIds.has(selected.id)}
          onToggleSave={() => onToggleSave(selected.id)}
          onWriteReview={() => onWriteReview(selected)}
        />
      )}
    </div>
  )
}

// بخش ۳.۵ — «شیت پایین‌صفحه‌ی سبک»: گالری (فعلاً تک‌عکس اول، مثل گرید)، قیمت، توضیح کوتاه.
// بدون چیپ‌های واریانت — مدل محصول فعلی هنوز واریانت ندارد (بخش ۲.۳ همین سند، فاز جدا/آینده)
function ProductDetailSheet({
  product,
  disabled,
  onClose,
  onAddToCart,
  onAskSeller,
  saved,
  onToggleSave,
  onWriteReview,
}: {
  product: PublicProduct
  disabled: boolean
  onClose: () => void
  onAddToCart: (id: string) => void
  onAskSeller: (product: PublicProduct) => void
  saved: boolean
  onToggleSave: () => void
  onWriteReview: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-4 light:bg-white"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 light:bg-slate-300" />
        {product.images[0] && (
          <img
            src={productImageUrl(product.id, product.images[0])}
            alt={product.name}
            className="mb-3 aspect-square w-full rounded-xl object-cover"
          />
        )}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100 light:text-slate-900">{product.name}</h3>
          <button
            onClick={onToggleSave}
            title={saved ? fa.shop.removeFromSaved : fa.shop.saveForLater}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" fill={saved ? 'currentColor' : 'none'} className={`size-4.5 ${saved ? 'text-emerald-400' : ''}`}>
              <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mb-2 text-sm font-bold text-emerald-400">{product.basePrice.toLocaleString('fa-IR')} تومان</p>
        {product.description && (
          <p className="mb-3 text-sm text-slate-400 light:text-slate-600">{product.description}</p>
        )}
        <p className="mb-4 text-xs text-slate-500">{product.stock > 0 ? fa.shop.inStock : fa.shop.outOfStock}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onAddToCart(product.id)}
            disabled={disabled || product.stock === 0}
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {fa.shop.addToCart}
          </button>
          <button
            onClick={() => onAskSeller(product)}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 light:border-slate-300 light:text-slate-800"
          >
            {fa.shop.storeModeAskSeller}
          </button>
        </div>
        <button
          onClick={onWriteReview}
          className="mt-2 w-full py-2 text-xs font-medium text-emerald-400 hover:underline"
        >
          {fa.shop.writeReviewButton}
        </button>
      </div>
    </div>
  )
}
