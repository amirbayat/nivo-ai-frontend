import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import { keys } from '@/queries/keys'
import { prepareImage, PrepareImageError } from '@/lib/prepareImage'
import { productImageUrl } from '@/lib/sellerProduct'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useDeleteProductImage } from '@/queries/seller.queries'
import { useSetCoverImage } from '@/queries/sellerV2.queries'
import type { SellerProduct } from '@/types/api'

const t = fa.seller.v2.product
const MAX_PHOTOS = 4

interface Pending {
  id: string
  previewUrl: string
  file: File
  pct: number
  error: string | null
}

interface Props {
  storeId: string
  productId: string | null
  images: string[]
  // اولین عکس/اقدام: پیش‌نویس را می‌سازد و شناسه را برمی‌گرداند
  ensureDraft: () => Promise<string>
  onProductUpdated: (product: SellerProduct) => void
}

// docs/PRD-seller-panel-simplification.md §4.4 — عکس‌ها: انتخاب با picker بومی (دوربین/گالری)،
// prepareImage (HEIC + فشرده‌سازی + سقف ۵MB)، پیش‌نمایش فوری با پیشرفت، خطا همیشه نمایش داده
// می‌شود (قبلاً upload.isError نادیده گرفته می‌شد)، عکس اول = کاور.
export function PhotoGrid({ storeId, productId, images, ensureDraft, onProductUpdated }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const remove = useDeleteProductImage(storeId)
  const cover = useSetCoverImage(storeId)
  const pendingRef = useRef<Pending[]>([])
  pendingRef.current = pending

  useEffect(() => () => pendingRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl)), [])

  async function upload(item: Pending, pid: string) {
    setPending(prev => prev.map(p => (p.id === item.id ? { ...p, error: null, pct: 0 } : p)))
    try {
      const file = await prepareImage(item.file)
      const form = new FormData()
      form.append('files', file)
      const res = await api.post<SellerProduct>(`/v2/stores/${storeId}/products/${pid}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 50
          setPending(prev => prev.map(p => (p.id === item.id ? { ...p, pct } : p)))
        },
      })
      onProductUpdated(res.data)
      void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) })
      setPending(prev => prev.filter(p => p.id !== item.id))
      URL.revokeObjectURL(item.previewUrl)
    } catch (err) {
      const message = err instanceof PrepareImageError ? err.message : t.uploadFailed
      setPending(prev => prev.map(p => (p.id === item.id ? { ...p, error: message } : p)))
    }
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    const room = MAX_PHOTOS - images.length - pending.length
    const chosen = Array.from(files).slice(0, Math.max(0, room))
    if (chosen.length === 0) return
    const items: Pending[] = chosen.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      pct: 0,
      error: null,
    }))
    setPending(prev => [...prev, ...items])
    let pid: string
    try {
      pid = productId ?? (await ensureDraft())
    } catch {
      // ساخت پیش‌نویس نشد: تایل‌ها خطا نشان بدهند (نه چرخش بی‌پایان)
      setPending(prev => prev.map(p => (items.some(i => i.id === p.id) ? { ...p, error: t.uploadFailed } : p)))
      return
    }
    // پشت‌سرهم (ترتیب عکس‌ها حفظ شود و سرور هم یک‌به‌یک بپذیرد)
    for (const item of items) await upload(item, pid)
  }

  const total = images.length + pending.length
  const picker = (
    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { void onPick(e.target.files); e.target.value = '' }} />
  )

  if (total === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-[150px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 text-slate-400 light:border-slate-300 light:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-9 text-emerald-400">
            <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <b className="text-slate-200 light:text-slate-800">{t.photoTitle}</b>
          <span className="text-xs">{t.photoHint}</span>
        </button>
        {picker}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {images.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setMenuKey(key)}
            className="relative aspect-square overflow-hidden rounded-2xl bg-slate-800"
          >
            {productId && <img src={productImageUrl(productId, key)} alt="" className="size-full object-cover" />}
            {i === 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">{t.cover}</span>}
          </button>
        ))}
        {pending.map(p => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-800">
            <img src={p.previewUrl} alt="" className="size-full object-cover" />
            {p.error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-950/80 text-xs text-white">
                <span className="px-2 text-center">{p.error}</span>
                {p.error === t.uploadFailed && (
                  <button
                    type="button"
                    onClick={() => void (productId ? upload(p, productId) : ensureDraft().then(id => upload(p, id)))}
                    className="rounded-full border border-white px-3 py-1"
                  >
                    {t.retry}
                  </button>
                )}
                <button type="button" onClick={() => setPending(prev => prev.filter(x => x.id !== p.id))} className="underline">
                  {t.removePhoto}
                </button>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 text-xs text-white">
                  <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>{fa.seller.v2.product.uploadPct(String(p.pct).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]))}</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-400" style={{ width: `${p.pct}%` }} />
              </>
            )}
          </div>
        ))}
        {total < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={t.photoTitle}
            className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 text-3xl text-slate-500 light:border-slate-300"
          >
            +
          </button>
        )}
      </div>
      {picker}
      <BottomSheet open={menuKey !== null} onClose={() => setMenuKey(null)}>
        <div className="flex flex-col gap-2 pb-2">
          {menuKey && images[0] !== menuKey && (
            <button
              type="button"
              onClick={() => {
                if (productId && menuKey) cover.mutate({ productId, key: menuKey }, { onSuccess: onProductUpdated })
                setMenuKey(null)
              }}
              className="h-12 rounded-xl bg-slate-800 text-sm font-bold text-slate-100 light:bg-slate-100 light:text-slate-900"
            >
              {t.makeCover}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (productId && menuKey) remove.mutate({ productId, key: menuKey }, { onSuccess: onProductUpdated })
              setMenuKey(null)
            }}
            className="h-12 rounded-xl bg-red-500/15 text-sm font-bold text-red-400"
          >
            {t.removePhoto}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
