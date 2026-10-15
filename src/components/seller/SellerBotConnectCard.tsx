import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { useDisconnectSellerBot, useSellerBotInfo, useSellerBotStatus } from '@/queries/seller.queries'
import { useSellerBotConnectToken } from '@/queries/sellerV2.queries'

const POLL_MS = 3000
const POLL_MAX_MS = 2 * 60 * 1000

// R2.3 — اتصال بات مدیریت پنل با وضعیت زنده: دکمه‌ی «باز کردن بات» → هر ۳ ثانیه تا ۲ دقیقه
// وضعیت چک می‌شود → «وصل شد ✅». variant=home فقط وقتی وصل نیست (یا تازه وصل شده) دیده می‌شود.
export function SellerBotConnectCard({ storeId, variant }: { storeId: string; variant: 'home' | 'more' | 'store' }) {
  const info = useSellerBotInfo()
  const username = info.data?.username || env.VITE_SELLER_BOT_USERNAME
  const [waiting, setWaiting] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [justLinked, setJustLinked] = useState(false)
  const status = useSellerBotStatus(storeId, waiting ? POLL_MS : false)
  const disconnect = useDisconnectSellerBot(storeId)
  const connectToken = useSellerBotConnectToken(storeId)
  const linked = !!status.data?.linked

  useEffect(() => {
    if (waiting && linked) {
      setWaiting(false)
      setJustLinked(true)
    }
  }, [waiting, linked])

  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => {
      setWaiting(false)
      setTimedOut(true)
    }, POLL_MAX_MS)
    return () => clearTimeout(t)
  }, [waiting])

  if (!username) return null
  if (variant === 'home' && linked && !justLinked) return null

  // SP-7/S9 — اتصال با یک تپ: لینک یک‌بارمصرف t.me/<bot>?start=c_<token>؛ اگر توکن نشد همان بات ساده
  // (روش قدیمی اشتراک شماره + کد پیامکی) باز می‌شود. پنجره همین‌جا و همزمان باز می‌شود تا پاپ‌آپ‌بلاکر
  // (iOS) بعد از await جلویش را نگیرد.
  function openBot() {
    const win = window.open('about:blank', '_blank')
    connectToken
      .mutateAsync()
      .then(r => r.url)
      .catch(() => `https://t.me/${username}`)
      .then(url => {
        if (win) win.location.href = url
        else window.location.href = url
      })
    setTimedOut(false)
    setJustLinked(false)
    setWaiting(true)
  }

  const p = fa.seller.panel.more
  if (variant === 'store') {
    const n = fa.seller.v2.store
    return (
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-slate-100 light:text-slate-900">{n.notifTitle}</span>
          {linked ? (
            <span className="text-xs font-bold text-emerald-400">{n.notifLinked}</span>
          ) : (
            <button type="button" onClick={openBot} disabled={connectToken.isPending} className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-50">
              {n.notifConnect}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">{n.notifHint}</p>
        {waiting && <p className="mt-1 text-xs text-amber-400">{p.sellerBotWaiting}</p>}
        {timedOut && <p className="mt-1 text-xs text-slate-400">{p.sellerBotTimeout}</p>}
        {justLinked && <p className="mt-1 text-xs font-semibold text-emerald-400">{p.sellerBotJustLinked}</p>}
      </div>
    )
  }
  return (
    <div className="mb-3 rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200 light:text-slate-900">
          {variant === 'home' ? p.sellerBotHomeTitle : p.sellerBotTitle}
        </span>
        <span className={clsx('text-xs', linked ? 'text-emerald-400' : 'text-slate-500')}>
          {linked && status.data?.linkedAt
            ? p.sellerBotLinked(new Date(status.data.linkedAt).toLocaleDateString('fa-IR'))
            : p.sellerBotNotLinked}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {variant === 'home' ? p.sellerBotHomeHint : p.sellerBotDescription}
      </p>
      {justLinked && <p className="mb-2 text-xs font-semibold text-emerald-400">{p.sellerBotJustLinked}</p>}
      {waiting && <p className="mb-2 text-xs text-amber-400">{p.sellerBotWaiting}</p>}
      {timedOut && <p className="mb-2 text-xs text-slate-400">{p.sellerBotTimeout}</p>}
      {linked ? (
        variant === 'more' && (
          <button
            onClick={() => {
              if (confirm(p.sellerBotDisconnectConfirm)) disconnect.mutate()
            }}
            disabled={disconnect.isPending}
            className="w-full rounded-lg border border-red-500/30 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-40"
          >
            {p.sellerBotDisconnectButton}
          </button>
        )
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openBot}
            className="flex-1 rounded-lg bg-emerald-500/15 py-2.5 text-center text-xs font-semibold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/25"
          >
            {p.sellerBotConnectButton}
          </button>
          {timedOut && (
            <button
              type="button"
              onClick={() => {
                setTimedOut(false)
                setWaiting(true)
              }}
              className="rounded-lg border border-slate-600 px-3 text-xs text-slate-300"
            >
              {p.sellerBotRecheck}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
