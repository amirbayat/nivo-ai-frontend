import { useState } from 'react'
import { fa } from '@/locales/fa'

// docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
// (ShopChatPage's ProductDetailSheet) یا از روی سفارش (ShopOrdersPage)، مستقل از پیام پیگیریِ
// چت فعلی که دست‌نخورده می‌ماند. عیناً همون bottom-sheet موجود (RegisterModal در ShopChatPage.tsx)
export function CommentModal({
  productId,
  onClose,
  onSubmit,
}: {
  productId?: string
  onClose: () => void
  onSubmit: (productId: string | undefined, text: string, rating?: number) => Promise<{ ok: boolean; message: string }>
}) {
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await onSubmit(productId, text.trim(), rating ?? undefined)
    setBusy(false)
    if (res.ok) setDone(true)
    else setError(res.message)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.reviewModalTitle}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
            {fa.common.close}
          </button>
        </div>

        {done ? (
          <p className="py-6 text-center text-sm font-semibold text-emerald-400">{fa.shop.reviewSuccess}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400 light:text-slate-600">{fa.shop.reviewRatingLabel}</span>
            <div dir="ltr" className="mb-1 flex justify-end gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className="text-2xl leading-none"
                >
                  {rating !== null && n <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              dir="auto"
              placeholder={fa.shop.reviewTextPlaceholder}
              className="resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={busy || !text.trim()}
              className="rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {fa.shop.reviewSubmitButton}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
