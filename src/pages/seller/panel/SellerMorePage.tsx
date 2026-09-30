import { useState } from 'react'
import { Link } from 'react-router-dom'
import { env } from '@/env'
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
  const [telegramCopied, setTelegramCopied] = useState(false)
  const chatLink = `${window.location.origin}/shop/${storeSlug}`
  // docs/PRD-telegram-bot-channel.md بخش ۵ — لینک اختصاصی همان بات مشترک، فقط با deep-link
  // /start=<slug> متفاوت است؛ بدون یوزرنیم بات (هنوز ساخته نشده) این بخش کلاً نمایش نمی‌شود
  const telegramLink = env.VITE_TELEGRAM_BOT_USERNAME
    ? `https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=${storeSlug}`
    : null

  async function copyLink() {
    await navigator.clipboard.writeText(chatLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyTelegramLink() {
    if (!telegramLink) return
    await navigator.clipboard.writeText(telegramLink)
    setTelegramCopied(true)
    setTimeout(() => setTelegramCopied(false), 2000)
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

      {telegramLink && (
        <>
          <p className="mb-2 text-sm text-slate-500">{fa.seller.panel.more.telegramBotLink}</p>
          <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
            <p dir="ltr" className="break-all text-center text-[14px] font-mono text-emerald-300 light:text-emerald-700">{telegramLink}</p>
          </div>
          <button onClick={copyTelegramLink} className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 light:border-slate-300 py-3.5 text-[14px] font-semibold text-slate-200 light:text-slate-800 hover:border-slate-600 light:hover:border-slate-400">
            {telegramCopied ? fa.seller.step4.linkCopied : fa.seller.step4.copyLink}
          </button>
        </>
      )}

      {instagramUrl && <ExternalLinkRow label={fa.seller.panel.more.instagramLink} value={instagramUrl} />}
      {telegramUrl && <ExternalLinkRow label={fa.seller.panel.more.telegramLink} value={telegramUrl} />}
      {websiteUrl && <ExternalLinkRow label={fa.seller.panel.more.websiteLink} value={websiteUrl} />}

      <Link
        to="/seller/panel/knowledge"
        className="mb-3 flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
      >
        <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.seller.panel.more.knowledgeBase}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L8.414 11l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </Link>

      <Link
        to="/seller/panel/credit"
        className="mb-3 flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
      >
        <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.seller.panel.more.credit}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L8.414 11l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </Link>

      <Link
        to="/seller/panel/bank-cards"
        className="mb-3 flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
      >
        <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.seller.panel.more.bankCards}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L8.414 11l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </Link>

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
