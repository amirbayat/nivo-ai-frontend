import { useNavigate } from 'react-router-dom'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { SellerBotConnectCard } from '@/components/seller/SellerBotConnectCard'
import { shareOrCopy } from '@/lib/shareLink'
import { storeLogoUrl } from '@/lib/sellerProduct'
import { useToastStore } from '@/store/toast.store'
import { useLogout } from '@/queries/auth.queries'
import { useMyStores, useStoreCompleteness, useStoreCredit } from '@/queries/seller.queries'
import { useSellerStore } from '../SellerPanelLayout'

const t = fa.seller.v2.store
const toFa = (n: number | string) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

function ForwardChevron() {
  // «ادامه/برو به» در RTL رو به چپ
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-slate-500">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function Item({ label, value, alert, onClick }: { label: string; value?: React.ReactNode; alert?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-start hover:bg-slate-800/40 light:hover:bg-slate-50">
      <span className="flex-1 text-sm font-bold text-slate-100 light:text-slate-900">{label}</span>
      {alert && <span className="size-2.5 rounded-full bg-red-500" aria-label="!" />}
      {value && <span className="text-xs text-slate-400">{value}</span>}
      <ForwardChevron />
    </button>
  )
}

// docs/PRD-seller-panel-simplification.md §4.9 — تب «فروشگاه» (جایگزین «بیشتر»): هر تنظیم یک خانه دارد
export function SellerStorePage() {
  const { storeId, storeName, storeSlug } = useSellerStore()
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const logout = useLogout()
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const completeness = useStoreCompleteness(storeId)
  const credit = useStoreCredit(storeId)
  const link = `${window.location.origin}/shop/${storeSlug}`
  const shortLink = `nivoai.ir/shop/${storeSlug}`
  const telegramShop = env.VITE_TELEGRAM_BOT_USERNAME ? `https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=${storeSlug}` : null

  const noPayment = completeness.data ? !completeness.data.launch.hasPaymentMethod : false
  const botMissing =
    store && completeness.data
      ? [!store.brandIntro, !store.returnPolicy, !(store.workingHoursStart && store.workingHoursEnd), !completeness.data.checklist.hasEnoughKbEntries].filter(Boolean).length
      : 0
  const estimate = credit.data?.conversationsLeftEstimate
  const balance = credit.data?.balanceToman ?? 0
  // QA-10 — اعتبار هدیه‌ی آزمایشی فعال (مقدار از داده، نه ثابت)
  const trialToman = credit.data?.trialCreditRemainingToman ?? 0
  const trialActive = trialToman > 0 && !!credit.data?.trialEndsAt && new Date(credit.data.trialEndsAt).getTime() > Date.now()
  const creditValue =
    balance < 0 ? <span className="font-bold text-red-400">{t.creditDebt}</span> : trialActive ? t.creditTrial(toFa(trialToman.toLocaleString('en-US').replace(/,/g, '٬'))) : estimate != null ? t.creditApprox(toFa(estimate)) : `${toFa(balance.toLocaleString('en-US').replace(/,/g, '٬'))} ${fa.common.toman}`

  const go = (p: string) => () => navigate(`/seller/panel/store/${p}`)

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 light:border-slate-200 light:bg-white">
        <button type="button" onClick={go('info')} className="flex w-full items-center gap-3 text-start">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-lg font-extrabold text-slate-300 light:bg-slate-200">
            {store?.logoImageKey ? <img src={storeLogoUrl(storeId, store.logoImageKey)} alt="" className="size-full object-cover" /> : storeName.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-base font-extrabold text-slate-100 light:text-slate-900">{storeName}</span>
          <span className="flex items-center gap-1 text-xs text-emerald-400 light:text-emerald-700">
            {t.edit}
            <ForwardChevron />
          </span>
        </button>
        <div className="mt-3 flex items-center gap-2">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-left font-mono text-xs text-slate-400">{shortLink}</span>
          <button type="button" onClick={() => void navigator.clipboard.writeText(link).then(() => addToast(t.copied))} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 light:bg-slate-100 light:text-slate-800">
            {t.copy}
          </button>
          <button type="button" onClick={() => void shareOrCopy({ url: link, text: fa.seller.v2.today.shareBio(link) })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
            {t.share}
          </button>
        </div>
      </section>

      <section className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 light:divide-slate-200 light:border-slate-200 light:bg-white">
        <Item label={t.receiveMoney} alert={noPayment} onClick={go('payments')} />
        <Item label={t.shipping} onClick={go('shipping')} />
        <Item label={t.myBot} value={botMissing > 0 ? t.missing(toFa(botMissing)) : undefined} onClick={go('bot')} />
        <Item label={t.discounts} onClick={go('discounts')} />
        <Item label={t.credit} value={creditValue} onClick={go('credit')} />
        <Item label={t.reports} onClick={go('reports')} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 light:border-slate-200 light:bg-white">
        <h2 className="px-4 pt-3 text-xs font-bold text-slate-500">{t.channels}</h2>
        <SellerBotConnectCard storeId={storeId} variant="store" />
        {telegramShop && (
          <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-3 light:border-slate-200">
            <span className="flex-1 text-sm font-bold text-slate-100 light:text-slate-900">{t.shopLinkTelegram}</span>
            <button type="button" onClick={() => void navigator.clipboard.writeText(telegramShop).then(() => addToast(t.copied))} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 light:bg-slate-100 light:text-slate-800">
              {t.copy}
            </button>
          </div>
        )}
      </section>

      <section className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 light:divide-slate-200 light:border-slate-200 light:bg-white">
        <Item label={t.advanced} onClick={go('advanced')} />
        <Item label={t.help} onClick={go('help')} />
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="w-full px-4 py-3.5 text-start text-sm font-bold text-red-400 disabled:opacity-40">
          {t.logout}
        </button>
      </section>
    </div>
  )
}
