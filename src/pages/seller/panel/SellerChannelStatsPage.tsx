import { fa } from '@/locales/fa'
import { useChannelStats } from '@/queries/seller.queries'
import type { ChannelStat } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

function pct(v: number): string {
  return `${(v * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`
}

function ChannelCard({ stat }: { stat: ChannelStat }) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <p className="mb-3 text-sm font-bold text-slate-100 light:text-slate-900">
        {fa.seller.panel.channelStats.channelLabels[stat.group] ?? stat.group}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-lg font-bold text-emerald-400 light:text-emerald-600">{stat.conversations.toLocaleString('fa-IR')}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{fa.seller.panel.channelStats.conversations}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-100 light:text-slate-900">{pct(stat.approvedOrderRate)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{fa.seller.panel.channelStats.approvedOrderRate}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-amber-400 light:text-amber-600">{pct(stat.stuckHandoffRate)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{fa.seller.panel.channelStats.stuckHandoffRate}</p>
        </div>
      </div>
    </div>
  )
}

export function SellerChannelStatsPage() {
  const { storeId } = useSellerStore()
  const { data, isLoading } = useChannelStats(storeId)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.channelStats.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.channelStats.subtitle}</p>

      {!isLoading && data?.length === 0 && <p className="text-sm text-slate-500">{fa.seller.panel.channelStats.empty}</p>}

      {data?.map(stat => <ChannelCard key={stat.group} stat={stat} />)}
    </div>
  )
}
