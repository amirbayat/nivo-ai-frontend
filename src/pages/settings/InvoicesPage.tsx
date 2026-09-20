import { useNavigate } from 'react-router-dom'
import { useInvoices } from '@/queries/invoices.queries'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'

export function InvoicesPage() {
  const navigate = useNavigate()
  const { data: invoices, isLoading } = useInvoices()

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-slate-100 light:text-slate-900">{fa.invoice.title}</h2>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden light:border-slate-200 light:bg-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400 light:text-slate-500">
            {fa.common.loading}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400 light:text-slate-500">
            {fa.invoice.noInvoices}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40 light:divide-slate-200">
            {invoices.map(inv => (
              <button
                key={inv.id}
                onClick={() => {
                  track('invoice_viewed', { invoiceId: inv.id })
                  navigate(`/settings/invoices/${inv.id}`)
                }}
                className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-slate-700/20 light:hover:bg-slate-100 transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-slate-200 light:text-slate-900 truncate">
                    {fa.invoice.number(inv.number)}
                  </span>
                  <span className="text-xs text-slate-500 light:text-slate-400">
                    {new Date(inv.issuedAt).toLocaleDateString('fa-IR')} — {inv.planName}
                  </span>
                </div>
                <span className="flex-shrink-0 text-sm font-medium text-emerald-400 light:text-emerald-700" dir="ltr">
                  {inv.amount.toLocaleString('fa-IR')} {fa.common.toman}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
