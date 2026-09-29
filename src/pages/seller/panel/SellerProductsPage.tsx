import { useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import {
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
  const update = useUpdateProduct(storeId)
  const create = useCreateProduct(storeId)
  const remove = useDeleteProduct(storeId)
  const pending = update.isPending || create.isPending || remove.isPending

  function save() {
    const dto = {
      name,
      basePrice: Number(toEnglishDigits(price)) || 0,
      stock: stock ? Number(toEnglishDigits(stock)) : undefined,
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
