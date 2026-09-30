import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import {
  useAddProductImagesFromUrl,
  useCompleteProductInfo,
  useCreateKbEntry,
  useCreateProduct,
  useDeleteProduct,
  useDeleteProductImage,
  useImportProductFromUrl,
  useImportProducts,
  useProducts,
  useUpdateProduct,
  useUploadProductImages,
} from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// همون الگوی extractErrorMessage در PromptExtractionCard.tsx/NivoCalPage.tsx/VideoEditForms.tsx —
// پیام واقعی بک‌اند (مثلاً «اعتبار فروشگاه کافی نیست») را نشان می‌دهد، نه یک متن ثابت
function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

// عمومی، بدون auth — عیناً همان مسیر که ShopUiBlocks.tsx برای چت خریدار استفاده می‌کند
function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

function ProductImages({ product }: { product: SellerProduct }) {
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

// دستیار تکمیل محصول با AI (docs/PRD-seller-knowledge-base.md بخش ۲) — نتیجه فقط پیشنهاد
// است، فروشنده تأیید/ویرایش می‌کند: توضیح را می‌تواند «استفاده» کند، هر سؤال را جدا با جواب
// خودش به باکس دانش اضافه می‌کند (ذخیره‌ی خودکار نیست)
function AiCompleteAssist({
  productId,
  storeId,
  onApplyDescription,
}: {
  productId: string
  storeId: string
  onApplyDescription: (text: string) => void
}) {
  const complete = useCompleteProductInfo(storeId)
  const createKb = useCreateKbEntry(storeId)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const [withWebSearch, setWithWebSearch] = useState(false)

  function saveAnswer(question: string, index: number) {
    const answer = answers[index]?.trim()
    if (!answer) return
    createKb.mutate(
      { kind: 'PRODUCT_INFO', question, answer, relatedProductId: productId },
      { onSuccess: () => setSavedIndexes(prev => new Set(prev).add(index)) },
    )
  }

  return (
    <div className="mb-6">
      {!complete.data && (
        <>
          <label className="mb-2 flex items-center gap-2 text-xs text-slate-400 light:text-slate-600">
            <input type="checkbox" checked={withWebSearch} onChange={e => setWithWebSearch(e.target.checked)} />
            {fa.seller.panel.products.aiWebSearchToggle}
          </label>
          {withWebSearch && <p className="mb-2 text-[11px] text-slate-500">{fa.seller.panel.products.aiWebSearchHint}</p>}
          <button
            type="button"
            onClick={() => complete.mutate({ productId, withWebSearch })}
            disabled={complete.isPending}
            className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {complete.isPending ? fa.seller.panel.products.aiCompleteLoading : `✨ ${fa.seller.panel.products.aiComplete}`}
          </button>
        </>
      )}
      {complete.isError && (
        <p className="mt-2 text-xs text-red-400">
          {extractErrorMessage(complete.error, fa.seller.panel.products.aiCompleteError)}
        </p>
      )}

      {complete.data && (
        <div className="mt-3 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
          <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
          <p className="mb-2 text-sm text-slate-200 light:text-slate-800">{complete.data.suggestedDescription}</p>
          <button
            type="button"
            onClick={() => onApplyDescription(complete.data!.suggestedDescription)}
            className="mb-3 text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
          >
            {fa.seller.panel.products.aiApplyDescription}
          </button>

          {!!complete.data.suggestedSpecs?.length && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
              <div className="flex flex-col gap-1">
                {complete.data.suggestedSpecs.map((s, i) => (
                  <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                    <span className="font-semibold">{s.label}:</span> {s.value}
                  </p>
                ))}
              </div>
            </div>
          )}
          {complete.data.sourceNote && (
            <p className="mb-3 text-[11px] text-slate-500">{complete.data.sourceNote}</p>
          )}

          <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedQuestions}</p>
          <div className="flex flex-col gap-2">
            {complete.data.suggestedQuestions.map((q, i) => (
              <div key={i} className="rounded-xl bg-slate-900/40 light:bg-white p-2.5">
                <p className="mb-1.5 text-sm text-slate-300 light:text-slate-700">{q}</p>
                {savedIndexes.has(i) ? (
                  <p className="text-xs text-emerald-400">{fa.common.success}</p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={answers[i] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder={fa.seller.panel.products.aiQuestionAnswerPlaceholder}
                      className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2.5 py-1.5 text-xs text-slate-200 light:text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => saveAnswer(q, i)}
                      disabled={!answers[i]?.trim() || createKb.isPending}
                      className="shrink-0 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                    >
                      {fa.common.save}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProductSheet({
  product,
  storeId,
  onClose,
}: {
  product: SellerProduct | 'new'
  storeId: string
  onClose: () => void
}) {
  const isNew = product === 'new'
  const [name, setName] = useState(isNew ? '' : product.name)
  const [price, setPrice] = useState(isNew ? '' : String(product.basePrice))
  const [stock, setStock] = useState(isNew ? '' : String(product.stock))
  const [description, setDescription] = useState(isNew ? '' : product.description ?? '')
  const [code, setCode] = useState(isNew ? '' : product.code ?? '')
  const update = useUpdateProduct(storeId)
  const create = useCreateProduct(storeId)
  const remove = useDeleteProduct(storeId)
  const pending = update.isPending || create.isPending || remove.isPending

  function save() {
    const dto = {
      name,
      basePrice: Number(toEnglishDigits(price)) || 0,
      stock: stock ? Number(toEnglishDigits(stock)) : undefined,
      description: description || undefined,
      code: code.trim() || undefined,
    }
    if (isNew) {
      create.mutate(dto, { onSuccess: onClose })
    } else {
      update.mutate({ productId: product.id, dto }, { onSuccess: onClose })
    }
  }

  function remove_() {
    if (isNew) return
    if (!window.confirm(fa.seller.panel.products.deleteConfirm)) return
    remove.mutate(product.id, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-5">
          <Input label={fa.seller.step3.nameLabel} value={name} onChange={e => setName(e.target.value)} />
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
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Input
            label={fa.seller.step3.priceLabel}
            value={formatThousands(price)}
            onChange={e => setPrice(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            dir="ltr"
            inputMode="numeric"
            className="text-center"
          />
          <Input
            label={fa.seller.step3.stockLabel}
            value={stock}
            onChange={e => setStock(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
            dir="ltr"
            inputMode="numeric"
            className="text-center"
          />
        </div>

        {!isNew && <ProductImages product={product} />}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
            {fa.seller.panel.products.descriptionLabel}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={fa.seller.panel.products.descriptionPlaceholder}
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
          />
        </div>

        {!isNew && (
          <AiCompleteAssist productId={product.id} storeId={storeId} onApplyDescription={setDescription} />
        )}

        {(create.isError || update.isError) && (
          <p className="mb-3 text-xs text-red-400">
            {extractErrorMessage(create.error ?? update.error, fa.common.error)}
          </p>
        )}

        <button
          onClick={save}
          disabled={!name || !price || pending}
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
    </div>
  )
}

// ورود سریع محصول از لینک صفحه‌ی موجود (docs/PRD-seller-knowledge-base.md بخش ۲.۵) — فقط
// پیش‌نمایش، خودِ افزودن با همان useCreateProduct موجود انجام می‌شود؛ عکس‌ها فقط بعد از
// تأیید فروشنده دانلود+آپلود می‌شوند (useAddProductImagesFromUrl)
function ImportFromUrlSheet({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const importFromUrl = useImportProductFromUrl(storeId)
  const createProduct = useCreateProduct(storeId)
  const addImagesFromUrl = useAddProductImagesFromUrl(storeId)
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')

  const preview = importFromUrl.data

  useEffect(() => {
    if (!preview) return
    setName(preview.name)
    setPrice(preview.priceHint ? String(preview.priceHint) : '')
    setDescription(preview.suggestedDescription)
  }, [preview])

  function addToStore() {
    if (!preview) return
    setAdding(true)
    createProduct.mutate(
      { name, basePrice: Number(toEnglishDigits(price)) || 0, description: description || undefined },
      {
        onSuccess: product => {
          if (preview.imageUrls.length) {
            addImagesFromUrl.mutate({ productId: product.id, urls: preview.imageUrls }, { onSettled: onClose })
          } else {
            onClose()
          }
        },
        onSettled: () => setAdding(false),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="mb-1.5 text-lg font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.products.importFromUrlTitle}</h2>
        <p className="mb-4 text-xs text-slate-500">{fa.seller.panel.products.importFromUrlHint}</p>

        {!preview && (
          <>
            <div className="mb-4">
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder={fa.seller.panel.products.importFromUrlPlaceholder} dir="ltr" />
            </div>
            {importFromUrl.isError && (
              <p className="mb-3 text-xs text-red-400">
                {extractErrorMessage(importFromUrl.error, fa.seller.panel.products.importFromUrlError)}
              </p>
            )}
            <button
              onClick={() => importFromUrl.mutate(url.trim())}
              disabled={!url.trim() || importFromUrl.isPending}
              className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {importFromUrl.isPending ? fa.seller.panel.products.importFromUrlLoading : fa.seller.panel.products.importFromUrlSubmit}
            </button>
          </>
        )}

        {preview && (
          <>
            {!!preview.imageUrls.length && (
              <div className="mb-4 flex gap-2">
                {preview.imageUrls.map(src => (
                  <img key={src} src={src} alt="" className="size-16 rounded-xl border border-slate-700 light:border-slate-200 object-cover" />
                ))}
              </div>
            )}
            <div className="mb-4">
              <Input label={fa.seller.step3.nameLabel} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="mb-4">
              <Input
                label={fa.seller.panel.products.importPreviewPriceHintLabel}
                value={formatThousands(price)}
                onChange={e => setPrice(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
                dir="ltr"
                inputMode="numeric"
                className="text-center"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
                {fa.seller.panel.products.descriptionLabel}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900"
              />
            </div>
            {!!preview.suggestedSpecs?.length && (
              <div className="mb-4 flex flex-col gap-1">
                {preview.suggestedSpecs.map((s, i) => (
                  <p key={i} className="text-xs text-slate-400 light:text-slate-600">
                    <span className="font-semibold">{s.label}:</span> {s.value}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={addToStore}
              disabled={!name || !price || adding}
              className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {adding ? fa.seller.panel.products.importPreviewAdding : fa.seller.panel.products.importPreviewAddToStore}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function SellerProductsPage() {
  const { storeId, storeSlug } = useSellerStore()
  const products = useProducts(storeId)
  const importProducts = useImportProducts(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<SellerProduct | 'new' | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; errorCount: number } | null>(null)
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null)
  const [importFromUrlOpen, setImportFromUrlOpen] = useState(false)

  async function copyProductLink(productId: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/shop/${storeSlug}?product=${productId}`)
    setCopiedProductId(productId)
    setTimeout(() => setCopiedProductId(null), 2000)
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.nav.products}</h1>

      <div className="mb-5 flex gap-2">
        <button onClick={() => setSheet('new')} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">
          + {fa.seller.panel.products.addProduct}
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
          {fa.seller.panel.products.uploadExcel}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              importProducts.mutate(file, {
                onSuccess: r => setImportResult({ created: r.created, errorCount: r.errors.length }),
              })
            }
            e.target.value = ''
          }}
        />
      </div>
      <div className="mb-5">
        <button
          onClick={() => setImportFromUrlOpen(true)}
          className="w-full rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.products.importFromUrl}
        </button>
      </div>

      {importResult && (
        <p className="mb-4 rounded-xl bg-slate-800/60 light:bg-slate-100 px-3 py-2 text-xs text-slate-300 light:text-slate-700">
          {fa.seller.panel.products.importResult(importResult.created, importResult.errorCount)}
        </p>
      )}
      <p className="mb-4 text-xs text-slate-600 light:text-slate-400">{fa.seller.panel.products.importColumnsHint}</p>

      {products.data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.products.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {products.data?.map(p => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
          >
            {p.images[0] && (
              <img src={productImageUrl(p.id, p.images[0])} alt="" className="ml-3 size-10 shrink-0 rounded-lg object-cover" />
            )}
            <button onClick={() => setSheet(p)} className="flex-1 text-start">
              <p className="text-sm font-semibold text-slate-200 light:text-slate-900">
                {p.name}
                {p.code && <span dir="ltr" className="mr-1.5 text-xs font-normal text-slate-500">#{p.code}</span>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{fa.shop.stockCount(p.stock)}</p>
            </button>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-sm font-bold text-emerald-300 light:text-emerald-700">{p.basePrice.toLocaleString('fa-IR')} {fa.common.toman}</span>
              <button
                onClick={() => copyProductLink(p.id)}
                className="text-[11px] text-slate-500 hover:text-slate-300 light:hover:text-slate-700"
              >
                {copiedProductId === p.id ? fa.seller.panel.products.productLinkCopied : fa.seller.panel.products.copyProductLink}
              </button>
            </div>
          </div>
        ))}
      </div>

      {sheet && <ProductSheet product={sheet} storeId={storeId} onClose={() => setSheet(null)} />}
      {importFromUrlOpen && <ImportFromUrlSheet storeId={storeId} onClose={() => setImportFromUrlOpen(false)} />}
    </div>
  )
}
