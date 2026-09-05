import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useVideoNotifications, useMarkNotificationsSeen } from '@/queries/videoStudio.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import type { VideoNotification } from '@/types/api'

// آیکون نوتیف هدر — ویدیوهای آماده‌شده‌ی استودیو ویدیو، برای کاربر وب (که پوش موبایل/FCM
// نمی‌گیرد). پولینگ سراسری (useVideoNotifications، هر ۲۵ ثانیه) روی همه‌ی صفحات (mount در
// ChatLayout/Sidebar)، نه فقط صفحه‌ی ویدیو استودیو.
function NotificationThumb({ previewImageKey }: { previewImageKey: string | null }) {
  const url = useAuthedImageUrl(previewImageKey ? `/video-studio/assets/${previewImageKey}` : '')
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
      {url ? (
        <img src={url} className="size-full object-cover" alt="" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-500">
          <rect x="3" y="5" width="14" height="14" rx="2" /><path d="M17 9l4-2v10l-4-2" />
        </svg>
      )}
    </span>
  )
}

function statusLabel(n: VideoNotification): string {
  return n.videoStatus === 'FAILED' ? 'تولید ویدیو ناموفق بود' : 'ویدیو آماده شد'
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data: notifications } = useVideoNotifications()
  const markSeen = useMarkNotificationsSeen()

  const items = notifications ?? []
  const unseenCount = items.filter(n => !n.seen).length

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function handleOpen() {
    setOpen(o => !o)
    if (!open && unseenCount > 0) markSeen.mutate(undefined)
  }

  function handleSelect(n: VideoNotification) {
    setOpen(false)
    navigate(`/video/${n.projectId}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700/60 hover:text-emerald-400 transition-colors"
        aria-label="نوتیفیکیشن‌ها"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseenCount > 0 && (
          <span
            className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-[#02170f]"
          >
            {unseenCount > 9 ? '۹+' : unseenCount.toLocaleString('fa-IR')}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl p-2 shadow-2xl"
          style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)' }}
        >
          {items.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-slate-500">هنوز نوتیفی نداری</p>
          ) : (
            items.map(n => (
              <button
                key={n.shotId}
                type="button"
                onClick={() => handleSelect(n)}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-xl p-2 text-right transition-colors hover:bg-white/5',
                  !n.seen && 'bg-emerald-500/5',
                )}
              >
                <NotificationThumb previewImageKey={n.previewImageKey} />
                <span className="flex-1 overflow-hidden">
                  <span className="block truncate text-[13px] font-semibold text-slate-100">{n.title}</span>
                  <span className={clsx('block text-[11px]', n.videoStatus === 'FAILED' ? 'text-red-400' : 'text-emerald-400')}>
                    {statusLabel(n)}
                  </span>
                </span>
                {!n.seen && <span className="size-2 shrink-0 rounded-full bg-emerald-500" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
