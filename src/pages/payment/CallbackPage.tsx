import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { keys } from '@/queries/keys'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'

export function CallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<'success' | 'failed' | null>(null)
  const [addedCredits, setAddedCredits] = useState<number | null>(null)
  const refId = params.get('refId')
  const invoiceId = params.get('invoiceId')
  // مسیری که کاربر پرداخت را از آنجا شروع کرده بود (مثلاً /image/xxx) — قبل از redirect به
  // درگاه در useInitiatePayment/useInitiateWalletTopup ذخیره شده؛ بدون این، کاربر همیشه به یک
  // مقصد ثابت («رفتن به چت») پرت می‌شد، حتی اگر از استودیوی عکس شارژ کرده باشد. useState با
  // initializer تنبل: فقط یک‌بار (رندر اول) خوانده می‌شود، نه با هر رندر — وگرنه بعد از پاک شدنش
  // در useEffect پایین، رندر بعدی (وقتی status ست می‌شود و دکمه واقعاً نمایش داده می‌شود) مقدار
  // null می‌گرفت
  const [returnPath] = useState(() => sessionStorage.getItem('nivo:pendingReturnPath'))
  // docs/PRD-user-push-notifications-and-mobile-app-flows.md بخش ۵.۵ — این پرداخت از داخل اپ
  // اندروید شروع شده بود (initiate با source=app)؛ چون اینجا احتمالاً در مرورگر خارجی هستیم
  // (نه WebView)، یک لینک عادی به nivoai.ir کافی‌ست — اگر App Link verified باشد، همین کلیک اپ را باز می‌کند
  const isFromApp = params.get('source') === 'app'

  useEffect(() => {
    const s = params.get('status')
    if (s === 'success') {
      setStatus('success')
      track('payment_succeeded', { refId: refId ?? undefined, invoiceId: invoiceId ?? undefined })
      void qc.invalidateQueries({ queryKey: keys.auth.me() })
      void qc.invalidateQueries({ queryKey: keys.sub.current() })
      void qc.invalidateQueries({ queryKey: keys.credits.balance() })
      const pending = sessionStorage.getItem('nivo:pendingPurchaseCredits')
      if (pending) {
        setAddedCredits(Number(pending))
        sessionStorage.removeItem('nivo:pendingPurchaseCredits')
      }
      sessionStorage.removeItem('nivo:pendingReturnPath')
    } else {
      sessionStorage.removeItem('nivo:pendingReturnPath')
      setStatus('failed')
      track('payment_failed', { refId: refId ?? undefined, invoiceId: invoiceId ?? undefined })
    }
  }, [params, qc, refId, invoiceId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'success' ? (
          <>
            <div className="mx-auto size-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="size-10 text-emerald-400">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                {addedCredits ? fa.payment.creditsAdded(addedCredits) : fa.payment.success}
              </h2>
              <p className="mt-2 text-sm text-emerald-400">{fa.payment.motivational}</p>
              {refId && <p className="mt-3 text-sm text-slate-500">کد پیگیری: {refId}</p>}
            </div>
            <button
              onClick={() => navigate(returnPath ?? '/chat', { replace: true })}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              {returnPath && returnPath !== '/chat' ? fa.payment.continueLabel : fa.payment.goToChat}
            </button>
            {invoiceId && (
              <button
                onClick={() => navigate(`/settings/invoices/${invoiceId}`)}
                className="w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-300 hover:border-slate-600 transition-colors"
              >
                {fa.invoice.view}
              </button>
            )}
            {isFromApp && (
              <a
                href="https://nivoai.ir/chat"
                className="block w-full rounded-xl border border-emerald-600 py-3 text-sm text-emerald-400 hover:border-emerald-500 transition-colors"
              >
                {fa.payment.returnToApp}
              </a>
            )}
          </>
        ) : status === 'failed' ? (
          <>
            <div className="mx-auto size-20 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="size-10 text-red-400">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100">{fa.payment.failed}</h2>
            <button
              onClick={() => navigate('/pricing', { replace: true })}
              className="w-full rounded-xl border border-slate-600 py-3 text-sm text-slate-300 hover:border-slate-500 transition-colors"
            >
              {fa.payment.tryAgain}
            </button>
            {isFromApp && (
              <a
                href="https://nivoai.ir/chat"
                className="block w-full rounded-xl border border-emerald-600 py-3 text-sm text-emerald-400 hover:border-emerald-500 transition-colors"
              >
                {fa.payment.returnToApp}
              </a>
            )}
          </>
        ) : (
          <div className="size-8 mx-auto rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        )}
      </div>
    </div>
  )
}
