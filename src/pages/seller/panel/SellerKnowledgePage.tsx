import { useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import {
  useCreateKbEntry,
  useDeleteKbEntry,
  useExtractKbFile,
  useExtractKbFromText,
  useKbEntries,
  useUpdateKbEntry,
} from '@/queries/seller.queries'
import type { KbCandidateEntry, StoreKbEntry, StoreKbKind } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-knowledge-box-redesign.md بخش ۵.۹ — فقط FAQ شکل سؤال/جواب دارد؛ بقیه‌ی
// kind ها عنوان/متن‌اند (یک پاراگراف کامل می‌تواند باشد، نه لزوماً یک سؤال)
const KIND_FIELD_COPY: Record<
  StoreKbKind,
  { qLabel: string; qPlaceholder: string; aLabel: string; aPlaceholder: string }
> = {
  FAQ: {
    qLabel: fa.seller.panel.knowledge.fieldQuestionFaq,
    qPlaceholder: fa.seller.panel.knowledge.questionPlaceholderFaq,
    aLabel: fa.seller.panel.knowledge.fieldAnswerFaq,
    aPlaceholder: fa.seller.panel.knowledge.answerPlaceholderFaq,
  },
  POLICY: {
    qLabel: fa.seller.panel.knowledge.fieldQuestionOther,
    qPlaceholder: fa.seller.panel.knowledge.questionPlaceholderPolicy,
    aLabel: fa.seller.panel.knowledge.fieldAnswerOther,
    aPlaceholder: fa.seller.panel.knowledge.answerPlaceholderPolicy,
  },
  PRODUCT_INFO: {
    qLabel: fa.seller.panel.knowledge.fieldQuestionOther,
    qPlaceholder: fa.seller.panel.knowledge.questionPlaceholderProductInfo,
    aLabel: fa.seller.panel.knowledge.fieldAnswerOther,
    aPlaceholder: fa.seller.panel.knowledge.answerPlaceholderProductInfo,
  },
  GENERAL: {
    qLabel: fa.seller.panel.knowledge.fieldQuestionOther,
    qPlaceholder: fa.seller.panel.knowledge.questionPlaceholderGeneral,
    aLabel: fa.seller.panel.knowledge.fieldAnswerOther,
    aPlaceholder: fa.seller.panel.knowledge.answerPlaceholderGeneral,
  },
}

// چیپ‌های برچسب آزاد — بخش ۵.۴ (فیلد tags در schema/DTO از قبل بود، UI نداشت)
function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')

  function commit() {
    const value = draft.trim()
    if (value && !tags.includes(value)) onChange([...tags, value])
    setDraft('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(t => (
        <span
          key={t}
          className="flex items-center gap-1.5 rounded-full bg-slate-700/40 light:bg-slate-100 px-2.5 py-1 text-xs text-slate-300 light:text-slate-700"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter(x => x !== t))}
            className="text-slate-500 hover:text-slate-300 light:hover:text-slate-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        placeholder={fa.seller.panel.knowledge.tagAddPlaceholder}
        className="min-w-[96px] flex-1 rounded-full border border-dashed border-slate-600 light:border-slate-300 bg-transparent px-3 py-1 text-xs text-slate-200 light:text-slate-900"
      />
    </div>
  )
}

