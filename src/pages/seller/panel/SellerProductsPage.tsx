import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import { extractErrorMessage, productImageUrl } from '@/lib/sellerProduct'
import {
  useAddProductImagesFromUrl,
  useAnalyzeCompetitors,
  useBulkCompleteProducts,
  useCreateProduct,
  useImportProductFromUrl,
  useImportProducts,
  useProducts,
  useUpdateProduct,
} from '@/queries/seller.queries'
import type { BulkCompleteResultItem } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-knowledge-base.md بخش ۹.۲ (دوم، مورد ۶) — تولید پیشنهاد برای حداکثر ۲۰
// محصول کم‌تکمیل این فروشگاه در یک درخواست، بعد مرور/تایید دسته‌ای این‌جا (نه تک‌تک مثل
// AiCompleteAssist) — تایید هرکدام همان useUpdateProduct معمولی را صدا می‌زند، چیزی خودکار
// persist نمی‌شود تا فروشنده فرصت رد‌کردن هرکدام را داشته باشد
function BulkCompleteSheet({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const bulkComplete = useBulkCompleteProducts(storeId)
  const updateProduct = useUpdateProduct(storeId)
  const startedRef = useRef(false)
  const [decided, setDecided] = useState<Record<string, 'applied' | 'rejected'>>({})

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    bulkComplete.mutate(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = bulkComplete.data?.items ?? []
  const pendingItems = items.filter(i => !!i.suggestedDescription && !decided[i.productId])

  function approve(item: BulkCompleteResultItem) {
    if (!item.suggestedDescription) return
    updateProduct.mutate(
      {
        productId: item.productId,
        dto: { description: item.suggestedDescription, specs: item.suggestedSpecs?.length ? item.suggestedSpecs : null },
      },
      { onSuccess: () => setDecided(prev => ({ ...prev, [item.productId]: 'applied' })) },
    )
  }
  function reject(item: BulkCompleteResultItem) {
    setDecided(prev => ({ ...prev, [item.productId]: 'rejected' }))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 p-5 pb-3">
          <h2 className="mb-1.5 text-lg font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.products.aiCompleteAllTitle}</h2>
          <p className="text-xs text-slate-500">{fa.seller.panel.products.aiCompleteAllHint}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {bulkComplete.isPending && (
            <p className="py-8 text-center text-sm text-slate-400">{fa.seller.panel.products.aiCompleteAllLoading}</p>
          )}
          {bulkComplete.isError && (
            <p className="py-8 text-center text-sm text-red-400">
              {extractErrorMessage(bulkComplete.error, fa.seller.panel.products.aiCompleteAllError)}
            </p>
          )}
          {bulkComplete.data && items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">{fa.seller.panel.products.aiCompleteAllEmpty}</p>
          )}

          {pendingItems.length > 1 && (
            <button
              onClick={() => pendingItems.forEach(approve)}
              disabled={updateProduct.isPending}
              className="mb-3 w-full rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
            >
              {fa.seller.panel.products.aiCompleteAllApproveAll}
            </button>
          )}

          <div className="flex flex-col gap-3">
            {items.map(item => (
              <div
                key={item.productId}
                className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5"
              >
                <p className="mb-2 text-sm font-bold text-slate-100 light:text-slate-900">{item.productName}</p>
                {item.error && <p className="text-xs text-red-400">{fa.seller.panel.products.aiCompleteAllItemError}</p>}
                {item.suggestedDescription && (
                  <>
                    <p className="mb-2 text-sm text-slate-300 light:text-slate-700">{item.suggestedDescription}</p>
                    {!!item.suggestedSpecs?.length && (
                      <div className="mb-3 flex flex-col gap-1">
                        {item.suggestedSpecs.map((s, i) => (
                          <p key={i} className="text-xs text-slate-400 light:text-slate-600">
                            <span className="font-semibold">{s.label}:</span> {s.value}
                          </p>
                        ))}
                      </div>
                    )}
                    {decided[item.productId] ? (
                      <p className="text-xs font-semibold text-slate-400">
                        {decided[item.productId] === 'applied'
                          ? fa.seller.panel.products.aiCompleteAllApplied
                          : fa.seller.panel.products.aiCompleteAllRejected}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(item)}
                          disabled={updateProduct.isPending}
                          className="flex-1 rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                        >
                          {fa.seller.panel.products.aiCompleteAllApprove}
                        </button>
                        <button
                          onClick={() => reject(item)}
                          className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-bold text-slate-300 light:text-slate-600"
                        >
                          {fa.seller.panel.products.aiCompleteAllReject}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {bulkComplete.data && (
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-2xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700"
            >
              {fa.seller.panel.products.aiCompleteAllDone}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۹ (رصد رقبا) — استاتلس (مثل
// completeProductInfo)؛ هر بار باز شدن این شیت یک فراخوان تازه (و هزینه‌ی تازه) است
function CompetitorAnalysisSheet({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const analyze = useAnalyzeCompetitors(storeId)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    analyze.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 p-5 pb-3">
          <h2 className="mb-1.5 text-lg font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.products.competitorAnalysisTitle}</h2>
          <p className="text-xs text-slate-500">{fa.seller.panel.products.competitorAnalysisHint}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {analyze.isPending && (
            <p className="py-8 text-center text-sm text-slate-400">{fa.seller.panel.products.competitorAnalysisLoading}</p>
          )}
          {analyze.isError && (
            <p className="py-8 text-center text-sm text-red-400">
              {extractErrorMessage(analyze.error, fa.seller.panel.products.competitorAnalysisError)}
            </p>
          )}

          {analyze.data && (
            <>
              {analyze.data.competitors.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">{fa.seller.panel.products.competitorAnalysisEmpty}</p>
              ) : (
                <div className="mb-4 flex flex-col gap-3">
                  {analyze.data.competitors.map((c, i) => (
                    <div key={i} className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
                      <p className="mb-1 text-sm font-bold text-slate-100 light:text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-400 light:text-slate-600">{c.highlight}</p>
                    </div>
                  ))}
                </div>
              )}

              {!!analyze.data.suggestions.length && (
                <>
                  <p className="mb-2 text-sm font-bold text-slate-200 light:text-slate-800">{fa.seller.panel.products.competitorAnalysisSuggestionsTitle}</p>
                  <ul className="mb-4 flex flex-col gap-1.5">
                    {analyze.data.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-slate-300 light:text-slate-700">• {s}</li>
                    ))}
                  </ul>
                </>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-2xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700"
              >
                {fa.seller.panel.products.competitorAnalysisDone}
              </button>
            </>
          )}
        </div>
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
              <Input label={fa.seller.panel.products.nameLabel} value={name} onChange={e => setName(e.target.value)} />
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
  const navigate = useNavigate()
  const products = useProducts(storeId)
  const importProducts = useImportProducts(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ created: number; errorCount: number } | null>(null)
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null)
  const [importFromUrlOpen, setImportFromUrlOpen] = useState(false)
  const [bulkCompleteOpen, setBulkCompleteOpen] = useState(false)
  const [competitorAnalysisOpen, setCompetitorAnalysisOpen] = useState(false)

  async function copyProductLink(productId: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/shop/${storeSlug}?product=${productId}`)
    setCopiedProductId(productId)
    setTimeout(() => setCopiedProductId(null), 2000)
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.nav.products}</h1>

      <div className="mb-5 flex gap-2">
        <button onClick={() => navigate('/seller/panel/products/new')} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">
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
      <div className="mb-5 flex flex-col gap-2">
        <button
          onClick={() => setImportFromUrlOpen(true)}
          className="w-full rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.products.importFromUrl}
        </button>
        {!!products.data?.length && (
          <button
            onClick={() => setBulkCompleteOpen(true)}
            className="w-full rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
          >
            ✨ {fa.seller.panel.products.aiCompleteAllButton}
          </button>
        )}
        <button
          onClick={() => setCompetitorAnalysisOpen(true)}
          className="w-full rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.products.competitorAnalysisButton}
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
            <button onClick={() => navigate(`/seller/panel/products/${p.id}`)} className="flex-1 text-start">
              <p className="text-sm font-semibold text-slate-200 light:text-slate-900">
                {p.name}
                {p.code && <span dir="ltr" className="mr-1.5 text-xs font-normal text-slate-500">#{p.code}</span>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{fa.shop.stockCount(p.stock)}</p>
              {p.completeness && p.completeness.percent < 100 && (
                <p className="mt-0.5 text-[11px] text-amber-400 light:text-amber-600">
                  {fa.seller.panel.products.completenessPercent(p.completeness.percent)}
                  {p.completeness.missing[0] && ` ${fa.seller.panel.products.completenessMissing(p.completeness.missing[0])}`}
                </p>
              )}
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

      {importFromUrlOpen && <ImportFromUrlSheet storeId={storeId} onClose={() => setImportFromUrlOpen(false)} />}
      {bulkCompleteOpen && <BulkCompleteSheet storeId={storeId} onClose={() => setBulkCompleteOpen(false)} />}
      {competitorAnalysisOpen && <CompetitorAnalysisSheet storeId={storeId} onClose={() => setCompetitorAnalysisOpen(false)} />}
    </div>
  )
}
