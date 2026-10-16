import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import { extractErrorMessage, productImageUrl } from '@/lib/sellerProduct'
import { prepareImage } from '@/lib/prepareImage'
import { MicButton } from '@/components/ui/MicButton'
import { useToastStore } from '@/store/toast.store'
import { useCreateProduct, useProductsPage, useReplaceProductVariants, useUpdateProduct } from '@/queries/seller.queries'
import { useAiFill, usePublishProducts, type AiFillResult } from '@/queries/sellerV2.queries'
import { buildVariantsDto, variantDraftFromAi } from '@/lib/variantDraft'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

const t = fa.seller.v2.batch
const MAX_PHOTOS = 20
const CONCURRENCY = 3
const toFa = (n: number | string) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
const money = (n: number) => toFa(n.toLocaleString('en-US').replace(/,/g, '٬'))

type CardState = 'wait' | 'filling' | 'ready' | 'price' | 'error'

interface Card {
  id: string
  imageKey: string | null
  previewUrl: string | null
  name: string
  price: number
  state: CardState
  summary: string
  text: string
  missing: string[]
  uploadFailed?: File
}

function stateOf(name: string, price: number): CardState {
  return name.trim().length >= 2 && price > 0 ? 'ready' : name.trim() ? 'price' : 'wait'
}

function BackChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// docs/PRD-seller-panel-simplification.md §4.5 — چند محصول با عکس: هر عکس یک پیش‌نویس سروری؛
// فروشنده فقط اسم و قیمت را می‌گوید/می‌نویسد، AI فیلدها را پر می‌کند، یک دکمه همه‌ی آماده‌ها را منتشر می‌کند.
export function SellerProductsBatchPage() {
  const { storeId } = useSellerStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resume = params.get('resume') === '1'
  const addToast = useToastStore(s => s.addToast)
  const createProduct = useCreateProduct(storeId)
  const updateProduct = useUpdateProduct(storeId)
  const replaceVariants = useReplaceProductVariants(storeId)
  const aiFill = useAiFill(storeId)
  const publish = usePublishProducts(storeId)

  const [cards, setCards] = useState<Card[]>([])
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const extraPhotoRef = useRef<HTMLInputElement>(null)
  const extraFor = useRef<string | null>(null)
  const loadedResume = useRef(false)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const drafts = useProductsPage(storeId, 'DRAFT')
  useEffect(() => {
    if (!resume || loadedResume.current || !drafts.data) return
    loadedResume.current = true
    setCards(
      drafts.data.items.slice(0, 50).map(p => ({
        id: p.id,
        imageKey: p.images[0] ?? null,
        previewUrl: null,
        name: p.name,
        price: p.basePrice,
        state: stateOf(p.name, p.basePrice),
        summary: p.name ? `${p.name}${p.basePrice ? ` • ${money(p.basePrice)}` : ''}` : '',
        text: '',
        missing: [],
      })),
    )
  }, [resume, drafts.data])

  const patchCard = (id: string, patch: Partial<Card>) => setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))

  async function uploadImage(productId: string, file: File, attempts = 3): Promise<SellerProduct> {
    let lastErr: unknown
    for (let i = 0; i < attempts; i++) {
      try {
        const prepared = await prepareImage(file)
        const form = new FormData()
        form.append('files', prepared)
        const res = await api.post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return res.data
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr
  }

  // نتیجه‌ی ai-fill ← PATCH محصول + مدل‌ها؛ قیمت فقط از متن می‌آید، هرگز حدس زده نمی‌شود
  async function applyFill(card: Card, res: AiFillResult) {
    const hasVariants = !!res.variantOptions?.length
    const alwaysInStock = res.trackStock === false || (!hasVariants && res.stock === undefined)
    if (hasVariants) {
      const draft = variantDraftFromAi(res.variantOptions!, '', alwaysInStock)
      await replaceVariants.mutateAsync({ productId: card.id, dto: buildVariantsDto(draft, {}, alwaysInStock) })
    }
    const name = res.name ?? card.name
    const price = res.basePrice ?? card.price
    await updateProduct.mutateAsync({
      productId: card.id,
      dto: {
        name,
        ...(price ? { basePrice: price } : {}),
        ...(res.description ? { description: res.description } : {}),
        trackStock: !alwaysInStock,
        ...(!alwaysInStock && !hasVariants && res.stock !== undefined ? { stock: res.stock } : {}),
        ...(res.specs?.length ? { specs: res.specs } : {}),
      },
    })
    const extras: string[] = []
    if (hasVariants) extras.push(`${toFa(res.variantOptions![0].values.length)} ${res.variantOptions![0].name}`)
    if (alwaysInStock) extras.push(fa.seller.v2.product.alwaysInStock)
    patchCard(card.id, {
      name,
      price,
      state: stateOf(name, price),
      summary: [name, price ? money(price) : '', ...extras].filter(Boolean).join(' • '),
      text: '',
      missing: [],
    })
  }

  async function fillCard(id: string, textOverride?: string) {
    const card = cardsRef.current.find(c => c.id === id)
    if (!card) return
    const text = (textOverride ?? card.text).trim()
    if (!text || card.state === 'filling') return
    patchCard(id, { state: 'filling' })
    try {
      const res = await aiFill.mutateAsync({ productId: id, text })
      await applyFill(card, res)
    } catch (err) {
      addToast(extractErrorMessage(err, fa.seller.v2.product.saveFailed))
      patchCard(id, { state: stateOf(card.name, card.price) })
    }
  }

  // بعد از آپلود: فقط پیشنهاد اسم از روی عکس (بدون قیمت)
  async function suggestNameFromPhoto(card: Card) {
    patchCard(card.id, { state: 'filling' })
    try {
      const res = await aiFill.mutateAsync({ productId: card.id, text: '' })
      // اگر فروشنده در این فاصله خودش اسم/قیمت داد، پیشنهاد عکس رد می‌شود (بازنویسی نکند)
      const current = cardsRef.current.find(c => c.id === card.id)
      if (current && (current.name || current.price || current.state === 'ready')) return
      if (res.name) {
        await updateProduct.mutateAsync({ productId: card.id, dto: { name: res.name } })
        patchCard(card.id, { name: res.name, state: stateOf(res.name, 0), summary: res.name })
        return
      }
    } catch {
      // پیشنهاد اختیاری است؛ خطا یعنی همان «منتظر توضیح»
    }
    patchCard(card.id, { state: 'wait' })
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    const chosen = Array.from(files).slice(0, MAX_PHOTOS)
    setUpload({ done: 0, total: chosen.length })
    let next = 0
    let done = 0
    async function worker() {
      while (next < chosen.length) {
        const file = chosen[next++]
        const previewUrl = URL.createObjectURL(file)
        try {
          const draft = await createProduct.mutateAsync({ status: 'DRAFT', name: '', basePrice: 0, via: 'batch' })
          const card: Card = { id: draft.id, imageKey: null, previewUrl, name: '', price: 0, state: 'filling', summary: '', text: '', missing: [] }
          setCards(prev => [...prev, card])
          try {
            const updated = await uploadImage(draft.id, file)
            patchCard(draft.id, { imageKey: updated.images[0] ?? null })
            void suggestNameFromPhoto(card)
          } catch {
            patchCard(draft.id, { state: 'error', uploadFailed: file })
          }
        } catch (err) {
          addToast(extractErrorMessage(err, fa.common.error))
        }
        done++
        setUpload({ done, total: chosen.length })
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chosen.length) }, worker))
    setUpload(null)
  }

  async function retryUpload(id: string) {
    const card = cardsRef.current.find(c => c.id === id)
    if (!card?.uploadFailed) return
    patchCard(id, { state: 'filling', uploadFailed: undefined })
    try {
      const updated = await uploadImage(id, card.uploadFailed)
      patchCard(id, { imageKey: updated.images[0] ?? null })
      void suggestNameFromPhoto(card)
    } catch {
      patchCard(id, { state: 'error', uploadFailed: card.uploadFailed })
    }
  }

  async function addExtraPhoto(files: FileList | null) {
    const id = extraFor.current
    if (!id || !files?.[0]) return
    try {
      await uploadImage(id, files[0])
    } catch (err) {
      addToast(extractErrorMessage(err, fa.seller.v2.product.uploadFailed))
    }
  }

  const ready = useMemo(() => cards.filter(c => c.state === 'ready'), [cards])

  async function publishReady() {
    const ids = ready.map(c => c.id)
    if (ids.length === 0) return
    try {
      const res = await publish.mutateAsync(ids)
      const bad = res.failed.length
      addToast(t.publishedToast(toFa(res.published.length)) + (bad ? t.someIncomplete(toFa(bad)) : ''))
      const failedMap = new Map(res.failed.map(f => [f.id, f.missing]))
      setCards(prev =>
        prev
          .filter(c => !res.published.includes(c.id))
          .map(c => (failedMap.has(c.id) ? { ...c, missing: failedMap.get(c.id)!, state: c.price > 0 ? 'wait' : 'price' } : c)),
      )
      if (bad === 0) navigate('/seller/panel/products')
    } catch (err) {
      addToast(extractErrorMessage(err, fa.common.error))
    }
  }

  const stateBadge = (c: Card) => {
    if (c.state === 'filling') return <span className="flex items-center gap-1 text-xs text-slate-400"><span className="size-3 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />{t.stateFilling}</span>
    if (c.state === 'ready') return <span className="text-xs font-bold text-emerald-400">✓ {t.stateReady}</span>
    if (c.state === 'price') return <span className="text-xs font-bold text-amber-400">{t.statePrice}</span>
    if (c.state === 'error') return <button type="button" onClick={() => void retryUpload(c.id)} className="text-xs font-bold text-red-400">{fa.seller.v2.product.uploadFailed} — {t.retry}</button>
    return <span className="text-xs text-slate-500">{t.stateWait}</span>
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[640px] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-slate-800 bg-slate-950 px-2 py-2 light:border-slate-200 light:bg-white">
        <button type="button" onClick={() => navigate('/seller/panel/products')} aria-label={fa.common.back} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 light:hover:bg-slate-100">
          <BackChevron />
        </button>
        <h1 className="flex-1 text-base font-extrabold text-slate-100 light:text-slate-900">{t.title}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {upload && (
          <div className="rounded-2xl border border-slate-800 p-3 light:border-slate-200">
            <p className="mb-2 text-sm font-bold text-slate-200 light:text-slate-800">{t.uploaded(toFa(upload.done), toFa(upload.total))}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800 light:bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(upload.done / upload.total) * 100}%` }} />
            </div>
          </div>
        )}

        {cards.length === 0 && !upload && (
          <>
            <p className="text-sm text-slate-400">{resume ? t.resumeEmpty : t.pickHint}</p>
            {!resume && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 text-slate-300 light:border-slate-300 light:bg-slate-50"
              >
                <span className="text-4xl">📷</span>
                <b>{t.pick}</b>
              </button>
            )}
          </>
        )}

        {cards.map(c => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 light:border-slate-200 light:bg-white">
            <div className="flex gap-3">
              <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-slate-800 light:bg-slate-200">
                {c.previewUrl ? (
                  <img src={c.previewUrl} alt="" className="size-full object-cover" />
                ) : c.imageKey ? (
                  <img src={productImageUrl(c.id, c.imageKey)} alt="" className="size-full object-cover" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={c.text}
                    onChange={e => patchCard(c.id, { text: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void fillCard(c.id)
                      }
                    }}
                    onBlur={() => void fillCard(c.id)}
                    placeholder={t.cardPlaceholder}
                    className={clsx(
                      'h-10 min-w-0 flex-1 rounded-lg border bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:text-slate-900',
                      c.state === 'price' ? 'border-amber-500/60' : 'border-slate-700 light:border-slate-300',
                    )}
                  />
                  <MicButton storeId={storeId} onText={text => void fillCard(c.id, `${cardsRef.current.find(x => x.id === c.id)?.text ?? ''} ${text}`)} disabled={c.state === 'filling'} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-300 light:text-slate-600">{c.summary}</span>
                  {stateBadge(c)}
                </div>
                {c.missing.length > 0 && <p className="mt-1 text-xs text-amber-400">{c.missing.includes('price') ? fa.seller.v2.product.missingPrice : fa.seller.v2.product.missingStock}</p>}
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      extraFor.current = c.id
                      extraPhotoRef.current?.click()
                    }}
                    className="text-slate-400"
                  >
                    {t.morePhoto}
                  </button>
                  <Link to={`/seller/panel/products/${c.id}`} className="font-bold text-emerald-400 light:text-emerald-700">
                    {t.details} ›
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {cards.length > 0 && cards.length < MAX_PHOTOS && !upload && (
          <button type="button" onClick={() => fileRef.current?.click()} className="self-start text-sm font-bold text-emerald-400 light:text-emerald-700">
            + {t.pick}
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { void onPick(e.target.files); e.target.value = '' }} />
      <input ref={extraPhotoRef} type="file" accept="image/*" hidden onChange={e => { void addExtraPhoto(e.target.files); e.target.value = '' }} />

      {cards.length > 0 && (
        <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 light:border-slate-200 light:bg-white">
          <button
            type="button"
            onClick={() => void publishReady()}
            disabled={ready.length === 0 || publish.isPending}
            className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {t.publishReady(toFa(ready.length))}
          </button>
        </div>
      )}
    </div>
  )
}
