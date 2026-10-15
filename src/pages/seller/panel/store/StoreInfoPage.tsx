import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { prepareImage, PrepareImageError } from '@/lib/prepareImage'
import { extractErrorMessage, storeLogoUrl } from '@/lib/sellerProduct'
import { useMyStores, useRemoveStoreLogo, useUpdateStore, useUploadStoreLogo } from '@/queries/seller.queries'
import type { SellerStore } from '@/types/api'
import { useSellerStore } from '../SellerPanelLayout'
import { SaveBar, StoreSubpage } from './StoreSubpage'

const t = fa.seller.v2.storeInfo

function LogoUpload({ store }: { store: SellerStore }) {
  const upload = useUploadStoreLogo(store.id)
  const remove = useRemoveStoreLogo(store.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const src = preview ?? (store.logoImageKey ? storeLogoUrl(store.id, store.logoImageKey) : null)

  async function pick(file: File) {
    setError(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    try {
      const prepared = await prepareImage(file)
      upload.mutate(prepared, { onSettled: () => setPreview(null), onError: e => setError(extractErrorMessage(e, fa.seller.panel.storeSettings.logoUploadError)) })
    } catch (e) {
      setPreview(null)
      setError(e instanceof PrepareImageError ? e.message : fa.seller.panel.storeSettings.logoUploadError)
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-slate-400">{fa.seller.panel.storeSettings.logoLabel}</label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="relative flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-600 text-slate-500 disabled:opacity-40">
          {src ? <img src={src} alt="" className="size-full object-cover" /> : '+'}
          {upload.isPending && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /></span>}
        </button>
        {store.logoImageKey && (
          <button type="button" onClick={() => remove.mutate()} disabled={remove.isPending} className="text-xs text-red-400">
            {t.removeLogo}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = '' }} />
    </div>
  )
}

const cleanSlug = (raw: string) => toEnglishDigits(raw).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)

// docs/PRD-seller-panel-simplification.md §4.9 — «اطلاعات فروشگاه»: لوگو، نام، لینک (فقط تا قبل از اولین
// مشتری واقعی)، دسته، لینک‌های اینستاگرام/تلگرام/وب‌سایت
export function StoreInfoPage() {
  const { storeId } = useSellerStore()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const update = useUpdateStore(storeId)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('')
  const [instagram, setInstagram] = useState('')
  const [telegram, setTelegram] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [lockedByServer, setLockedByServer] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!store || loaded.current) return
    loaded.current = true
    setName(store.name)
    setSlug(store.slug)
    setCategory(store.category ?? '')
    setInstagram(store.instagramUrl ?? '')
    setTelegram(store.telegramUrl ?? '')
    setWebsite(store.websiteUrl ?? '')
  }, [store])

  if (!store) return <StoreSubpage title={t.title}>{null}</StoreSubpage>
  const locked = !!store.slugLocked || lockedByServer
  const dirty =
    name !== store.name || slug !== store.slug || category !== (store.category ?? '') || instagram !== (store.instagramUrl ?? '') || telegram !== (store.telegramUrl ?? '') || website !== (store.websiteUrl ?? '')
  const categories = fa.seller.step1.categories as readonly string[]

  function save() {
    setError(null)
    update.mutate(
      {
        name: name.trim(),
        ...(slug !== store!.slug && !locked ? { slug } : {}),
        category: category || undefined,
        instagramUrl: instagram.trim(),
        telegramUrl: telegram.trim(),
        websiteUrl: website.trim(),
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
        onError: err => {
          const msg = extractErrorMessage(err, fa.common.error)
          if (msg === fa.seller.v2.storeInfo.serverSlugLocked) setLockedByServer(true)
          setError(msg)
        },
      },
    )
  }

  return (
    <StoreSubpage title={t.title} footer={<SaveBar onSave={save} pending={update.isPending} dirty={dirty && name.trim().length >= 2} saved={saved} error={error} />}>
      <LogoUpload store={store} />
      <Input label={t.name} value={name} onChange={e => setName(e.target.value)} maxLength={60} />
      <div>
        <label className="mb-1.5 block text-sm text-slate-400">{t.link}</label>
        {locked ? (
          <>
            <p dir="ltr" className="rounded-xl bg-slate-800/50 px-4 py-3 text-left font-mono text-sm text-slate-400 light:bg-slate-100">nivoai.ir/shop/{store.slug}</p>
            <p className="mt-1 text-xs text-slate-500">{t.slugLockedHint}</p>
          </>
        ) : (
          <div className="flex items-center gap-2" dir="ltr">
            <span className="font-mono text-xs text-slate-500">nivoai.ir/shop/</span>
            <input value={slug} onChange={e => setSlug(cleanSlug(e.target.value))} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-transparent px-3 text-left font-mono text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900" />
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">{t.category}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)} className={clsx('rounded-full border px-3 py-1.5 text-[13px]', category === c ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700' : 'border-slate-700 text-slate-300 light:border-slate-300 light:text-slate-600')}>
              {c}
            </button>
          ))}
          {category && !categories.includes(category) && <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[13px] font-bold text-emerald-400">{category}</span>}
        </div>
      </div>
      <Input label={t.instagram} value={instagram} onChange={e => setInstagram(e.target.value)} dir="ltr" placeholder="instagram.com/yourshop" maxLength={200} />
      <Input label={t.telegram} value={telegram} onChange={e => setTelegram(e.target.value)} dir="ltr" placeholder="t.me/yourshop" maxLength={200} />
      <Input label={t.website} value={website} onChange={e => setWebsite(e.target.value)} dir="ltr" maxLength={200} />
    </StoreSubpage>
  )
}
