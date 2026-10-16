import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { toEnglishDigits } from '@/lib/digits'
import { GoldPriceTicker } from '@/components/shop/GoldPriceTicker'
import { productImageUrl } from '@/components/shop/ShopUiBlocks'
import type { ProductSort, useStoreProducts } from '@/hooks/useStoreProducts'
import type { PublicProduct, PublicStoreAbout } from '@/types/api'

type Catalog = ReturnType<typeof useStoreProducts>

interface ShopProductsViewProps {
  catalog: Catalog
  // B4 — چیپ‌های «n سفارش موفق» و «مرجوعی»؛ تا نرسیده فقط چیپ‌های بدون وابستگی دیده می‌شوند
  about: PublicStoreAbout | null
  savedProductIds: Set<string>
  savedItems: PublicProduct[]
  onToggleSave: (productId: string) => void
  onOpenProduct: (product: PublicProduct) => void
  // «از فروشنده بپرس» در جست‌وجوی بی‌نتیجه؛ q همان متن جست‌وجوست
  onAskSeller: (query: string) => void
}

const chipBase = 'min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm'

function ProductCard({
  product,
  saved,
  onOpen,
  onToggleSave,
}: {
  product: PublicProduct
  saved: boolean
  onOpen: () => void
  onToggleSave: () => void
}) {
  const soldOut = product.stock <= 0
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--shop-border)] bg-[var(--shop-surface)] text-start"
      >
        <div className="relative aspect-[4/5] w-full bg-[var(--shop-surface-2)]">
          {product.images[0] ? (
            <img
              src={productImageUrl(product.id, product.images[0])}
              alt={product.name}
              width={400}
              height={500}
              loading="lazy"
              className={`size-full object-cover ${soldOut ? 'opacity-40' : ''}`}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-bold text-[var(--shop-text-2)]">{product.name.trim().charAt(0)}</div>
          )}
          {soldOut && (
            <span className="absolute bottom-2 start-2 rounded-full bg-[var(--shop-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--shop-text)]">
              {fa.shop.v2.soldOut}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 p-2.5">
          <span className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[var(--shop-text)]">{product.name}</span>
          {product.priceUnavailable ? (
            <span className="text-sm text-[var(--shop-text-2)]">{fa.shop.v2.priceSoon}</span>
          ) : (
            <span className="text-base font-bold text-[var(--shop-text)]">
              {product.basePrice.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[var(--shop-text-2)]">تومان</span>
            </span>
          )}
          {product.isWeightBasedPricing && <span className="text-xs text-[var(--shop-warning)]">{fa.shop.v2.priceLive}</span>}
          {(product.reviewCount ?? 0) > 0 && (
            <span className="text-xs text-[var(--shop-text-2)]">
              <span className="text-[var(--shop-warning)]" aria-hidden>
                ★
              </span>{' '}
              {(product.ratingAvg ?? 0).toLocaleString('fa-IR')} ({(product.reviewCount ?? 0).toLocaleString('fa-IR')})
            </span>
          )}
        </div>
      </button>
      {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»؛ هدف لمسی ۴۴px */}
      <button
        type="button"
        onClick={onToggleSave}
        aria-label={saved ? fa.shop.removeFromSaved : fa.shop.saveForLater}
        aria-pressed={saved}
        className="absolute end-0 top-0 flex size-11 items-center justify-center"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-black/45 text-white">
          <svg viewBox="0 0 20 20" fill={saved ? 'currentColor' : 'none'} className={`size-4 ${saved ? 'text-emerald-400' : ''}`} aria-hidden>
            <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  )
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse motion-reduce:animate-none overflow-hidden rounded-2xl border border-[var(--shop-border)]">
          <div className="aspect-[4/5] bg-[var(--shop-surface-2)]" />
          <div className="space-y-2 p-2.5">
            <div className="h-4 rounded bg-[var(--shop-surface-2)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--shop-surface-2)]" />
          </div>
        </div>
      ))}
    </>
  )
}

