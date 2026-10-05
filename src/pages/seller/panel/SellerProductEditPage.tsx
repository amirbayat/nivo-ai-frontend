import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import { extractErrorMessage, productImageUrl, productVideoUrl } from '@/lib/sellerProduct'
import {
  useCreateProduct,
  useDeleteProduct,
  useDeleteProductImage,
  useExtractProductsFromText,
  useGenerateProductOptionsFromText,
  useGoldPricePreview,
  useTranscribeAudio,
  useTranscribeAudioFile,
  useProducts,
  useProductTelegramLink,
  useRemoveProductVideo,
  useReplaceProductVariants,
  useUpdateProduct,
  useUploadProductImages,
  useUploadProductVideo,
  type CreateProductInput,
  type ReplaceProductVariantsInput,
} from '@/queries/seller.queries'
import type { ExtractedVariantOption, ProductSpecSuggestion, SellerProduct } from '@/types/api'
import { AiCompleteAssist } from './AiCompleteAssist'
import { ProductDescriptionModal } from './ProductDescriptionModal'
import { useSellerStore } from './SellerPanelLayout'

function ProductImages({
  product,
  onProductUpdated,
}: {
  product: SellerProduct
  onProductUpdated: (product: SellerProduct) => void
}) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductImages(storeId)
  const remove = useDeleteProductImage(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  // پیش‌نمایش محلی حین آپلود — تا رفت‌وبرگشت شبکه/invalidate تمام شود، فروشنده چیزی نمی‌دید
  useEffect(() => () => pendingPreviews.forEach(url => URL.revokeObjectURL(url)), [pendingPreviews])

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.products.addImage}</label>
      <div className="flex flex-wrap gap-2">
        {product.images.map(key => (
          <div key={key} className="relative size-16 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200">
            <img
              src={productImageUrl(product.id, key)}
              alt=""
              onClick={() => setZoomSrc(productImageUrl(product.id, key))}
              className="size-full cursor-zoom-in object-cover"
            />
            <button
              onClick={() => remove.mutate({ productId: product.id, key })}
              className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        ))}
        {pendingPreviews.map(url => (
          <div key={url} className="relative size-16 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200 opacity-60">
            <img src={url} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          </div>
        ))}
        {product.images.length < 4 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex size-16 items-center justify-center rounded-xl border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
          >
            +
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.maxImages}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
          if (!files.length) return
          const previewUrls = files.map(f => URL.createObjectURL(f))
          setPendingPreviews(prev => [...prev, ...previewUrls])
          upload.mutate({ productId: product.id, files }, {
            // سرور SellerProduct به‌روز (با عکس‌های جدید) را برمی‌گرداند — مستقیم به صفحه‌ی
            // والد پاس داده می‌شود تا پیش‌نمایش فوری باشد، نه منتظر رفت‌وبرگشت invalidate
            onSuccess: updated => onProductUpdated(updated),
            onSettled: () => {
              previewUrls.forEach(url => URL.revokeObjectURL(url))
              setPendingPreviews(prev => prev.filter(url => !previewUrls.includes(url)))
            },
          })
          e.target.value = ''
        }}
      />
      {zoomSrc && <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} analyticsSource="seller_product_image" />}
    </div>
  )
}

// docs/PRD-product-video.md بخش ۴ — چندویدیویی (سقف ۴ تا)، عیناً الگوی ProductImages بالا
// (نه StoreLogoUpload تک‌فایل قدیمی)
function ProductVideo({
  product,
  onProductUpdated,
}: {
  product: SellerProduct
  onProductUpdated: (product: SellerProduct) => void
}) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductVideo(storeId)
  const remove = useRemoveProductVideo(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
  }, [pendingPreview])

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.products.videoLabel}
      </label>
      <div className="flex flex-wrap gap-2">
        {product.videos.map(v => (
          <div key={v.key} className="relative h-16 w-24 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200">
            <video src={productVideoUrl(product.id, v.key)} className="size-full object-cover" />
            <button
              onClick={() => remove.mutate({ productId: product.id, key: v.key }, { onSuccess: updated => onProductUpdated(updated) })}
              disabled={remove.isPending}
              className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        ))}
        {pendingPreview && (
          <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200 opacity-60">
            <video src={pendingPreview} className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          </div>
        )}
        {product.videos.length < 4 && !pendingPreview && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
          >
            +
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.videoHint}</p>
      {upload.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(upload.error, fa.seller.panel.products.videoUploadError)}</p>
      )}
      {remove.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(remove.error, fa.seller.panel.products.videoRemoveError)}</p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const previewUrl = URL.createObjectURL(file)
          setPendingPreview(previewUrl)
          upload.mutate(
            { productId: product.id, file },
            {
              onSuccess: updated => onProductUpdated(updated),
              onSettled: () => {
                URL.revokeObjectURL(previewUrl)
                setPendingPreview(null)
              },
            },
          )
          e.target.value = ''
        }}
      />
    </div>
  )
}

// docs/PRD-product-display-focus-and-variations.md §۴.۱ — فاز ۱ حداکثر ۲ بعد (سایز/رنگ)
const MAX_OPTION_TYPES = 2

type DraftOptionType = { name: string; values: string[] }
type DraftVariantRow = { stock: string; priceOverride: string; sku: string; weightGrams: string; purityKarat: string }

function comboKey(optionValues: Record<string, string>): string {
  return Object.keys(optionValues).sort().map(k => `${k}=${optionValues[k]}`).join('|')
}

