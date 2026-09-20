import { useNetworkOutageStatus } from '@/queries/network-outage.queries'
import { fa } from '@/locales/fa'

// وقتی ادمین «قطعی نت» را ثبت کرده (بخش قطع‌شدن اینترنت)، این نوار مطمئن می‌کند کاربر بداند
// روزهای اشتراکش هدر نمی‌رود — برای جلوگیری از نگرانی/تماس پشتیبانی در طول قطعی
export function OutageBanner() {
  const { data: status } = useNetworkOutageStatus()
  if (!status?.active) return null

  return (
    <div className="mx-4 mb-2 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-right">
      <span className="shrink-0 text-base">📡</span>
      <span className="text-sm font-medium text-amber-300 light:text-amber-700">{fa.networkOutage.message}</span>
    </div>
  )
}
