import { fa } from '@/locales/fa'
import { productImageUrl } from '@/components/shop/ShopUiBlocks'
import type { ShopUiBlock } from '@/types/api'

type CardProduct = Extract<ShopUiBlock, { type: 'PRODUCT_CARD' }>['products'][number]

interface ChatProductCardsProps {
  products: CardProduct[]
  disabled: boolean
  // فروشنده خودش جواب می‌دهد: کارت دیدنی می‌ماند، دکمه‌ی افزودن غیرفعال
  handoff: boolean
  cartProductIds: Set<string>
  onOpenProduct: (productId: string) => void
  onAddToCart: (productId: string) => void
  onSeeAllProducts: () => void
}

function Thumb({ product, ratio }: { product: CardProduct; ratio: string }) {
  return product.images[0] ? (
    <img
      src={productImageUrl(product.id, product.images[0])}
      alt={product.name}
      loading="lazy"
      className={`${ratio} w-full object-cover`}
    />
  ) : (
    <div className={`${ratio} flex w-full items-center justify-center bg-[var(--shop-surface-2)] text-4xl font-bold text-[var(--shop-text-2)]`}>
      {product.name.trim().charAt(0)}
    </div>
  )
}

const outlineBtn = 'min-h-11 flex-1 rounded-xl border border-[var(--shop-border)] px-3 text-sm font-semibold text-[var(--shop-text)]'
const fillBtn = 'min-h-11 flex-1 rounded-xl bg-[var(--shop-accent-fill)] px-3 text-sm font-bold text-[var(--shop-accent-text)] disabled:opacity-50'

// docs/PRD-buyer-chat-redesign.md §6.4.3 — یک محصول: کارت ۲۸۰px؛ چند محصول: کاروسل ۲۰۰px.
// «ببین» همان ProductSheet را باز می‌کند؛ دکمه‌ی اصلی برای محصول بدون گزینه مستقیم اضافه می‌کند و برای
// محصول گزینه‌دار (hasVariants، B2) شیت را باز می‌کند
export function ChatProductCards({ products, disabled, handoff, cartProductIds, onOpenProduct, onAddToCart, onSeeAllProducts }: ChatProductCardsProps) {
  if (products.length === 0) return null

  if (products.length === 1) {
    const p = products[0]
    const inCart = cartProductIds.has(p.id)
    const soldOut = p.stock <= 0
    return (
      <div className="mt-2 w-[280px] max-w-full overflow-hidden rounded-2xl border border-[var(--shop-border)] bg-[var(--shop-surface)]">
        <button type="button" onClick={() => onOpenProduct(p.id)} className="block w-full text-start" aria-label={p.name}>
          <Thumb product={p} ratio="aspect-[4/5]" />
        </button>
        <div className="flex flex-col gap-0.5 p-3">
          <span className="text-[15px] font-bold leading-6 text-[var(--shop-text)]">{p.name}</span>
          <span className="text-base font-bold text-[var(--shop-text)]">
            {p.basePrice.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[var(--shop-text-2)]">تومان</span>
          </span>
          {p.goldPricingSummary && <span className="text-xs text-[var(--shop-warning)]">{p.goldPricingSummary}</span>}
          <span className="text-xs text-[var(--shop-text-2)]">{soldOut ? fa.shop.outOfStock : fa.shop.inStock}</span>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => onOpenProduct(p.id)} className={outlineBtn}>
              {fa.shop.v2.view}
            </button>
            {p.hasVariants ? (
              <button type="button" onClick={() => onOpenProduct(p.id)} disabled={handoff || soldOut} className={fillBtn}>
                {fa.shop.v2.chooseVariant}
              </button>
            ) : (
              <button type="button" onClick={() => onAddToCart(p.id)} disabled={disabled || handoff || soldOut || inCart} className={fillBtn}>
                {inCart ? fa.shop.v2.inCart : soldOut ? fa.shop.v2.soldOut : fa.shop.v2.addToCart}
              </button>
            )}
          </div>
          {handoff && <span className="mt-1 text-xs text-[var(--shop-text-2)]">{fa.shop.sellerIsReplying}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="-me-4 mt-2 flex snap-x gap-2 overflow-x-auto pe-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {products.map((p) => (
        <div key={p.id} className="w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--shop-border)] bg-[var(--shop-surface)]">
          <button type="button" onClick={() => onOpenProduct(p.id)} className="block w-full text-start" aria-label={p.name}>
            <Thumb product={p} ratio="aspect-square" />
          </button>
          <div className="flex flex-col gap-0.5 p-2.5">
            <span className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[var(--shop-text)]">{p.name}</span>
            <span className="text-[15px] font-bold text-[var(--shop-text)]">
              {p.basePrice.toLocaleString('fa-IR')} <span className="text-xs font-normal text-[var(--shop-text-2)]">تومان</span>
            </span>
            <button type="button" onClick={() => onOpenProduct(p.id)} className={`${outlineBtn} mt-1.5 w-full flex-none`}>
              {fa.shop.v2.view}
            </button>
          </div>
        </div>
      ))}
      {products.length > 2 && (
        <button
          type="button"
          onClick={onSeeAllProducts}
          className="flex w-[120px] shrink-0 snap-start items-center justify-center rounded-2xl border border-dashed border-[var(--shop-border)] px-3 text-center text-sm font-semibold text-[var(--shop-accent)]"
        >
          {fa.shop.v2.allProducts}
        </button>
      )}
    </div>
  )
}
