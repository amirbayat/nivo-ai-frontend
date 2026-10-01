import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import { extractErrorMessage, productImageUrl } from '@/lib/sellerProduct'
import {
  useAddProductImagesFromUrl,
  useCreateProduct,
  useImportProductFromUrl,
  useImportProducts,
  useProducts,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

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
  const navigate = useNavigate()
  const products = useProducts(storeId)
  const importProducts = useImportProducts(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
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
    </div>
  )
}