// ترکیب دکارتی — فقط وقتی همه‌ی گزینه‌ها حداقل یک مقدار دارند تولید می‌شود، وگرنه حین
// تایپ (گزینه‌ی تازه‌ساخته‌شده‌ی هنوز بدون مقدار) ترکیب‌های ناقص/گمراه‌کننده نشان داده می‌شود
function cartesianCombos(optionTypes: DraftOptionType[]): Record<string, string>[] {
  const valid = optionTypes.filter(o => o.name.trim() && o.values.length > 0)
  if (valid.length === 0 || valid.length !== optionTypes.length) return []
  return valid.reduce<Record<string, string>[]>((acc, opt) => {
    if (acc.length === 0) return opt.values.map(v => ({ [opt.name]: v }))
    return acc.flatMap(combo => opt.values.map(v => ({ ...combo, [opt.name]: v })))
  }, [])
}

// سوئیچ «چند حالت داره؟» + فرم دستی گزینه/مقدار + جدول ترکیب‌ها (docs/PRD-product-display-focus-and-variations.md
// §۴.۱) + ساخت گزینه‌ها از توضیح متنی آزاد با AI (§۴.۱.۱، فاز ۲) — کنار مسیر دستی، نه جایگزینش؛
// auto-save ممنوع، فقط همین جدول را با چیپ‌های قابل‌ویرایش پیش‌پر می‌کند.
function ProductVariantsEditor({
  product,
  storeId,
  onProductUpdated,
  aiPrefill,
}: {
  product: SellerProduct
  storeId: string
  onProductUpdated: (product: SellerProduct) => void
  // فیدبک کاربر ۱۴۰۵/۰۷/۱۵ — اگر فروشنده همین حالت‌ها را قبلاً در متن افزودن تکی محصول گفته
  // بود (مثلاً «سایز M سه تا»)، همین‌جا بعد از ساخت محصول پایه یک‌بار پیش‌پر شود
  aiPrefill?: ExtractedVariantOption[]
}) {
  const replaceVariants = useReplaceProductVariants(storeId)
  const generateOptions = useGenerateProductOptionsFromText(storeId)
  const [enabled, setEnabled] = useState((product.optionTypes?.length ?? 0) > 0)
  const [optionTypes, setOptionTypes] = useState<DraftOptionType[]>([])
  const [rowsByKey, setRowsByKey] = useState<Record<string, DraftVariantRow>>({})
  const [newValueDrafts, setNewValueDrafts] = useState<Record<number, string>>({})
  const [initialized, setInitialized] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiAssumptions, setAiAssumptions] = useState<string[]>([])
  const aiPrefillAppliedRef = useRef(false)

  useEffect(() => { setInitialized(false); aiPrefillAppliedRef.current = false }, [product.id])
  useEffect(() => {
    if (initialized) return
    setEnabled((product.optionTypes?.length ?? 0) > 0)
    setOptionTypes(
      (product.optionTypes ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(o => ({ name: o.name, values: o.values.slice().sort((a, b) => a.position - b.position).map(v => v.value) })),
    )
    const rows: Record<string, DraftVariantRow> = {}
    for (const v of product.variants ?? []) {
      rows[comboKey(v.optionValues)] = {
        stock: String(v.stock),
        priceOverride: v.priceOverride != null ? String(v.priceOverride) : '',
        sku: v.sku ?? '',
        weightGrams: v.weightGrams != null ? String(v.weightGrams) : '',
        purityKarat: v.purityKarat != null ? String(v.purityKarat) : '',
      }
    }
    setRowsByKey(rows)
    setInitialized(true)
  }, [initialized, product.optionTypes, product.variants])

  const combos = enabled ? cartesianCombos(optionTypes) : []

  // تک‌دیزاین مشترک بین دکمه‌ی «استخراج از متن» همین کامپوننت و پیش‌پرشدن خودکار بعد از
  // افزودن تکی محصول با متن؛ فقط وقتی دقیقاً یک نوع گزینه برگردد موجودی هر مقدار هم ست می‌شود
  // (برای ۲ نوع گزینه، موجودی مال کدام ترکیب است از متن مشخص نیست، پس دست‌نخورده صفر می‌ماند)
  function applyExtractedOptions(options: ExtractedVariantOption[]) {
    setOptionTypes(options.map(o => ({ name: o.name, values: o.values.map(v => v.value) })))
    if (options.length === 1) {
      const only = options[0]
      setRowsByKey(prev => {
        const next = { ...prev }
        for (const v of only.values) {
          if (v.stock == null) continue
          const key = comboKey({ [only.name]: v.value })
          next[key] = { ...(next[key] ?? { stock: '0', priceOverride: '', sku: '', weightGrams: '', purityKarat: '' }), stock: String(v.stock) }
        }
        return next
      })
    }
    setExcludedKeys(new Set())
  }

  useEffect(() => {
    if (!initialized || aiPrefillAppliedRef.current) return
    if (aiPrefill && aiPrefill.length > 0 && (product.optionTypes?.length ?? 0) === 0) {
      aiPrefillAppliedRef.current = true
      setEnabled(true)
      applyExtractedOptions(aiPrefill)
    }
  }, [initialized, aiPrefill, product.optionTypes])

  function applyAiOptions() {
    if (!aiText.trim()) return
    generateOptions.mutate(
      { productId: product.id, rawText: aiText },
      {
        onSuccess: res => {
          applyExtractedOptions(res.optionTypes)
          setAiAssumptions(res.assumptions)
        },
      },
    )
  }

  function addOptionType() {
    if (optionTypes.length >= MAX_OPTION_TYPES) return
    setOptionTypes(prev => [...prev, { name: '', values: [] }])
  }
  function removeOptionType(index: number) {
    setOptionTypes(prev => prev.filter((_, i) => i !== index))
  }
  function renameOptionType(index: number, name: string) {
    setOptionTypes(prev => prev.map((o, i) => (i === index ? { ...o, name } : o)))
  }
  function addValue(index: number) {
    const draft = (newValueDrafts[index] ?? '').trim()
    if (!draft) return
    setOptionTypes(prev =>
      prev.map((o, i) => (i === index && !o.values.includes(draft) ? { ...o, values: [...o.values, draft] } : o)),
    )
    setNewValueDrafts(prev => ({ ...prev, [index]: '' }))
  }
  function removeValue(index: number, value: string) {
    setOptionTypes(prev => prev.map((o, i) => (i === index ? { ...o, values: o.values.filter(v => v !== value) } : o)))
  }
  function removeCombo(key: string) {
    setRowsByKey(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setExcludedKeys(prev => new Set(prev).add(key))
  }
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set())
  const visibleCombos = combos.filter(c => !excludedKeys.has(comboKey(c)))

  function rowFor(key: string): DraftVariantRow {
    return rowsByKey[key] ?? { stock: '0', priceOverride: '', sku: '', weightGrams: '', purityKarat: '' }
  }
  function updateRow(key: string, patch: Partial<DraftVariantRow>) {
    setRowsByKey(prev => ({ ...prev, [key]: { ...rowFor(key), ...patch } }))
    setExcludedKeys(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const allZeroStock = enabled && visibleCombos.length > 0 && visibleCombos.every(c => (Number(toEnglishDigits(rowFor(comboKey(c)).stock)) || 0) === 0)

  function save() {
    const dto: ReplaceProductVariantsInput = enabled
      ? {
          optionTypes: optionTypes
            .filter(o => o.name.trim() && o.values.length > 0)
            .map(o => ({ name: o.name.trim(), values: o.values })),
          variants: visibleCombos.map(ov => {
            const row = rowFor(comboKey(ov))
            return {
              optionValues: ov,
              stock: Number(toEnglishDigits(row.stock)) || 0,
              priceOverride: row.priceOverride ? Number(toEnglishDigits(row.priceOverride)) || 0 : null,
              sku: row.sku.trim() || undefined,
              weightGrams: row.weightGrams ? Number(toEnglishDigits(row.weightGrams)) || undefined : undefined,
              purityKarat: row.purityKarat ? Number(row.purityKarat) || undefined : undefined,
            }
          }),
        }
      : { optionTypes: [], variants: [] }
    replaceVariants.mutate(
      { productId: product.id, dto },
      {
        onSuccess: updated => {
          onProductUpdated(updated)
          setExcludedKeys(new Set())
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  return (
    <div className="mb-6">
      <div className="divide-y divide-slate-800 light:divide-slate-200">
        <ToggleRow label={fa.seller.panel.products.variantsToggleLabel} checked={enabled} onChange={setEnabled} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.variantsToggleHint}</p>

      {enabled && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              placeholder={fa.seller.panel.products.variantsAiTextPlaceholder}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-3 py-1.5 text-xs text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={applyAiOptions}
              disabled={generateOptions.isPending || !aiText.trim()}
              className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {generateOptions.isPending ? fa.seller.panel.products.variantsAiLoading : fa.seller.panel.products.variantsAiButton}
            </button>
            {generateOptions.isError && (
              <p className="mt-1.5 text-[11px] text-red-400">{extractErrorMessage(generateOptions.error, fa.seller.panel.products.variantsAiError)}</p>
            )}
            {aiAssumptions.length > 0 && (
              <div className="mt-2 rounded-lg bg-slate-800/60 light:bg-slate-100 p-2">
                <p className="mb-1 text-[11px] font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.variantsAiAssumptionsTitle}</p>
                {aiAssumptions.map((a, i) => (
                  <p key={i} className="text-[11px] text-slate-400 light:text-slate-600">· {a}</p>
                ))}
              </div>
            )}
          </div>
          <p className="-mt-2 text-center text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.variantsAiOr}</p>
          {optionTypes.map((opt, i) => (
            <div key={i} className="rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  placeholder={fa.seller.panel.products.variantsOptionNamePlaceholder}
                  value={opt.name}
                  onChange={e => renameOptionType(i, e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeOptionType(i)}
                  className="shrink-0 text-slate-500 hover:text-red-400"
                  aria-label={fa.seller.panel.products.variantsRemoveOption}
                >
                  ×
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {opt.values.map(v => (
                  <span key={v} className="flex items-center gap-1 rounded-full bg-slate-700/60 light:bg-slate-200 px-2.5 py-1 text-xs text-slate-200 light:text-slate-800">
                    {v}
                    <button type="button" onClick={() => removeValue(i, v)} className="text-slate-400 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
              <input
                placeholder={fa.seller.panel.products.variantsOptionValuesPlaceholder}
                value={newValueDrafts[i] ?? ''}
                onChange={e => setNewValueDrafts(prev => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addValue(i)
                  }
                }}
                className="w-full rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-3 py-1.5 text-xs text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ))}
          {optionTypes.length < MAX_OPTION_TYPES ? (
            <button
              type="button"
              onClick={addOptionType}
              className="rounded-xl border border-dashed border-slate-600 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-500"
            >
              {fa.seller.panel.products.variantsAddOptionType}
            </button>
          ) : (
            <p className="text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.variantsMaxOptionTypes}</p>
          )}

          {visibleCombos.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.products.variantsCombinationsTitle}</p>
              <p className="mb-2 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.variantsCombinationsHint}</p>
              <div className="flex flex-col gap-2">
                {visibleCombos.map(ov => {
                  const key = comboKey(ov)
                  const row = rowFor(key)
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-xl bg-slate-800/40 light:bg-slate-50 p-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-300 light:text-slate-700">
                        {Object.entries(ov).map(([k, v]) => `${k}: ${v}`).join('، ')}
                      </span>
                      {product.pricingModel === 'WEIGHT_BASED_FORMULA' && (
                        <input
                          value={row.weightGrams}
                          onChange={e => updateRow(key, { weightGrams: toEnglishDigits(e.target.value).replace(/[^\d.]/g, '') })}
                          placeholder={fa.seller.panel.products.weightGramsLabel}
                          dir="ltr"
                          inputMode="decimal"
                          className="w-16 shrink-0 rounded-lg border border-amber-500/40 bg-transparent px-2 py-1.5 text-center text-xs text-slate-200 light:text-slate-900"
                        />
                      )}
                      <input
                        value={row.stock}
                        onChange={e => updateRow(key, { stock: toEnglishDigits(e.target.value).replace(/\D/g, '') })}
                        placeholder={fa.seller.panel.products.variantsStockPlaceholder}
                        dir="ltr"
                        inputMode="numeric"
                        className="w-16 shrink-0 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2 py-1.5 text-center text-xs text-slate-200 light:text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => removeCombo(key)}
                        className="shrink-0 text-slate-500 hover:text-red-400"
                        aria-label={fa.seller.panel.products.variantsRemoveCombination}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
              {allZeroStock && (
                <p className="mt-2 text-[11px] text-amber-500">{fa.seller.panel.products.variantsZeroStockWarning}</p>
              )}
            </div>
          )}
          {optionTypes.length > 0 && visibleCombos.length === 0 && (
            <p className="text-xs text-slate-500">{fa.seller.panel.products.variantsNoCombinations}</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={replaceVariants.isPending}
            className="rounded-xl border border-emerald-500/60 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
          >
            {saved ? fa.seller.panel.products.variantsSaved : fa.seller.panel.products.variantsSave}
          </button>
        </div>
      )}
    </div>
  )
}

// فروشنده هرچقدر می‌خواهد می‌تواند بنویسد (دیگر سقف سختگیرانه‌ای در فرانت نیست)؛ فقط DTO
// بک‌اند (create-product.dto.ts/update-product.dto.ts) سقف واقعی ۵۰۰۰/۲۰۰ را enforce می‌کند —
// این‌جا فقط برای فیدبک فوری به فروشنده قبل از Save تکرار شده
const NAME_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 5000
// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۱ — از همان ۱۸ دسته‌ی
// ثابت ثبت‌نام استفاده می‌شود (fa.ts:449-454)، نه یک لیست موازی جدید
const GOLD_CATEGORY_NAMES = ['جواهرات و اکسسوری']
const PURITY_KARAT_OPTIONS = [18, 21, 22, 24]

// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۲ — فیلدهای وزن/عیار +
// پیش‌نمایش زنده به‌جای فیلد «قیمت» وقتی pricingModel=WEIGHT_BASED_FORMULA است
function GoldPricingFields({
  storeId,
  weightGrams,
  setWeightGrams,
  purityKarat,
  setPurityKarat,
  stock,
  setStock,
  goldPricingConfigured,
  hasCustomGoldWage,
  setHasCustomGoldWage,
  productGoldWageType,
  setProductGoldWageType,
  productGoldWageValue,
  setProductGoldWageValue,
  productGoldProfitPercent,
  setProductGoldProfitPercent,
}: {
  storeId: string
  weightGrams: string
  setWeightGrams: (v: string) => void
  purityKarat: string
  setPurityKarat: (v: string) => void
  stock: string
  setStock: (v: string) => void
  goldPricingConfigured: boolean
  hasCustomGoldWage: boolean
  setHasCustomGoldWage: (v: boolean) => void
  productGoldWageType: 'PERCENT' | 'FIXED_PER_GRAM'
  setProductGoldWageType: (v: 'PERCENT' | 'FIXED_PER_GRAM') => void
  productGoldWageValue: string
  setProductGoldWageValue: (v: string) => void
  productGoldProfitPercent: string
  setProductGoldProfitPercent: (v: string) => void
}) {
  const preview = useGoldPricePreview(
    storeId,
    weightGrams ? Number(toEnglishDigits(weightGrams)) : null,
    purityKarat ? Number(purityKarat) : null,
    hasCustomGoldWage
      ? {
          goldWageType: productGoldWageType,
          goldWageValue: productGoldWageValue ? Number(toEnglishDigits(productGoldWageValue)) : undefined,
          goldProfitPercent: productGoldProfitPercent ? Number(toEnglishDigits(productGoldProfitPercent)) : undefined,
        }
      : undefined,
  )

  return (
    <div className="mb-6">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Input
          label={fa.seller.panel.products.weightGramsLabel}
          value={weightGrams}
          onChange={e => setWeightGrams(toEnglishDigits(e.target.value).replace(/[^\d.]/g, ''))}
          dir="ltr"
          inputMode="decimal"
          className="text-center"
        />
        <Input
          label={fa.seller.panel.products.stockLabel}
          value={stock}
          onChange={e => setStock(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
          dir="ltr"
          inputMode="numeric"
          className="text-center"
        />
      </div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.products.purityKaratLabel}
      </label>
      <div className="mb-3 flex gap-2">
        {PURITY_KARAT_OPTIONS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setPurityKarat(String(k))}
            className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
              Number(purityKarat) === k
                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <ToggleRow
          label={fa.seller.panel.products.customGoldWageToggleLabel}
          checked={hasCustomGoldWage}
          onChange={setHasCustomGoldWage}
        />
      </div>

      {hasCustomGoldWage && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setProductGoldWageType('PERCENT')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${productGoldWageType === 'PERCENT' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypePercent}
            </button>
            <button
              type="button"
              onClick={() => setProductGoldWageType('FIXED_PER_GRAM')}
              className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${productGoldWageType === 'FIXED_PER_GRAM' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 light:border-slate-300 text-slate-400'}`}
            >
              {fa.seller.panel.storeSettings.goldWageTypeFixedPerGram}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={
                productGoldWageType === 'PERCENT'
                  ? fa.seller.panel.storeSettings.goldWageValuePercentLabel
                  : fa.seller.panel.storeSettings.goldWageValueFixedLabel
              }
              value={productGoldWageValue}
              onChange={e => setProductGoldWageValue(e.target.value.replace(/[^\d.]/g, ''))}
              dir="ltr"
              inputMode="decimal"
              className="text-center"
            />
            <Input
              label={fa.seller.panel.storeSettings.goldProfitPercentLabel}
              value={productGoldProfitPercent}
              onChange={e => setProductGoldProfitPercent(e.target.value.replace(/[^\d.]/g, ''))}
              dir="ltr"
              inputMode="decimal"
              className="text-center"
            />
          </div>
        </div>
      )}

      {!hasCustomGoldWage && !goldPricingConfigured ? (
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300">
          {fa.seller.panel.products.goldSettingsMissing}{' '}
          <Link to="/seller/panel/store-settings" className="font-semibold underline">
            {fa.seller.panel.products.goldSettingsMissingLink}
          </Link>
        </p>
      ) : preview.data?.error ? (
        <p className="rounded-xl bg-slate-800/40 light:bg-slate-50 p-3 text-xs text-slate-500">{preview.data.error}</p>
      ) : preview.data?.price != null ? (
        <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
          {fa.seller.panel.products.goldPricePreviewLabel} {preview.data.price.toLocaleString('fa-IR')} {fa.common.toman}
        </p>
      ) : null}
    </div>
  )
}

function BackChevron() {
  // قانون RTL پروژه: آیکون «بازگشت» باید به راست اشاره کند (CLAUDE.md)
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — قبلاً ویرایش محصول یک مودال/شیت پایین‌صفحه بود؛ به یک صفحه‌ی
// مستقل تبدیل شد (همون الگوی TicketDetailPage.tsx/InvoiceDetailPage.tsx: دکمه‌ی بازگشت بالا،
// بدون محدودیت ارتفاع مصنوعی). منطق فرم عیناً همان ProductSheet قبلی است.
export function SellerProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { storeId, storeSlug, category, goldWageType, goldWageValue, goldProfitPercent } = useSellerStore()
  const products = useProducts(storeId)
  const isNew = id === 'new'

  // نتیجه‌ی آپلود عکس/ایجاد را مستقیم override می‌کنیم تا منتظر invalidate+refetch نباشیم
  // (همون دلیل A1 قبلی) — با عوض‌شدن id (مثلاً از لیست یک محصول دیگر باز شد) ریست می‌شود.
  // استثنا: وقتی خودمان بعد از ساخت محصول تازه id را به شناسه‌ی واقعی عوض می‌کنیم (پایین،
  // docs/PRD-seller-knowledge-base.md بخش ۹.۲ مورد ۲)، override را نگه می‌داریم تا صفحه بدون
  // فلیکر «در حال بارگذاری» مستقیم به حالت ویرایش سوییچ کند
  const [override, setOverride] = useState<SellerProduct | null>(null)
  const justCreatedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (justCreatedIdRef.current === id) {
      justCreatedIdRef.current = null
      return
    }
    setOverride(null)
  }, [id])

  const found = isNew ? 'new' : (override ?? products.data?.find(p => p.id === id) ?? null)

  const update = useUpdateProduct(storeId)
  const create = useCreateProduct(storeId)
  const remove = useDeleteProduct(storeId)
  const pending = update.isPending || create.isPending || remove.isPending

  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۵ — افزودن تکی با متن؛
  // همان endpoint بولک موجود را صدا می‌زند و فقط نتیجه‌ی اول آرایه را مصرف می‌کند (تصمیم کاربر)
  const extractFromText = useExtractProductsFromText(storeId)
  const [aiProductText, setAiProductText] = useState('')
  // فیدبک کاربر ۱۴۰۵/۰۷/۱۵ — اگر همین متن حالت‌هایی (سایز/رنگ) هم داشت، بعد از ساخت محصول
  // پایه به ProductVariantsEditor پاس داده می‌شود تا خودش را با آن پیش‌پر کند
  const [pendingVariantOptions, setPendingVariantOptions] = useState<ExtractedVariantOption[]>([])

  // فیدبک کاربر ۱۴۰۵/۰۷/۱۵ (دور دوم) — بالای همین متن، ضبط صدا یا آپلود فایل صوتی هم ممکن
  // باشد؛ عیناً الگوی ProductDescriptionModal.tsx (ضبط با MediaRecorder) و
  // BulkProductImportSheet در SellerProductsPage.tsx (آپلود فایل صوتی)، فقط هر دو این‌جا کنار هم
  const transcribeAudio = useTranscribeAudio(storeId)
  const transcribeAudioFile = useTranscribeAudioFile(storeId)
  const [aiVoiceRecording, setAiVoiceRecording] = useState(false)
  const aiVoiceRecorderRef = useRef<MediaRecorder | null>(null)
  const aiVoiceChunksRef = useRef<Blob[]>([])
  const aiVoiceFileInputRef = useRef<HTMLInputElement>(null)

  function appendAiProductText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setAiProductText(prev => (prev ? `${prev}\n${trimmed}` : trimmed))
  }

  async function toggleAiVoiceRecording() {
    if (aiVoiceRecording) {
      aiVoiceRecorderRef.current?.stop()
      setAiVoiceRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      aiVoiceChunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) aiVoiceChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(aiVoiceChunksRef.current, { type: 'audio/webm' })
        transcribeAudio.mutate(blob, { onSuccess: ({ text }) => appendAiProductText(text) })
      }
      aiVoiceRecorderRef.current = recorder
      recorder.start()
      setAiVoiceRecording(true)
    } catch {
      // دسترسی میکروفون رد شد — دکمه به حالت اولیه برمی‌گردد
    }
  }

  // همون الگوی کپی لینک وب در SellerProductsPage.tsx — این‌جا هم تکرار شده تا از صفحه‌ی
  // ویرایش محصول (بدون برگشت به لیست) قابل کپی باشد
  const [linkCopied, setLinkCopied] = useState(false)
  async function copyProductLink(productId: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/shop/${storeSlug}?product=${productId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // docs/PRD-product-display-focus-and-variations.md §۲.۴ — لینک اختصاصی تلگرام همین محصول؛
  // بدون یوزرنیم بات (هنوز ساخته نشده) دکمه کلاً نمایش داده نمی‌شود، همون الگوی SellerMorePage
  const telegramLink = useProductTelegramLink(storeId)
  const [telegramCopied, setTelegramCopied] = useState(false)
  async function copyTelegramLink(productId: string) {
    if (!env.VITE_TELEGRAM_BOT_USERNAME) return
    const { shortCode } = await telegramLink.mutateAsync(productId)
    await navigator.clipboard.writeText(`https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=p_${shortCode}`)
    setTelegramCopied(true)
    setTimeout(() => setTelegramCopied(false), 2000)
  }

  const product = found
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [description, setDescription] = useState('')
  const [specs, setSpecs] = useState<ProductSpecSuggestion[]>([])
  const [code, setCode] = useState('')
  const [persuasionTechniquesEnabled, setPersuasionTechniquesEnabled] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false)

  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۱ — پیش‌فرض خاموش؛ فقط
  // برای محصول تازه در دسته‌ی طلا/جواهر پیشنهاد نرم روشن می‌شود (کاملاً قابل‌تغییر فروشنده)
  const [isWeightBased, setIsWeightBased] = useState(false)
  const [weightGrams, setWeightGrams] = useState('')
  const [purityKarat, setPurityKarat] = useState('18')
  // فیدبک کاربر ۱۴۰۵/۰۷/۱۴ — اجرت/سود می‌تواند بین محصولات فرق کند؛ پیش‌فرض خاموش (یعنی از
  // تنظیمات فروشگاه استفاده کن)
  const [hasCustomGoldWage, setHasCustomGoldWage] = useState(false)
  const [productGoldWageType, setProductGoldWageType] = useState<'PERCENT' | 'FIXED_PER_GRAM'>('PERCENT')
  const [productGoldWageValue, setProductGoldWageValue] = useState('')
  const [productGoldProfitPercent, setProductGoldProfitPercent] = useState('')

  // فرم فقط یک‌بار از دیتای واقعی پر می‌شود (نه هر رندر، وگرنه تایپ فروشنده با هر invalidate
  // پاک می‌شد)؛ با عوض‌شدن id دوباره مقداردهی می‌شود
  useEffect(() => {
    setInitialized(false)
  }, [id])
  useEffect(() => {
    if (initialized || !product) return
    if (product !== 'new') {
      setName(product.name)
      setPrice(String(product.basePrice))
      setStock(String(product.stock))
      setDescription(product.description ?? '')
      setSpecs(product.specs ?? [])
      setCode(product.code ?? '')
      setPersuasionTechniquesEnabled(product.persuasionTechniquesEnabled)
      setIsWeightBased(product.pricingModel === 'WEIGHT_BASED_FORMULA')
      setWeightGrams(product.weightGrams != null ? String(product.weightGrams) : '')
      setPurityKarat(product.purityKarat != null ? String(product.purityKarat) : '18')
      setHasCustomGoldWage(product.goldWageType != null)
      if (product.goldWageType) setProductGoldWageType(product.goldWageType)
      setProductGoldWageValue(product.goldWageValue != null ? String(product.goldWageValue) : '')
      setProductGoldProfitPercent(product.goldProfitPercent != null ? String(product.goldProfitPercent) : '')
    } else if (GOLD_CATEGORY_NAMES.includes(category ?? '')) {
      // بخش ۳.۱ سند — پیشنهاد نرم برای محصول تازه در دسته‌ی طلا/جواهر، نه قفل
      setIsWeightBased(true)
    }
    setInitialized(true)
  }, [initialized, product, category])

  function goBack() {
    navigate('/seller/panel/products')
  }

  function save() {
    const dto = {
      name,
      basePrice: isWeightBased ? 0 : Number(toEnglishDigits(price)) || 0,
      stock: stock ? Number(toEnglishDigits(stock)) : undefined,
      description: description || undefined,
      specs: specs.length ? specs : null,
      code: code.trim() || undefined,
      persuasionTechniquesEnabled,
      pricingModel: (isWeightBased ? 'WEIGHT_BASED_FORMULA' : 'FIXED') as 'WEIGHT_BASED_FORMULA' | 'FIXED',
      weightGrams: isWeightBased ? Number(toEnglishDigits(weightGrams)) || undefined : undefined,
      purityKarat: isWeightBased ? Number(purityKarat) : undefined,
      // فیدبک کاربر ۱۴۰۵/۰۷/۱۴ — اجرت/سود اختصاصی؛ وقتی سوئیچ خاموش است برای محصول موجود
      // صریح null می‌فرستیم تا override قبلی پاک شود (برگشت به پیش‌فرض فروشگاه)، برای محصول
      // تازه undefined کافی‌ست (اصلاً override‌ای وجود نداشته)
      goldWageType: hasCustomGoldWage ? productGoldWageType : isNew ? undefined : null,
      goldWageValue: hasCustomGoldWage ? Number(toEnglishDigits(productGoldWageValue)) || undefined : isNew ? undefined : null,
      goldProfitPercent: hasCustomGoldWage
        ? Number(toEnglishDigits(productGoldProfitPercent)) || undefined
        : isNew
          ? undefined
          : null,
    }
    if (isNew) {
      // فیدبک کاربر/تصمیم PRD بخش ۹.۲ مورد ۲ — بعد از ذخیره‌ی محصول تازه به لیست برنمی‌گردیم؛
      // همان صفحه فوراً به حالت ویرایش محصول واقعی سوییچ می‌شود (بدون رفت‌وبرگشت)
      create.mutate(dto as CreateProductInput, {
        onSuccess: created => {
          justCreatedIdRef.current = created.id
          setOverride(created)
          navigate(`/seller/panel/products/${created.id}`, { replace: true })
        },
      })
    } else if (product && product !== 'new') {
      update.mutate({ productId: product.id, dto }, { onSuccess: goBack })
    }
  }

  function remove_() {
    if (isNew || !product || product === 'new') return
    if (!window.confirm(fa.seller.panel.products.deleteConfirm)) return
    remove.mutate(product.id, { onSuccess: goBack })
  }

  if (!isNew && products.isLoading) {
    return (
      <div className="flex items-center justify-center px-5 py-12 text-sm text-slate-400 light:text-slate-500">
        {fa.common.loading}
      </div>
    )
  }
  if (!isNew && !product) {
    return (
      <div className="px-5 py-6">
        <button onClick={goBack} className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800">
          <BackChevron />
          {fa.seller.panel.products.backToList}
        </button>
        <p className="text-sm text-slate-500">{fa.seller.panel.products.notFound}</p>
      </div>
    )
  }

  const existingProduct = product !== 'new' ? product : null

  function applyAiProductText() {
    if (!aiProductText.trim()) return
    extractFromText.mutate(
      aiProductText,
      {
        onSuccess: res => {
          const first = res.items[0]
          if (!first) return
          setName(first.name)
          if (first.description) setDescription(first.description)
          if (first.basePrice != null) setPrice(String(first.basePrice))
          if (first.stock != null) setStock(String(first.stock))
          if (first.code) setCode(first.code)
          if (first.weightGrams != null || first.purityKarat != null) {
            setIsWeightBased(true)
            if (first.weightGrams != null) setWeightGrams(String(first.weightGrams))
            if (first.purityKarat != null) setPurityKarat(String(first.purityKarat))
          }
          if (first.goldWageType && first.goldWageValue != null && first.goldProfitPercent != null) {
            setIsWeightBased(true)
            setHasCustomGoldWage(true)
            setProductGoldWageType(first.goldWageType)
            setProductGoldWageValue(String(first.goldWageValue))
            setProductGoldProfitPercent(String(first.goldProfitPercent))
          }
          if (first.variantOptions && first.variantOptions.length > 0) {
            setPendingVariantOptions(first.variantOptions)
          }
        },
      },
    )
  }

  return (
    <div className="px-5 py-6">
      <button onClick={goBack} className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800">
        <BackChevron />
        {fa.seller.panel.products.backToList}
      </button>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-100 light:text-slate-900">
          {isNew ? fa.seller.panel.products.addProduct : fa.seller.panel.products.editProduct}
        </h1>
        {existingProduct && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => void copyProductLink(existingProduct.id)}
              className="rounded-lg border border-slate-700/60 light:border-slate-200 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 light:text-slate-600 light:hover:text-slate-900"
            >
              {linkCopied ? fa.seller.panel.products.productLinkCopied : fa.seller.panel.products.copyProductLink}
            </button>
            {env.VITE_TELEGRAM_BOT_USERNAME && (
              <button
                onClick={() => void copyTelegramLink(existingProduct.id)}
                disabled={telegramLink.isPending}
                className="rounded-lg border border-slate-700/60 light:border-slate-200 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 light:text-slate-600 light:hover:text-slate-900 disabled:opacity-50"
              >
                {telegramCopied ? fa.seller.panel.products.telegramLinkCopied : fa.seller.panel.products.copyTelegramLink}
              </button>
            )}
          </div>
        )}
      </div>

      {isNew && (
        <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-400">{fa.seller.panel.products.aiTextAddTitle}</p>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => void toggleAiVoiceRecording()}
              disabled={transcribeAudio.isPending || transcribeAudioFile.isPending}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold disabled:opacity-40 ${
                aiVoiceRecording
                  ? 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-slate-700 light:border-slate-300 text-slate-300 light:text-slate-700'
              }`}
            >
              🎙️ {aiVoiceRecording ? fa.seller.panel.products.aiTextAddVoiceRecording : fa.seller.panel.products.aiTextAddVoiceRecord}
            </button>
            <button
              type="button"
              onClick={() => aiVoiceFileInputRef.current?.click()}
              disabled={aiVoiceRecording || transcribeAudio.isPending || transcribeAudioFile.isPending}
              className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-1.5 text-[11px] font-semibold text-slate-300 light:text-slate-700 disabled:opacity-40"
            >
              {fa.seller.panel.products.aiTextAddVoiceUpload}
            </button>
            <input
              ref={aiVoiceFileInputRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) transcribeAudioFile.mutate(file, { onSuccess: ({ text }) => appendAiProductText(text) })
                e.target.value = ''
              }}
            />
          </div>
          {(transcribeAudio.isPending || transcribeAudioFile.isPending) && (
            <p className="mb-2 text-[11px] text-slate-400">{fa.seller.panel.products.aiTextAddVoiceTranscribing}</p>
          )}
          {(transcribeAudio.isError || transcribeAudioFile.isError) && (
            <p className="mb-2 text-[11px] text-red-400">{fa.seller.panel.products.aiTextAddVoiceError}</p>
          )}
          <textarea
            value={aiProductText}
            onChange={e => setAiProductText(e.target.value)}
            placeholder={fa.seller.panel.products.aiTextAddPlaceholder}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-3 py-1.5 text-xs text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={applyAiProductText}
            disabled={extractFromText.isPending || !aiProductText.trim()}
            className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {extractFromText.isPending ? fa.common.loading : fa.seller.panel.products.aiTextAddButton}
          </button>
          {extractFromText.isError && (
            <p className="mt-1.5 text-[11px] text-red-400">{extractErrorMessage(extractFromText.error, fa.common.error)}</p>
          )}
        </div>
      )}

      <div className="mb-5">
        <Input label={fa.seller.panel.products.nameLabel} value={name} onChange={e => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} />
      </div>
      <div className="mb-5">
        <Input
          label={fa.seller.panel.products.codeLabel}
          placeholder={fa.seller.panel.products.codePlaceholder}
          value={code}
          onChange={e => setCode(e.target.value)}
          dir="ltr"
        />
      </div>
      <div className="mb-3">
        <ToggleRow
          label={fa.seller.panel.products.weightBasedToggleLabel}
          checked={isWeightBased}
          onChange={setIsWeightBased}
        />
      </div>

      {isWeightBased ? (
        <GoldPricingFields
          storeId={storeId}
          weightGrams={weightGrams}
          setWeightGrams={setWeightGrams}
          purityKarat={purityKarat}
          setPurityKarat={setPurityKarat}
          stock={stock}
          setStock={setStock}
          goldPricingConfigured={!!goldWageType && goldWageValue != null && goldProfitPercent != null}
          hasCustomGoldWage={hasCustomGoldWage}
          setHasCustomGoldWage={setHasCustomGoldWage}
          productGoldWageType={productGoldWageType}
          setProductGoldWageType={setProductGoldWageType}
          productGoldWageValue={productGoldWageValue}
          setProductGoldWageValue={setProductGoldWageValue}
          productGoldProfitPercent={productGoldProfitPercent}
          setProductGoldProfitPercent={setProductGoldProfitPercent}
        />
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Input
            label={fa.seller.panel.products.priceLabel}
            value={formatThousands(price)}
            onChange={e => setPrice(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            dir="ltr"
            inputMode="numeric"
            className="text-center"
          />
          <Input
            label={fa.seller.panel.products.stockLabel}
            value={stock}
            onChange={e => setStock(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            dir="ltr"
            inputMode="numeric"
            className="text-center"
          />
        </div>
      )}

      {product && product !== 'new' && (
        <>
          <ProductImages product={product} onProductUpdated={setOverride} />
          <ProductVideo product={product} onProductUpdated={setOverride} />
        </>
      )}

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.products.descriptionLabel}
        </label>
        <button
          type="button"
          onClick={() => setDescriptionModalOpen(true)}
          className="block w-full rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-800/40 light:bg-slate-50 p-4 text-start"
        >
          {description ? (
            <>
              <p className="mb-2 line-clamp-3 text-sm leading-7 text-slate-300 light:text-slate-700">{description}</p>
              <span className="text-xs font-semibold text-emerald-400 light:text-emerald-700">{fa.seller.panel.products.descriptionCardEditHint}</span>
            </>
          ) : (
            <span className="text-sm text-slate-500">{fa.seller.panel.products.descriptionCardEmptyPlaceholder}</span>
          )}
        </button>
        <ProductDescriptionModal
          open={descriptionModalOpen}
          onClose={() => setDescriptionModalOpen(false)}
          storeId={storeId}
          productId={existingProduct?.id}
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onApply={setDescription}
          onApplySpecs={setSpecs}
        />
      </div>

      {product && product !== 'new' && (
        <AiCompleteAssist
          product={product}
          storeId={storeId}
          name={name}
          description={description}
          specs={specs}
          onApplyName={setName}
          onApplyDescription={setDescription}
          onApplySpecs={setSpecs}
        />
      )}

      {specs.length > 0 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
            {fa.seller.panel.products.specsLabel}
          </label>
          <div className="flex flex-col gap-1.5">
            {specs.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-800/40 light:bg-slate-50 px-3 py-2"
              >
                <p className="min-w-0 flex-1 text-xs text-slate-300 light:text-slate-700">
                  <span className="font-semibold">{s.label}:</span> {s.value}
                </p>
                <button
                  type="button"
                  onClick={() => setSpecs(prev => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-slate-500 hover:text-red-400"
                  aria-label={fa.common.delete}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {product && product !== 'new' && (
        <ProductVariantsEditor product={product} storeId={storeId} onProductUpdated={setOverride} aiPrefill={pendingVariantOptions} />
      )}

      <div className="mb-6">
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.products.persuasionToggleLabel}
            checked={persuasionTechniquesEnabled}
            onChange={setPersuasionTechniquesEnabled}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.persuasionToggleHint}</p>
      </div>

      {(create.isError || update.isError) && (
        <p className="mb-3 text-xs text-red-400">
          {extractErrorMessage(create.error ?? update.error, fa.common.error)}
        </p>
      )}

      <button
        onClick={save}
        disabled={!name || (!isWeightBased && !price) || pending}
        className="mb-3 w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {fa.common.save}
      </button>
      {!isNew && (
        <button onClick={remove_} disabled={pending} className="w-full rounded-2xl bg-red-500/15 py-3 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40">
          {fa.common.delete}
        </button>
      )}
    </div>
  )
}
