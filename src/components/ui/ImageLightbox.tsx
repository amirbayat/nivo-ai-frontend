import { useEffect } from 'react'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { api } from '@/lib/api'
import { track } from '@/lib/events'

// دانلود واقعی فایل (نه فقط باز شدن URL خام) — attribute «download» ساده روی لینک نامعتبر
// می‌شود. src یا یک data: URL خام قدیمی است (نیاز به auth ندارد) یا مسیر نسبی بک‌اند خودمان
// (مثل /conversations/:id/images/:filename یا /v2/discovery/images/:key) که باید با هدر
// Authorization واقعی خوانده شود — یک fetch خام بدون auth برای حالت دوم ۴۰۱ می‌گیرد
export async function downloadImage(src: string, filename: string) {
  try {
    const blob = src.startsWith('data:')
      ? await (await fetch(src)).blob()
      : (await api.get(src, { responseType: 'blob' })).data
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // fallback: حداقل توی تب جدید باز شود تا کاربر دستی ذخیره کند
    window.open(src, '_blank')
  }
}

interface ImageLightboxProps {
  src: string
  onClose: () => void
  // برای رویداد آنالیتیکس دانلود — کجا (چت/گالری) این لایت‌باکس باز شده
  analyticsSource?: string
}

// لایت‌باکس مشترک بزرگ‌نمایی عکس + دانلود — هم توی چت (نتیجه‌ی تولید دیسکاوری/عکس) هم توی
// گالری استفاده می‌شود. کلیک روی backdrop یا Escape می‌بندد.
export function ImageLightbox({ src, onClose, analyticsSource = 'lightbox' }: ImageLightboxProps) {
  const url = useAuthedImageUrl(src)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={e => {
            e.stopPropagation()
            track('generated_image_downloaded', { source: analyticsSource })
            void downloadImage(src, 'nivo-image.png')
          }}
          className="flex size-10 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="دانلود عکس"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M8 1v9m0 0l-3-3m3 3l3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="بستن"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {url && (
        <img
          src={url}
          alt="نمایش بزرگ‌شده‌ی تصویر"
          onClick={e => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      )}
    </div>
  )
}
