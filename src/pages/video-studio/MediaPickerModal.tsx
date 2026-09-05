import { useState } from 'react'
import { useMyImages } from '@/queries/conversation.queries'
import { useAuthedImageUrl, fetchImageAsDataUrl } from '@/hooks/useAuthedImageUrl'
import type { MyImageItem } from '@/types/api'

// «انتخاب از تولیدات قبلی» — به‌جای دانلود دستی عکسی که در استودیو عکس ساخته شده و آپلود دوباره‌اش
// در استودیو ویدیو، مستقیم از گالری قبلی انتخاب می‌شود. عکس‌ها همان endpoint امن موجود
// (/conversations/:id/images/:filename) را دارند؛ فقط لیست‌گیری فلت آن‌ها تازه است.
function Thumbnail({ item, onPick }: { item: MyImageItem; onPick: (dataUrl: string) => void }) {
  const url = useAuthedImageUrl(item.imageUrl)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      onPick(await fetchImageAsDataUrl(item.imageUrl))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="relative aspect-square overflow-hidden rounded-xl border disabled:opacity-50"
      style={{ borderColor: 'rgba(148,163,184,0.25)', background: 'rgba(255,255,255,0.03)' }}
    >
      {url && <img src={url} className="size-full object-cover" alt="" />}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      )}
    </button>
  )
}

export function MediaPickerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (dataUrl: string) => void }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMyImages()
  const items = data?.pages.flatMap(p => p.items) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-t-3xl p-5 sm:rounded-3xl"
        style={{ background: '#0b1220', border: '1px solid rgba(148,163,184,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[14.5px] font-bold text-white">انتخاب از تولیدات قبلی</span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
            aria-label="بستن"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-[13px] text-slate-500">در حال بارگذاری...</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-500">هنوز عکسی در استودیو عکس نساخته‌ای</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {items.map(item => (
                <Thumbnail key={item.messageId} item={item} onPick={onSelect} />
              ))}
            </div>
          )}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-3 w-full rounded-full py-2 text-[12px] font-semibold text-slate-400"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)' }}
            >
              {isFetchingNextPage ? 'در حال بارگذاری...' : 'بیشتر'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