// افزودن دستی — تب سوم کارت «افزودن دانش جدید»
function AddEntryForm({ storeId }: { storeId: string }) {
  const create = useCreateKbEntry(storeId)
  // SP-6 — «نوع» برای فروشنده نمایش داده نمی‌شود؛ ورودی تازه همیشه FAQ است
  const kind: StoreKbKind = 'FAQ'
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const copy = KIND_FIELD_COPY[kind]

  function save() {
    if (!question.trim() || !answer.trim()) return
    create.mutate(
      { kind, question: question.trim(), answer: answer.trim(), tags },
      {
        onSuccess: () => {
          setQuestion('')
          setAnswer('')
          setTags([])
        },
      },
    )
  }

  return (
    <div>

      <label className="mb-1.5 block text-xs font-semibold text-slate-400 light:text-slate-600">{copy.qLabel}</label>
      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        maxLength={500}
        placeholder={copy.qPlaceholder}
        className="mb-1 w-full rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <p dir="ltr" className="mb-3 text-left text-[11px] tabular-nums text-slate-500">{question.length} / 500</p>

      <label className="mb-1.5 block text-xs font-semibold text-slate-400 light:text-slate-600">{copy.aLabel}</label>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={4}
        maxLength={5000}
        placeholder={copy.aPlaceholder}
        className="mb-1 w-full resize-y rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <p dir="ltr" className="mb-3 text-left text-[11px] tabular-nums text-slate-500">{answer.length.toLocaleString('en-US')} / 5,000</p>

      <label className="mb-1.5 block text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.knowledge.tagsLabel}</label>
      <div className="mb-4">
        <TagEditor tags={tags} onChange={setTags} />
      </div>

      <button
        onClick={save}
        disabled={!question.trim() || !answer.trim() || create.isPending}
        className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {fa.seller.panel.knowledge.save}
      </button>
    </div>
  )
}

// ویرایش یک entry موجود — بخش ۵.۳: چون کاندید در صف بررسی دیگر inline-editable نیست، ویرایش
// واقعی فقط از همین مسیر (لیست پایین صفحه) ممکن است
function EntryEditForm({ storeId, entry, onDone }: { storeId: string; entry: StoreKbEntry; onDone: () => void }) {
  const update = useUpdateKbEntry(storeId)
  const kind: StoreKbKind = entry.kind
  const [question, setQuestion] = useState(entry.question)
  const [answer, setAnswer] = useState(entry.answer)
  const [tags, setTags] = useState<string[]>(entry.tags)
  const copy = KIND_FIELD_COPY[kind]

  function save() {
    if (!question.trim() || !answer.trim()) return
    update.mutate(
      { id: entry.id, dto: { kind, question: question.trim(), answer: answer.trim(), tags } },
      { onSuccess: onDone },
    )
  }

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-slate-800/60 light:bg-white p-4">
      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        maxLength={500}
        placeholder={copy.qPlaceholder}
        className="mb-2 w-full rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={4}
        maxLength={5000}
        className="mb-3 w-full resize-y rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <div className="mb-3">
        <TagEditor tags={tags} onChange={setTags} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!question.trim() || !answer.trim() || update.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {fa.common.save}
        </button>
        <button
          onClick={onDone}
          className="flex-1 rounded-xl border border-slate-600 py-2 text-xs font-semibold text-slate-400 hover:border-slate-500"
        >
          {fa.seller.panel.knowledge.cancel}
        </button>
      </div>
    </div>
  )
}

// کاندید استخراج‌شده از فایل/متن — دیگر inline-editable نیست (فقط اعمال/نادیده‌بگیر، بخش
// ۵.۳)؛ اگر فروشنده خواست متن را عوض کند، بعد از ذخیره از لیست پایین صفحه ویرایش می‌کند
function CandidateRow({
  storeId,
  candidate,
  onResolved,
}: {
  storeId: string
  candidate: KbCandidateEntry
  onResolved: () => void
}) {
  const create = useCreateKbEntry(storeId)

  function apply() {
    create.mutate(
      { kind: candidate.kind, question: candidate.question, answer: candidate.answer },
      { onSuccess: onResolved },
    )
  }

  return (
    <div className="mb-3 rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/60 light:bg-white p-3.5">
      <p className="mb-1 text-sm font-semibold text-slate-200 light:text-slate-900">{candidate.question}</p>
      <p className="mb-3 text-xs text-slate-400 light:text-slate-600">{candidate.answer}</p>
      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={create.isPending}
          className="flex-1 rounded-xl bg-emerald-500/15 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          {fa.seller.panel.knowledge.candidateSave}
        </button>
        <button
          onClick={onResolved}
          className="flex-1 rounded-xl border border-slate-600 py-2 text-xs font-semibold text-slate-400 hover:border-slate-500"
        >
          {fa.seller.panel.knowledge.candidateDiscard}
        </button>
      </div>
    </div>
  )
}

