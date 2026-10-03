import { useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import type { ShopAction, ShopUiBlock } from '@/types/api'

interface BlockProps {
  block: ShopUiBlock
  disabled: boolean
  onAddToCart: (productId: string) => void
  onConfirmCart: () => void
  onUploadReceipt: (file: File) => void
  onSendAction: (action: ShopAction) => void
}

// عمومی، بدون auth — الگوی مسیر عیناً مطابق sales-agent.controller.ts getProductImage
function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

// docs/PRD-product-video.md — عیناً همون الگوی productImageUrl بالا؛ اندپوینت Range request
// را پشتیبانی می‌کند، پس <video> خودش seek می‌تواند بزند
function productVideoUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/video/${key}`
}

function ProductCardBlock({
  products,
  disabled,
  onAddToCart,
}: {
  products: {
    id: string
    name: string
    basePrice: number
    stock: number
    images: string[]
    videoKey?: string | null
  }[]
  disabled: boolean
  onAddToCart: (productId: string) => void
}) {
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  return (
    <div className="mt-2 flex flex-col gap-2">
      {products.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
          <div className="mb-2 flex items-center gap-3">
            {p.images[0] && (
              <img
                src={productImageUrl(p.id, p.images[0])}
                alt={p.name}
                onClick={() => setZoomSrc(productImageUrl(p.id, p.images[0]))}
                className="size-20 shrink-0 cursor-zoom-in rounded-lg object-cover"
              />
            )}
            <div className="flex flex-1 items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{p.name}</span>
              <span className="text-xs text-slate-400 light:text-slate-600">
                {p.basePrice.toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </div>
          {p.videoKey && (
            // preload="metadata" نه auto — پخش خودکار توی چت آزاردهنده است و بی‌اجازه
            // دیتای موبایل مشتری را مصرف می‌کند
            <video
              controls
              preload="metadata"
              src={productVideoUrl(p.id, p.videoKey)}
              className="mb-2 w-full rounded-lg"
            />
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
      ))}
      {zoomSrc && <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} analyticsSource="shop_product_image" />}
    </div>
  )
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۳ — برخلاف ProductCardBlock که فقط
// images[0] نشان می‌دهد، همه‌ی عکس‌های محصول را به شکل گرید می‌دهد (وقتی مشتری صریح عکس
// بیشتر خواسته)
function ProductPhotosBlock({
  productId,
  productName,
  images,
}: {
  productId: string
  productName: string
  images: string[]
}) {
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {images.map((key) => {
        const src = productImageUrl(productId, key)
        return (
          <img
            key={key}
            src={src}
            alt={productName}
            onClick={() => setZoomSrc(src)}
            className="aspect-square w-full cursor-zoom-in rounded-lg object-cover"
          />
        )
      })}
      {zoomSrc && <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} analyticsSource="shop_product_photos" />}
    </div>
  )
}

function CartSummaryBlock({
  items,
  total,
  disabled,
  onConfirmCart,
}: {
  items: { productId: string; name: string; unitPrice: number; qty: number }[]
  total: number
  disabled: boolean
  onConfirmCart: () => void
}) {
  return (
    <div className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/60 light:border-slate-200 light:bg-white p-3">
      <div className="mb-2 flex flex-col gap-1.5">
        {items.map((i) => (
          <div key={i.productId} className="flex items-center justify-between text-xs text-slate-300 light:text-slate-600">
            <span>
              {i.name} × {i.qty}
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

export function ShopUiBlockView({ block, disabled, onAddToCart, onConfirmCart, onUploadReceipt, onSendAction }: BlockProps) {
  switch (block.type) {
    case 'PRODUCT_CARD':
      return <ProductCardBlock products={block.products} disabled={disabled} onAddToCart={onAddToCart} />
    case 'PRODUCT_PHOTOS':
      return <ProductPhotosBlock productId={block.productId} productName={block.productName} images={block.images} />
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
    default:
      return null
  }
}
