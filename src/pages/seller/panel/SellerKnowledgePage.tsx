import { useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import {
  useCreateKbEntry,
  useDeleteKbEntry,
  useExtractKbFile,
  useExtractKbFromText,
  useKbEntries,
} from '@/queries/seller.queries'
import type { KbCandidateEntry, StoreKbKind } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'
import { GuidePromptModal } from './GuidePromptModal'

const KIND_LABELS: Record<StoreKbKind, string> = {
  FAQ: fa.seller.panel.knowledge.kindFaq,
  POLICY: fa.seller.panel.knowledge.kindPolicy,
  PRODUCT_INFO: fa.seller.panel.knowledge.kindProductInfo,
  GENERAL: fa.seller.panel.knowledge.kindGeneral,
}
const KIND_OPTIONS = Object.keys(KIND_LABELS) as StoreKbKind[]

function KindSelect({ value, onChange }: { value: StoreKbKind; onChange: (v: StoreKbKind) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as StoreKbKind)}
      className="rounded-lg border border-slate-700 light:border-slate-300 bg-slate-900 light:bg-white px-2 py-1.5 text-xs text-slate-200 light:text-slate-900"
    >
      {KIND_OPTIONS.map(k => (
        <option key={k} value={k}>{KIND_LABELS[k]}</option>
      ))}
    </select>
  )
}

// افزودن دستی — بخش ۳.۲
function AddEntryForm({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const create = useCreateKbEntry(storeId)
  const [kind, setKind] = useState<StoreKbKind>('FAQ')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  function save() {
    if (!question.trim() || !answer.trim()) return
    create.mutate({ kind, question, answer }, { onSuccess: onDone })
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.knowledge.kindLabel}</span>
        <KindSelect value={kind} onChange={setKind} />
      </div>
      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder={fa.seller.panel.knowledge.questionLabel}
        className="mb-2 w-full rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder={fa.seller.panel.knowledge.answerLabel}
        rows={3}
        className="mb-3 w-full resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <button
        onClick={save}
        disabled={!question.trim() || !answer.trim() || create.isPending}
        className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {fa.common.save}
      </button>
    </div>
  )
}

// کاندید استخراج‌شده از فایل — باید قبل از ذخیره تأیید/ویرایش شود (بخش ۳.۳، human-in-the-loop)
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
  const [kind, setKind] = useState<StoreKbKind>(candidate.kind)
  const [question, setQuestion] = useState(candidate.question)
  const [answer, setAnswer] = useState(candidate.answer)

  function save() {
    create.mutate({ kind, question, answer }, { onSuccess: onResolved })
  }

  return (
    <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-400">{fa.seller.panel.knowledge.kindLabel}</span>
        <KindSelect value={kind} onChange={setKind} />
      </div>
      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        className="mb-2 w-full rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        rows={2}
        className="mb-3 w-full resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={!question.trim() || !answer.trim() || create.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
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

export function SellerKnowledgePage() {
  const { storeId } = useSellerStore()
  const [filter, setFilter] = useState<StoreKbKind | undefined>(undefined)
  const entries = useKbEntries(storeId, filter)
  const removeEntry = useDeleteKbEntry(storeId)
  const extractFile = useExtractKbFile(storeId)
  const extractText = useExtractKbFromText(storeId)
  const [showAddForm, setShowAddForm] = useState(false)
  const [candidates, setCandidates] = useState<KbCandidateEntry[]>([])
  const [extractRawText, setExtractRawText] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function resolveCandidate(index: number) {
    setCandidates(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="px-5 py-6">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.knowledge.title}</h1>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20"
        >
          ✨ {fa.seller.panel.guidePrompt.button}
        </button>
      </div>
      <p className="mb-5 text-sm text-slate-500">{fa.seller.panel.knowledge.subtitle}</p>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
        >
          + {fa.seller.panel.knowledge.addEntry}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={extractFile.isPending}
          className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
        >
          {extractFile.isPending ? fa.seller.panel.knowledge.extracting : fa.seller.panel.knowledge.uploadFile}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              extractFile.mutate(file, { onSuccess: result => setCandidates(result) })
            }
            e.target.value = ''
          }}
        />
      </div>
      <p className="mb-2 text-xs text-slate-600 light:text-slate-400">{fa.seller.panel.knowledge.uploadFileHint}</p>

      <div className="mb-5 flex gap-2">
        <textarea
          value={extractRawText}
          onChange={e => setExtractRawText(e.target.value)}
          rows={2}
          placeholder={fa.seller.panel.knowledge.extractTextPlaceholder}
          className="flex-1 resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-100 light:text-slate-900"
        />
        <button
          onClick={() =>
            extractText.mutate(extractRawText.trim(), {
              onSuccess: result => {
                setCandidates(result)
                setExtractRawText('')
              },
            })
          }
          disabled={!extractRawText.trim() || extractText.isPending}
          className="shrink-0 rounded-xl border border-slate-700 light:border-slate-300 px-3 text-xs font-semibold text-slate-200 light:text-slate-800 disabled:opacity-40"
        >
          {extractText.isPending ? fa.seller.panel.knowledge.extracting : fa.seller.panel.knowledge.extractTextButton}
        </button>
      </div>

      {(extractFile.isError || extractText.isError) && (
        <p className="mb-4 text-xs text-red-400">{fa.seller.panel.knowledge.extractError}</p>
      )}

      {showAddForm && <AddEntryForm storeId={storeId} onDone={() => setShowAddForm(false)} />}

      {candidates.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-amber-400">{fa.seller.panel.knowledge.reviewCandidates}</p>
          {candidates.map((c, i) => (
            <CandidateRow key={i} storeId={storeId} candidate={c} onResolved={() => resolveCandidate(i)} />
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter(undefined)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!filter ? 'bg-emerald-500 text-white' : 'bg-slate-800 light:bg-slate-100 text-slate-400'}`}
        >
          {fa.seller.panel.knowledge.filterAll}
        </button>
        {KIND_OPTIONS.map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? 'bg-emerald-500 text-white' : 'bg-slate-800 light:bg-slate-100 text-slate-400'}`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {entries.data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.knowledge.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {entries.data?.map(entry => (
          <div key={entry.id} className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rounded-full bg-slate-700/50 light:bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
                {KIND_LABELS[entry.kind]}
              </span>
              <button
                onClick={() => {
                  if (window.confirm(fa.seller.panel.knowledge.deleteConfirm)) removeEntry.mutate(entry.id)
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                {fa.common.delete}
              </button>
            </div>
            <p className="mb-1 text-sm font-semibold text-slate-200 light:text-slate-900">{entry.question}</p>
            <p className="text-xs text-slate-400 light:text-slate-600">{entry.answer}</p>
          </div>
        ))}
      </div>

      <GuidePromptModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
