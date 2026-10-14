import { useEffect, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { productImageUrl, productVideoUrl, reviewMediaUrl } from './ShopUiBlocks'
import { toEnglishDigits } from '@/lib/digits'
import { GoldPriceTicker } from './GoldPriceTicker'
import type { PublicProduct, PublicProductVariant, ProductReview } from '@/types/api'

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — حالت «فروشگاه»، «فاز ۱»: فقط گرید ساده
// (عکس/نام/قیمت) + جست‌وجو، بدون درخت دسته‌بندی (آن بخشِ بزرگ‌تر مارکت‌پلیس بین‌فروشگاهی است)
interface StoreProductGridProps {
  slug: string
  disabled: boolean
  onAddToCart: (productId: string, variantId?: string) => void
  onAskSeller: (product: PublicProduct) => void
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»
  savedProductIds: Set<string>
  savedItems: PublicProduct[]
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
  savedItems,
  onToggleSave,
  onWriteReview,
}: StoreProductGridProps) {
  const { items, query, setQuery, loading, error, hasMore, loadMore, shippingEstimate } = useStoreProducts(slug, true)
  const [catalogTab, setCatalogTab] = useState<'all' | 'saved'>('all')
  const [selected, setSelected] = useState<PublicProduct | null>(null)
  const needle = query.trim().toLowerCase()
  const visible =
    catalogTab === 'saved'
      ? savedItems.filter((product) => !needle || product.name.toLowerCase().includes(needle))
      : items
  const [reviewsProduct, setReviewsProduct] = useState<PublicProduct | null>(null)
  const hasGoldProducts = items.some((p) => p.isWeightBasedPricing)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {hasGoldProducts && <GoldPriceTicker />}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur light:border-slate-200 light:bg-white/95">
        <input
          value={query}
          onChange={(e) => setQuery(toEnglishDigits(e.target.value))}
          placeholder={fa.shop.storeModeSearchPlaceholder}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setCatalogTab('all')}
            className={`rounded-full px-3 py-1 text-xs ${catalogTab === 'all' ? 'bg-emerald-500 text-white' : 'text-slate-300 light:text-slate-700'}`}
          >
            {fa.shop.savedTabAll}
          </button>
          <button
            type="button"
            onClick={() => setCatalogTab('saved')}
            className={`rounded-full px-3 py-1 text-xs ${catalogTab === 'saved' ? 'bg-emerald-500 text-white' : 'text-slate-300 light:text-slate-700'}`}
          >
            {fa.shop.savedTab}
          </button>
        </div>
      </div>

      <div className="flex-1 p-3">
        {visible.length === 0 && (catalogTab === 'saved' || !loading) ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {catalogTab === 'saved' ? fa.shop.savedEmpty : fa.shop.storeModeEmpty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((p) => (
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
                    {p.priceUnavailable ? (
                      <span className="text-[11px] text-slate-500">{fa.shop.goldPriceUnavailable}</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 light:text-slate-600">
                        {p.basePrice.toLocaleString('fa-IR')} تومان
                      </span>
                    )}
                    {p.isWeightBasedPricing && (
                      <span className="text-[10px] text-amber-400">{fa.shop.weightBasedPriceBadge}</span>
                    )}
                    <RatingLine avg={p.ratingAvg ?? null} count={p.reviewCount ?? 0} />
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
        {catalogTab === 'all' && hasMore && !loading && (
          <button
            onClick={loadMore}
            className="mx-auto mt-4 block rounded-lg px-4 py-2 text-xs font-medium text-emerald-400"
          >
            {fa.shop.storeModeLoadMore}
          </button>
        )}
        {catalogTab === 'all' && loading && <p className="py-4 text-center text-xs text-slate-500">{fa.common.loading}</p>}
      </div>

      {selected && (
        <ProductDetailSheet
          product={selected}
          disabled={disabled}
          onClose={() => setSelected(null)}
          slug={slug}
          shippingEstimate={shippingEstimate ?? null}
          onAddToCart={(id, variantId) => {
            onAddToCart(id, variantId)
            setSelected(null)
          }}
          onAskSeller={(p) => {
            onAskSeller(p)
            setSelected(null)
          }}
          saved={savedProductIds.has(selected.id)}
          onToggleSave={() => onToggleSave(selected.id)}
          onWriteReview={() => onWriteReview(selected)}
          onViewReviews={() => setReviewsProduct(selected)}
        />
      )}

      {reviewsProduct && <ReviewsModal slug={slug} product={reviewsProduct} onClose={() => setReviewsProduct(null)} />}
    </div>
  )
}

function RatingLine({ avg, count }: { avg: number | null; count: number }) {
  if (count <= 0) return null
  const filled = avg == null ? 0 : Math.max(0, Math.min(5, Math.round(avg)))
  return (
    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-400">
      {avg != null && (
        <span dir="ltr" aria-hidden>
          {'★'.repeat(filled)}
          {'☆'.repeat(5 - filled)}
        </span>
      )}
      <span className="text-slate-400 light:text-slate-500">{fa.shop.reviewCount(count)}</span>
    </span>
  )
}

function optionValueAvailable(
  variants: PublicProductVariant[],
  optionName: string,
  value: string,
  selected: Record<string, string>,
) {
  return variants.some((variant) => {
    if (variant.stock <= 0) return false
    if (variant.options[optionName] !== value) return false
    return Object.entries(selected).every(
      ([key, chosen]) => key === optionName || variant.options[key] === chosen,
    )
  })
}

function matchingVariant(product: PublicProduct, selected: Record<string, string>) {
  const options = product.options ?? []
  if (options.length === 0 || options.some((option) => !selected[option.name])) return null
  return (
    (product.variants ?? []).find((variant) =>
      options.every((option) => variant.options[option.name] === selected[option.name]),
    ) ?? null
  )
}

function ProductDetailSheet({
  product,
  slug,
  shippingEstimate,
  disabled,
  onClose,
  onAddToCart,
  onAskSeller,
  saved,
  onToggleSave,
  onWriteReview,
  onViewReviews,
}: {
  product: PublicProduct
  slug: string
  shippingEstimate: { minCostToman: number; maxCostToman: number } | null
  disabled: boolean
  onClose: () => void
  onAddToCart: (id: string, variantId?: string) => void
  onAskSeller: (product: PublicProduct) => void
  saved: boolean
  onToggleSave: () => void
  onWriteReview: () => void
  onViewReviews: () => void
}) {
  const options = product.options ?? []
  const variants = product.variants ?? []
  const media = [
    ...product.images.map((key) => ({ type: 'image' as const, src: productImageUrl(product.id, key) })),
    ...product.videos.map((video) => ({ type: 'video' as const, src: productVideoUrl(product.id, video.key) })),
  ]
  const [mediaIndex, setMediaIndex] = useState(0)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const picked = matchingVariant(product, selected)
  const shownPrice = picked?.price ?? product.basePrice
  const canAdd =
    options.length === 0 ? product.stock > 0 : picked != null && picked.stock > 0
  const shippingText =
    shippingEstimate == null
      ? null
      : shippingEstimate.minCostToman === shippingEstimate.maxCostToman
        ? fa.shop.shippingEstimateFlat(shippingEstimate.minCostToman)
        : fa.shop.shippingEstimateRange(shippingEstimate.minCostToman, shippingEstimate.maxCostToman)

  useEffect(() => {
    setMediaIndex(0)
    setSelected({})
    setCopied(false)
  }, [product.id])

  function choose(optionName: string, value: string) {
    setSelected((current) => {
      const next = { ...current, [optionName]: value }
      for (const option of options) {
        if (option.name === optionName) continue
        const chosen = next[option.name]
        if (chosen && !optionValueAvailable(variants, option.name, chosen, next)) {
          delete next[option.name]
        }
      }
      return next
    })
  }

  async function share() {
    const url = `${window.location.origin}/shop/${slug}?product=${product.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const frame = media[mediaIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-4 light:bg-white"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700 light:bg-slate-300" />
        {frame && (
          <div className="relative mb-3">
            {frame.type === 'video' ? (
              <video controls preload="metadata" src={frame.src} className="aspect-square w-full rounded-xl bg-black object-contain" />
            ) : (
              <img src={frame.src} alt={product.name} className="aspect-square w-full rounded-xl object-cover" />
            )}
            {media.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={fa.shop.carouselPrev}
                  onClick={() => setMediaIndex((index) => Math.max(0, index - 1))}
                  disabled={mediaIndex === 0}
                  className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={fa.shop.carouselNext}
                  onClick={() => setMediaIndex((index) => Math.min(media.length - 1, index + 1))}
                  disabled={mediaIndex === media.length - 1}
                  className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100 light:text-slate-900">{product.name}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void share()}
              className="rounded-full px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60 light:text-slate-600 light:hover:bg-slate-100"
            >
              {copied ? fa.shop.linkCopied : fa.shop.shareProduct}
            </button>
            <button
              type="button"
              onClick={onToggleSave}
              title={saved ? fa.shop.removeFromSaved : fa.shop.saveForLater}
              className="flex size-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
            >
              <svg viewBox="0 0 20 20" fill={saved ? 'currentColor' : 'none'} className={`size-4.5 ${saved ? 'text-emerald-400' : ''}`}>
                <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <RatingLine avg={product.ratingAvg ?? null} count={product.reviewCount ?? 0} />
        {product.priceUnavailable ? (
          <p className="mb-2 text-sm text-slate-500">{fa.shop.goldPriceUnavailable}</p>
        ) : (
          <p className="mb-0.5 text-sm font-bold text-emerald-400">{shownPrice.toLocaleString('fa-IR')} تومان</p>
        )}
        {product.isWeightBasedPricing && product.weightGrams != null && product.purityKarat != null && (
          <p className={product.goldPricingSummary ? 'mb-0.5 text-[11px] text-amber-400' : 'mb-2 text-[11px] text-amber-400'}>
            {fa.shop.weightBasedPriceBadge} — {fa.shop.weightBasedPriceDetail(product.weightGrams, product.purityKarat)}
          </p>
        )}
        {product.isWeightBasedPricing && product.goldPricingSummary && (
          <p className="mb-2 text-[11px] text-amber-400/80">{product.goldPricingSummary}</p>
        )}
        {options.map((option) => (
          <div key={option.name} className="mb-3">
            <p className="mb-1 text-xs text-slate-400 light:text-slate-600">{option.name}</p>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const available = optionValueAvailable(variants, option.name, value, selected)
                const active = selected[option.name] === value
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!available}
                    onClick={() => choose(option.name, value)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      active
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 text-slate-200 light:border-slate-300 light:text-slate-800'
                    } disabled:line-through disabled:opacity-40`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {product.description && (
          <p className="mb-3 text-sm text-slate-400 light:text-slate-600">{product.description}</p>
        )}
        <p className="text-xs text-slate-500">{canAdd ? fa.shop.inStock : fa.shop.outOfStock}</p>
        {shippingText && <p className="mb-4 text-xs text-slate-500">{shippingText}</p>}
        {!shippingText && <div className="mb-4" />}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAddToCart(product.id, picked?.id)}
            disabled={disabled || !canAdd}
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {fa.shop.addToCart}
          </button>
          <button
            type="button"
            onClick={() => onAskSeller(product)}
            className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 light:border-slate-300 light:text-slate-800"
          >
            {fa.shop.storeModeAskSeller}
          </button>
        </div>
        <button
          type="button"
          onClick={onWriteReview}
          className="mt-2 w-full py-2 text-xs font-medium text-emerald-400 hover:underline"
        >
          {fa.shop.writeReviewButton}
        </button>
        <button
          type="button"
          onClick={onViewReviews}
          className="w-full py-1 text-xs font-medium text-slate-400 light:text-slate-600 hover:underline"
        >
          {fa.shop.viewReviewsButton}
        </button>
      </div>
    </div>
  )
}

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۴.۲ — «مشاهده نظرات
// خریداران قبلی»؛ عیناً الگوی fetch ساده‌ی useStoreProducts بالا (بدون session-token، چون این
// endpoint هم عمومی است)
function ReviewsModal({ slug, product, onClose }: { slug: string; product: PublicProduct; onClose: () => void }) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${env.VITE_API_URL}/v2/stores/${slug}/products/${product.id}/reviews`)
      .then((res) => {
        if (!res.ok) throw new Error('request failed')
        return res.json() as Promise<ProductReview[]>
      })
      .then((data) => {
        if (!cancelled) setReviews(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug, product.id])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.reviewsModalTitle}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
            {fa.common.close}
          </button>
        </div>

        {error && <p className="py-6 text-center text-sm text-red-400">{fa.shop.reviewsLoadError}</p>}
        {!error && reviews?.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">{fa.shop.reviewsEmpty}</p>
        )}
        {!error && reviews === null && <p className="py-6 text-center text-xs text-slate-500">{fa.common.loading}</p>}

        <div className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-700/60 light:border-slate-200 p-3">
              {r.rating != null && (
                <div dir="ltr" className="mb-1 flex justify-end gap-0.5 text-sm">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n}>{n <= r.rating! ? '⭐' : '☆'}</span>
                  ))}
                </div>
              )}
              <p dir="auto" className="text-sm text-slate-300 light:text-slate-700">
                {r.text}
              </p>
              {r.imageKey && (
                <img src={reviewMediaUrl(r.id, r.imageKey)} alt="" className="mt-2 max-h-48 rounded-xl object-cover" />
              )}
              {r.videoKey && (
                <video src={reviewMediaUrl(r.id, r.videoKey)} controls className="mt-2 max-h-48 w-full rounded-xl" />
              )}
              {r.audioKey && <audio src={reviewMediaUrl(r.id, r.audioKey)} controls className="mt-2 w-full" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
