import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import type { ShopAction, ShopUiBlock } from '@/types/api'

interface BlockProps {
  block: ShopUiBlock
  disabled: boolean
  onAddToCart: (productId: string) => void
  onConfirmCart: () => void
  onUploadReceipt: (file: File) => void
  onSendAction: (action: ShopAction) => void
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»
  savedProductIds: Set<string>
  onToggleSave: (productId: string) => void
}

// عمومی، بدون auth — الگوی مسیر عیناً مطابق sales-agent.controller.ts getProductImage
// export شده چون StoreProductGrid.tsx (بخش ۳.۵) هم همین الگوی URL را لازم دارد
export function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

// docs/PRD-product-video.md — عیناً همون الگوی productImageUrl بالا؛ اندپوینت Range request
// را پشتیبانی می‌کند، پس <video> خودش seek می‌تواند بزند
export function productVideoUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/video/${key}`
}

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۴.۲ — رسانه‌ی نظرات؛ کلید
// شامل پیشوند «conversationId/» است (چون از همان storage.uploadImage آپلود شده) — باید encode
// شود عیناً chatImageUrl در useShopChat.ts، وگرنه «/» مسیر را می‌شکند
export function reviewMediaUrl(commentId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/comments/${commentId}/media/${encodeURIComponent(key)}`
}

// docs/PRD-product-video.md بخش ۴ — چندرسانه‌ای (چند عکس + چند ویدیو) یکجا، ویدیو(ها) اول
type MediaItem = { type: 'image' | 'video'; src: string }

// carousel اسکرول‌افقی + scroll-snap دستی (بدون کتابخانه‌ی خارجی، طبق تصمیم کاربر ۱۴۰۵/۰۷/۱۲)؛
// وقتی فقط یک آیتم باشد دکمه/نقطه‌ی ناوبری نشان داده نمی‌شود
function MediaCarousel({ items, onImageClick }: { items: MediaItem[]; onImageClick: (index: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [active, setActive] = useState(0)

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    // به‌جای scrollLeft خام (علامتش در RTL بین مرورگرها فرق دارد)، نزدیک‌ترین آیتم به مرکز
    // track را با getBoundingClientRect پیدا می‌کند
    const center = track.getBoundingClientRect().left + track.getBoundingClientRect().width / 2
    let closest = 0
    let minDist = Infinity
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(rect.left + rect.width / 2 - center)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActive(closest)
  }

  function goTo(index: number) {
    itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  if (items.length === 0) return null

  return (
    <div className="relative mb-2">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={i} ref={(el) => { itemRefs.current[i] = el }} className="w-full shrink-0 snap-center">
            {item.type === 'video' ? (
              // preload="metadata" نه auto — پخش خودکار توی چت آزاردهنده است و بی‌اجازه دیتای
              // موبایل مشتری را مصرف می‌کند
              <video controls preload="metadata" src={item.src} className="aspect-video w-full rounded-lg bg-black object-contain" />
            ) : (
              <img
                src={item.src}
                alt=""
                onClick={() => onImageClick(i)}
                className="aspect-video w-full cursor-zoom-in rounded-lg object-cover"
              />
            )}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <>
          {/* chevron-right = قبلی (عقب)، چون آیتم اول در RTL سمت راست‌تر قرار می‌گیرد */}
          <button
            type="button"
            aria-label={fa.shop.carouselPrev}
            onClick={() => goTo(Math.max(0, active - 1))}
            disabled={active === 0}
            className="absolute right-1.5 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 sm:flex"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          {/* chevron-left = بعدی (ادامه) */}
          <button
            type="button"
            aria-label={fa.shop.carouselNext}
            onClick={() => goTo(Math.min(items.length - 1, active + 1))}
            disabled={active === items.length - 1}
            className="absolute left-1.5 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 sm:flex"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="mt-1.5 flex items-center justify-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => goTo(i)}
                className={clsx('h-1.5 rounded-full transition-all duration-300', i === active ? 'w-4 bg-emerald-400' : 'w-1.5 bg-slate-500/60')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// بزرگ‌نمایی چندآیتمی — تعمیم‌یافته‌ی ImageLightbox (components/ui/ImageLightbox.tsx)، فقط
// برای carousel محصول که ویدیو هم دارد؛ کلیک/کیبورد (ArrowLeft/ArrowRight) بین آیتم‌ها می‌چرخاند
function MediaLightbox({ items, startIndex, onClose }: { items: MediaItem[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex)
  const item = items[index]
  const authedImageSrc = useAuthedImageUrl(item?.type === 'image' ? item.src : '')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.min(items.length - 1, i + 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, items.length])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 transition-colors hover:bg-slate-700"
        aria-label="بستن"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)) }}
            disabled={index === 0}
            className="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-30"
            aria-label={fa.shop.carouselPrev}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.min(items.length - 1, i + 1)) }}
            disabled={index === items.length - 1}
            className="absolute left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-30"
            aria-label={fa.shop.carouselNext}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}
      {item.type === 'video' ? (
        <video controls autoPlay src={item.src} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
      ) : (
        authedImageSrc && (
          <img
            src={authedImageSrc}
            alt="نمایش بزرگ‌شده‌ی تصویر"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        )
      )}
    </div>
  )
}

