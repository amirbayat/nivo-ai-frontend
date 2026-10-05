import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useCreateKbEntry } from '@/queries/seller.queries'
import type { AnalyzeOwnerNotesResult } from '@/types/api'

// docs/PRD-seller-guide-assistant-modal.md بخش ۱.۲ — پیشنهادهای تحلیل یادداشت، هرکدام جدا
// تایید/رد می‌شود؛ هیچ‌چیز خودکار در فیلد اصلی نمی‌نشیند. مشترک بین SellerStoreSettingsPage
// و SellerOnboardingPage (فیدبک کاربر ۱۴۰۵/۰۷/۱۵ — onboarding هم باید همه‌ی پیشنهادها را نشان
// بدهد، نه فقط brandIntro، وگرنه سیاست ارسال/مرجوعی/دسته‌بندی/باکس دانشی که فروشنده پیست کرده گم می‌شود)
export function NotesSuggestionsPanel({
  storeId,
  result,
  onApplyBrandIntro,
  onApplyShippingInfo,
  onApplyReturnPolicy,
  onApplyCategory,
}: {
  storeId: string
  result: AnalyzeOwnerNotesResult
  onApplyBrandIntro: (text: string) => void
  onApplyShippingInfo: (text: string) => void
  onApplyReturnPolicy: (text: string) => void
  onApplyCategory: (category: string) => void
}) {
  const createKb = useCreateKbEntry(storeId)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [addedKb, setAddedKb] = useState<Set<number>>(new Set())

  const suggestionRows: { key: string; label: string; onApply: () => void }[] = []
  if (result.brandIntroSuggestion && !dismissed.has('brandIntro')) {
    suggestionRows.push({
      key: 'brandIntro',
      label: result.brandIntroSuggestion,
      onApply: () => onApplyBrandIntro(result.brandIntroSuggestion!),
    })
  }
  if (result.shippingInfoSuggestion && !dismissed.has('shippingInfo')) {
    suggestionRows.push({
      key: 'shippingInfo',
      label: result.shippingInfoSuggestion,
      onApply: () => onApplyShippingInfo(result.shippingInfoSuggestion!),
    })
  }
  if (result.returnPolicySuggestion && !dismissed.has('returnPolicy')) {
    suggestionRows.push({
      key: 'returnPolicy',
      label: result.returnPolicySuggestion,
      onApply: () => onApplyReturnPolicy(result.returnPolicySuggestion!),
    })
  }

  const hasCategory = result.categoryHint && !dismissed.has('category')
  const kbCandidates = result.kbCandidates.filter((_, i) => !addedKb.has(i))

  if (suggestionRows.length === 0 && !hasCategory && kbCandidates.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="mb-3 text-xs font-semibold text-amber-400">{fa.seller.panel.guidePrompt.suggestionsTitle}</p>
      <div className="flex flex-col gap-2.5">
        {suggestionRows.map(row => (
          <div key={row.key} className="rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-900/40 light:bg-white p-3">
            <p className="mb-2 text-xs text-slate-300 light:text-slate-700">{row.label}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  row.onApply()
                  setDismissed(prev => new Set(prev).add(row.key))
                }}
                className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700"
              >
                {row.key === 'brandIntro' && fa.seller.panel.guidePrompt.applyBrandIntro}
                {row.key === 'shippingInfo' && fa.seller.panel.guidePrompt.applyShippingInfo}
                {row.key === 'returnPolicy' && fa.seller.panel.guidePrompt.applyReturnPolicy}
              </button>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(row.key))}
                className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-1.5 text-xs font-bold text-slate-400"
              >
                {fa.seller.panel.guidePrompt.ignore}
              </button>
            </div>
          </div>
        ))}

        {hasCategory && (
          <div className="rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-900/40 light:bg-white p-3">
            <p className="mb-2 text-xs text-slate-300 light:text-slate-700">{result.categoryHint}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onApplyCategory(result.categoryHint!)
                  setDismissed(prev => new Set(prev).add('category'))
                }}
                className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700"
              >
                {fa.seller.panel.guidePrompt.applyCategory}
              </button>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add('category'))}
                className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-1.5 text-xs font-bold text-slate-400"
              >
                {fa.seller.panel.guidePrompt.ignore}
              </button>
            </div>
          </div>
        )}

        {kbCandidates.map(c => {
          const originalIndex = result.kbCandidates.indexOf(c)
          return (
            <div key={originalIndex} className="rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-900/40 light:bg-white p-3">
              <p className="mb-1 text-xs font-semibold text-slate-200 light:text-slate-900">{c.question}</p>
              <p className="mb-2 text-xs text-slate-400 light:text-slate-600">{c.answer}</p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    createKb.mutate(
                      { kind: c.kind, question: c.question, answer: c.answer, tags: c.tags, source: 'AI_ENRICHMENT' },
                      { onSuccess: () => setAddedKb(prev => new Set(prev).add(originalIndex)) },
                    )
                  }
                  disabled={createKb.isPending}
                  className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                >
                  {fa.seller.panel.guidePrompt.kbCandidateAdd}
                </button>
                <button
                  onClick={() => setAddedKb(prev => new Set(prev).add(originalIndex))}
                  className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-1.5 text-xs font-bold text-slate-400"
                >
                  {fa.seller.panel.guidePrompt.ignore}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
