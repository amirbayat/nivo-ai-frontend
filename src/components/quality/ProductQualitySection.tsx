import { useRef } from 'react'
import { fa } from '@/locales/fa'
import {
  useApplyProductQuality,
  useProductQualityReview,
  type QualityApplyPreview,
} from '@/queries/quality.queries'
import { QualityCard, SuggestionRow } from './QualityCard'

const t = fa.seller.panel.quality

// کلیدهایی که جایشان گزینه‌های محصول است (سایز/رنگ)؛ به‌جای پرسیدن متن، ویرایشگر گزینه‌ها باز می‌شود
const OPTION_KEYS = new Set(['colors'])

interface Props {
  storeId: string
  productId: string
  pollSince: number | null
  currentDescription: string
  currentSpecs: { label: string; value: string }[]
  onApply: (next: QualityApplyPreview) => void
  onOpenVariants: () => void
}

// PQ-4 — کارت بررسی زیر textarea توضیحات
export function ProductQualitySection({ storeId, productId, pollSince, currentDescription, currentSpecs, onApply, onOpenVariants }: Props) {
  const q = useProductQualityReview(storeId, productId, pollSince)
  const apply = useApplyProductQuality(storeId, productId)
  // نتیجه‌ی پیش‌نمایش هر پیشنهاد؛ در ref تا با re-render (بعد از mutation) گم نشود
  const previews = useRef(new Map<string, QualityApplyPreview>())
  const questions = q.data?.review?.buyerQuestionsUnanswered ?? []

  return (
    <QualityCard
      data={q.data}
      loading={q.isLoading}
      dismissKey={`product:${productId}`}
      pendingText={t.productPending}
      doneText={t.productDone}
      renderSuggestion={(s, index, dismiss) => {
        const isOption = OPTION_KEYS.has(s.key)
        return (
          <SuggestionRow
            index={index}
            suggestion={s}
            storeId={storeId}
            actionLabel={isOption ? t.openVariants : undefined}
            onAction={isOption ? onOpenVariants : undefined}
            onDismiss={dismiss}
            onPreview={async answer => {
              const latest = await apply.mutateAsync({ key: s.key, answer })
              previews.current.set(s.key, latest)
              const addedText = latest.description.startsWith(currentDescription)
                ? latest.description.slice(currentDescription.length).trim()
                : latest.description
              const addedSpecs = latest.specs.filter(n => !currentSpecs.some(o => o.label === n.label)).map(n => `${n.label}: ${n.value}`)
              return [addedText, ...addedSpecs].filter(Boolean).join('\n') || latest.description
            }}
            onAccept={() => {
              const latest = previews.current.get(s.key)
              if (latest) onApply(latest)
            }}
          />
        )
      }}
      unansweredFooter={
        questions.length > 0 ? (
          <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 text-xs text-slate-400 light:border-slate-200">
            {questions.map(question => (
              <p key={question}>{t.unanswered('۱', question)}</p>
            ))}
          </div>
        ) : undefined
      }
    />
  )
}
