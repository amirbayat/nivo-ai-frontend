import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { toEnglishDigits } from '@/lib/digits'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useAnalyzeOwnerNotes, useMyStores, useProducts, useUpdateStore } from '@/queries/seller.queries'
import type { AnalyzeOwnerNotesResult } from '@/types/api'
import { useSellerStore } from '../SellerPanelLayout'
import { GuideAssistantModal } from '../GuideAssistantModal'
import { NotesSuggestionsPanel } from '../NotesSuggestionsPanel'
import { SaveBar, StoreSubpage } from './StoreSubpage'

const t = fa.seller.panel.storeSettings

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-0.5 text-sm font-bold text-slate-200 light:text-slate-800">{title}</p>
      {hint && <p className="mb-1 text-[11px] text-slate-500">{hint}</p>}
      {children}
    </section>
  )
}

// docs/PRD-seller-panel-simplification.md §4.9 — «تنظیمات پیشرفته»: چیزهایی که اکثر فروشنده‌ها هیچ‌وقت
// لازم ندارند (پیام‌های خودکار، رفتار AI، جواب صوتی، قیمت طلا، یادداشت آزاد برای AI)
export function StoreAdvancedPage() {
  const { storeId } = useSellerStore()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const products = useProducts(storeId)
  const update = useUpdateStore(storeId)
  const reanalyze = useAnalyzeOwnerNotes(storeId)
  const [follow, setFollow] = useState(true)
  const [cart, setCart] = useState(true)
  const [persuasion, setPersuasion] = useState(true)
  const [voice, setVoice] = useState(false)
  const [notes, setNotes] = useState('')
  const [wageType, setWageType] = useState<'PERCENT' | 'FIXED_PER_GRAM'>('PERCENT')
  const [wageValue, setWageValue] = useState('')
  const [profit, setProfit] = useState('')
  const [vat, setVat] = useState('10')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [notesResult, setNotesResult] = useState<AnalyzeOwnerNotesResult | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (!store || loaded.current) return
    loaded.current = true
    setFollow(store.postPurchaseFollowUpEnabled)
    setCart(store.abandonedCartReminderEnabled)
    setPersuasion(store.persuasionTechniquesEnabled)
    setVoice(store.voiceRepliesEnabled)
    setNotes(store.ownerNotes ?? '')
    if (store.goldWageType) setWageType(store.goldWageType)
    setWageValue(store.goldWageValue != null ? String(store.goldWageValue) : '')
    setProfit(store.goldProfitPercent != null ? String(store.goldProfitPercent) : '')
    setVat(String(store.goldVatPercent))
  }, [store])

  if (!store) return <StoreSubpage title={fa.seller.v2.store.advanced}>{null}</StoreSubpage>
  // فقط وقتی فروشگاه طلا/جواهر است یا حداقل یک محصول وزن‌محور دارد
  const showGold = store.category === 'جواهرات و اکسسوری' || (products.data?.some(p => p.pricingModel === 'WEIGHT_BASED_FORMULA') ?? false)

  function save() {
    setError(null)
    update.mutate(
      {
        postPurchaseFollowUpEnabled: follow,
        abandonedCartReminderEnabled: cart,
        persuasionTechniquesEnabled: persuasion,
        voiceRepliesEnabled: voice,
        ownerNotes: notes.trim() || undefined,
        goldWageType: showGold ? wageType : undefined,
        goldWageValue: showGold && wageValue ? Number(toEnglishDigits(wageValue)) : undefined,
        goldProfitPercent: showGold && profit ? Number(toEnglishDigits(profit)) : undefined,
        goldVatPercent: showGold && vat ? Number(toEnglishDigits(vat)) : undefined,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
        onError: e => setError(extractErrorMessage(e, t.saveError)),
      },
    )
  }

  // پیشنهادهای تحلیل یادداشت مستقیم روی فیلد مربوط ذخیره می‌شوند (آن فیلدها در صفحه‌های دیگرند)
  const apply = (patch: Parameters<typeof update.mutate>[0]) => update.mutate({ ...patch, source: 'AI_ENRICHMENT' })

  return (
    <StoreSubpage title={fa.seller.v2.store.advanced} footer={<SaveBar onSave={save} pending={update.isPending} saved={saved} error={error} />}>
      <Group title={t.autoMessagesLabel} hint={t.autoMessagesHint}>
        <ToggleRow label={t.postPurchaseFollowUpLabel} checked={follow} onChange={setFollow} />
        <ToggleRow label={t.abandonedCartReminderLabel} checked={cart} onChange={setCart} />
      </Group>
      <Group title={t.persuasionLabel} hint={t.persuasionHint}>
        <ToggleRow label={t.persuasionToggleLabel} checked={persuasion} onChange={setPersuasion} />
      </Group>
      <Group title={t.voiceLabel} hint={t.voiceHint}>
        <ToggleRow label={t.voiceToggleLabel} checked={voice} onChange={setVoice} />
      </Group>

      {showGold && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-300">{t.goldPricingTitle}</p>
          <p className="mb-3 text-[11px] text-slate-500">{t.goldPricingHint}</p>
          <div className="mb-3 flex gap-2">
            {(['PERCENT', 'FIXED_PER_GRAM'] as const).map(k => (
              <button key={k} type="button" onClick={() => setWageType(k)} className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${wageType === k ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400 light:border-slate-300'}`}>
                {k === 'PERCENT' ? t.goldWageTypePercent : t.goldWageTypeFixedPerGram}
              </button>
            ))}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <DigitsInput kind="decimal" label={wageType === 'PERCENT' ? t.goldWageValuePercentLabel : t.goldWageValueFixedLabel} value={wageValue} onChange={setWageValue} className="text-center" />
            <DigitsInput kind="decimal" label={t.goldProfitPercentLabel} value={profit} onChange={setProfit} className="text-center" />
          </div>
          <DigitsInput kind="decimal" label={t.goldVatPercentLabel} value={vat} onChange={setVat} className="w-1/2 text-center" />
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-bold text-slate-200 light:text-slate-800">{fa.seller.v2.storeAdvanced.notes}</label>
          <button type="button" onClick={() => setGuideOpen(true)} className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700">
            ✨ {fa.seller.panel.guidePrompt.button}
          </button>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-700 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900" />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">{fa.seller.panel.guidePrompt.ownerNotesHint}</p>
          <button type="button" onClick={() => reanalyze.mutate({ entityType: 'STORE', rawText: undefined }, { onSuccess: setNotesResult })} disabled={!notes.trim() || reanalyze.isPending} className="shrink-0 text-xs font-bold text-emerald-400 disabled:opacity-40 light:text-emerald-700">
            {reanalyze.isPending ? fa.seller.panel.guidePrompt.reanalyzing : fa.seller.panel.guidePrompt.reanalyze}
          </button>
        </div>
        {reanalyze.isError && <p className="mt-1 text-xs text-red-400">{fa.seller.panel.guidePrompt.analyzeError}</p>}
      </section>

      {notesResult && (
        <NotesSuggestionsPanel
          storeId={storeId}
          result={notesResult}
          onApplyBrandIntro={text => apply({ brandIntro: text })}
          onApplyShippingInfo={text => apply({ shippingInfo: text })}
          onApplyReturnPolicy={text => apply({ returnPolicy: text })}
          onApplyCategory={c => apply({ category: c })}
        />
      )}

      <GuideAssistantModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        context="store-setup"
        storeId={storeId}
        category={store.category}
        businessType={store.businessType}
        storeName={store.name}
        onResult={result => {
          setNotes(result.ownerNotes)
          setNotesResult(result)
        }}
      />
    </StoreSubpage>
  )
}
