import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import { DigitsInput } from '@/components/ui/DigitsInput'

type PublicOrder = {
  orderCode: string
  status: string
  totalAmount: number
  storeName: string
  storeSlug: string
  carrier: string | null
  trackingCode: string | null
  items: { name: string; qty: number; unitPrice: number }[]
  timeline: { to: string; at: string; reason: string | null }[]
  refunds: {
    id: string
    amountToman: number
    status: string
    destinationMasked: string | null
    bankName: string | null
    paidRef: string | null
    overdue: boolean
  }[]
  actions: {
    canCancel: boolean
    canConfirmDelivery: boolean
    canReportIssue: boolean
    awaitingDestinationRefundId: string | null
  }
}

async function loadOrder(code: string, token: string | null) {
  const { data } = await api.get<PublicOrder>(`/v2/o/${encodeURIComponent(code)}`, {
    params: token ? { t: token } : undefined,
  })
  return data
}

function statusLabel(status: string) {
  return fa.shop.orderStatusLabels[status as keyof typeof fa.shop.orderStatusLabels] ?? status
}

function ActionStatus({ pending, error, done }: { pending: boolean; error: boolean; done: boolean }) {
  if (pending) return <p className="text-sm text-[var(--text-secondary)]">{fa.publicOrder.working}</p>
  if (error) return <p className="text-sm text-red-400 light:text-red-700">{fa.publicOrder.actionFailed}</p>
  if (done) return <p className="text-sm text-[var(--brand)]">{fa.publicOrder.saved}</p>
  return null
}

const card = 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4'
const field = 'min-h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-primary)]'
const toggle = (active: boolean) =>
  `min-h-11 rounded-xl border px-3 text-sm ${
    active
      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--text-primary)]'
      : 'border-[var(--border)] text-[var(--text-secondary)]'
  }`

