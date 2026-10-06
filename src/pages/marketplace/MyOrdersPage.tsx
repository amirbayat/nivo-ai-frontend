import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { api } from '@/lib/api'
import { useSendOtp, useVerifyOtp } from '@/queries/auth.queries'
import { fa } from '@/locales/fa'
import type { MarketplaceStoreOrders } from '@/types/api'

type Step = 'checking' | 'phone' | 'otp' | 'orders'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۴.۲ — خریدار دیگر توکن
// کوتاه‌مدت مخصوص این صفحه نمی‌گیرد؛ از همان /auth/send-otp + /auth/verify-otp عمومی (مثل
// فروشنده) لاگین می‌کند و access/refresh token در localStorage ذخیره می‌شود — یعنی رفرش صفحه
// یا برگشت چند روز بعد دیگر نیاز به تأیید دوباره‌ی شماره ندارد
export function MyOrdersPage() {
  const [step, setStep] = useState<Step>('checking')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [stores, setStores] = useState<MarketplaceStoreOrders[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()

  const loadOrders = async () => {
    const data = await api.get<{ stores: MarketplaceStoreOrders[] }>('/v2/marketplace/orders').then(r => r.data)
    setStores(data.stores)
    setStep('orders')
  }

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      setStep('phone')
      return
    }
    loadOrders().catch(() => setStep('phone'))
  }, [])

  const requestOtp = async () => {
    setLoading(true)
    setError('')
    try {
      await sendOtp.mutateAsync(phone)
      setCode('')
      setStep('otp')
    } catch {
      setError(fa.common.error)
    } finally {
      setLoading(false)
    }
  }

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await verifyOtp.mutateAsync({ phone, code })
      await loadOrders()
    } catch {
      setError(fa.common.error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPhone = (e: FormEvent) => {
    e.preventDefault()
    void requestOtp()
  }

  return (
    <div className="min-h-screen bg-slate-950 light:bg-white" dir="rtl">
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link to="/explore" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-300">
          {fa.marketplace.backToExplore}
        </Link>
        <h1 className="mb-6 text-xl font-bold text-slate-100 light:text-slate-900">{fa.marketplace.myOrdersTitle}</h1>

        {step === 'checking' && (
          <p className="py-10 text-center text-sm text-slate-500">{fa.common.loading}</p>
        )}

        {step === 'phone' && (
          <form onSubmit={onSubmitPhone} className="space-y-4">
            <Input
              type="tel"
              inputMode="numeric"
              placeholder={fa.marketplace.phonePlaceholder}
              value={phone}
              onChange={e => setPhone(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
              error={error}
              dir="ltr"
              autoFocus
            />
            <Button type="submit" className="w-full" loading={loading} disabled={phone.length < 10}>
              {fa.marketplace.sendOtpButton}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <p className="text-sm text-slate-500">{fa.marketplace.otpSentTo(phone)}</p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={fa.marketplace.otpPlaceholder}
              value={code}
              onChange={e => setCode(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
              error={error}
              dir="ltr"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            <Button type="submit" className="w-full" loading={loading} disabled={code.length < 6}>
              {fa.marketplace.verifyOtpButton}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('phone')} className="text-slate-500 hover:text-slate-300">
                {fa.marketplace.changePhone}
              </button>
              <button type="button" onClick={() => void requestOtp()} className="text-emerald-400 hover:text-emerald-300">
                {fa.marketplace.resendOtp}
              </button>
            </div>
          </form>
        )}

        {step === 'orders' && (
          <div className="space-y-6">
            {stores.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">{fa.marketplace.noOrdersFound}</p>
            )}
            {stores.map(store => (
              <div key={store.storeId}>
                <Link
                  to={`/shop/${store.storeSlug}`}
                  className="mb-2 block text-sm font-semibold text-slate-200 light:text-slate-900"
                >
                  {store.storeName}
                </Link>
                <div className="space-y-2">
                  {store.orders.map(order => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 light:border-slate-200 light:bg-white"
                    >
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                        <span>{fa.shop.orderStatusLabels[order.status] ?? order.status}</span>
                      </div>
                      <ul className="mb-1 text-sm text-slate-300 light:text-slate-700">
                        {order.items.map((item, i) => (
                          <li key={i}>
                            {item.name} × {item.qty.toLocaleString('fa-IR')}
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm font-bold text-emerald-400">
                        {order.totalAmount.toLocaleString('fa-IR')} تومان
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
