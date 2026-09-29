import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useMyStores } from '@/queries/seller.queries'

// جایگزین موقت پنل فروشنده‌ی گام ۳ (docs/PRD-mvp-launch-plan.md) — تا آن گام ساخته شود،
// این صفحه فقط لینک فروشگاه را نشان می‌دهد تا فروشنده بتواند دوباره آن را بردارد/بفرستد
export function SellerDashboardPlaceholderPage() {
  const { data: stores, isLoading } = useMyStores()
  const [copied, setCopied] = useState(false)
  const store = stores?.[0]

  if (isLoading) return <div className="min-h-screen bg-slate-950" />

  const chatLink = store ? `${window.location.origin}/chat/${store.slug}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8" dir="rtl">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="mb-1.5 text-[22px] font-bold text-slate-100">{store?.name ?? fa.seller.dashboardPlaceholder.heading}</h1>
        <p className="mb-6 text-sm text-slate-500">{fa.seller.dashboardPlaceholder.linkLabel}</p>

        <div className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-800/40 px-4 py-4">
          <p dir="ltr" className="break-all text-center text-[15px] font-mono text-emerald-300">{chatLink}</p>
        </div>

        <button onClick={copyLink} className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-[14px] font-bold text-white hover:bg-emerald-600">
          {copied ? fa.seller.step4.linkCopied : fa.seller.step4.copyLink}
        </button>

        <p className="text-xs text-slate-600">{fa.seller.dashboardPlaceholder.comingSoon}</p>
      </div>
    </div>
  )
}
