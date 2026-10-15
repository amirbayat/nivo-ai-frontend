import { useState } from 'react'
import { fa } from '@/locales/fa'
import { PaymentsSetup } from '../PaymentsSetup'
import { SellerCreditPage } from '../SellerCreditPage'
import { SellerDiscountCodesPage } from '../SellerDiscountCodesPage'
import { SellerHelpCenterPage } from '../SellerHelpCenterPage'
import { SellerDashboardPage } from '../SellerDashboardPage'
import { SellerChannelStatsPage } from '../SellerChannelStatsPage'
import { StoreSubpage } from './StoreSubpage'

// صفحه‌های قدیمی که فقط مسیر و هدر عوض شده‌اند؛ h1 تکراری‌شان داخل StoreSubpage(legacy) مخفی است

export function StorePaymentsPage() {
  return (
    <StoreSubpage title={fa.seller.v2.store.receiveMoney}>
      <PaymentsSetup />
    </StoreSubpage>
  )
}

export function StoreCreditPage() {
  return (
    <StoreSubpage title={fa.seller.v2.storeLegacy.credit} legacy>
      <SellerCreditPage />
    </StoreSubpage>
  )
}

export function StoreDiscountsPage() {
  return (
    <StoreSubpage title={fa.seller.v2.storeLegacy.discounts} legacy>
      <SellerDiscountCodesPage />
    </StoreSubpage>
  )
}

export function StoreHelpPage() {
  return (
    <StoreSubpage title={fa.seller.v2.storeLegacy.help} legacy>
      <SellerHelpCenterPage />
    </StoreSubpage>
  )
}

// گزارش‌ها: داشبورد + آمار کانال (بخش جمع‌شونده‌ی «به تفکیک کانال» پایین صفحه)
export function StoreReportsPage() {
  const [open, setOpen] = useState(false)
  return (
    <StoreSubpage title={fa.seller.v2.storeReports.title} legacy>
      <SellerDashboardPage />
      <div className="px-5 pb-8">
        <button type="button" onClick={() => setOpen(v => !v)} className="mb-2 text-sm font-bold text-emerald-400 light:text-emerald-700">
          {fa.seller.v2.storeReports.byChannel} {open ? '⌃' : '⌄'}
        </button>
        {open && <SellerChannelStatsPage />}
      </div>
    </StoreSubpage>
  )
}
