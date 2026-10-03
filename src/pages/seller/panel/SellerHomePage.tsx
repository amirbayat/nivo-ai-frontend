import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useNeededAttention, useOrders, useProducts, useStoreCompleteness, useStoreCredit } from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-product-strategy-and-roadmap.md بخش ۳.۱ — چک‌لیست ۳موردی، هر ردیف یک ✓/— ساده
function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={clsx('flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]', done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 text-slate-500')}>
        {done ? '✓' : '—'}
      </span>
      <span className={done ? 'text-slate-500 line-through' : 'text-slate-300 light:text-slate-700'}>{label}</span>
    </li>
  )
}

export function SellerHomePage() {
  const navigate = useNavigate()
  const { storeId, storeName, storeSlug } = useSellerStore()
  const pending = useOrders(storeId, 'RECEIPT_SUBMITTED')
  const attention = useNeededAttention(storeId)
  const credit = useStoreCredit(storeId)
  const completeness = useStoreCompleteness(storeId)
  const products = useProducts(storeId)
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

      {products.data?.length === 0 && (
        <button
          onClick={() => navigate('/seller/panel/products/new')}
          className="mb-6 w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-right"
        >
          <p className="text-sm font-bold text-amber-300 light:text-amber-700">{fa.seller.panel.home.noProductsTitle}</p>
          <p className="mt-1 text-xs text-amber-400/80 light:text-amber-700/80">{fa.seller.panel.home.noProductsSubtitle}</p>
          <span className="mt-2 inline-block rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 light:text-amber-700">
            {fa.seller.panel.home.noProductsCta}
          </span>
        </button>
      )}

      {completeness.data && (
        <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-100 light:text-slate-900">
            {fa.seller.panel.home.completenessTitle(completeness.data.overallScorePercent)}
          </p>
          <ul className="flex flex-col gap-1.5">
            <ChecklistRow done={completeness.data.checklist.hasProductWithPhoto} label={fa.seller.panel.home.completenessChecklistPhoto} />
            <ChecklistRow done={completeness.data.checklist.hasEnoughKbEntries} label={fa.seller.panel.home.completenessChecklistKb} />
            <ChecklistRow done={completeness.data.checklist.hasShippingPolicy} label={fa.seller.panel.home.completenessChecklistShipping} />
          </ul>
        </div>
      )}

      <Link
        to="/seller/panel/credit"
        className="mb-6 flex items-center justify-between rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4"
      >
        <div>
          <p className="text-xs text-slate-500">{fa.seller.panel.home.creditBalance}</p>
          <p className="mt-1 text-lg font-bold text-slate-100 light:text-slate-900">
            {fa.seller.panel.home.creditBalanceToman(credit.data?.balanceToman ?? 0)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {fa.seller.panel.home.creditFreeQuota(credit.data?.freeQuotaUsedToday ?? 0, credit.data?.freeQuotaLimit ?? 10)}
          </p>
        </div>
        <span className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400 light:text-emerald-700">
          {fa.seller.panel.home.creditTopUp}
        </span>
      </Link>

      <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <p dir="ltr" className="break-all text-center text-[14px] font-mono text-emerald-300 light:text-emerald-700">{chatLink}</p>
      </div>

      <button onClick={copyLink} className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-[14px] font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
        {copied ? fa.seller.step3.linkCopied : fa.seller.step3.copyLink}
      </button>
      <button onClick={shareLink} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[15px] font-bold text-white hover:bg-emerald-600">
        {fa.seller.panel.home.shareLink}
      </button>
    </div>
  )
}
