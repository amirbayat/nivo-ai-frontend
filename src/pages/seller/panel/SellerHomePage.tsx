import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useNeededAttention, useOrders } from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

export function SellerHomePage() {
  const { storeId, storeName, storeSlug } = useSellerStore()
  const pending = useOrders(storeId, 'RECEIPT_SUBMITTED')
  const attention = useNeededAttention(storeId)
  const [copied, setCopied] = useState(false)

  const chatLink = `${window.location.origin}/shop/${storeSlug}`

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ url: chatLink, title: storeName })
        return
      } catch {
        // کاربر شیت اشتراک‌گذاری را بست
      }
    }
    await copyLink()
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{storeName}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.nav.home}</p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
          <p className="text-2xl font-bold text-emerald-400 light:text-emerald-600">{pending.data?.length ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">{fa.seller.panel.home.pendingOrders(pending.data?.length ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
          <p className="text-2xl font-bold text-amber-400 light:text-amber-600">{attention.data?.length ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">{fa.seller.panel.home.needsAttention(attention.data?.length ?? 0)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <p dir="ltr" className="break-all text-center text-[14px] font-mono text-emerald-300 light:text-emerald-700">{chatLink}</p>
      </div>

      <button onClick={copyLink} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-[14px] font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
        {copied ? fa.seller.step4.linkCopied : fa.seller.step4.copyLink}
      </button>
      <button onClick={shareLink} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600">
        {fa.seller.panel.home.shareLink}
      </button>
    </div>
  )
}