export function PublicOrderPage() {
  const { code = '' } = useParams<{ code: string }>()
  const [params] = useSearchParams()
  const token = params.get('t')
  const order = useQuery({
    queryKey: ['public-order', code, token],
    queryFn: () => loadOrder(code, token),
    enabled: !!code,
    retry: false,
  })
  const [destKind, setDestKind] = useState<'card' | 'sheba'>('card')
  const [destination, setDestination] = useState('')
  const [holderName, setHolderName] = useState('')
  const [issueReason, setIssueReason] = useState('NOT_RECEIVED')
  const [issueText, setIssueText] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [cancelArmed, setCancelArmed] = useState(false)
  const [nudgedId, setNudgedId] = useState<string | null>(null)

  const refresh = () => void order.refetch()
  const post = (path: string, body?: unknown) =>
    api.post(`/v2/o/${encodeURIComponent(code)}${path}`, body ?? {}, {
      params: token ? { t: token } : undefined,
    })

  const destinationMut = useMutation({
    mutationFn: () => {
      const id = order.data?.actions.awaitingDestinationRefundId
      if (!id) throw new Error('missing')
      return post(`/refunds/${id}/destination`, { destination, holderName })
    },
    onSuccess: () => {
      setFormError(null)
      refresh()
    },
    onError: () => setFormError(fa.publicOrder.destinationError),
  })
  const cancelMut = useMutation({ mutationFn: () => post('/cancel'), onSuccess: refresh })
  const deliveredMut = useMutation({ mutationFn: () => post('/delivered'), onSuccess: refresh })
  const issueMut = useMutation({
    mutationFn: () => post('/issue', { reason: issueReason, text: issueText || undefined }),
    onSuccess: refresh,
  })
  const nudgeMut = useMutation({
    mutationFn: (refundId: string) => post(`/refunds/${refundId}/nudge`),
    onSuccess: (_data, refundId) => setNudgedId(refundId),
  })

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-primary)]">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="mb-4 text-xl font-bold">{fa.publicOrder.title}</h1>
        {order.isLoading && (
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--chip-bg)]" aria-hidden />
        )}
        {order.isError && (
          <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400 light:text-red-700">
            {fa.publicOrder.loadError}
          </p>
        )}
        {order.data && (
          <div className="flex flex-col gap-4">
            <section className={card}>
              <p className="text-sm text-[var(--text-secondary)]">{order.data.storeName}</p>
              <p dir="ltr" className="mt-1 font-mono text-lg font-bold">{order.data.orderCode}</p>
              <p className="mt-2 text-sm">{statusLabel(order.data.status)}</p>
              <p className="mt-1 text-base font-bold">
                {order.data.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}
              </p>
              {order.data.trackingCode && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {order.data.carrier} · <span dir="ltr">{order.data.trackingCode}</span>
                </p>
              )}
            </section>

            <ul className="flex flex-col gap-2 text-sm">
              {order.data.timeline.map((ev) => (
                <li key={`${ev.to}-${ev.at}`} className="rounded-xl bg-[var(--surface)] px-3 py-2">
                  <span>{statusLabel(ev.to)}</span>
                  <span className="mr-2 text-xs text-[var(--text-tertiary)]">
                    {new Date(ev.at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}
                  </span>
                </li>
              ))}
            </ul>

            {order.data.actions.awaitingDestinationRefundId && (
              <form
                className="flex flex-col gap-3 rounded-2xl border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (destinationMut.isPending || destinationMut.isSuccess) return
                  destinationMut.mutate()
                }}
              >
                <p className="text-sm font-semibold">{fa.publicOrder.destinationTitle}</p>
                <div className="flex gap-2">
                  <button type="button" aria-pressed={destKind === 'card'} onClick={() => setDestKind('card')} className={toggle(destKind === 'card')}>
                    {fa.publicOrder.card}
                  </button>
                  <button type="button" aria-pressed={destKind === 'sheba'} onClick={() => setDestKind('sheba')} className={toggle(destKind === 'sheba')}>
                    {fa.publicOrder.sheba}
                  </button>
                </div>
                <DigitsInput
                  kind={destKind}
                  value={destination}
                  onChange={setDestination}
                  aria-label={fa.publicOrder.destinationTitle}
                  placeholder={destKind === 'sheba' ? fa.publicOrder.shebaPlaceholder : undefined}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-center tracking-wider text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
                <input
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder={fa.publicOrder.holderName}
                  className={field}
                  style={{ fontSize: 16 }}
                />
                {formError && <p className="text-sm text-red-400 light:text-red-700">{formError}</p>}
                {destinationMut.isSuccess && <p className="text-sm text-[var(--brand)]">{fa.publicOrder.saved}</p>}
                <button
                  type="submit"
                  disabled={destinationMut.isPending || destinationMut.isSuccess}
                  className="min-h-11 rounded-2xl bg-[var(--brand)] font-bold text-white disabled:opacity-40"
                >
                  {destinationMut.isPending ? fa.publicOrder.working : fa.publicOrder.saveDestination}
                </button>
              </form>
            )}

            {order.data.refunds.map((r) => (
              <section key={r.id} className={`${card} text-sm`}>
                <p className="font-bold">{r.amountToman.toLocaleString('fa-IR')} {fa.common.toman}</p>
                <p className="mt-1">{fa.publicOrder.refundStatus[r.status] ?? r.status}</p>
                {r.destinationMasked && <p dir="ltr" className="mt-1">{r.destinationMasked}</p>}
                {r.paidRef && <p className="mt-1">{fa.publicOrder.paidRef}: <span dir="ltr">{r.paidRef}</span></p>}
                {r.status === 'DONE' && <p className="mt-2 font-semibold text-[var(--brand)]">{fa.publicOrder.paid}</p>}
                {r.overdue && (
                  <>
                    <button
                      type="button"
                      disabled={nudgeMut.isPending || nudgedId === r.id}
                      onClick={() => nudgeMut.mutate(r.id)}
                      className="mt-3 min-h-11 rounded-xl border border-[var(--border)] px-3 disabled:opacity-40"
                    >
                      {nudgeMut.isPending && nudgeMut.variables === r.id ? fa.publicOrder.working : fa.publicOrder.nudge}
                    </button>
                    <ActionStatus
                      pending={false}
                      error={nudgeMut.isError && nudgeMut.variables === r.id}
                      done={nudgedId === r.id}
                    />
                  </>
                )}
              </section>
            ))}

            {order.data.actions.canConfirmDelivery && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={deliveredMut.isPending || deliveredMut.isSuccess}
                  onClick={() => deliveredMut.mutate()}
                  className="min-h-11 rounded-2xl bg-[var(--brand)] font-bold text-white disabled:opacity-40"
                >
                  {deliveredMut.isPending ? fa.publicOrder.working : fa.publicOrder.delivered}
                </button>
                <ActionStatus pending={false} error={deliveredMut.isError} done={deliveredMut.isSuccess} />
              </div>
            )}
            {order.data.actions.canCancel && (
              <div className="flex flex-col gap-2">
                {cancelArmed ? (
                  <div className={`${card} flex flex-col gap-2`}>
                    <p className="text-sm">{fa.publicOrder.cancelConfirm}</p>
                    <button
                      type="button"
                      disabled={cancelMut.isPending || cancelMut.isSuccess}
                      onClick={() => cancelMut.mutate()}
                      className="min-h-11 rounded-2xl border border-red-500/50 text-red-400 disabled:opacity-40 light:text-red-700"
                    >
                      {cancelMut.isPending ? fa.publicOrder.working : fa.publicOrder.cancelYes}
                    </button>
                    <button
                      type="button"
                      disabled={cancelMut.isPending || cancelMut.isSuccess}
                      onClick={() => setCancelArmed(false)}
                      className="min-h-11 rounded-2xl border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      {fa.publicOrder.cancelNo}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelArmed(true)}
                    className="min-h-11 rounded-2xl border border-red-500/50 text-red-400 light:text-red-700"
                  >
                    {fa.publicOrder.cancel}
                  </button>
                )}
                <ActionStatus pending={false} error={cancelMut.isError} done={cancelMut.isSuccess} />
              </div>
            )}
            {order.data.actions.canReportIssue && (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (issueMut.isPending || issueMut.isSuccess) return
                  issueMut.mutate()
                }}
              >
                <select
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  disabled={issueMut.isPending || issueMut.isSuccess}
                  className={field}
                >
                  <option value="NOT_RECEIVED">{fa.publicOrder.issueNotReceived}</option>
                  <option value="DAMAGED">{fa.publicOrder.issueDamaged}</option>
                  <option value="WRONG_ITEM">{fa.publicOrder.issueWrong}</option>
                  <option value="OTHER">{fa.publicOrder.issueOther}</option>
                </select>
                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  disabled={issueMut.isPending || issueMut.isSuccess}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm text-[var(--text-primary)]"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={issueMut.isPending || issueMut.isSuccess}
                  className="min-h-11 rounded-2xl border border-[var(--border)] disabled:opacity-40"
                >
                  {issueMut.isPending ? fa.publicOrder.working : fa.publicOrder.reportIssue}
                </button>
                <ActionStatus pending={false} error={issueMut.isError} done={issueMut.isSuccess} />
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
