import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { en } from '@/locales/en'
import { useIntlConnectInstagram, useIntlInstagramConnectUrl } from '@/queries/intlInstagram.queries'
import { useIntlStore } from './IntlPanelLayout'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱/۴.۴ — معادل
// SellerInstagramConnectPage.tsx برای REGION=INTL؛ همان الگوی redirect_uri=همین صفحه
export function IntlInstagramConnectPage() {
  const { instagramBusinessId, instagramConnectedAt } = useIntlStore()
  const connectUrl = useIntlInstagramConnectUrl()
  const connect = useIntlConnectInstagram()
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
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{en.instagram.connectTitle}</h1>
      <p className="mb-6 text-sm text-slate-500">{en.instagram.connectSubtitle}</p>

      <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{en.instagram.connectTitle}</span>
          <span className={connected ? 'text-xs text-emerald-400' : 'text-xs text-slate-500'}>
            {connected
              ? instagramConnectedAt
                ? en.instagram.connectedAt(new Date(instagramConnectedAt).toLocaleDateString('en-US'))
                : en.instagram.connectedLabel
              : en.instagram.notConnected}
          </span>
        </div>

        {connect.isError && <p className="mb-2 text-xs text-red-400">{en.instagram.connectError}</p>}

        {!connected &&
          (connectUrl.data?.url ? (
            <a
              href={connectUrl.data.url}
              className="mt-2 block w-full rounded-lg bg-emerald-500 py-2.5 text-center text-sm font-bold text-white hover:bg-emerald-600"
            >
              {en.instagram.connectButton}
            </a>
          ) : (
            <button disabled className="mt-2 w-full rounded-lg bg-slate-700/40 py-2.5 text-sm font-bold text-slate-500">
              {en.instagram.connectButton}
            </button>
          ))}
      </div>

      {connected && (
        <Link
          to="/app/instagram/rules"
          className="flex items-center justify-between rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-3.5"
        >
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{en.instagram.goToRules}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </Link>
      )}
    </div>
  )
}
