import { useMemo, useState, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { MicButton } from '@/components/ui/MicButton'
import { ScoreRing } from '@/components/ui/ScoreRing'
import type { QualityReviewResponse, QualitySuggestion } from '@/queries/quality.queries'

const t = fa.seller.panel.quality
const MAX_VISIBLE = 3
const faNum = (n: number) => n.toLocaleString('fa-IR')

// «بعداً» پیشنهاد را برای همین نسخه‌ی بررسی پنهان می‌کند (localStorage؛ هر خطایی نادیده گرفته می‌شود)
function readDismissed(storageKey: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
function writeDismissed(storageKey: string, set: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...set]))
  } catch {
    /* بدون localStorage هم کارت کار می‌کند */
  }
}

// ── ردیف پیشنهاد: عنوان، «چرا»، «نمونه» و پاسخ درجا (متن/میکروفون) با پیش‌نمایش ─────────────
export interface SuggestionRowProps {
  index: number
  suggestion: QualitySuggestion
  storeId: string
  // اگر داده شود، به‌جای «جواب بده» دکمه‌ی مستقیم (مثل «تنظیم ←») نشان داده می‌شود
  actionLabel?: string
  onAction?: () => void
  // پاسخ از پیش‌پرشده (مثلاً برداشت از یادداشت فروشنده)؛ کلیک دکمه فرم را با همین متن باز می‌کند
  prefill?: string
  // پاسخ فروشنده ← پیش‌نمایش (رشته‌ی نمایشی خطی که اضافه می‌شود)
  onPreview: (answer: string) => Promise<string>
  onAccept: () => void | Promise<void>
  onDismiss: () => void
}

