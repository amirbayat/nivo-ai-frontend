import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { MicButton } from '@/components/ui/MicButton'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useMyStores, useUpdateStore } from '@/queries/seller.queries'
import { useSellerStore } from '../SellerPanelLayout'
import { SellerKnowledgePage } from '../SellerKnowledgePage'
// import { SellerTestChatSheet } from '../SellerTestChatSheet'
import { SaveBar, StoreSubpage } from './StoreSubpage'

const t = fa.seller.v2.storeBot

function Card({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 light:border-slate-200 light:bg-white">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-100 light:text-slate-900">
        {title}
        {done && <span className="text-emerald-400">✓</span>}
      </h2>
      {children}
    </section>
  )
}

const areaClass =
  'w-full resize-none rounded-xl border border-slate-700 bg-transparent px-3.5 py-2.5 pb-10 text-sm leading-7 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900'

// docs/PRD-seller-panel-simplification.md §4.9 — «بات من»: هر چیزی که بات باید درباره‌ی فروشگاه بدانند
export function StoreBotPage() {
  const { storeId } = useSellerStore()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const update = useUpdateStore(storeId)
  const [intro, setIntro] = useState('')
  const [returns, setReturns] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // const [testOpen, setTestOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!store || loaded.current) return
    loaded.current = true
    setIntro(store.brandIntro ?? '')
    setReturns(store.returnPolicy ?? '')
    setFrom(store.workingHoursStart ?? '')
    setTo(store.workingHoursEnd ?? '')
  }, [store])

  if (!store) return <StoreSubpage title={t.title}>{null}</StoreSubpage>
  const dirty = intro !== (store.brandIntro ?? '') || returns !== (store.returnPolicy ?? '') || from !== (store.workingHoursStart ?? '') || to !== (store.workingHoursEnd ?? '')

  function save() {
    setError(null)
    update.mutate(
      {
        brandIntro: intro.trim() || undefined,
        returnPolicy: returns.trim() || undefined,
        workingHoursStart: from || undefined,
        workingHoursEnd: to || undefined,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
        onError: e => setError(extractErrorMessage(e, fa.seller.panel.storeSettings.saveError)),
      },
    )
  }

  return (
    <StoreSubpage title={t.title} footer={<SaveBar onSave={save} pending={update.isPending} dirty={dirty} saved={saved} error={error} />}>
      {/* تست بات موقتاً غیرفعال
      <button type="button" onClick={() => setTestOpen(true)} className="h-12 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-400 light:text-emerald-700">
        {t.test}
      </button> */}

      <Card title={t.intro} done={!!store.brandIntro}>
        <div className="relative">
          <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={7} maxLength={(store as { leadCaptureOnly?: boolean }).leadCaptureOnly ? 2000 : 1500} placeholder={fa.seller.panel.storeSettings.brandIntroPlaceholder} className={areaClass} />
          <div className="absolute bottom-2 left-2">
            <MicButton storeId={storeId} onText={v => setIntro(prev => (prev ? `${prev} ${v}` : v))} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.introHint} ({intro.length.toLocaleString('fa-IR')})</p>
      </Card>

      <Card title={t.returns} done={!!store.returnPolicy}>
        <div className="relative">
          <textarea value={returns} onChange={e => setReturns(e.target.value)} rows={3} maxLength={1000} placeholder={fa.seller.panel.storeSettings.returnPolicyPlaceholder} className={areaClass} />
          <div className="absolute bottom-2 left-2">
            <MicButton storeId={storeId} onText={v => setReturns(prev => (prev ? `${prev} ${v}` : v))} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (returns.trim() && !window.confirm(fa.seller.panel.storeSettings.returnPolicyTemplateConfirm)) return
            setReturns(fa.seller.panel.storeSettings.returnPolicyTemplate)
          }}
          className="mt-2 text-xs font-bold text-emerald-400 light:text-emerald-700"
        >
          {fa.seller.panel.storeSettings.returnPolicyTemplateButton}
        </button>
      </Card>

      <Card title={t.hours} done={!!(store.workingHoursStart && store.workingHoursEnd)}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {fa.seller.v2.today.workingHoursFrom}
            <input type="time" dir="ltr" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-700 bg-transparent px-3 text-slate-100 light:border-slate-300 light:text-slate-900" />
          </label>
          <label className="text-xs text-slate-400">
            {fa.seller.v2.today.workingHoursTo}
            <input type="time" dir="ltr" value={to} onChange={e => setTo(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-700 bg-transparent px-3 text-slate-100 light:border-slate-300 light:text-slate-900" />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.hoursHint}</p>
      </Card>

      <Card title={t.faq} done={false}>
        <button type="button" onClick={() => setMoreOpen(v => !v)} className="mb-3 text-xs font-bold text-emerald-400 light:text-emerald-700">
          {moreOpen ? fa.common.close : t.addFromFile}
        </button>
        <SellerKnowledgePage embedded expanded={moreOpen} />
      </Card>

      {/* {testOpen && <SellerTestChatSheet storeId={storeId} onClose={() => setTestOpen(false)} />} */}
    </StoreSubpage>
  )
}
