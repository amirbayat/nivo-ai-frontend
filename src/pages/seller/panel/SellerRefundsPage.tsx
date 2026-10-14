import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import { copyText } from '@/lib/clipboard'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { useSellerStore } from './SellerPanelLayout'

type RefundRow = {
  id: string
  orderCode: string
  buyerName: string
  amountToman: number
  reason: string
  status: 'AWAITING_DESTINATION' | 'AWAITING_SELLER_CONFIRM' | 'READY' | 'DONE'
  destinationMasked: string | null
  destination: string | null
  holderName: string | null
  bankName: string | null
  paidRef: string | null
  waitingHours: number
  overdue: boolean
}

type Summary = {
  readyCount: number
  readyAmountToman: number
  people: number
  overdue: number
  bankingText: string
}

const TABS = ['READY', 'AWAITING_DESTINATION', 'AWAITING_SELLER_CONFIRM', 'DONE'] as const

export function SellerRefundsPage() {
  const { storeId } = useSellerStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]>('READY')
  const [paidRef, setPaidRef] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const summary = useQuery({
    queryKey: ['seller', 'refunds', storeId, 'summary'],
    queryFn: () => api.get<Summary>(`/v2/stores/${storeId}/refunds/summary`).then((r) => r.data),
    enabled: !!storeId,
  })
  const rows = useQuery({
    queryKey: ['seller', 'refunds', storeId, tab],
    queryFn: () =>
      api.get<RefundRow[]>(`/v2/stores/${storeId}/refunds`, { params: { status: tab } }).then((r) => r.data),
    enabled: !!storeId,
  })
  const markPaid = useMutation({
    mutationFn: (id: string) =>
      api.post(`/v2/stores/${storeId}/refunds/${id}/paid`, { paidRef: paidRef[id] || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'refunds', storeId] })
    },
  })
  const resolveHold = useMutation({
    mutationFn: ({ id, moneyReceived }: { id: string; moneyReceived: boolean }) =>
      api.post(`/v2/stores/${storeId}/refunds/${id}/seller-hold`, { moneyReceived }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['seller', 'refunds', storeId] })
    },
  })

  return (
    <div className="px-5 py-6" dir="rtl">
      <Link to="/seller/panel/orders" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-slate-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {fa.seller.panel.refunds.back}
      </Link>
      <h1 className="mb-4 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.refunds.title}</h1>
      {summary.isError && (
        <p className="mb-4 rounded-xl border border-red-500/40 p-3 text-sm text-red-300">{fa.seller.panel.refunds.loadError}</p>
      )}
      {summary.data && (
        <p className="mb-4 rounded-2xl bg-slate-800/60 light:bg-slate-100 p-4 text-sm text-slate-200 light:text-slate-800">
          {fa.seller.panel.refunds.summary(
            summary.data.readyAmountToman,
            summary.data.people,
            summary.data.overdue,
          )}
        </p>
      )}
      <button
        type="button"
        className="mb-4 min-h-11 w-full rounded-2xl border border-slate-600 text-sm font-semibold"
        onClick={() => {
          void copyText(summary.data?.bankingText ?? '').then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? fa.seller.panel.refunds.copied : fa.seller.panel.refunds.copyAll}
      </button>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-11 whitespace-nowrap rounded-full border px-3 text-sm ${tab === t ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400'}`}
          >
            {fa.seller.panel.refunds.tabs[t]}
          </button>
        ))}
      </div>
      {rows.isLoading && <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />}
      {rows.isError && <p className="text-sm text-red-300">{fa.seller.panel.refunds.loadError}</p>}
      {rows.data && rows.data.length === 0 && (
        <p className="text-sm text-slate-500">{fa.seller.panel.refunds.empty}</p>
      )}
      <div className="flex flex-col gap-3">
        {rows.data?.map((row) => (
          <article key={row.id} className={`rounded-2xl border p-4 ${row.overdue ? 'border-red-500/60' : 'border-slate-700'}`}>
            <p className="text-sm text-slate-400">{row.buyerName}</p>
            <p dir="ltr" className="font-mono text-sm font-bold">{row.orderCode}</p>
            <p className="mt-1 text-lg font-bold">{row.amountToman.toLocaleString('fa-IR')} {fa.common.toman}</p>
            <p className="text-xs text-slate-500">{fa.seller.panel.refunds.reasons[row.reason] ?? row.reason}</p>
            {(row.destination || row.destinationMasked) && (
              <p dir="ltr" className="mt-2 text-sm">{row.destination ?? row.destinationMasked}</p>
            )}
            {row.bankName && <p className="text-xs text-slate-400">{row.bankName} · {row.holderName}</p>}
            {row.status === 'AWAITING_SELLER_CONFIRM' && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={resolveHold.isPending}
                  onClick={() => resolveHold.mutate({ id: row.id, moneyReceived: true })}
                  className="min-h-11 rounded-2xl bg-emerald-500 font-bold text-white"
                >
                  {fa.seller.panel.refunds.moneyArrived}
                </button>
                <button
                  type="button"
                  disabled={resolveHold.isPending}
                  onClick={() => resolveHold.mutate({ id: row.id, moneyReceived: false })}
                  className="min-h-11 rounded-2xl border border-slate-600 text-sm font-semibold"
                >
                  {fa.seller.panel.refunds.moneyMissing}
                </button>
              </div>
            )}
            {row.status === 'READY' && (
              <div className="mt-3 flex flex-col gap-2">
                <DigitsInput
                  kind="int"
                  value={paidRef[row.id] ?? ''}
                  onChange={(v) => setPaidRef((s) => ({ ...s, [row.id]: v }))}
                  aria-label={fa.seller.panel.refunds.paidRef}
                />
                <button
                  type="button"
                  disabled={markPaid.isPending}
                  onClick={() => markPaid.mutate(row.id)}
                  className="min-h-11 rounded-2xl bg-emerald-500 font-bold text-white"
                >
                  {fa.seller.panel.refunds.markPaid}
                </button>
              </div>
            )}
            {row.status === 'DONE' && row.paidRef && (
              <p className="mt-2 text-sm text-emerald-300">{fa.publicOrder.paid} · <span dir="ltr">{row.paidRef}</span></p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
