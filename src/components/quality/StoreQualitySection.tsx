import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { useUpdateStore } from '@/queries/seller.queries'
import { useApplyStoreQuality, useStoreQualityReview, type StoreQualityApplyPreview } from '@/queries/storeQuality.queries'
import { QualityCard, SuggestionRow } from './QualityCard'

const t = fa.seller.panel.quality

// فیلدهای ساخت‌یافته: بدون LLM، دکمه‌ی «تنظیم ←» به همان کنترل می‌برد (focus برای highlight صفحه‌ی مقصد)
const ROUTE_BY_TARGET: Record<string, string> = {
  shippingDays: '/seller/panel/store/shipping?focus=days',
  shippingRules: '/seller/panel/store/shipping?focus=rules',
  workingHours: '/seller/panel/store/bot?focus=hours',
  payment: '/seller/panel/store/payments',
  logo: '/seller/panel/store/info?focus=logo',
  social: '/seller/panel/store/info?focus=instagram',
  kb: '/seller/panel/store/bot',
}
const TEXT_TARGETS = new Set(['brandIntro', 'returnPolicy', 'shippingInfo'])

// SQ-4 — کارت «آمادگی فروشگاه» بالای هاب (فقط بعد از اولین محصول فعال)
export function StoreQualitySection({ storeId, enabled }: { storeId: string; enabled: boolean }) {
  const navigate = useNavigate()
  const q = useStoreQualityReview(storeId, enabled, null)
  const apply = useApplyStoreQuality(storeId)
  const update = useUpdateStore(storeId)
  const previews = useRef(new Map<string, StoreQualityApplyPreview>())
  if (!enabled) return null
  const questions = q.data?.review?.buyerQuestionsUnanswered ?? []

  return (
    <QualityCard
      data={q.data ? { status: q.data.status, review: q.data.review as never, rules: { items: q.data.rules.items.map(i => ({ key: i.key, label: i.label, status: i.status === 'ok' ? 'ok' : 'unknown' })) } } : undefined}
      loading={q.isLoading}
      dismissKey={`store:${storeId}`}
      pendingText={t.storePending}
      doneText={t.storeDone}
      levelLabels={t.storeLevels}
      readinessLabel={t.storeReadiness}
      renderSuggestion={(s, index, dismiss) => {
        const target = s.target ?? ''
        if (!TEXT_TARGETS.has(target)) {
          return (
            <SuggestionRow
              index={index}
              suggestion={s}
              storeId={storeId}
              actionLabel={`${t.setup} ←`}
              onAction={() => navigate(ROUTE_BY_TARGET[target] ?? '/seller/panel/store/info')}
              onDismiss={dismiss}
              onPreview={async () => ''}
              onAccept={() => undefined}
            />
          )
        }
        return (
          <SuggestionRow
            index={index}
            suggestion={s}
            storeId={storeId}
            actionLabel={s.fromNotes ? t.fromNotes : undefined}
            prefill={s.fromNotes ? s.exampleText : undefined}
            onDismiss={dismiss}
            onPreview={async answer => {
              const res = await apply.mutateAsync({ key: s.key, answer })
              previews.current.set(s.key, res)
              return res.newText
            }}
            onAccept={async () => {
              const res = previews.current.get(s.key)
              if (res) await update.mutateAsync({ [res.field]: res.newText })
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
