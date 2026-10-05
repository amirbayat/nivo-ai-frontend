import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fa } from '@/locales/fa'
import { extractErrorMessage } from '@/lib/sellerProduct'
import {
  useCompleteProductInfo,
  useCreateKbEntry,
  useGenerateProductDescriptionFromNotes,
  useTranscribeAudio,
} from '@/queries/seller.queries'
import type { NotesAnalysisKbCandidate, ProductSpecSuggestion } from '@/types/api'
import { GuidePromptModal } from './GuidePromptModal'

type Suggestion = {
  description: string
  specs?: ProductSpecSuggestion[]
  sourceNote?: string
  kbCandidates?: NotesAnalysisKbCandidate[]
}

// docs/PRD-product-description-editor.md — جایگزین textarea سه‌خطی قبلی + دو مدال جدای AI
// (DescriptionNotesAssist حذف شد، تب متنی AiCompleteAssist هم همین‌جا ادغام شد) با یک صفحه‌ی
// تمام‌صفحه‌ی واحد؛ فیدبک کاربر ۱۴۰۵/۰۸: «شبیه گوگل داک» + دو اکشن AI («بهبود نوشته‌ی من» ارزان
// روی متن زنده، «تکمیل با جستجوی وب» روی همون pipeline وب‌سرچ موجود completeProductInfo)
export function ProductDescriptionModal({
  open,
  onClose,
  storeId,
  productId,
  value,
  maxLength,
  onApply,
  onApplySpecs,
}: {
  open: boolean
  onClose: () => void
  storeId: string
  productId?: string
  value: string
  maxLength: number
  onApply: (text: string) => void
  onApplySpecs: (specs: ProductSpecSuggestion[]) => void
}) {
  const [draft, setDraft] = useState(value)
  const [previewOn, setPreviewOn] = useState(false)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)

  // هر بار مدال باز می‌شود، از آخرین مقدار صفحه‌ی اصلی شروع می‌کند — نه از جایی که دفعه‌ی
  // قبل ول کرده بود (مثلاً اگر AiCompleteAssist از جای دیگری description را عوض کرده باشد)
  useEffect(() => {
    if (open) {
      setDraft(value)
      setSuggestion(null)
      setAddedKb(new Set())
      setPreviewOn(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const transcribe = useTranscribeAudio(storeId)
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        transcribe.mutate(blob, {
          onSuccess: ({ text }) => {
            const trimmed = text.trim()
            if (trimmed) setDraft(prev => (prev ? `${prev}\n${trimmed}` : trimmed))
          },
        })
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      // دسترسی میکروفون رد شد — دکمه به حالت اولیه برمی‌گردد
    }
  }

  const improve = useGenerateProductDescriptionFromNotes(storeId)
  const webComplete = useCompleteProductInfo(storeId)
  const createKb = useCreateKbEntry(storeId)
  const [guideOpen, setGuideOpen] = useState(false)
  const [addedKb, setAddedKb] = useState<Set<number>>(new Set())

  function clickImprove() {
    if (!productId || !draft.trim()) return
    improve.mutate(
      { productId, rawText: draft },
      { onSuccess: res => setSuggestion({ description: res.suggestedDescription }) },
    )
  }

  function clickWebComplete() {
    if (!productId) return
    webComplete.mutate(
      { productId, withWebSearch: true, currentDraft: draft },
      {
        onSuccess: res =>
          setSuggestion({ description: res.suggestedDescription, specs: res.suggestedSpecs, sourceNote: res.sourceNote }),
      },
    )
  }

  function applySuggestion() {
    if (!suggestion) return
    setDraft(suggestion.description)
    if (suggestion.specs?.length) onApplySpecs(suggestion.specs)
    setSuggestion(null)
  }

  function applyAndClose() {
    onApply(draft)
    onClose()
  }

  const aiPending = improve.isPending || webComplete.isPending

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col bg-[var(--bg)] transition-transform duration-300 ease-out',
        open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={fa.seller.panel.products.descriptionModalTitle}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/50 light:border-slate-200 px-5 pb-4"
        style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={fa.common.close}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300 light:text-slate-600"
          style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-[14px] font-bold text-white light:text-slate-900">
          {fa.seller.panel.products.descriptionModalTitle}
        </span>
        <button type="button" onClick={applyAndClose} className="shrink-0 text-[13px] font-bold text-emerald-400 light:text-emerald-700">
          {fa.seller.panel.products.descriptionModalDone}
        </button>
      </div>

      <div
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {previewOn ? (
          <div className="min-h-[260px] flex-1 rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-900/40 light:bg-slate-50 px-3.5 py-3 text-sm text-slate-100 light:text-slate-900 prose prose-sm prose-invert light:prose-neutral max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft || fa.seller.panel.products.descriptionPlaceholder}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={fa.seller.panel.products.descriptionPlaceholder}
            maxLength={maxLength}
            className="min-h-[260px] w-full flex-1 resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-3 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600 outline-none"
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void toggleRecording()}
            disabled={transcribe.isPending}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              recording ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 light:bg-slate-100 text-slate-300 light:text-slate-700'
            } disabled:opacity-40`}
          >
            🎙️ {recording ? fa.seller.panel.products.descriptionDictating : fa.seller.panel.products.descriptionDictateStart}
          </button>
          <button
            type="button"
            onClick={() => setPreviewOn(p => !p)}
            className="text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
          >
            {fa.seller.panel.products.descriptionPreviewToggle}
          </button>
        </div>
        {transcribe.isPending && <p className="-mt-2 text-xs text-slate-500">{fa.seller.panel.products.descriptionTranscribing}</p>}
        {transcribe.isError && <p className="-mt-2 text-xs text-red-400">{fa.seller.panel.products.descriptionDictateError}</p>}

        <div className="h-px bg-slate-800 light:bg-slate-200" />

        {productId ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={clickImprove}
              disabled={aiPending || !draft.trim()}
              className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {improve.isPending ? fa.seller.panel.products.aiImproveLoading : `✨ ${fa.seller.panel.products.aiImproveButton}`}
            </button>
            <button
              type="button"
              onClick={clickWebComplete}
              disabled={aiPending}
              className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {webComplete.isPending ? fa.seller.panel.products.aiWebCompleteLoading : `🔍 ${fa.seller.panel.products.aiWebCompleteButton}`}
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20"
            >
              ✨ {fa.seller.panel.guidePrompt.button} (ChatGPT)
            </button>
            <p className="px-0.5 text-[11px] text-slate-500 light:text-slate-400">{fa.seller.panel.products.aiWebSearchHint}</p>
            {improve.isError && (
              <p className="text-xs text-red-400">{extractErrorMessage(improve.error, fa.seller.panel.products.aiDescribeFromNotesError)}</p>
            )}
            {webComplete.isError && (
              <p className="text-xs text-red-400">{extractErrorMessage(webComplete.error, fa.seller.panel.products.aiCompleteError)}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 px-3.5 py-3">
            <span className="text-sm">🆕</span>
            <p className="text-[11px] leading-relaxed text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiNewProductHint}</p>
          </div>
        )}

        {suggestion && (
          <div className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
            <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
            <div className="prose prose-sm prose-invert light:prose-neutral mb-3 max-w-none text-sm text-slate-200 light:text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggestion.description}</ReactMarkdown>
            </div>
            {!!suggestion.specs?.length && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
                <div className="flex flex-col gap-1">
                  {suggestion.specs.map((s, i) => (
                    <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                      <span className="font-semibold">{s.label}:</span> {s.value}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {suggestion.sourceNote && <p className="mb-3 text-[11px] text-slate-500">{suggestion.sourceNote}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={applySuggestion} className="flex-1 rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700">
                {fa.seller.panel.products.aiSuggestionApply}
              </button>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-bold text-slate-300 light:text-slate-600"
              >
                {fa.seller.panel.products.aiSuggestionDismiss}
              </button>
            </div>
          </div>
        )}

        {!!suggestion?.kbCandidates?.filter((_, i) => !addedKb.has(i)).length && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <p className="mb-2 text-xs font-semibold text-amber-400">{fa.seller.panel.guidePrompt.suggestionsTitle}</p>
            <div className="flex flex-col gap-2">
              {suggestion.kbCandidates.map((c, i) =>
                addedKb.has(i) ? null : (
                  <div key={i} className="rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-900/40 light:bg-white p-3">
                    <p className="mb-1 text-xs font-semibold text-slate-200 light:text-slate-900">{c.question}</p>
                    <p className="mb-2 text-xs text-slate-400 light:text-slate-600">{c.answer}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          createKb.mutate(
                            { kind: c.kind, question: c.question, answer: c.answer, tags: c.tags, relatedProductId: productId, source: 'AI_ENRICHMENT' },
                            { onSuccess: () => setAddedKb(prev => new Set(prev).add(i)) },
                          )
                        }
                        disabled={createKb.isPending}
                        className="flex-1 rounded-lg bg-emerald-500/20 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                      >
                        {fa.seller.panel.guidePrompt.kbCandidateAdd}
                      </button>
                      <button
                        onClick={() => setAddedKb(prev => new Set(prev).add(i))}
                        className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-1.5 text-xs font-bold text-slate-400"
                      >
                        {fa.seller.panel.guidePrompt.ignore}
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <GuidePromptModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        context="product"
        storeId={storeId}
        productId={productId}
        onResult={result => {
          setSuggestion({
            description: result.descriptionSuggestion ?? draft,
            specs: result.specsSuggestion ?? undefined,
            kbCandidates: result.kbCandidates,
          })
          setAddedKb(new Set())
        }}
      />
    </div>
  )
}
