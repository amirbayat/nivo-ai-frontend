import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { useToastStore } from '@/store/toast.store'
import { MediaCarousel, MediaLightbox, productImageUrl, productVideoUrl, type MediaItem } from '@/components/shop/ShopUiBlocks'
import type { PublicProduct, PublicProductVariant } from '@/types/api'

type NotifyResult = Promise<{ status: 'subscribed' | 'needs_phone' | 'in_stock' | 'error' }>

// ── انتخاب واریانت (منطق قبلی ProductDetailSheet، بدون تغییر رفتار) ─────────────────────────────
function optionValueExists(variants: PublicProductVariant[], optionName: string, value: string, selected: Record<string, string>) {
  return variants.some((variant) => {
    if (variant.options[optionName] !== value) return false
    return Object.entries(selected).every(([key, chosen]) => key === optionName || variant.options[key] === chosen)
  })
}

function optionValueAvailable(variants: PublicProductVariant[], optionName: string, value: string, selected: Record<string, string>) {
  return variants.some((variant) => {
    if (variant.stock <= 0) return false
    if (variant.options[optionName] !== value) return false
    return Object.entries(selected).every(([key, chosen]) => key === optionName || variant.options[key] === chosen)
  })
}

function matchingVariant(product: PublicProduct, selected: Record<string, string>) {
  const options = product.options ?? []
  if (options.length === 0 || options.some((option) => !selected[option.name])) return null
  return (product.variants ?? []).find((variant) => options.every((option) => variant.options[option.name] === selected[option.name])) ?? null
}

function useProductPick(product: PublicProduct) {
  const options = product.options ?? []
  const variants = product.variants ?? []
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    setSelected({})
  }, [product.id])

  const picked = matchingVariant(product, selected)
  const missingOption = options.find((option) => !selected[option.name]) ?? null
  const soldOut =
    options.length === 0
      ? product.stock <= 0
      : picked != null
        ? picked.stock <= 0
        : variants.length > 0 && variants.every((v) => v.stock <= 0)
  const canAdd = !product.priceUnavailable && !soldOut && (options.length === 0 || picked != null)
  const shownPrice = picked?.price ?? product.basePrice
  const stockLeft = options.length === 0 ? product.stock : (picked?.stock ?? null)

  function choose(optionName: string, value: string) {
    setSelected((current) => {
      const next = { ...current, [optionName]: value }
      for (const option of options) {
        if (option.name === optionName) continue
        const chosen = next[option.name]
        if (chosen && !optionValueExists(variants, option.name, chosen, next)) delete next[option.name]
      }
      return next
    })
  }

  return { options, variants, selected, picked, missingOption, soldOut, canAdd, shownPrice, stockLeft, choose }
}

type Pick = ReturnType<typeof useProductPick>

const iconBtnOverlay = 'flex size-11 items-center justify-center rounded-full bg-black/45 text-white'