function ProductCardBlock({
  products,
  disabled,
  onAddToCart,
  savedProductIds,
  onToggleSave,
}: {
  products: {
    id: string
    name: string
    basePrice: number
    stock: number
    images: string[]
    videos: { key: string; durationSec: number }[]
  }[]
  disabled: boolean
  onAddToCart: (productId: string) => void
  savedProductIds: Set<string>
  onToggleSave: (productId: string) => void
}) {
  const [zoom, setZoom] = useState<{ items: MediaItem[]; index: number } | null>(null)
  return (
    <div className="mt-2 flex flex-col gap-2">
      {products.map((p) => {
        // docs/PRD-product-video.md بخش ۴ — ویدیو(ها) قبل از عکس‌ها (تصمیم ترتیب‌نمایش)
        // محصول در این کارت از JSON پیام‌های قدیمی‌تر مکالمه هم می‌تواند بیاید (payload تاریخی،
        // از قبل از افزوده‌شدن فیلد videos به محصول) — پس videos/images ممکن است اصلاً وجود نداشته باشد
        const mediaItems: MediaItem[] = [
          ...(p.videos ?? []).map((v) => ({ type: 'video' as const, src: productVideoUrl(p.id, v.key) })),
          ...(p.images ?? []).map((key) => ({ type: 'image' as const, src: productImageUrl(p.id, key) })),
        ]
        return (
          <div key={p.id} className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
            {mediaItems.length > 1 ? (
              <MediaCarousel items={mediaItems} onImageClick={(index) => setZoom({ items: mediaItems, index })} />
            ) : null}
            <div className="mb-2 flex items-center gap-3">
              {mediaItems.length === 1 && mediaItems[0].type === 'image' && (
                <img
                  src={mediaItems[0].src}
                  alt={p.name}
                  onClick={() => setZoom({ items: mediaItems, index: 0 })}
                  className="size-20 shrink-0 cursor-zoom-in rounded-lg object-cover"
                />
              )}
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-400 light:text-slate-600">
                  {p.basePrice.toLocaleString('fa-IR')} تومان
                </span>
              </div>
              {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد» */}
              <button
                onClick={() => onToggleSave(p.id)}
                title={savedProductIds.has(p.id) ? fa.shop.removeFromSaved : fa.shop.saveForLater}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700/60 light:hover:bg-slate-100"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill={savedProductIds.has(p.id) ? 'currentColor' : 'none'}
                  className={`size-4 ${savedProductIds.has(p.id) ? 'text-emerald-400' : ''}`}
                >
                  <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {mediaItems.length === 1 && mediaItems[0].type === 'video' && (
              // preload="metadata" نه auto — پخش خودکار توی چت آزاردهنده است و بی‌اجازه
              // دیتای موبایل مشتری را مصرف می‌کند
              <video controls preload="metadata" src={mediaItems[0].src} className="mb-2 w-full rounded-lg" />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 light:text-slate-500">
                {p.stock > 0 ? fa.shop.inStock : fa.shop.outOfStock}
              </span>
              <button
                onClick={() => onAddToCart(p.id)}
                disabled={disabled || p.stock === 0}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
              >
                {fa.shop.addToCart}
              </button>
            </div>
          </div>
        )
      })}
      {zoom && <MediaLightbox items={zoom.items} startIndex={zoom.index} onClose={() => setZoom(null)} />}
    </div>
  )
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۳ — برخلاف ProductCardBlock که فقط
// images[0] نشان می‌دهد، همه‌ی عکس‌ها/ویدیوهای محصول را carousel-طور نشان می‌دهد (وقتی مشتری
// صریح عکس بیشتر خواسته). docs/PRD-product-video.md بخش ۴ — ویدیو(ها) اول، بعد عکس‌ها
function ProductPhotosBlock({
  productId,
  productName,
  images,
  videos,
}: {
  productId: string
  productName: string
  images: string[]
  videos: { key: string; durationSec: number }[]
}) {
  const [zoom, setZoom] = useState<{ items: MediaItem[]; index: number } | null>(null)
  const mediaItems: MediaItem[] = [
    ...(videos ?? []).map((v) => ({ type: 'video' as const, src: productVideoUrl(productId, v.key) })),
    ...(images ?? []).map((key) => ({ type: 'image' as const, src: productImageUrl(productId, key) })),
  ]
  if (mediaItems.length > 1) {
    return (
      <div className="mt-2">
        <MediaCarousel items={mediaItems} onImageClick={(index) => setZoom({ items: mediaItems, index })} />
        {zoom && <MediaLightbox items={zoom.items} startIndex={zoom.index} onClose={() => setZoom(null)} />}
      </div>
    )
  }
  const only = mediaItems[0]
  if (!only) return null
  return (
    <div className="mt-2">
      {only.type === 'video' ? (
        <video controls preload="metadata" src={only.src} className="aspect-square w-full rounded-lg bg-black object-contain" />
      ) : (
        <img
          src={only.src}
          alt={productName}
          onClick={() => setZoom({ items: mediaItems, index: 0 })}
          className="aspect-square w-full cursor-zoom-in rounded-lg object-cover"
        />
      )}
      {zoom && <MediaLightbox items={zoom.items} startIndex={zoom.index} onClose={() => setZoom(null)} />}
    </div>
  )
}

function CartSummaryBlock({
  items,
  total,
  disabled,
  onConfirmCart,
}: {
  items: { productId: string; name: string; unitPrice: number; qty: number; variantId?: string; variantLabel?: string }[]
  total: number
  disabled: boolean
  onConfirmCart: () => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
      <div className="mb-2 flex flex-col gap-1.5">
        {items.map((i) => (
          <div key={`${i.productId}-${i.variantId ?? ''}`} className="flex items-center justify-between text-xs text-slate-300 light:text-slate-600">
            <span>
              {i.name}
              {i.variantLabel ? <span className="text-slate-500"> ({i.variantLabel})</span> : null} × {i.qty}
            </span>
            <span>{(i.unitPrice * i.qty).toLocaleString('fa-IR')} تومان</span>
          </div>
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between border-t border-slate-700/60 light:border-slate-200 pt-2 text-sm font-semibold text-slate-100 light:text-slate-900">
        <span>جمع کل</span>
        <span>{total.toLocaleString('fa-IR')} تومان</span>
      </div>
      <button
        onClick={onConfirmCart}
        disabled={disabled || items.length === 0}
        className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
      >
        {fa.shop.confirmAndPay}
      </button>
    </div>
  )
}

function PaymentInstructionsBlock({
  cardNumber,
  ownerName,
  amount,
  disabled,
  onUploadReceipt,
}: {
  cardNumber: string
  ownerName: string
  amount: number
  disabled: boolean
  onUploadReceipt: (file: File) => void
}) {
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function copy() {
    await navigator.clipboard.writeText(cardNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
      <p className="mb-1 text-xs text-slate-500">مبلغ قابل پرداخت</p>
      <p className="mb-3 text-sm font-bold text-emerald-300 light:text-emerald-700">{amount.toLocaleString('fa-IR')} تومان</p>
      <p dir="ltr" className="mb-1 break-all text-center font-mono text-sm text-slate-200 light:text-slate-900">
        {cardNumber}
      </p>
      <p className="mb-3 text-center text-xs text-slate-500">{ownerName}</p>
      <button
        onClick={copy}
        className="mb-2 w-full rounded-lg border border-slate-600/60 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400"
      >
        {copied ? fa.shop.cardNumberCopied : fa.shop.copyCardNumber}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUploadReceipt(file)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
      >
        {fa.shop.uploadReceipt}
      </button>
    </div>
  )
}

function OrderStatusBlock({ status }: { status: string }) {
  return (
    <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white px-3 py-2 text-xs font-semibold text-emerald-300 light:text-emerald-700">
      {fa.shop.orderStatusLabels[status] ?? status}
    </div>
  )
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۱ + docs/PRD-buyer-saved-addresses.md
// — یک کامپوننت با سه حالت (مثل UiBlock سمت بک‌اند)، نه سه کامپوننت جدا
function AddressPromptBlock({
  mode,
  addresses,
  provinces,
  summary,
  disabled,
  onSendAction,
}: {
  mode: 'CHOOSE_SAVED' | 'CHOOSE_PROVINCE' | 'CONFIRM' | 'ASK_SAVE'
  addresses?: { id: string; summary: string }[]
  provinces?: string[]
  summary?: string
  disabled: boolean
  onSendAction: (action: ShopAction) => void
}) {
  if (mode === 'CHOOSE_PROVINCE') {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(provinces ?? []).map(p => (
          <button
            key={p}
            onClick={() => onSendAction({ type: 'SELECT_PROVINCE', province: p })}
            disabled={disabled}
            className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white px-2 py-2 text-center text-xs text-slate-200 light:text-slate-900 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>
    )
  }

  if (mode === 'CHOOSE_SAVED') {
    return (
      <div className="mt-2 flex flex-col gap-2">
        {(addresses ?? []).map((a) => (
          <button
            key={a.id}
            onClick={() => onSendAction({ type: 'SELECT_ADDRESS', addressId: a.id })}
            disabled={disabled}
            className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white px-3 py-2 text-right text-xs text-slate-200 light:text-slate-900 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
          >
            {a.summary}
          </button>
        ))}
        <button
          onClick={() => onSendAction({ type: 'NEW_ADDRESS' })}
          disabled={disabled}
          className="rounded-xl border border-dashed border-slate-600/60 light:border-slate-300 px-3 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
        >
          {fa.shop.addressNewOption}
        </button>
      </div>
    )
  }

  if (mode === 'CONFIRM') {
    return (
      <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
        <p className="mb-3 whitespace-pre-line text-xs text-slate-200 light:text-slate-900">{summary}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onSendAction({ type: 'CONFIRM_ADDRESS' })}
            disabled={disabled}
            className="flex-1 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
          >
            {fa.shop.addressConfirmButton}
          </button>
          <button
            onClick={() => onSendAction({ type: 'EDIT_ADDRESS' })}
            disabled={disabled}
            className="flex-1 rounded-lg border border-slate-600/60 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
          >
            {fa.shop.addressEditButton}
          </button>
        </div>
      </div>
    )
  }

  // ASK_SAVE
  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={() => onSendAction({ type: 'SAVE_ADDRESS' })}
        disabled={disabled}
        className="flex-1 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
      >
        {fa.shop.addressSaveYesButton}
      </button>
      <button
        onClick={() => onSendAction({ type: 'SKIP_SAVE_ADDRESS' })}
        disabled={disabled}
        className="flex-1 rounded-lg border border-slate-600/60 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
      >
        {fa.shop.addressSaveNoButton}
      </button>
    </div>
  )
}

// docs/PRD-product-display-focus-and-variations.md §۴.۲ — عیناً سبک AddressPromptBlock's
// CHOOSE_PROVINCE بالا: چیپ‌چین ساده؛ هر دو mode (DIMENSION/ALTERNATIVES) همون
// SELECT_VARIANT_VALUE را می‌فرستند، فرق را فقط سرور از روی ctx می‌داند
function VariantPromptBlock({
  values,
  disabled,
  onSendAction,
}: {
  values: { label: string; value: string }[]
  disabled: boolean
  onSendAction: (action: ShopAction) => void
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {values.map(v => (
        <button
          key={v.value}
          onClick={() => onSendAction({ type: 'SELECT_VARIANT_VALUE', value: v.value })}
          disabled={disabled}
          className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white px-2 py-2 text-center text-xs text-slate-200 light:text-slate-900 hover:border-slate-500 light:hover:border-slate-400 disabled:opacity-40"
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۲) — سفارش مجدد با یک دکمه
// docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۲ — export شد تا ShopOrdersPage.tsx
// (صفحه‌ی مستقل «سفارش‌های من») هم همین کارت را عیناً استفاده کند، بدون دوبار نوشتن UI
export function OrderListBlock({
  orders,
  disabled,
  onReorder,
  onWriteReview,
}: {
  orders: {
    id: string
    createdAt: string
    items: { productId: string; name: string; unitPrice: number; qty: number }[]
    totalAmount: number
    status: string
    distinctProductId?: string | null
  }[]
  disabled: boolean
  onReorder: (orderId: string) => void
  // فقط در صفحه‌ی مستقل «سفارش‌های من» پر می‌شود (بخش ۲.۳)؛ در داخل چت (مصرف اصلی/قدیمی این
  // بلاک) عمداً خالی می‌ماند — ثبت نظر از دل چت نیازی ندارد
  onWriteReview?: (orderId: string, distinctProductId: string | null) => void
}) {
  if (orders.length === 0) {
    return <p className="mt-2 text-xs text-slate-500">{fa.shop.orderListEmpty}</p>
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-slate-400 light:text-slate-600">
              {new Date(o.createdAt).toLocaleDateString('fa-IR')}
            </span>
            <span className="rounded-full bg-slate-700/60 light:bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-300 light:text-slate-700">
              {fa.shop.orderStatusLabels[o.status] ?? o.status}
            </span>
          </div>
          <p className="mb-2 truncate text-xs text-slate-300 light:text-slate-700">
            {o.items.map((i) => `${i.name} × ${i.qty}`).join('، ')}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-200 light:text-slate-900">
              {o.totalAmount.toLocaleString('fa-IR')} تومان
            </span>
            <div className="flex items-center gap-2">
              {onWriteReview && (
                <button
                  onClick={() => onWriteReview(o.id, o.distinctProductId ?? null)}
                  className="rounded-lg border border-slate-600/60 light:border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-300 light:text-slate-700"
                >
                  {fa.shop.writeReviewButton}
                </button>
              )}
              <button
                onClick={() => onReorder(o.id)}
                disabled={disabled}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
              >
                {fa.shop.reorderButton}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// همان بخش، مورد ۴ — مقایسه‌ی ۲-۳ محصول کنار هم (قیمت/موجودی/specs جدولی)
function CompareCardBlock({
  products,
}: {
  products: { id: string; name: string; basePrice: number; stock: number; specs: { label: string; value: string }[] }[]
}) {
  const allLabels = Array.from(new Set(products.flatMap((p) => p.specs.map((s) => s.label))))
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/60 light:border-slate-200">
            <th className="p-2 text-start font-medium text-slate-500" />
            {products.map((p) => (
              <th key={p.id} className="p-2 text-start font-semibold text-slate-200 light:text-slate-900">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-700/40 light:border-slate-100">
            <td className="p-2 text-slate-500">{fa.shop.compareCardPrice}</td>
            {products.map((p) => (
              <td key={p.id} className="p-2 font-semibold text-emerald-400">
                {p.basePrice.toLocaleString('fa-IR')} تومان
              </td>
            ))}
          </tr>
          <tr className="border-b border-slate-700/40 light:border-slate-100">
            <td className="p-2 text-slate-500">{fa.shop.compareCardStock}</td>
            {products.map((p) => (
              <td key={p.id} className="p-2 text-slate-300 light:text-slate-700">
                {p.stock > 0 ? fa.shop.inStock : fa.shop.outOfStock}
              </td>
            ))}
          </tr>
          {allLabels.map((label) => (
            <tr key={label} className="border-b border-slate-700/40 light:border-slate-100 last:border-0">
              <td className="p-2 text-slate-500">{label}</td>
              {products.map((p) => (
                <td key={p.id} className="p-2 text-slate-300 light:text-slate-700">
                  {p.specs.find((s) => s.label === label)?.value ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ShopUiBlockView({
  block,
  disabled,
  onAddToCart,
  onConfirmCart,
  onUploadReceipt,
  onSendAction,
  savedProductIds,
  onToggleSave,
}: BlockProps) {
  switch (block.type) {
    case 'PRODUCT_CARD':
      return (
        <ProductCardBlock
          products={block.products}
          disabled={disabled}
          onAddToCart={onAddToCart}
          savedProductIds={savedProductIds}
          onToggleSave={onToggleSave}
        />
      )
    case 'PRODUCT_PHOTOS':
      return <ProductPhotosBlock productId={block.productId} productName={block.productName} images={block.images} videos={block.videos} />
    case 'CART_SUMMARY':
      return <CartSummaryBlock items={block.items} total={block.total} disabled={disabled} onConfirmCart={onConfirmCart} />
    case 'PAYMENT_INSTRUCTIONS':
      return (
        <PaymentInstructionsBlock
          cardNumber={block.cardNumber}
          ownerName={block.ownerName}
          amount={block.amount}
          disabled={disabled}
          onUploadReceipt={onUploadReceipt}
        />
      )
    case 'ORDER_STATUS':
      return <OrderStatusBlock status={block.status} />
    case 'ADDRESS_PROMPT':
      return (
        <AddressPromptBlock
          mode={block.mode}
          addresses={block.addresses}
          provinces={block.provinces}
          summary={block.summary}
          disabled={disabled}
          onSendAction={onSendAction}
        />
      )
    case 'ORDER_LIST':
      return (
        <OrderListBlock
          orders={block.orders}
          disabled={disabled}
          onReorder={(orderId) => onSendAction({ type: 'REORDER', orderId })}
        />
      )
    case 'COMPARE_CARD':
      return <CompareCardBlock products={block.products} />
    case 'VARIANT_PROMPT':
      return <VariantPromptBlock values={block.values} disabled={disabled} onSendAction={onSendAction} />
    default:
      return null
  }
}
