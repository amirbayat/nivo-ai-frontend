import { useEffect, useRef, useState } from 'react'
import { fa } from '@/locales/fa'
import { extractErrorMessage, productVideoUrl } from '@/lib/sellerProduct'
import { useRemoveProductVideo, useUploadProductVideo } from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from '../SellerPanelLayout'

// docs/PRD-product-video.md بخش ۴ — چندویدیویی (سقف ۴ تا)، عیناً الگوی ProductImages بالا
// (نه StoreLogoUpload تک‌فایل قدیمی)
export function ProductVideo({
  product,
  onProductUpdated,
}: {
  product: SellerProduct
  onProductUpdated: (product: SellerProduct) => void
}) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductVideo(storeId)
  const remove = useRemoveProductVideo(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
  }, [pendingPreview])

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.products.videoLabel}
      </label>
      <div className="flex flex-wrap gap-2">
        {product.videos.map(v => (
          <div key={v.key} className="relative h-16 w-24 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200">
            <video src={productVideoUrl(product.id, v.key)} className="size-full object-cover" />
            <button
              onClick={() => remove.mutate({ productId: product.id, key: v.key }, { onSuccess: updated => onProductUpdated(updated) })}
              disabled={remove.isPending}
              className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        ))}
        {pendingPreview && (
          <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200 opacity-60">
            <video src={pendingPreview} className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          </div>
        )}
        {product.videos.length < 4 && !pendingPreview && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
          >
            +
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.videoHint}</p>
      {upload.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(upload.error, fa.seller.panel.products.videoUploadError)}</p>
      )}
      {remove.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(remove.error, fa.seller.panel.products.videoRemoveError)}</p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const previewUrl = URL.createObjectURL(file)
          setPendingPreview(previewUrl)
          upload.mutate(
            { productId: product.id, file },
            {
              onSuccess: updated => onProductUpdated(updated),
              onSettled: () => {
                URL.revokeObjectURL(previewUrl)
                setPendingPreview(null)
              },
            },
          )
          e.target.value = ''
        }}
      />
    </div>
  )
}