// ── بدنه‌ی شیت (اسکرول‌شونده) ───────────────────────────────────────────────────────────────────
function ProductBody({
  product,
  pick,
  slug,
  shippingEstimate,
  shippingDaysText,
  preview,
  saved,
  onToggleSave,
  onWriteReview,
  onViewReviews,
}: {
  product: PublicProduct
  pick: Pick
  slug: string
  shippingEstimate: { minCostToman: number; maxCostToman: number } | null
  shippingDaysText: string | null
  preview: boolean
  saved: boolean
  onToggleSave: () => void
  onWriteReview: () => void
  onViewReviews: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [zoom, setZoom] = useState<{ items: MediaItem[]; index: number } | null>(null)
  const [descOpen, setDescOpen] = useState(false)
  // ویدیوها اول (طبق PRD §6.3 و رفتار قبلی چت)، بعد عکس‌ها
  const media: MediaItem[] = [
    ...product.videos.map((video) => ({ type: 'video' as const, src: productVideoUrl(product.id, video.key) })),
    ...product.images.map((key) => ({ type: 'image' as const, src: productImageUrl(product.id, key) })),
  ]
  const shippingRange =
    shippingEstimate == null
      ? null
      : shippingEstimate.minCostToman === shippingEstimate.maxCostToman
        ? `${shippingEstimate.minCostToman.toLocaleString('fa-IR')} تومان`
        : `${shippingEstimate.minCostToman.toLocaleString('fa-IR')} تا ${shippingEstimate.maxCostToman.toLocaleString('fa-IR')} تومان`
  const longDescription = (product.description?.length ?? 0) > 110 || (product.description?.includes('\n') ?? false)

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
      addToast(fa.shop.linkCopied, 2500)
    } catch {
      addToast(url, 6000)
    }
  }

  return (
    <div className="pb-2">
      <div className="relative mb-3">
        {media.length > 0 ? (
          <MediaCarousel items={media} aspectClass="aspect-square" showCounter onImageClick={(index) => setZoom({ items: media, index })} />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[var(--shop-surface-2)] text-5xl font-bold text-[var(--shop-text-2)]">
            {product.name.trim().charAt(0)}
          </div>
        )}
        {!preview && (
          <div className="absolute end-2 top-0 flex flex-col">
            <button type="button" onClick={() => void share()} aria-label={fa.shop.shareProduct} className={iconBtnOverlay}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
                <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={saved ? fa.shop.removeFromSaved : fa.shop.saveForLater}
              aria-pressed={saved}
              className={iconBtnOverlay}
            >
              <svg viewBox="0 0 20 20" fill={saved ? 'currentColor' : 'none'} className={`size-5 ${saved ? 'text-emerald-400' : ''}`} aria-hidden>
                <path d="M5 3.5A1.5 1.5 0 016.5 2h7A1.5 1.5 0 0115 3.5V17l-5-3-5 3V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold leading-7 text-[var(--shop-text)]">{product.name}</h3>
      {product.priceUnavailable ? (
        <>
          <p className="mt-0.5 text-xl font-bold text-[var(--shop-text-2)]">{fa.shop.v2.priceSoon}</p>
          <p className="text-xs text-[var(--shop-warning)]">{fa.shop.v2.goldPriceUnavailableHelp}</p>
        </>
      ) : (
        <p className="mt-0.5 text-xl font-bold text-[var(--shop-text)]">
          {pick.shownPrice.toLocaleString('fa-IR')} <span className="text-sm font-normal text-[var(--shop-text-2)]">تومان</span>
        </p>
      )}
      {product.isWeightBasedPricing && (
        <div className="mt-1 text-xs text-[var(--shop-warning)]">
          <p>
            {fa.shop.weightBasedPriceBadge}
            {product.weightGrams != null && product.purityKarat != null
              ? ` — ${fa.shop.weightBasedPriceDetail(product.weightGrams, product.purityKarat)}`
              : ''}
          </p>
          {product.goldPricingSummary && <p className="opacity-80">{product.goldPricingSummary}</p>}
        </div>
      )}

      {(product.reviewCount ?? 0) > 0 && (
        <div className="mt-2 flex items-center gap-3 text-sm">
          <button type="button" onClick={onViewReviews} disabled={preview} className="flex min-h-11 items-center gap-1 text-[var(--shop-warning)]">
            <span aria-hidden>★</span>
            <span>{(product.ratingAvg ?? 0).toLocaleString('fa-IR')}</span>
            <span className="text-[var(--shop-text-2)]">({fa.shop.reviewCount(product.reviewCount ?? 0)})</span>
          </button>
          {!preview && (
            <button type="button" onClick={onWriteReview} className="min-h-11 text-[var(--shop-accent)] underline">
              {fa.shop.v2.writeReview}
            </button>
          )}
        </div>
      )}
      {(product.reviewCount ?? 0) <= 0 && !preview && (
        <button type="button" onClick={onWriteReview} className="mt-1 min-h-11 text-sm text-[var(--shop-accent)] underline">
          {fa.shop.v2.writeReview}
        </button>
      )}

      {pick.options.map((option) => (
        <div key={option.name} className="mt-3">
          <p className="mb-1.5 text-sm text-[var(--shop-text-2)]">{option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const exists = optionValueExists(pick.variants, option.name, value, pick.selected)
              const available = optionValueAvailable(pick.variants, option.name, value, pick.selected)
              const active = pick.selected[option.name] === value
              return (
                <button
                  key={value}
                  type="button"
                  // ناموجود: خط‌خورده ولی قابل‌انتخاب، تا «موجود شد خبرم کن» برای همان ترکیب کار کند (§14)
                  disabled={!exists}
                  aria-pressed={active}
                  onClick={() => pick.choose(option.name, value)}
                  className={`min-h-11 min-w-11 rounded-full border px-4 text-sm ${
                    active
                      ? 'border-[var(--shop-accent-fill)] bg-[var(--shop-accent-fill)] font-bold text-[var(--shop-accent-text)]'
                      : 'border-[var(--shop-border)] text-[var(--shop-text)]'
                  } ${available ? '' : 'line-through opacity-50'} disabled:cursor-not-allowed`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {pick.stockLeft != null && pick.stockLeft > 0 && pick.stockLeft <= 3 && (
        <p className="mt-2 text-sm text-[var(--shop-warning)]">{fa.shop.v2.fewLeft(pick.stockLeft)}</p>
      )}

      {(shippingRange || shippingDaysText) && (
        <p className="mt-3 text-sm text-[var(--shop-text-2)]">{fa.shop.v2.shippingLine(shippingRange, shippingDaysText)}</p>
      )}

      {product.description && (
        <div className="mt-3">
          <p className={`whitespace-pre-line text-[15px] leading-7 text-[var(--shop-text-2)] ${descOpen ? '' : 'line-clamp-3'}`}>{product.description}</p>
          {longDescription && (
            <button type="button" onClick={() => setDescOpen((v) => !v)} className="min-h-11 text-sm text-[var(--shop-accent)]">
              {descOpen ? fa.shop.v2.lessText : fa.shop.v2.moreText}
            </button>
          )}
        </div>
      )}
      {zoom && <MediaLightbox items={zoom.items} startIndex={zoom.index} onClose={() => setZoom(null)} />}
    </div>
  )
}

// ── «موجود شد خبرم کن» (جریان قبلی با شماره و OTP درون‌خطی) ──────────────────────────────────────
function NotifyStock({
  productId,
  variantId,
  onNotifyStock,
  onSendBuyerOtp,
  onVerifyBuyerOtp,
}: {
  productId: string
  variantId?: string
  onNotifyStock?: (productId: string, variantId?: string) => NotifyResult
  onSendBuyerOtp?: (phone: string) => Promise<{ ok: boolean; message: string }>
  onVerifyBuyerOtp?: (phone: string, code: string) => Promise<{ ok: boolean; message: string }>
}) {
  const [state, setState] = useState<'idle' | 'phone' | 'code' | 'done'>('idle')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input =
    'min-h-11 rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3 text-[15px] text-[var(--shop-text)] placeholder:text-[var(--shop-text-2)]'
  const primary = 'min-h-12 rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)] disabled:opacity-40'

  function settle(status: 'subscribed' | 'needs_phone' | 'in_stock' | 'error') {
    if (status === 'subscribed') setState('done')
    else if (status === 'needs_phone') setState('phone')
    else if (status === 'in_stock') setError(fa.shop.notifyMeInStock)
    else setError(fa.shop.notifyMeError)
  }

  async function ask() {
    if (!onNotifyStock) return
    setBusy(true)
    setError(null)
    const result = await onNotifyStock(productId, variantId)
    setBusy(false)
    settle(result.status)
  }

  async function sendCode() {
    if (!onSendBuyerOtp) return
    setBusy(true)
    setError(null)
    const result = await onSendBuyerOtp(phone)
    setBusy(false)
    if (!result.ok) setError(result.message || fa.shop.notifyMeError)
    else setState('code')
  }

  async function confirmCode() {
    if (!onVerifyBuyerOtp || !onNotifyStock) return
    setBusy(true)
    setError(null)
    const verified = await onVerifyBuyerOtp(phone, code)
    if (!verified.ok) {
      setBusy(false)
      setError(verified.message || fa.shop.notifyMeError)
      return
    }
    const result = await onNotifyStock(productId, variantId)
    setBusy(false)
    settle(result.status)
  }

  if (state === 'done') return <p className="py-3 text-center text-sm font-semibold text-[var(--shop-accent)]">{fa.shop.notifyMeSent}</p>
  return (
    <div className="flex flex-col gap-2">
      {state === 'idle' && (
        <button type="button" onClick={() => void ask()} disabled={busy} className={primary}>
          {fa.shop.notifyMe}
        </button>
      )}
      {state === 'phone' && (
        <>
          <p className="text-xs text-[var(--shop-text-2)]">{fa.shop.notifyMePhone}</p>
          <DigitsInput kind="phone" value={phone} onChange={setPhone} placeholder={fa.shop.registerPhonePlaceholder} className={input} />
          <button type="button" onClick={() => void sendCode()} disabled={busy || !phone.trim()} className={primary}>
            {fa.shop.registerSendCodeButton}
          </button>
        </>
      )}
      {state === 'code' && (
        <>
          <p className="text-xs text-[var(--shop-text-2)]">{fa.shop.notifyMeCode}</p>
          <DigitsInput kind="otp" value={code} onChange={setCode} placeholder={fa.shop.registerCodePlaceholder} className={input} />
          <button type="button" onClick={() => void confirmCode()} disabled={busy || code.trim().length < 4} className={primary}>
            {fa.shop.registerConfirmButton}
          </button>
        </>
      )}
      {error && <p className="text-xs text-[var(--shop-danger)]">{error}</p>}
    </div>
  )
}

interface ProductSheetProps {
  open: boolean
  onClose: () => void
  // null تا وقتی که محصول از سرور می‌آید (اسکلت)؛ unavailable وقتی دیگر قابل‌نمایش نیست
  product: PublicProduct | null
  unavailable?: boolean
  slug: string
  shippingEstimate: { minCostToman: number; maxCostToman: number } | null
  shippingDaysText: string | null
  disabled: boolean
  inCart: boolean
  saved: boolean
  onAddToCart: (productId: string, variantId?: string) => void
  onAskAbout: (product: PublicProduct) => void
  onSeeOthers: () => void
  onToggleSave: () => void
  onWriteReview: () => void
  onViewReviews: () => void
  onNotifyStock?: (productId: string, variantId?: string) => NotifyResult
  onSendBuyerOtp?: (phone: string) => Promise<{ ok: boolean; message: string }>
  onVerifyBuyerOtp?: (phone: string, code: string) => Promise<{ ok: boolean; message: string }>
}

// docs/PRD-buyer-chat-redesign.md §6.3 — تنها رابط محصول: از گرید، کارت چت و لینک محصول همین شیت باز می‌شود
export function ProductSheet(props: ProductSheetProps) {
  const { open, onClose, product, unavailable } = props
  if (!open) return null
  if (unavailable) {
    return (
      <BottomSheet
        open
        onClose={onClose}
        closeOnBack
        title={fa.shop.v2.notAvailable}
        footer={
          <button
            type="button"
            onClick={props.onSeeOthers}
            className="min-h-12 w-full rounded-xl bg-[var(--shop-accent-fill)] text-sm font-bold text-[var(--shop-accent-text)]"
          >
            {fa.shop.v2.seeOtherProducts}
          </button>
        }
      >
        <p className="py-6 text-center text-sm text-[var(--shop-text-2)]">{fa.shop.v2.notAvailable}</p>
      </BottomSheet>
    )
  }
  if (!product) {
    return (
      <BottomSheet open onClose={onClose} closeOnBack full title={fa.common.loading}>
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="aspect-square w-full rounded-lg bg-[var(--shop-surface-2)]" />
          <div className="mt-4 h-6 w-2/3 rounded bg-[var(--shop-surface-2)]" />
          <div className="mt-2 h-7 w-1/3 rounded bg-[var(--shop-surface-2)]" />
          <div className="mt-4 h-4 w-full rounded bg-[var(--shop-surface-2)]" />
        </div>
      </BottomSheet>
    )
  }
  return <LoadedProductSheet {...props} product={product} />
}

function LoadedProductSheet({ product, ...props }: ProductSheetProps & { product: PublicProduct }) {
  const pick = useProductPick(product)
  const [justAdded, setJustAdded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setJustAdded(false)
  }, [product.id])
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function add() {
    props.onAddToCart(product.id, pick.picked?.id)
    setJustAdded(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setJustAdded(false), 1500)
  }

  const secondary = (
    <button
      type="button"
      onClick={() => props.onAskAbout(product)}
      className="min-h-12 shrink-0 rounded-xl border border-[var(--shop-border)] px-4 text-sm font-semibold text-[var(--shop-text)]"
    >
      {fa.shop.v2.haveQuestion}
    </button>
  )

  let primary: ReactNode
  let helper: string | null = null
  if (pick.soldOut && !product.priceUnavailable) {
    primary = (
      <NotifyStock
        key={`${product.id}-${pick.picked?.id ?? ''}`}
        productId={product.id}
        variantId={pick.picked?.id}
        onNotifyStock={props.onNotifyStock}
        onSendBuyerOtp={props.onSendBuyerOtp}
        onVerifyBuyerOtp={props.onVerifyBuyerOtp}
      />
    )
  } else {
    if (product.priceUnavailable) helper = fa.shop.v2.goldPriceUnavailableHelp
    else if (pick.missingOption) helper = fa.shop.v2.chooseFirst(pick.missingOption.name)
    primary = (
      <button
        type="button"
        onClick={add}
        disabled={props.disabled || !pick.canAdd}
        className="min-h-12 flex-1 rounded-xl bg-[var(--shop-accent-fill)] text-[15px] font-bold text-[var(--shop-accent-text)] disabled:opacity-40"
      >
        {justAdded ? fa.shop.v2.added : props.inCart ? fa.shop.v2.addAnother : fa.shop.v2.addToCart}
      </button>
    )
  }

  return (
    <BottomSheet
      open
      onClose={props.onClose}
      closeOnBack
      full
      title={product.name}
      footer={
        <div className="flex flex-col gap-1.5">
          {helper && <p className="text-center text-xs text-[var(--shop-text-2)]">{helper}</p>}
          <div className="flex items-stretch gap-2">
            {primary}
            {secondary}
          </div>
        </div>
      }
    >
      <ProductBody
        product={product}
        pick={pick}
        slug={props.slug}
        shippingEstimate={props.shippingEstimate}
        shippingDaysText={props.shippingDaysText}
        preview={false}
        saved={props.saved}
        onToggleSave={props.onToggleSave}
        onWriteReview={props.onWriteReview}
        onViewReviews={props.onViewReviews}
      />
    </BottomSheet>
  )
}

// SP-4 §4.12.2 — حالت preview: همان بدنه‌ی خریدار، فقط‌خواندنی و بدون هیچ درخواست شبکه (بدون سبد/پرسش/
// ذخیره/نظرات/اطلاع از موجودی) و بدون شیت/footer؛ فروشنده در پیش‌نمایش پیش‌نویس هم می‌بیند مشتری چه می‌بیند
export function ProductSheetPreview({ product, slug }: { product: PublicProduct; slug: string }) {
  const pick = useProductPick(product)
  return (
    <ProductBody
      product={product}
      pick={pick}
      slug={slug}
      shippingEstimate={null}
      shippingDaysText={null}
      preview
      saved={false}
      onToggleSave={() => undefined}
      onWriteReview={() => undefined}
      onViewReviews={() => undefined}
    />
  )
}
