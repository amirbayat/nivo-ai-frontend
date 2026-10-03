import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { extractErrorMessage, productImageUrl } from '@/lib/sellerProduct'
import {
  useApproveEnrichmentDraft,
  useCompleteProductInfo,
  useCompleteProductInfoFromPhoto,
  useCreateKbEntry,
  usePendingEnrichmentDraft,
  useRejectEnrichmentDraft,
} from '@/queries/seller.queries'
import type { ProductSpecSuggestion, SellerProduct } from '@/types/api'

// یک سطح «برگردون به قبل» مشترک بین هر دو مسیر تولید (متن/عکس) — هرکدام قبل از apply خودشان
// یک snapshot تازه می‌گذارند؛ فقط آخرین apply قابل‌برگشت است (دقیقاً همون رفتار قبلی description-only)
type ApplySnapshot = { name?: string; description: string; specs: ProductSpecSuggestion[] }

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۳ (فاز ۴.۱) — ریفکتور فرانت:
// دستیار تکمیل محصول با AI که قبلاً دائمی داخل فرم ویرایش محصول جا می‌گرفت، حالا پشت یک
// دکمه‌ی تریگر و یک مدال تمام‌ارتفاع است (پیش‌نمایش محصول بالا ثابت، پایین اسکرول‌شونده).
// منطق/هوک‌های بک‌اند عیناً از نسخه‌ی قبلی (inline در SellerProductEditPage.tsx) کپی شده‌اند —
// هیچ تغییری در API/مدل داده نیست.
function AiCompleteAssistModal({
  open,
  onClose,
  product,
  storeId,
  name,
  description,
  specs,
  onApplyName,
  onApplyDescription,
  onApplySpecs,
}: {
  open: boolean
  onClose: () => void
  product: SellerProduct
  storeId: string
  name: string
  description: string
  specs: ProductSpecSuggestion[]
  onApplyName: (name: string) => void
  onApplyDescription: (text: string) => void
  onApplySpecs: (specs: ProductSpecSuggestion[]) => void
}) {
  const complete = useCompleteProductInfo(storeId)
  const completePhoto = useCompleteProductInfoFromPhoto(storeId)
  const createKb = useCreateKbEntry(storeId)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const [withWebSearch, setWithWebSearch] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const applySnapshotRef = useRef<ApplySnapshot | null>(null)
  function undoApply() {
    const snap = applySnapshotRef.current
    if (!snap) return
    if (snap.name !== undefined) onApplyName(snap.name)
    onApplyDescription(snap.description)
    onApplySpecs(snap.specs)
  }
  useEffect(() => {
    if (!complete.data) return
    onApplyDescription(complete.data.suggestedDescription)
    if (complete.data.suggestedSpecs?.length) onApplySpecs(complete.data.suggestedSpecs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete.data])
  useEffect(() => {
    if (!completePhoto.data) return
    if (completePhoto.data.suggestedName) onApplyName(completePhoto.data.suggestedName)
    onApplyDescription(completePhoto.data.suggestedDescription)
    if (completePhoto.data.suggestedSpecs?.length) onApplySpecs(completePhoto.data.suggestedSpecs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completePhoto.data])

  const pendingDraft = usePendingEnrichmentDraft(storeId, product.id)
  const approveDraft = useApproveEnrichmentDraft(storeId, product.id)
  const rejectDraft = useRejectEnrichmentDraft(storeId, product.id)

  function saveAnswer(question: string, index: number) {
    const answer = answers[index]?.trim()
    if (!answer) return
    createKb.mutate(
      { kind: 'PRODUCT_INFO', question, answer, relatedProductId: product.id },
      { onSuccess: () => setSavedIndexes(prev => new Set(prev).add(index)) },
    )
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300 ease-out sm:items-center sm:justify-center sm:p-6',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={fa.seller.panel.products.aiModalTitle}
    >
      <div className="absolute inset-0 bg-black/70 sm:backdrop-blur-sm" onClick={onClose} />

      <div
        className={clsx(
          'relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg)] transition-all duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          'sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:translate-y-0 sm:rounded-3xl sm:border sm:shadow-2xl',
          open ? 'sm:scale-100 sm:opacity-100' : 'sm:scale-95 sm:opacity-0',
        )}
        style={{ borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* پیش‌نمایش محصول — ثابت، طبق PRD */}
        <div
          className="flex shrink-0 items-center gap-3 border-b border-slate-700/50 light:border-slate-200 px-5 pb-4"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
        >
          {product.images[0] && (
            <img src={productImageUrl(product.id, product.images[0])} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold text-white light:text-slate-900">{product.name}</span>
            <span className="block text-[11.5px] text-slate-500">{fa.seller.panel.products.aiModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300 light:text-slate-600"
            style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
            aria-label="بستن"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          {pendingDraft.data ? (
            (() => {
              const draft = pendingDraft.data
              return (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
                  <p className="mb-2 text-xs font-bold text-emerald-300 light:text-emerald-700">
                    ✨ {fa.seller.panel.products.enrichmentDraftBadge}
                  </p>
                  <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
                  <p className="mb-3 text-sm text-slate-200 light:text-slate-800">{draft.suggestedDescription}</p>

                  {!!draft.suggestedSpecs?.length && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
                      <div className="flex flex-col gap-1">
                        {draft.suggestedSpecs.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                            <span className="font-semibold">{s.label}:</span> {s.value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {draft.sourceNote && <p className="mb-3 text-[11px] text-slate-500">{draft.sourceNote}</p>}

                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        approveDraft.mutate(undefined, {
                          onSuccess: () => {
                            onApplyDescription(draft.suggestedDescription)
                            onApplySpecs(draft.suggestedSpecs ?? [])
                          },
                        })
                      }
                      disabled={approveDraft.isPending}
                      className="flex-1 rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                    >
                      {fa.seller.panel.products.enrichmentApprove}
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectDraft.mutate()}
                      disabled={rejectDraft.isPending}
                      className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-bold text-slate-300 light:text-slate-600 disabled:opacity-40"
                    >
                      {fa.seller.panel.products.enrichmentReject}
                    </button>
                  </div>

                  <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedQuestions}</p>
                  <div className="flex flex-col gap-2">
                    {draft.suggestedQuestions.map((q, i) => (
                      <div key={i} className="rounded-xl bg-slate-900/40 light:bg-white p-2.5">
                        <p className="mb-1.5 text-sm text-slate-300 light:text-slate-700">{q}</p>
                        {savedIndexes.has(i) ? (
                          <p className="text-xs text-emerald-400">{fa.common.success}</p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={answers[i] ?? ''}
                              onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                              placeholder={fa.seller.panel.products.aiQuestionAnswerPlaceholder}
                              className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2.5 py-1.5 text-xs text-slate-200 light:text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => saveAnswer(q, i)}
                              disabled={!answers[i]?.trim() || createKb.isPending}
                              className="shrink-0 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                            >
                              {fa.common.save}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()
          ) : (
            <>
              {!complete.data && (
                <>
                  <label className="mb-2 flex items-center gap-2 text-xs text-slate-400 light:text-slate-600">
                    <input type="checkbox" checked={withWebSearch} onChange={e => setWithWebSearch(e.target.checked)} />
                    {fa.seller.panel.products.aiWebSearchToggle}
                  </label>
                  {withWebSearch && <p className="mb-2 text-[11px] text-slate-500">{fa.seller.panel.products.aiWebSearchHint}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      applySnapshotRef.current = { description, specs }
                      complete.mutate({ productId: product.id, withWebSearch })
                    }}
                    disabled={complete.isPending}
                    className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    {complete.isPending ? fa.seller.panel.products.aiCompleteLoading : `✨ ${fa.seller.panel.products.aiComplete}`}
                  </button>
                </>
              )}
              {complete.isError && (
                <p className="mt-2 text-xs text-red-400">
                  {extractErrorMessage(complete.error, fa.seller.panel.products.aiCompleteError)}
                </p>
              )}

              {complete.data && (
                <div className="mt-3 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
                  <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
                  <p className="mb-1.5 text-[11px] text-emerald-400 light:text-emerald-700">{fa.seller.panel.products.aiAppliedNotice}</p>
                  <p className="mb-2 text-sm text-slate-200 light:text-slate-800">{complete.data.suggestedDescription}</p>
                  <button
                    type="button"
                    onClick={undoApply}
                    className="mb-3 text-xs font-semibold text-slate-400 light:text-slate-600 hover:underline"
                  >
                    {fa.seller.panel.products.aiUndoApply}
                  </button>

                  {!!complete.data.suggestedSpecs?.length && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
                      <div className="flex flex-col gap-1">
                        {complete.data.suggestedSpecs.map((s, i) => (
                          <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                            <span className="font-semibold">{s.label}:</span> {s.value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {complete.data.sourceNote && (
                    <p className="mb-3 text-[11px] text-slate-500">{complete.data.sourceNote}</p>
                  )}

                  <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedQuestions}</p>
                  <div className="flex flex-col gap-2">
                    {complete.data.suggestedQuestions.map((q, i) => (
                      <div key={i} className="rounded-xl bg-slate-900/40 light:bg-white p-2.5">
                        <p className="mb-1.5 text-sm text-slate-300 light:text-slate-700">{q}</p>
                        {savedIndexes.has(i) ? (
                          <p className="text-xs text-emerald-400">{fa.common.success}</p>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              value={answers[i] ?? ''}
                              onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                              placeholder={fa.seller.panel.products.aiQuestionAnswerPlaceholder}
                              className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2.5 py-1.5 text-xs text-slate-200 light:text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => saveAnswer(q, i)}
                              disabled={!answers[i]?.trim() || createKb.isPending}
                              className="shrink-0 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                            >
                              {fa.common.save}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!completePhoto.data && (
                <div className="mt-3 border-t border-slate-700/50 light:border-slate-200 pt-3">
                  <p className="mb-2 text-[11px] text-slate-500">{fa.seller.panel.products.aiPhotoCompleteHint}</p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      applySnapshotRef.current = { name, description, specs }
                      completePhoto.mutate({ productId: product.id, file })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={completePhoto.isPending}
                    className="w-full rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 py-2.5 text-sm font-bold text-slate-200 light:text-slate-800 hover:bg-slate-800/60 light:hover:bg-slate-100 disabled:opacity-40"
                  >
                    {completePhoto.isPending ? fa.seller.panel.products.aiPhotoCompleteLoading : `📷 ${fa.seller.panel.products.aiPhotoComplete}`}
                  </button>
                  {completePhoto.isError && (
                    <p className="mt-2 text-xs text-red-400">
                      {extractErrorMessage(completePhoto.error, fa.seller.panel.products.aiPhotoCompleteError)}
                    </p>
                  )}
                </div>
              )}

              {completePhoto.data && (
                <div className="mt-3 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
                  <p className="mb-1.5 text-[11px] text-emerald-400 light:text-emerald-700">{fa.seller.panel.products.aiPhotoAppliedNotice}</p>
                  {completePhoto.data.suggestedName && (
                    <p className="mb-1.5 text-sm text-slate-200 light:text-slate-800">
                      <span className="font-semibold">{fa.seller.panel.products.nameLabel}:</span> {completePhoto.data.suggestedName}
                    </p>
                  )}
                  <p className="mb-2 text-sm text-slate-200 light:text-slate-800">{completePhoto.data.suggestedDescription}</p>
                  <button
                    type="button"
                    onClick={undoApply}
                    className="mb-1 text-xs font-semibold text-slate-400 light:text-slate-600 hover:underline"
                  >
                    {fa.seller.panel.products.aiUndoApply}
                  </button>
                  {!!completePhoto.data.suggestedSpecs?.length && (
                    <div className="mt-2 flex flex-col gap-1">
                      {completePhoto.data.suggestedSpecs.map((s, i) => (
                        <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                          <span className="font-semibold">{s.label}:</span> {s.value}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AiCompleteAssist({
  product,
  storeId,
  name,
  description,
  specs,
  onApplyName,
  onApplyDescription,
  onApplySpecs,
}: {
  product: SellerProduct
  storeId: string
  name: string
  description: string
  specs: ProductSpecSuggestion[]
  onApplyName: (name: string) => void
  onApplyDescription: (text: string) => void
  onApplySpecs: (specs: ProductSpecSuggestion[]) => void
}) {
  const [open, setOpen] = useState(false)
  // فقط برای نشان‌دادن نشان روی دکمه‌ی تریگر — منطق واقعی داخل مدال است
  const pendingDraft = usePendingEnrichmentDraft(storeId, product.id)

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'w-full rounded-2xl border py-2.5 text-sm font-bold',
          pendingDraft.data
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20'
            : 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 text-slate-200 light:text-slate-800 hover:bg-slate-800/60 light:hover:bg-slate-100',
        )}
      >
        {pendingDraft.data ? `✨ ${fa.seller.panel.products.enrichmentDraftBadge}` : `✨ ${fa.seller.panel.products.aiComplete}`}
      </button>
      <AiCompleteAssistModal
        open={open}
        onClose={() => setOpen(false)}
        product={product}
        storeId={storeId}
        name={name}
        description={description}
        specs={specs}
        onApplyName={onApplyName}
        onApplyDescription={onApplyDescription}
        onApplySpecs={onApplySpecs}
      />
    </div>
  )
}
