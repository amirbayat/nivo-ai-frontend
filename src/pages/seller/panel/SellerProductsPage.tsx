import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { effectiveStock, extractErrorMessage, productImageUrl } from '@/lib/sellerProduct'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { PriceInput } from '@/components/ui/PriceInput'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { useToastStore } from '@/store/toast.store'
import { useImportProducts, useProductsPage, useUpdateProduct, useDeleteProduct } from '@/queries/seller.queries'
import { useDuplicateProduct } from '@/queries/sellerV2.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'
import { BulkProductImportSheet } from './ProductImportSheets'
import { ProductShareButtons } from './product/PublishSheets'

const t = fa.seller.v2.products
const toFa = (s: string | number) => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
type Seg = 'ACTIVE' | 'DRAFT' | 'HIDDEN'

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

// docs/PRD-seller-panel-simplification.md §4.6 + §4.12 — لیست محصولات: بخش‌ها (فعال/پیش‌نویس/مخفی)،
// ردیف ساده (عکس، اسم، قیمت قابل‌تغییر، یک خط وضعیت)، منوی ⋯، موجودی‌دهی سریع روی «تموم شده».
export function SellerProductsPage() {
  const { storeId, storeSlug, storeName, category, businessType } = useSellerStore()
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const [params, setParams] = useSearchParams()
  const seg: Seg = params.get('seg') === 'DRAFT' ? 'DRAFT' : params.get('seg') === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE'
  const query = useProductsPage(storeId, seg)
  const counts = query.data?.counts ?? { ACTIVE: 0, DRAFT: 0, HIDDEN: 0 }
  const items = useMemo(() => query.data?.items ?? [], [query.data])
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? items.filter(p => p.name.toLowerCase().includes(needle) || (p.code ?? '').toLowerCase().includes(needle)) : items
  }, [items, q])

  const update = useUpdateProduct(storeId)
  const remove = useDeleteProduct(storeId)
  const duplicate = useDuplicateProduct(storeId)
  const importProducts = useImportProducts(storeId)

  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<SellerProduct | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SellerProduct | null>(null)
  const [restockFor, setRestockFor] = useState<SellerProduct | null>(null)
  const [restockValue, setRestockValue] = useState('')
  const [priceFor, setPriceFor] = useState<SellerProduct | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [importResult, setImportResult] = useState<{ created: number; errors: number; notes: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function setSeg(next: Seg) {
    setParams(next === 'ACTIVE' ? {} : { seg: next }, { replace: true })
  }

  function statusLine(p: SellerProduct) {
    if (!p.trackStock) return { text: t.alwaysInStock, tone: '' }
    const n = effectiveStock(p)
    if (n === 0) return { text: t.soldOut, tone: 'text-red-400 font-bold' }
    if (n <= 3) return { text: t.low, tone: 'text-amber-400 font-bold' }
    return { text: t.count(toFa(n)), tone: '' }
  }

  function toggleHidden(p: SellerProduct) {
    const to = p.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN'
    update.mutate(
      { productId: p.id, dto: { status: to } },
      { onError: err => addToast(extractErrorMessage(err, fa.common.error)) },
    )
    setMenuFor(null)
  }

  function saveRestock() {
    if (!restockFor || restockValue === '') return
    update.mutate(
      { productId: restockFor.id, dto: { stock: Number(restockValue) } },
      {
        onSuccess: () => setRestockFor(null),
        onError: err => addToast(extractErrorMessage(err, fa.common.error)),
      },
    )
  }

  function savePrice() {
    if (!priceFor) return
    const value = Number(priceValue)
    if (!(value > 0)) return
    const target = priceFor
    const before = priceOverrides[target.id]
    setPriceOverrides(prev => ({ ...prev, [target.id]: value }))
    update.mutate(
      { productId: target.id, dto: { basePrice: value } },
      {
        onSuccess: () => {
          setPriceFor(null)
          setPriceError(null)
        },
        onError: err => {
          // برگرداندن قیمت قبلی + پیام فارسی سرور (مثلاً گارد قیمت مشکوک) داخل همان شیت
          setPriceOverrides(prev => {
            const next = { ...prev }
            if (before === undefined) delete next[target.id]
            else next[target.id] = before
            return next
          })
          setPriceError(extractErrorMessage(err, t.priceFailed))
        },
      },
    )
  }

  const priceOf = (p: SellerProduct) => priceOverrides[p.id] ?? p.basePrice
  const hasVariantOverrides = (p: SellerProduct) => (p.variants ?? []).some(v => v.priceOverride != null)

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-100 light:text-slate-900">{t.title}</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label={t.addTitle}
          className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white"
        >
          +
        </button>
      </div>

      <div className="mb-3 flex rounded-xl bg-slate-800/60 p-1 light:bg-slate-100">
        {(
          [
            ['ACTIVE', t.segActive],
            ['DRAFT', t.segDraft],
            ['HIDDEN', t.segHidden],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSeg(key)}
            className={clsx(
              'flex-1 rounded-lg py-2 text-[13px]',
              seg === key ? 'bg-slate-950 font-extrabold text-slate-100 light:bg-white light:text-slate-900' : 'text-slate-400',
            )}
          >
            {label} ({toFa(counts[key])})
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t.search}
        className="mb-3 h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
      />

      {seg === 'ACTIVE' && counts.DRAFT > 0 && (
        <Link
          to="/seller/panel/products/batch?resume=1"
          className="mb-3 block rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm font-bold text-amber-300 light:text-amber-700"
        >
          {t.draftsBanner(toFa(counts.DRAFT))}
        </Link>
      )}

      {importResult && (
        <div className="mb-3 rounded-xl bg-slate-800/60 px-3 py-2 text-xs text-slate-300 light:bg-slate-100 light:text-slate-700">
          <p>{fa.seller.panel.products.importResult(importResult.created, importResult.errors)}</p>
          {importResult.notes.length > 0 && <p className="mt-1 text-slate-400">{importResult.notes[0]} ({toFa(importResult.notes.length)})</p>}
        </div>
      )}

      {query.isSuccess && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 px-4 py-10 text-center light:border-slate-200">
          <p className="text-sm text-slate-400">{seg === 'ACTIVE' ? t.emptyTitle : seg === 'DRAFT' ? t.emptyDrafts : t.emptyHidden}</p>
          {seg === 'ACTIVE' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate('/seller/panel/products/new')} className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
                {t.oneProduct}
              </button>
              <button type="button" onClick={() => navigate('/seller/panel/products/batch')} className="h-11 rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-200 light:border-slate-300 light:text-slate-800">
                {t.batchProducts}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map(p => {
          const st = statusLine(p)
          const priceTappable = p.status !== 'DRAFT' && p.pricingModel === 'FIXED'
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-3 light:border-slate-200 light:bg-white">
              <button type="button" onClick={() => navigate(`/seller/panel/products/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-slate-800 light:bg-slate-200">
                  {p.images[0] && <img src={productImageUrl(p.id, p.images[0])} alt="" className="size-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-100 light:text-slate-900">
                    {p.name || t.noName}
                    {p.status === 'HIDDEN' && <span className="ms-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-normal text-slate-300">{t.hiddenTag}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{p.status === 'DRAFT' && !p.basePrice ? '—' : `${toFa(priceOf(p).toLocaleString('en-US').replace(/,/g, '٬'))} ${fa.common.toman}`}</span>
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {p.status !== 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!p.trackStock || effectiveStock(p) > 0) return
                      setRestockFor(p)
                      setRestockValue('')
                    }}
                    className={clsx('text-xs', st.tone || 'text-slate-400')}
                  >
                    {st.text}
                  </button>
                )}
                {(p.stockAlertCount ?? 0) > 0 && <span className="text-[11px] text-amber-400">{t.waiting(toFa(p.stockAlertCount ?? 0))}</span>}
                {priceTappable && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceFor(p)
                      setPriceValue(String(priceOf(p)))
                      setPriceError(null)
                    }}
                    className="text-[11px] font-bold text-emerald-400 light:text-emerald-700"
                  >
                    {t.editPrice}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setMenuFor(p)} aria-label="⋯" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 light:hover:bg-slate-100">
                <MoreIcon />
              </button>
            </div>
          )
        })}
      </div>

      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="mt-3 min-h-11 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 disabled:opacity-50 light:border-slate-300 light:text-slate-700"
        >
          {t.loadMore}
        </button>
      )}

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title={t.addTitle}>
        <div className="flex flex-col gap-2 pb-2">
          <button type="button" onClick={() => navigate('/seller/panel/products/new')} className="h-12 rounded-xl bg-emerald-600 text-sm font-bold text-white">
            {t.oneProduct}
          </button>
          <button type="button" onClick={() => navigate('/seller/panel/products/batch')} className="h-12 rounded-xl bg-slate-800 text-sm font-bold text-slate-100 light:bg-slate-100 light:text-slate-900">
            {t.batchProducts}
          </button>
          <button
            type="button"
            onClick={() => {
              setAddOpen(false)
              fileRef.current?.click()
            }}
            className="h-12 rounded-xl border border-slate-700 text-sm font-bold text-slate-200 light:border-slate-300 light:text-slate-800"
          >
            {fa.seller.panel.products.uploadExcel}
          </button>
          <button
            type="button"
            onClick={() => {
              setAddOpen(false)
              setBulkOpen(true)
            }}
            className="h-12 rounded-xl border border-slate-700 text-sm font-bold text-slate-200 light:border-slate-300 light:text-slate-800"
          >
            {t.importFile}
          </button>
          <p className="text-[11px] text-slate-500">{fa.seller.panel.products.importColumnsHint}</p>
        </div>
      </BottomSheet>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) {
            importProducts.mutate(file, {
              onSuccess: r => setImportResult({ created: r.created, errors: r.errors.length, notes: (r as { notes?: { message: string }[] }).notes?.map(n => n.message) ?? [] }),
              onError: err => addToast(extractErrorMessage(err, fa.common.error)),
            })
          }
          e.target.value = ''
        }}
      />

      <BottomSheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name || t.noName}>
        {menuFor && (
          <div className="flex flex-col gap-1 pb-2">
            {menuFor.status === 'ACTIVE' && (
              <ProductShareButtons storeId={storeId} storeSlug={storeSlug} product={{ id: menuFor.id, name: menuFor.name, basePrice: menuFor.basePrice }} />
            )}
            <button
              type="button"
              disabled={duplicate.isPending}
              onClick={() => {
                const src = menuFor
                setMenuFor(null)
                duplicate.mutate(src.id, {
                  onSuccess: copy => {
                    addToast(fa.seller.v2.product.duplicated)
                    navigate(`/seller/panel/products/${copy.id}`)
                  },
                  onError: err => addToast(extractErrorMessage(err, fa.common.error)),
                })
              }}
              className="h-11 rounded-xl text-sm font-bold text-emerald-400 light:text-emerald-700"
            >
              {t.menuDuplicate}
            </button>
            {menuFor.status !== 'DRAFT' && (
              <button type="button" onClick={() => toggleHidden(menuFor)} className="h-11 rounded-xl text-sm font-bold text-slate-200 light:text-slate-800">
                {menuFor.status === 'HIDDEN' ? t.menuShow : t.menuHide}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(menuFor)
                setMenuFor(null)
              }}
              className="h-11 rounded-xl text-sm font-bold text-red-400"
            >
              {t.menuDelete}
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t.deleteTitle}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(null)} className="h-12 flex-1 rounded-2xl bg-slate-800 font-bold text-slate-100 light:bg-slate-100 light:text-slate-900">
              {fa.common.cancel}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}
              className="h-12 flex-1 rounded-2xl bg-red-500/90 font-bold text-white disabled:opacity-50"
            >
              {t.menuDelete}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-400">{t.deleteHint}</p>
      </BottomSheet>

      <BottomSheet
        open={!!restockFor}
        onClose={() => setRestockFor(null)}
        title={`${t.restockTitle} — ${restockFor?.name ?? ''}`}
        footer={
          <button type="button" onClick={saveRestock} disabled={restockValue === '' || update.isPending} className="h-12 w-full rounded-2xl bg-emerald-600 font-bold text-white disabled:opacity-40">
            {t.restockSave}
          </button>
        }
      >
        <DigitsInput kind="int" value={restockValue} onChange={setRestockValue} placeholder={t.restockPlaceholder} autoFocus />
      </BottomSheet>

      <BottomSheet
        open={!!priceFor}
        onClose={() => setPriceFor(null)}
        title={`${t.priceTitle} — ${priceFor?.name ?? ''}`}
        footer={
          <button type="button" onClick={savePrice} disabled={!(Number(priceValue) > 0) || update.isPending} className="h-12 w-full rounded-2xl bg-emerald-600 font-bold text-white disabled:opacity-40">
            {t.priceSave}
          </button>
        }
      >
        <PriceInput value={priceValue} onChange={setPriceValue} error={priceError ?? undefined} />
        {priceFor && hasVariantOverrides(priceFor) && (
          <p className="mt-3 text-xs text-amber-300 light:text-amber-700">
            {t.variantOverrideNote}{' '}
            <Link to={`/seller/panel/products/${priceFor.id}`} className="font-bold underline">
              {t.editVariantPrices}
            </Link>
          </p>
        )}
      </BottomSheet>

      {bulkOpen && (
        <BulkProductImportSheet storeId={storeId} category={category} businessType={businessType} storeName={storeName} onClose={() => setBulkOpen(false)} />
      )}
    </div>
  )
}
