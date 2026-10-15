import { useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useMyStores } from '@/queries/seller.queries'
import { SellerOnboardingPage } from './SellerOnboardingPage'

// R3.5 / D-1 — هر فروشنده یک فروشگاه واقعی: فروشنده‌ی دارای فروشگاه (غیرنمایشی) به ویزارد راه
// ندارد. تصمیم فقط یک‌بار در اولین لود گرفته می‌شود؛ وگرنه بعد از ساخت فروشگاه در همین ویزارد
// (invalidate لیست فروشگاه‌ها) کاربر وسط قدم‌های بعدی به پنل پرت می‌شد.
export function SellerOnboardingGate() {
  const stores = useMyStores()
  const decision = useRef<'wizard' | 'panel' | null>(null)

  if (decision.current === null && stores.data) {
    decision.current = stores.data.some(s => !s.isDemo) ? 'panel' : 'wizard'
  }
  if (decision.current === 'panel') return <Navigate to="/seller/panel/today" replace />
  if (decision.current === 'wizard') return <SellerOnboardingPage />
  if (stores.isError) return <SellerOnboardingPage />
  return <div className="min-h-screen bg-slate-950 light:bg-white" />
}