// docs/PRD-buyer-chat-redesign.md §6.2 — نمای محصولات: خوش‌آمد، چیپ‌های اعتماد، نرخ طلا، جست‌وجو (چسبان)،
// مرتب‌سازی، ذخیره‌شده‌ها، گرید دوستونه و اسکرول بی‌نهایت. هر محصول همان ProductSheet را باز می‌کند
export function ShopProductsView({ catalog, about, savedProductIds, savedItems, onToggleSave, onOpenProduct, onAskSeller }: ShopProductsViewProps) {
  const { items, query, setQuery, sort, setSort, loading, loaded, error, hasMore, loadMore, popularSortAvailable, catalogTotal, shippingDaysText } = catalog
  const [savedOnly, setSavedOnly] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore

  // اگر آخرین ذخیره‌شده برداشته شد، فیلتر خالی نماند
  useEffect(() => {
    if (savedProductIds.size === 0) setSavedOnly(false)
  }, [savedProductIds.size])

  // اسکرول بی‌نهایت: نزدیک ۸۰٪ اسکرول صفحه‌ی بعد را می‌گیرد (IntersectionObserver با حاشیه‌ی ۲۰٪ پایین)
  // بعد از خطا اسکرول بی‌نهایت متوقف می‌شود؛ فقط دکمه‌ی «دوباره» (یک‌بار به‌ازای هر لمس) ادامه می‌دهد
  const canLoadMore = !savedOnly && hasMore && !loading && !error
  useEffect(() => {
    const target = sentinelRef.current
    const root = scrollRef.current
    if (!target || !root || !canLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current()
      },
      { root, rootMargin: '0px 0px 20% 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [canLoadMore, items.length])

  const needle = query.trim().toLowerCase()
  const visible = savedOnly ? savedItems.filter((p) => !needle || p.name.toLowerCase().includes(needle)) : items
  const hasGold = items.some((p) => p.isWeightBasedPricing)
  const showSkeleton = !savedOnly && loading && items.length === 0
  const noResult = !showSkeleton && visible.length === 0 && (savedOnly || loaded)

  const sortChip = (value: ProductSort, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setSort(value)}
      aria-pressed={sort === value}
      className={`${chipBase} ${sort === value ? 'bg-[var(--shop-accent-fill)] font-bold text-[var(--shop-accent-text)]' : 'border border-[var(--shop-border)] text-[var(--shop-text)]'}`}
    >
      {label}
    </button>
  )

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <p className="px-4 pt-3 text-[15px] text-[var(--shop-text)]">{fa.shop.v2.welcomeStrip}</p>

      <div className="flex gap-2 overflow-x-auto px-4 py-2 text-xs text-[var(--shop-text-2)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shippingDaysText && <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--shop-surface-2)] px-3 py-1.5">{fa.shop.v2.trustShipping(shippingDaysText)}</span>}
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--shop-surface-2)] px-3 py-1.5">{fa.shop.v2.trustDirectPay}</span>
        {about?.successfulOrders != null && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--shop-surface-2)] px-3 py-1.5">{fa.shop.v2.trustOrders(about.successfulOrders)}</span>
        )}
        {about?.returnPolicyText && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--shop-surface-2)] px-3 py-1.5">{fa.shop.v2.trustReturn}</span>
        )}
      </div>

      {hasGold && <GoldPriceTicker />}

      <div className="sticky top-0 z-10 border-b border-[var(--shop-border)] bg-[var(--shop-bg)] px-4 pb-2 pt-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(toEnglishDigits(e.target.value))}
          placeholder={fa.shop.v2.searchIn(catalogTotal ?? catalog.total)}
          aria-label={fa.shop.v2.searchIn(catalogTotal ?? catalog.total)}
          enterKeyHint="search"
          className="min-h-11 w-full rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3.5 text-[15px] text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] focus:outline-none"
        />
        <div className="mt-2 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={fa.shop.v2.sortLabel}>
          {sortChip('newest', fa.shop.v2.sortNewest)}
          {popularSortAvailable && sortChip('popular', fa.shop.v2.sortPopular)}
          {sortChip('price_asc', fa.shop.v2.sortCheap)}
          {sortChip('price_desc', fa.shop.v2.sortExpensive)}
          {savedProductIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSavedOnly((v) => !v)}
              aria-pressed={savedOnly}
              className={`${chipBase} ${savedOnly ? 'bg-[var(--shop-accent-fill)] font-bold text-[var(--shop-accent-text)]' : 'border border-[var(--shop-border)] text-[var(--shop-text)]'}`}
            >
              {fa.shop.v2.savedChip(savedProductIds.size)}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {noResult ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-[var(--shop-text-2)]">{savedOnly && !needle ? fa.shop.savedEmpty : query.trim() ? fa.shop.v2.noResult(query.trim()) : fa.shop.storeModeEmpty}</p>
            {query.trim() && !savedOnly && (
              <button
                type="button"
                onClick={() => onAskSeller(query.trim())}
                className="min-h-11 rounded-xl bg-[var(--shop-accent-fill)] px-5 text-sm font-bold text-[var(--shop-accent-text)]"
              >
                {fa.shop.v2.askSeller}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} saved={savedProductIds.has(p.id)} onOpen={() => onOpenProduct(p)} onToggleSave={() => onToggleSave(p.id)} />
            ))}
            {showSkeleton && <SkeletonCards count={4} />}
            {!savedOnly && loading && items.length > 0 && <SkeletonCards count={2} />}
          </div>
        )}
        {error && items.length > 0 && (
          <button type="button" onClick={loadMore} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--shop-border)] px-4 text-sm text-[var(--shop-danger)]">
            {fa.shop.v2.loadMoreFailed}
          </button>
        )}
        {error && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-[var(--shop-danger)]">{error}</p>
            <button type="button" onClick={loadMore} className="min-h-11 rounded-xl border border-[var(--shop-border)] px-4 text-sm text-[var(--shop-text)]">
              {fa.shop.v2.retry}
            </button>
          </div>
        )}
        <div ref={sentinelRef} className="h-px" aria-hidden />
      </div>
    </div>
  )
}
