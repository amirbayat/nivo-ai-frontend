import { useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import {
  useCreateProduct,
  useDeleteProduct,
  useImportProducts,
  useProducts,
  useUpdateProduct,
} from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

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
      <div className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 bg-slate-900 p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-5">
          <Input label={fa.seller.step3.nameLabel} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Input
            label={fa.seller.step3.priceLabel}
            value={price}
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
  const { storeId } = useSellerStore()
  const products = useProducts(storeId)
  const importProducts = useImportProducts(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<SellerProduct | 'new' | null>(null)
  const [importResult, setImportResult] = useState<{ created: number; errorCount: number } | null>(null)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-100">{fa.seller.panel.nav.products}</h1>

      <div className="mb-5 flex gap-2">
        <button onClick={() => setSheet('new')} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">
          + {fa.seller.panel.products.addProduct}
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600">
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
        <p className="mb-4 rounded-xl bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
          {fa.seller.panel.products.importResult(importResult.created, importResult.errorCount)}
        </p>
      )}
      <p className="mb-4 text-xs text-slate-600">{fa.seller.panel.products.importColumnsHint}</p>

      {products.data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.products.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {products.data?.map(p => (
          <button
            key={p.id}
            onClick={() => setSheet(p)}
            className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/40 px-4 py-3.5 text-start hover:border-slate-600"
          >
            <div>
              <p className="text-sm font-semibold text-slate-200">{p.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{fa.shop.stockCount(p.stock)}</p>
            </div>
            <span className="text-sm font-bold text-emerald-300">{p.basePrice.toLocaleString('fa-IR')} {fa.common.toman}</span>
          </button>
        ))}
      </div>

      {sheet && <ProductSheet product={sheet} storeId={storeId} onClose={() => setSheet(null)} />}
    </div>
  )
}