type AddTab = 'upload' | 'paste' | 'manual'

// embedded + expanded=false (صفحه‌ی «بات من»): فقط افزودن دستی یک سوال؛ فایل/متن پشت «از فایل یا متن اضافه کن»
export function SellerKnowledgePage({ embedded = false, expanded = true }: { embedded?: boolean; expanded?: boolean } = {}) {
  const { storeId } = useSellerStore()
  const entries = useKbEntries(storeId)
  const removeEntry = useDeleteKbEntry(storeId)
  const createEntry = useCreateKbEntry(storeId)
  const extractFile = useExtractKbFile(storeId)
  const extractText = useExtractKbFromText(storeId)

  const [tab, setTab] = useState<AddTab>('upload')
  const [candidates, setCandidates] = useState<KbCandidateEntry[]>([])
  const [truncated, setTruncated] = useState(false)
  const [extractRawText, setExtractRawText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  function handleFile(file: File) {
    setTruncated(false)
    extractFile.mutate(file, {
      onSuccess: result => {
        setCandidates(prev => [...prev, ...result.candidates])
        setTruncated(result.truncated)
      },
    })
  }

  function resolveCandidate(index: number) {
    setCandidates(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) showToast(fa.seller.panel.knowledge.reviewDoneToast)
      return next
    })
  }

  // تأیید همه — بخش ۵.۳: چون کاندیدها دیگر state ویرایش جدا ندارند، اعمال دسته‌ای بدون تعارض
  // state ممکن است. ردیفی که ذخیره‌اش رد شود (نادر، بعد از clamp سمت سرور) در صف می‌ماند.
  async function applyAll() {
    const failed: KbCandidateEntry[] = []
    for (const candidate of candidates) {
      try {
        await createEntry.mutateAsync({
          kind: candidate.kind,
          question: candidate.question,
          answer: candidate.answer,
        })
      } catch {
        failed.push(candidate)
      }
    }
    setCandidates(failed)
    if (failed.length === 0) showToast(fa.seller.panel.knowledge.reviewDoneToast)
  }

  const addTabs: { key: AddTab; label: string }[] = [
    { key: 'upload', label: fa.seller.panel.knowledge.tabUpload },
    { key: 'paste', label: fa.seller.panel.knowledge.tabPaste },
    { key: 'manual', label: fa.seller.panel.knowledge.tabManual },
  ]

  return (
    <div className={embedded ? '' : 'px-5 py-6'}>
      {!embedded && (
        <>
          <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.knowledge.title}</h1>
          <p className="mb-5 text-sm text-slate-500">{fa.seller.panel.knowledge.subtitle}</p>
        </>
      )}

      {/* افزودن دانش جدید — کارت واحد با سه تب، بدون مسیر موازی ChatGPT بیرونی (حذف‌شده) */}
      <div className="mb-5 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        {!(embedded && !expanded) && <h2 className="mb-3 text-base font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.knowledge.addTitle}</h2>}

        {embedded && !expanded ? (
          <AddEntryForm storeId={storeId} />
        ) : (
        <>
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-900/60 light:bg-slate-100 p-1">
          {addTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                tab === t.key
                  ? 'bg-slate-700 light:bg-white text-slate-100 light:text-slate-900 shadow-sm'
                  : 'text-slate-400 light:text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div>
            <div
              onClick={() => !extractFile.isPending && fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 light:border-slate-300 bg-slate-900/30 light:bg-slate-50 px-4 py-7 text-center ${
                extractFile.isPending ? 'pointer-events-none opacity-60' : 'cursor-pointer'
              }`}
            >
              <p className="text-sm font-semibold text-slate-200 light:text-slate-800">{fa.seller.panel.knowledge.dropzoneTitle}</p>
              <p className="text-xs text-slate-500">{fa.seller.panel.knowledge.dropzoneSub}</p>
              <span className="mt-1 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700">
                {extractFile.isPending ? fa.seller.panel.knowledge.extracting : fa.seller.panel.knowledge.chooseFile}
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
              hidden
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <p className="mt-2 text-center text-xs text-slate-600 light:text-slate-400">{fa.seller.panel.knowledge.uploadHint}</p>
          </div>
        )}

        {tab === 'paste' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400 light:text-slate-600">
              {fa.seller.panel.knowledge.pasteLabel}
            </label>
            <textarea
              value={extractRawText}
              onChange={e => setExtractRawText(e.target.value)}
              rows={8}
              maxLength={20000}
              placeholder={fa.seller.panel.knowledge.pastePlaceholder}
              className="w-full resize-y rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2.5 text-sm text-slate-100 light:text-slate-900"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">{fa.seller.panel.knowledge.pasteHelper}</span>
              <span
                dir="ltr"
                className={`text-xs tabular-nums ${extractRawText.length > 18000 ? 'text-amber-400' : 'text-slate-500'}`}
              >
                {extractRawText.length.toLocaleString('en-US')} / 20,000
              </span>
            </div>
            <button
              onClick={() => {
                setTruncated(false)
                extractText.mutate(extractRawText.trim(), {
                  onSuccess: result => {
                    setCandidates(prev => [...prev, ...result.candidates])
                    setTruncated(result.truncated)
                    setExtractRawText('')
                  },
                })
              }}
              disabled={!extractRawText.trim() || extractText.isPending}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {extractText.isPending ? fa.seller.panel.knowledge.extracting : fa.seller.panel.knowledge.extractTextButton}
            </button>
          </div>
        )}

        {tab === 'manual' && <AddEntryForm storeId={storeId} />}

        {(extractFile.isError || extractText.isError) && (
          <p className="mt-3 text-xs text-red-400">{fa.seller.panel.knowledge.extractError}</p>
        )}
        </>
        )}
      </div>

      {/* برش بی‌صدا دیگر بی‌صدا نیست — بخش ۵.۲ */}
      {truncated && (
        <div className="mb-5 flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
          <span className="text-amber-400">⚠</span>
          <p className="text-xs leading-relaxed text-amber-200 light:text-amber-800">{fa.seller.panel.knowledge.truncatedWarning}</p>
        </div>
      )}

      {/* در انتظار بررسی — کاندیدها فقط اعمال/نادیده‌بگیر؛ تأیید همه (بخش ۵.۳) */}
      {candidates.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-amber-400">{fa.seller.panel.knowledge.reviewCandidates}</p>
              <span dir="ltr" className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-300">
                {candidates.length}
              </span>
            </div>
            <button
              onClick={() => void applyAll()}
              className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/25"
            >
              {fa.seller.panel.knowledge.applyAll}
            </button>
          </div>
          {candidates.map((c, i) => (
            <CandidateRow key={i} storeId={storeId} candidate={c} onResolved={() => resolveCandidate(i)} />
          ))}
        </div>
      )}

      {entries.data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.knowledge.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {entries.data?.map(entry =>
          editingId === entry.id ? (
            <EntryEditForm key={entry.id} storeId={storeId} entry={entry} onDone={() => setEditingId(null)} />
          ) : (
            <div key={entry.id} className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
              <div className="mb-1.5 flex items-center justify-end">
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingId(entry.id)} className="text-xs text-slate-400 hover:text-slate-200 light:hover:text-slate-700">
                    {fa.seller.panel.knowledge.edit}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(fa.seller.panel.knowledge.deleteConfirm)) removeEntry.mutate(entry.id)
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {fa.common.delete}
                  </button>
                </div>
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-200 light:text-slate-900">{entry.question}</p>
              <p className="text-xs text-slate-400 light:text-slate-600">{entry.answer}</p>
              {entry.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {entry.tags.map(t => (
                    <span key={t} className="rounded-md bg-slate-700/40 light:bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-5 lg:bottom-6">
          <div className="rounded-full bg-slate-900 light:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}