export function SuggestionRow({ index, suggestion, storeId, actionLabel, onAction, prefill, onPreview, onAccept, onDismiss }: SuggestionRowProps) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<false | 'generic' | 'cap'>(false)

  async function submit() {
    if (answer.trim().length < 2) return
    setBusy(true)
    setError(false)
    try {
      setPreview(await onPreview(answer.trim()))
    } catch (err) {
      setError(isAxiosError(err) && err.response?.status === 429 ? 'cap' : 'generic')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-3 light:border-slate-200">
      <p className="text-sm font-bold text-slate-100 light:text-slate-900">
        {faNum(index)}. {suggestion.title}
      </p>
      <p className="text-xs leading-6 text-slate-500">{t.why(suggestion.why)}</p>
      {suggestion.exampleText && (
        <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-xs leading-6 text-slate-300 light:bg-slate-100 light:text-slate-700">{t.example(suggestion.exampleText)}</p>
      )}
      {!open && !preview && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (onAction) return onAction()
              if (prefill) setAnswer(prefill)
              setOpen(true)
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
          >
            {actionLabel ?? t.answer}
          </button>
          <button type="button" onClick={onDismiss} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">
            {t.later}
          </button>
        </div>
      )}
      {open && !preview && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">{suggestion.askPrompt}</p>
          <div className="flex items-start gap-2">
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={2}
              maxLength={1500}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
            />
            <MicButton storeId={storeId} onText={txt => setAnswer(prev => (prev ? `${prev} ${txt}` : txt))} />
          </div>
          {error && <p className="text-xs text-red-400">{error === 'cap' ? t.applyCapped : t.applyError}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy || answer.trim().length < 2} onClick={() => void submit()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              {busy ? t.applying : t.preview}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500">
              {t.cancel}
            </button>
          </div>
        </div>
      )}
      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">{t.previewTitle}</p>
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-6 text-emerald-300 light:text-emerald-800">{preview}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                void Promise.resolve(onAccept()).then(() => {
                  setPreview(null)
                  setOpen(false)
                  setAnswer('')
                })
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              {t.accept}
            </button>
            <button type="button" onClick={() => setPreview(null)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500">
              {t.reject}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export interface QualityCardProps {
  data: QualityReviewResponse | undefined
  loading?: boolean
  // کلید پایدار برای «بعداً» (مثلاً product:<id>)
  dismissKey: string
  pendingText: string
  doneText: string
  levelLabels?: Record<'weak' | 'ok' | 'good' | 'great', string>
  readinessLabel?: (level: string) => string
  // رندر هر پیشنهاد را صفحه‌ی میزبان می‌سازد (چون اعمال محصول/فروشگاه فرق دارد)
  renderSuggestion: (s: QualitySuggestion, index: number, dismiss: () => void) => ReactNode
  // ردیف 💬 «مشتری‌ها پرسیدن …»
  unansweredFooter?: ReactNode
}

export function QualityCard({ data, loading, dismissKey, pendingText, doneText, levelLabels = t.levels, readinessLabel = t.readiness, renderSuggestion, unansweredFooter }: QualityCardProps) {
  const review = data?.review ?? null
  const hashKey = `quality-dismissed:${dismissKey}:${review ? review.score : 'x'}:${review?.suggestions.map(s => s.key).join(',') ?? ''}`
  const [dismissed, setDismissed] = useState(() => readDismissed(hashKey))
  const [showAll, setShowAll] = useState(false)
  const [collapsedOverride, setCollapsedOverride] = useState(false)

  const visible = useMemo(() => (review?.suggestions ?? []).filter(s => !dismissed.has(s.key)), [review, dismissed])
  const hidden = visible.slice(MAX_VISIBLE)
  const shown = showAll ? visible : visible.slice(0, MAX_VISIBLE)

  const dismiss = (key: string) => {
    const next = new Set(dismissed)
    next.add(key)
    setDismissed(next)
    writeDismissed(hashKey, next)
  }

  const shell = 'rounded-2xl border border-slate-800 bg-slate-900/40 p-3 light:border-slate-200 light:bg-slate-50'

  if (loading || !data) return <div className={clsx(shell, 'h-20 animate-pulse')} />

  // rules_only: فقط چیپ‌ها، بدون عدد
  const chips = review
    ? review.items.map(i => ({ key: i.key, label: data.rules.items.find(r => r.key === i.key)?.label ?? i.key, done: i.status === 'ok' }))
    : data.rules.items.map(i => ({ key: i.key, label: i.label, done: i.status === 'ok' }))

  const chipList = (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(c => (
        <span
          key={c.key}
          aria-label={`${c.label}: ${c.done ? t.chipDone : t.chipTodo}`}
          className={clsx(
            'rounded-full px-2.5 py-1 text-[11px]',
            c.done ? 'bg-emerald-500/15 text-emerald-300 light:text-emerald-700' : 'border border-dashed border-slate-600 text-slate-400 light:border-slate-400 light:text-slate-600',
          )}
        >
          {c.done ? '✓' : '○'} {c.label}
        </span>
      ))}
    </div>
  )

  if (!review) {
    return (
      <div className={clsx(shell, 'flex flex-col gap-2')}>
        {data.status === 'pending' && <p className="text-xs text-slate-400">{pendingText}</p>}
        {chipList}
      </div>
    )
  }

  const great = review.score >= 85 && !collapsedOverride
  if (great) {
    return (
      <button type="button" onClick={() => setCollapsedOverride(true)} className={clsx(shell, 'flex w-full items-center gap-3 text-start')}>
        <ScoreRing score={review.score} level={review.level} />
        <span className="text-sm font-bold text-emerald-300 light:text-emerald-700">🎉 {doneText}</span>
      </button>
    )
  }

  return (
    <div className={clsx(shell, 'flex flex-col gap-3')}>
      <div className="flex items-center gap-3">
        <ScoreRing score={review.score} level={review.level} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 light:text-slate-900">{readinessLabel(levelLabels[review.level])}</p>
          {review.summary && <p className="text-xs leading-6 text-slate-400">{review.summary}</p>}
        </div>
      </div>
      {chipList}
      {data.status === 'pending' && <p className="text-xs text-slate-500">{pendingText}</p>}
      {shown.map((s, i) => (
        <div key={s.key}>{renderSuggestion(s, i + 1, () => dismiss(s.key))}</div>
      ))}
      {!showAll && hidden.length > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="self-start text-xs text-emerald-400 light:text-emerald-700">
          {t.allItems(faNum(hidden.length))}
        </button>
      )}
      {unansweredFooter}
    </div>
  )
}
