import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useInvoice, downloadInvoicePdf } from '@/queries/invoices.queries'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0 light:border-slate-200">
      <span className="text-sm text-slate-400 light:text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200 light:text-slate-900">{value}</span>
    </div>
  )
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useInvoice(id)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    if (!invoice) return
    setDownloading(true)
    try {
      await downloadInvoicePdf(invoice.id, `invoice-${invoice.number}.pdf`)
      track('invoice_pdf_downloaded', { invoiceId: invoice.id })
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-slate-400 light:text-slate-500">{fa.common.loading}</div>
  }

  if (!invoice) {
    return <div className="py-12 text-center text-sm text-slate-400 light:text-slate-500">{fa.invoice.noInvoices}</div>
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/settings/invoices')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {fa.invoice.back}
      </button>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 light:border-slate-200 light:bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.invoice.number(invoice.number)}</h3>
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 light:text-emerald-700 transition-colors"
          >
            {downloading ? fa.common.loading : fa.invoice.download}
          </button>
        </div>

        <InfoRow label={fa.invoice.issuedAt} value={new Date(invoice.issuedAt).toLocaleDateString('fa-IR')} />
        <InfoRow label={fa.invoice.plan} value={invoice.planName} />
        <InfoRow
          label={fa.invoice.amount}
          value={`${invoice.amount.toLocaleString('fa-IR')} ${fa.common.toman}`}
        />
        <InfoRow label={fa.invoice.gateway} value={fa.invoice.gateways[invoice.provider]} />
        {invoice.refId && <InfoRow label={fa.invoice.refId} value={invoice.refId} />}
      </div>

      <p className="text-center text-xs text-slate-600 light:text-slate-400">{fa.invoice.disclaimer}</p>
    </div>
  )
}
