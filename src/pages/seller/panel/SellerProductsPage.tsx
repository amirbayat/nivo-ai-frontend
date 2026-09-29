import { useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import {
  useCompleteProductInfo,
  useCreateKbEntry,
  useCreateProduct,
  useDeleteProduct,
  useDeleteProductImage,
  useImportProducts,
  useProducts,
  useUpdateProduct,
  useUploadProductImages,
} from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// عمومی، بدون auth — عیناً همان مسیر که ShopUiBlocks.tsx برای چت خریدار استفاده می‌کند
function productImageUrl(productId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/products/${productId}/images/${key}`
}

function ProductImages({ product }: { product: SellerProduct }) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductImages(storeId)
  const remove = useDeleteProductImage(storeId)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.products.addImage}</label>
      <div className="flex flex-wrap gap-2">
        {product.images.map(key => (
          <div key={key} className="relative size-16 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200">
            <img src={productImageUrl(product.id, key)} alt="" className="size-full object-cover" />
            <button
              onClick={() => remove.mutate({ productId: product.id, key })}
              className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
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
          if (files.length) upload.mutate({ productId: product.id, files })
          e.target.value = ''
        }}
      />
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
        <button
          type="button"
          onClick={() => complete.mutate(productId)}
          disabled={complete.isPending}
          className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {complete.isPending ? fa.seller.panel.products.aiCompleteLoading : `✨ ${fa.seller.panel.products.aiComplete}`}
        </button>
      )}
      {complete.isError && <p className="mt-2 text-xs text-red-400">{fa.seller.panel.products.aiCompleteError}</p>}

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

export function SellerProductsPage() {
  const { storeId, storeSlug } = useSellerStore()
  const products = useProducts(storeId)
  const importProducts = useImportProducts(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<SellerProduct | 'new' | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; errorCount: number } | null>(null)
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null)

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
              <p className="text-sm font-semibold text-slate-200 light:text-slate-900">{p.name}</p>
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
    </div>
  )
}
