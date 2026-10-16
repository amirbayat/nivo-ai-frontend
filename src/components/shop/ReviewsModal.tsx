import { useEffect, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { reviewMediaUrl } from '@/components/shop/ShopUiBlocks'
import type { PublicProduct, ProductReview } from '@/types/api'

// docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۴.۲ — «مشاهده نظرات
// خریداران قبلی»؛ عیناً الگوی fetch ساده‌ی useStoreProducts بالا (بدون session-token، چون این
// endpoint هم عمومی است)
export function ReviewsModal({ slug, product, onClose }: { slug: string; product: PublicProduct; onClose: () => void }) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${env.VITE_API_URL}/v2/stores/${slug}/products/${product.id}/reviews`)
      .then((res) => {
        if (!res.ok) throw new Error('request failed')
        return res.json() as Promise<ProductReview[]>
      })
      .then((data) => {
        if (!cancelled) setReviews(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug, product.id])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.reviewsModalTitle}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
            {fa.common.close}
          </button>
        </div>

        {error && <p className="py-6 text-center text-sm text-red-400">{fa.shop.reviewsLoadError}</p>}
        {!error && reviews?.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">{fa.shop.reviewsEmpty}</p>
        )}
        {!error && reviews === null && <p className="py-6 text-center text-xs text-slate-500">{fa.common.loading}</p>}

        <div className="flex flex-col gap-3">
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-700/60 light:border-slate-200 p-3">
              {r.rating != null && (
                <div dir="ltr" className="mb-1 flex justify-end gap-0.5 text-sm">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n}>{n <= r.rating! ? '⭐' : '☆'}</span>
                  ))}
                </div>
              )}
              <p dir="auto" className="text-sm text-slate-300 light:text-slate-700">
                {r.text}
              </p>
              {r.imageKey && (
                <img src={reviewMediaUrl(r.id, r.imageKey)} alt="" className="mt-2 max-h-48 rounded-xl object-cover" />
              )}
              {r.videoKey && (
                <video src={reviewMediaUrl(r.id, r.videoKey)} controls className="mt-2 max-h-48 w-full rounded-xl" />
              )}
              {r.audioKey && <audio src={reviewMediaUrl(r.id, r.audioKey)} controls className="mt-2 w-full" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
