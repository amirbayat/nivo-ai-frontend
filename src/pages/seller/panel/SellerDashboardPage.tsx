import { fa } from '@/locales/fa'
import {
  useSellerDashboard,
  useExportOrdersCsv,
  useExportProductsCsv,
  useExportCreditUsageCsv,
} from '@/queries/seller.queries'
import type { SellerDashboard } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

function toman(n: number): string {
  return `${n.toLocaleString('fa-IR')} تومان`
}

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۱.۱ — «نمودار روند درآمد روزانه
// — ساده، خطی»؛ بدون کتابخانه‌ی چارت جدید (بسته‌ی فعلی هیچ‌کدام ندارد)، یک SVG دستی ساده
function RevenueTrendChart({ trend }: { trend: SellerDashboard['dailyRevenueTrend'] }) {
  const width = 300
  const height = 72
  const max = Math.max(1, ...trend.map(d => d.totalToman))
  const points = trend.map((d, i) => {
    const x = (i / Math.max(1, trend.length - 1)) * width
    const y = height - (d.totalToman / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth={2} className="text-emerald-400" />
    </svg>
  )
}

function StatCard({ label, value, color = 'text-slate-100 light:text-slate-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

export function SellerDashboardPage() {
  const { storeId } = useSellerStore()
  const { data } = useSellerDashboard(storeId)
  const exportOrders = useExportOrdersCsv(storeId)
  const exportProducts = useExportProductsCsv(storeId)
  const exportCreditUsage = useExportCreditUsageCsv(storeId)

  const exportError = exportOrders.isError || exportProducts.isError || exportCreditUsage.isError

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.dashboard.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.dashboard.subtitle}</p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <StatCard label={fa.seller.panel.dashboard.revenueToday} value={toman(data?.revenueTodayToman ?? 0)} color="text-emerald-400 light:text-emerald-600" />
        <StatCard label={fa.seller.panel.dashboard.revenueWeek} value={toman(data?.revenueWeekToman ?? 0)} color="text-emerald-400 light:text-emerald-600" />
        <StatCard label={fa.seller.panel.dashboard.revenueMonth} value={toman(data?.revenueMonthToman ?? 0)} color="text-emerald-400 light:text-emerald-600" />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.dashboard.trendTitle}</p>
        <RevenueTrendChart trend={data?.dailyRevenueTrend ?? []} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label={fa.seller.panel.dashboard.uniqueCustomers} value={(data?.uniqueCustomerCount ?? 0).toLocaleString('fa-IR')} />
        <StatCard label={fa.seller.panel.dashboard.averageOrderValue} value={toman(data?.averageOrderValueToman ?? 0)} />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.dashboard.orderStatusTitle}</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(fa.seller.panel.dashboard.orderStatusLabels) as (keyof SellerDashboard['orderCountsByStatus'])[]).map(status => (
            <div key={status} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{fa.seller.panel.dashboard.orderStatusLabels[status]}</span>
              <span className="font-bold text-slate-200 light:text-slate-800">{(data?.orderCountsByStatus[status] ?? 0).toLocaleString('fa-IR')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.dashboard.topProductsTitle}</p>
        {data?.topProducts.length === 0 && <p className="text-xs text-slate-500">{fa.seller.panel.dashboard.topProductsEmpty}</p>}
        <div className="flex flex-col gap-2">
          {data?.topProducts.map(p => (
            <div key={p.productId} className="flex items-center justify-between text-sm">
              <span className="text-slate-200 light:text-slate-800">{p.name}</span>
              <span className="text-xs text-slate-500">{fa.seller.panel.dashboard.soldQty(p.qty)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.dashboard.exportTitle}</p>
        {exportError && <p className="mb-2 text-xs text-red-400">{fa.seller.panel.dashboard.exportError}</p>}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => exportOrders.mutate()}
            disabled={exportOrders.isPending}
            className="rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
          >
            {fa.seller.panel.dashboard.exportOrders}
          </button>
          <button
            onClick={() => exportProducts.mutate()}
            disabled={exportProducts.isPending}
            className="rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
          >
            {fa.seller.panel.dashboard.exportProducts}
          </button>
          <button
            onClick={() => exportCreditUsage.mutate()}
            disabled={exportCreditUsage.isPending}
            className="rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
          >
            {fa.seller.panel.dashboard.exportCreditUsage}
          </button>
        </div>
      </div>
    </div>
  )
}
