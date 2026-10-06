import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fa } from '@/locales/fa'
import { useConnectInstagram, useInstagramConnectUrl } from '@/queries/instagram.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۴.۱/۴.۴ — redirect_uri اینستاگرام
// مستقیم همین صفحه است (نه یک مسیر callback جدا)؛ بعد از ریدایرکت، همین صفحه ?code= را
// می‌خواند و به بک‌اند می‌دهد — ساده‌تر از یک route جدا برای یک‌بار مصرف
export function SellerInstagramConnectPage() {
  const { storeId, instagramBusinessId, instagramConnectedAt } = useSellerStore()
  const connectUrl = useInstagramConnectUrl(storeId)
  const connect = useConnectInstagram(storeId)
  const [searchParams, setSearchParams] = useSearchParams()
  const handledCode = useRef(false)

  const code = searchParams.get('code')
  useEffect(() => {
    if (!code || handledCode.current) return
    handledCode.current = true
    connect.mutate(code, {
      onSettled: () => {
        searchParams.delete('code')
        searchParams.delete('state')
        setSearchParams(searchParams, { replace: true })
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const connected = !!instagramBusinessId

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">
        {fa.seller.panel.instagram.connectTitle}
      </h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.instagram.connectSubtitle}</p>

      <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">
            {fa.seller.panel.instagram.connectTitle}
          </span>
          <span className={connected ? 'text-xs text-emerald-400' : 'text-xs text-slate-500'}>
            {connected
              ? instagramConnectedAt
                ? fa.seller.panel.instagram.connectedAt(new Date(instagramConnectedAt).toLocaleDateString('fa-IR'))
                : fa.seller.panel.instagram.connectedLabel
              : fa.seller.panel.instagram.notConnected}
          </span>
        </div>

        {connect.isError && (
          <p className="mb-2 text-xs text-red-400">{fa.seller.panel.instagram.connectError}</p>
        )}

        {!connected &&
          (connectUrl.data?.url ? (
            <a
              href={connectUrl.data.url}
              className="mt-2 block w-full rounded-lg bg-emerald-500 py-2.5 text-center text-sm font-bold text-white hover:bg-emerald-600"
            >
              {fa.seller.panel.instagram.connectButton}
            </a>
          ) : (
            <button
              disabled
              className="mt-2 w-full rounded-lg bg-slate-700/40 py-2.5 text-sm font-bold text-slate-500"
            >
              {fa.seller.panel.instagram.connectButton}
            </button>
          ))}
      </div>

      {connected && (
        <Link
          to="/seller/panel/instagram/rules"
          className="flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
        >
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">
            {fa.seller.panel.instagram.goToRules}
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L8.414 11l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </Link>
      )}
    </div>
  )
}
