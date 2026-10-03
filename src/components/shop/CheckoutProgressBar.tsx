import { fa } from '@/locales/fa'

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۱) — نوار پیشرفت چک‌اوت
// (سبد → آدرس → پرداخت → تأیید)؛ از همان ConversationState که useShopChat.ts از قبل
// سمت سرور می‌گیرد، بدون state/مدل تازه
const STEP_STATES = [
  ['CART_REVIEW'],
  ['ADDRESS_COLLECTION'],
  ['AWAITING_PAYMENT', 'RECEIPT_SUBMITTED'],
  ['AWAITING_SELLER_APPROVAL', 'COMPLETED'],
]

function stepIndexForState(state: string): number {
  return STEP_STATES.findIndex((states) => states.includes(state))
}

export function CheckoutProgressBar({ state }: { state: string }) {
  const current = stepIndexForState(state)
  if (current === -1) return null

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 px-4 py-2">
      {fa.shop.checkoutSteps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-1.5">
          <div className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`size-2 rounded-full ${
                i <= current ? 'bg-emerald-400' : 'bg-slate-700 light:bg-slate-300'
              }`}
            />
            <span
              className={`text-[10px] ${
                i === current
                  ? 'font-semibold text-emerald-400'
                  : i < current
                    ? 'text-slate-400'
                    : 'text-slate-600 light:text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
          {i < fa.shop.checkoutSteps.length - 1 && (
            <div className={`mb-3.5 h-px flex-1 ${i < current ? 'bg-emerald-400' : 'bg-slate-700 light:bg-slate-300'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
