import { useNavigate } from 'react-router-dom'
import { useCreditsBalance } from '@/queries/credits.queries'

// docs/PRODUCT-AUDIT-AND-GAPS.md — «Chat header: remaining نیوو visible without opening Wallet».
// الان کاربر باید بره صفحه‌ی کیف‌پول تا موجودیش رو ببینه؛ این یه بج کوچیک کنار ModelSelector
// است که مستقیم به /pricing لینک می‌شه. useCreditsBalance از قبل بعد از هر پیام invalidate
// می‌شود (useChat.ts finally block) — پس این بج بدون کد اضافه، real-time به‌روز می‌ماند.
export function WalletBalanceBadge() {
  const { data } = useCreditsBalance()
  const navigate = useNavigate()

  if (!data) return null

  return (
    <button
      type="button"
      onClick={() => navigate('/pricing')}
      className="flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/[0.08] px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/[0.13] transition-colors"
      aria-label="موجودی نیوو — شارژ کیف‌پول"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5 shrink-0">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 7.5v9M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.4c0 1.9-5 .9-5 2.9 0 .9 1 1.6 2.5 1.6s2.5-.6 2.5-1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span>{data.credits.toLocaleString('fa-IR')}</span>
    </button>
  )
}
