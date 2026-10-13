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
  })

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="mb-4 text-xl font-bold">{fa.publicOrder.title}</h1>
        {order.isLoading && (
          <div className="h-40 animate-pulse rounded-2xl bg-slate-800" aria-hidden />
        )}
        {order.isError && (
          <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {fa.publicOrder.loadError}
          </p>
        )}
        {order.data && (
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">{order.data.storeName}</p>
              <p dir="ltr" className="mt-1 font-mono text-lg font-bold">{order.data.orderCode}</p>
              <p className="mt-2 text-sm">{fa.shop.orderStatusLabels[order.data.status as keyof typeof fa.shop.orderStatusLabels] ?? order.data.status}</p>
              <p className="mt-1 text-base font-bold">
                {order.data.totalAmount.toLocaleString('fa-IR')} {fa.common.toman}
              </p>
              {order.data.trackingCode && (
                <p className="mt-2 text-sm text-slate-300">
                  {order.data.carrier} · <span dir="ltr">{order.data.trackingCode}</span>
                </p>
              )}
            </section>

            <ul className="flex flex-col gap-2 text-sm">
              {order.data.timeline.map((ev) => (
                <li key={`${ev.to}-${ev.at}`} className="rounded-xl bg-slate-900 px-3 py-2">
                  <span>{fa.shop.orderStatusLabels[ev.to as keyof typeof fa.shop.orderStatusLabels] ?? ev.to}</span>
                  <span className="mr-2 text-xs text-slate-500">
                    {new Date(ev.at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}
                  </span>
                </li>
              ))}
            </ul>

            {order.data.actions.awaitingDestinationRefundId && (
              <form
                className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  destinationMut.mutate()
                }}
              >
                <p className="text-sm font-semibold">{fa.publicOrder.destinationTitle}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDestKind('card')} className="min-h-11 rounded-xl border border-slate-600 px-3 text-sm">
                    {fa.publicOrder.card}
                  </button>
                  <button type="button" onClick={() => setDestKind('sheba')} className="min-h-11 rounded-xl border border-slate-600 px-3 text-sm">
                    {fa.publicOrder.sheba}
                  </button>
                </div>
                <DigitsInput kind={destKind} value={destination} onChange={setDestination} aria-label={fa.publicOrder.destinationTitle} />
                <input
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder={fa.publicOrder.holderName}
                  className="min-h-11 rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm"
                  style={{ fontSize: 16 }}
                />
                {formError && <p className="text-sm text-red-300">{formError}</p>}
                <button type="submit" disabled={destinationMut.isPending} className="min-h-11 rounded-2xl bg-emerald-500 font-bold text-white">
                  {fa.publicOrder.saveDestination}
                </button>
              </form>
            )}

            {order.data.refunds.map((r) => (
              <section key={r.id} className="rounded-2xl border border-slate-700 p-4 text-sm">
                <p className="font-bold">{r.amountToman.toLocaleString('fa-IR')} {fa.common.toman}</p>
                <p className="mt-1">{fa.publicOrder.refundStatus[r.status] ?? r.status}</p>
                {r.destinationMasked && <p dir="ltr" className="mt-1">{r.destinationMasked}</p>}
                {r.paidRef && <p className="mt-1">{fa.publicOrder.paidRef}: <span dir="ltr">{r.paidRef}</span></p>}
                {r.status === 'DONE' && <p className="mt-2 font-semibold text-emerald-300">{fa.publicOrder.paid}</p>}
                {r.overdue && (
                  <button type="button" onClick={() => nudgeMut.mutate(r.id)} className="mt-3 min-h-11 rounded-xl border border-slate-600 px-3">
                    {fa.publicOrder.nudge}
                  </button>
                )}
              </section>
            ))}

            {order.data.actions.canConfirmDelivery && (
              <button type="button" onClick={() => deliveredMut.mutate()} className="min-h-11 rounded-2xl bg-emerald-500 font-bold text-white">
                {fa.publicOrder.delivered}
              </button>
            )}
            {order.data.actions.canCancel && (
              <button type="button" onClick={() => cancelMut.mutate()} className="min-h-11 rounded-2xl border border-red-500/50 text-red-300">
                {fa.publicOrder.cancel}
              </button>
            )}
            {order.data.actions.canReportIssue && (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  issueMut.mutate()
                }}
              >
                <select value={issueReason} onChange={(e) => setIssueReason(e.target.value)} className="min-h-11 rounded-xl bg-slate-900 px-3">
                  <option value="NOT_RECEIVED">{fa.publicOrder.issueNotReceived}</option>
                  <option value="DAMAGED">{fa.publicOrder.issueDamaged}</option>
                  <option value="WRONG_ITEM">{fa.publicOrder.issueWrong}</option>
                  <option value="OTHER">{fa.publicOrder.issueOther}</option>
                </select>
                <textarea value={issueText} onChange={(e) => setIssueText(e.target.value)} className="rounded-xl bg-slate-900 p-3 text-sm" rows={2} />
                <button type="submit" className="min-h-11 rounded-2xl border border-slate-600">{fa.publicOrder.reportIssue}</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
