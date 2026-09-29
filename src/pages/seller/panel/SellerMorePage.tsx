import { useState } from 'react'
import { fa } from '@/locales/fa'
import { useLogout } from '@/queries/auth.queries'
import { useSellerStore } from './SellerPanelLayout'

function ExternalLinkRow({ label, value }: { label: string; value: string }) {
  const href = value.startsWith('http') ? value : `https://${value.replace(/^@/, '')}`
  return (
    <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" dir="ltr" className="text-sm text-emerald-300 light:text-emerald-700 hover:underline">
        {value}
      </a>
    </div>
  )
}

export function SellerMorePage() {
  const { storeName, storeSlug, instagramUrl, telegramUrl, websiteUrl } = useSellerStore()
  const logout = useLogout()
  const [copied, setCopied] = useState(false)
  const chatLink = `${window.location.origin}/shop/${storeSlug}`

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{storeName}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.more.storeLink}</p>

      <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <p dir="ltr" className="break-all text-center text-[14px] font-mono text-emerald-300 light:text-emerald-700">{chatLink}</p>
      </div>
      <button onClick={copyLink} className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-[14px] font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
        {copied ? fa.seller.step4.linkCopied : fa.seller.step4.copyLink}
      </button>

      {instagramUrl && <ExternalLinkRow label={fa.seller.panel.more.instagramLink} value={instagramUrl} />}
      {telegramUrl && <ExternalLinkRow label={fa.seller.panel.more.telegramLink} value={telegramUrl} />}
      {websiteUrl && <ExternalLinkRow label={fa.seller.panel.more.websiteLink} value={websiteUrl} />}

      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-4 w-full rounded-2xl bg-red-500/15 py-3.5 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40"
      >
        {fa.seller.panel.more.logout}
      </button>
    </div>
  )
}
