import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { keys } from '@/queries/keys'
import { useRequestShotVideo, useShotVideoStatus, useUpdateShot } from '@/queries/videoStudio.queries'
import type { StudioCharacterOption, StudioProject, StudioShot } from '@/types/api'

// docs/PRD-video-studio-chat-flow.md §۲/۳ — گالری استودیوی ویدیو، محتوایش بر اساس مرحله‌ی
// پروژه عوض می‌شود (خالی → گرید ۲×۲ کاراکتر → استوری‌برد ۱۶:۹ → همون گرید با overlay وضعیت
// ویدیو → گرید نهایی با پخش/دانلود). یک کامپوننت واحد با پارامتر `mode` هم برای ستون گالری
// دسکتاپ (بزرگ‌تر، گرید کامل) هم برای رندر درون‌خطیِ پیام دستیار روی موبایل (فشرده‌تر،
// استوری‌برد به‌صورت نوار افقی طبق PRD §۲ «نسخه‌ی موبایل») استفاده می‌شود.

export type VideoStudioStage = 'empty' | 'character' | 'storyboard' | 'render' | 'result'

export function getVideoStudioStage(project: StudioProject | undefined): VideoStudioStage {
  if (!project) return 'empty'
  // پروژه‌ی «تولید ساده» (SimpleVideoForm.tsx) هیچ‌وقت characterOptions ندارد ولی مستقیم shot
  // دارد — نباید empty نمایش داده شود؛ فقط وقتی واقعاً نه کاراکتر نه صحنه‌ای ساخته شده empty است
  if (project.characterOptions.length === 0 && project.shots.length === 0) return 'empty'
  if (project.shots.length === 0) return 'character'
  const anyRequested = project.shots.some(s => s.videoStatus !== 'NOT_STARTED')
  const allSucceeded = project.shots.every(s => s.videoStatus === 'SUCCEEDED')
  if (!anyRequested) return 'storyboard'
  if (allSucceeded) return 'result'
  return 'render'
}

function assetSrc(key: string) {
  return `/video-studio/assets/${key}`
}

function StudioImage({ imgKey, className, alt }: { imgKey: string; className?: string; alt: string }) {
  const url = useAuthedImageUrl(assetSrc(imgKey))
  if (!url) return <div className={clsx(className, 'animate-pulse bg-slate-700/50')} />
  return <img src={url} className={className} alt={alt} />
}

export function StudioVideo({ videoKey, previewImageKey, className }: { videoKey: string; previewImageKey?: string | null; className?: string }) {
  const url = useAuthedImageUrl(assetSrc(videoKey))
  const posterUrl = useAuthedImageUrl(previewImageKey ? assetSrc(previewImageKey) : '')
  if (!url) return <div className={clsx(className, 'flex items-center justify-center bg-slate-800/60 text-[11px] text-slate-500')}>در حال بارگذاری...</div>
  return <video src={url} poster={posterUrl ?? undefined} className={className} controls playsInline preload="metadata" />
}

export function VideoStudioEmptyState({ compact }: { compact?: boolean }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3.5 text-center', compact ? 'py-8' : 'py-16')}>
      <div
        className="flex size-16 items-center justify-center rounded-[20px]"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399' }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="5.5" width="15" height="13" rx="2.5" /><polygon points="22.5 7.5 16.5 12 22.5 16.5 22.5 7.5" />
        </svg>
      </div>
      <p className="text-[15px] font-semibold text-slate-100">هنوز چیزی ساخته نشده</p>
      <p className="max-w-[280px] text-[13.5px] leading-relaxed" style={{ color: '#64748b' }}>
        ایده‌ی ویدیوت رو برای دستیار بنویس تا کاراکتر و استوری‌بردش رو باهم بسازیم
      </p>
    </div>
  )
}

export function CharacterGrid({
  options,
  onSelect,
  selecting,
  compact,
}: {
  options: StudioCharacterOption[]
  onSelect: (optionId: string) => void
  selecting: boolean
  compact?: boolean
}) {
  // فقط جدیدترین دسته را نشان بده — «بازطراحی کن» دسته‌ی تازه اضافه می‌کند ولی دسته‌های قدیمی
  // در آرایه می‌مانند (طبق توضیح بک‌اند)؛ createdAt جدیدترین batch را مشخص می‌کند
  const latestBatchAt = options.reduce((max, o) => (o.createdAt > max ? o.createdAt : max), options[0]?.createdAt ?? '')
  const latest = options.filter(o => o.createdAt === latestBatchAt)
  return (
    <div className={clsx('grid grid-cols-2 gap-3', compact ? 'gap-2.5' : 'sm:gap-4')}>
      {latest.map((opt, i) => (
        <div
          key={opt.id}
          className="group relative aspect-square overflow-hidden rounded-2xl"
          style={{ border: opt.selected ? '2px solid #10b981' : '1px solid rgba(148,163,184,0.22)' }}
        >
          <StudioImage imgKey={opt.imageKey} className="size-full object-cover" alt={`طرح کاراکتر ${i + 1}`} />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1.5 p-2" style={{ background: 'linear-gradient(0deg, rgba(2,4,10,0.85), transparent)' }}>
            <span className="text-[10.5px] font-semibold text-slate-200">طرح {i + 1}</span>
            {opt.selected ? (
              <span className="rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-[#02170f]">انتخاب‌شده</span>
            ) : (
              <button
                type="button"
                disabled={selecting}
                onClick={() => onSelect(opt.id)}
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white disabled:opacity-50"
                style={{ background: 'rgba(16,185,129,0.85)' }}
              >
                انتخاب
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ShotStatusBadge({ status }: { status: StudioShot['videoStatus'] }) {
  const map: Record<StudioShot['videoStatus'], { text: string; bg: string; color: string }> = {
    NOT_STARTED: { text: '', bg: '', color: '' },
    PENDING: { text: 'در صف', bg: 'rgba(251,191,36,0.85)', color: '#1c1305' },
    PROCESSING: { text: 'در حال تولید...', bg: 'rgba(56,189,248,0.85)', color: '#03202e' },
    SUCCEEDED: { text: 'آماده', bg: 'rgba(16,185,129,0.9)', color: '#02170f' },
    FAILED: { text: 'خطا', bg: 'rgba(248,113,113,0.9)', color: '#2b0505' },
  }
  const info = map[status]
  if (!info.text) return null
  return (
    <span
      className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
      style={{ background: info.bg, color: info.color }}
    >
      {(status === 'PENDING' || status === 'PROCESSING') && (
        <span className="size-1.5 animate-pulse rounded-full" style={{ background: info.color }} />
      )}
      {info.text}
    </span>
  )
}

function ShotCard({
  projectId,
  shot,
  stage,
  compact,
  onOpenPlayer,
}: {
  projectId: string
  shot: StudioShot
  stage: VideoStudioStage
  compact?: boolean
  onOpenPlayer: (videoKey: string, previewImageKey: string | null) => void
}) {
  const qc = useQueryClient()
  const updateShot = useUpdateShot(projectId)
  const requestVideo = useRequestShotVideo(projectId)
  const [editing, setEditing] = useState(false)
  const [draftScenario, setDraftScenario] = useState(shot.scenario)

  const shouldPoll = shot.videoStatus === 'PENDING' || shot.videoStatus === 'PROCESSING'
  const { data: polled } = useShotVideoStatus(projectId, shot.id, shouldPoll)
  const effectiveStatus = polled?.videoStatus ?? shot.videoStatus

  useEffect(() => {
    if (polled && (polled.videoStatus === 'SUCCEEDED' || polled.videoStatus === 'FAILED')) {
      void qc.invalidateQueries({ queryKey: keys.videoStudio.detail(projectId) })
    }
  }, [polled, projectId, qc])

  function saveScenario() {
    if (draftScenario.trim() && draftScenario !== shot.scenario) {
      updateShot.mutate({ shotId: shot.id, scenario: draftScenario.trim() })
    }
    setEditing(false)
  }

  return (
    <div
      className={clsx('relative shrink-0 overflow-hidden rounded-2xl', compact ? 'w-[220px]' : 'w-full')}
      style={{ border: '1px solid rgba(148,163,184,0.2)' }}
    >
      <div className="relative aspect-video w-full bg-slate-800/60">
        {effectiveStatus === 'SUCCEEDED' && shot.videoKey ? (
          <button type="button" className="absolute inset-0" onClick={() => onOpenPlayer(shot.videoKey!, shot.previewImageKey)}>
            {shot.previewImageKey && <StudioImage imgKey={shot.previewImageKey} className="size-full object-cover" alt={shot.title} />}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#02170f]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>
          </button>
        ) : shot.previewImageKey ? (
          <StudioImage imgKey={shot.previewImageKey} className="size-full object-cover" alt={shot.title} />
        ) : (
          <div className="flex size-full items-center justify-center text-[11px] text-slate-500">بدون پیش‌نمایش</div>
        )}
        {(effectiveStatus === 'PENDING' || effectiveStatus === 'PROCESSING') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 backdrop-blur-[1px]">
            <div className="size-7 animate-spin rounded-full border-2 border-slate-300/30" style={{ borderTopColor: '#38bdf8' }} />
            <span className="text-[11px] font-semibold text-slate-100">
              {effectiveStatus === 'PENDING' ? 'در صف تولید...' : 'در حال تولید ویدیو...'}
            </span>
          </div>
        )}
        <ShotStatusBadge status={effectiveStatus} />
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-slate-100" style={{ display: effectiveStatus === 'NOT_STARTED' ? 'block' : 'none' }}>
          صحنه {shot.order}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[12px] font-bold text-slate-100">{shot.title || `صحنه ${shot.order}`}</span>
          {stage === 'storyboard' && (
            <button type="button" onClick={() => setEditing(e => !e)} className="shrink-0 text-slate-400 hover:text-slate-200" aria-label="ویرایش صحنه">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={draftScenario}
              onChange={e => setDraftScenario(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg bg-black/30 p-2 text-[11.5px] leading-relaxed text-slate-200 focus:outline-none"
              style={{ border: '1px solid rgba(148,163,184,0.25)' }}
            />
            <div className="flex gap-1.5">
              <button type="button" onClick={saveScenario} className="flex-1 rounded-full bg-emerald-500 py-1.5 text-[11px] font-bold text-[#02170f]">ذخیره</button>
              <button type="button" onClick={() => { setEditing(false); setDraftScenario(shot.scenario) }} className="flex-1 rounded-full text-[11px] font-semibold text-slate-300" style={{ background: 'rgba(255,255,255,0.06)' }}>انصراف</button>
            </div>
          </div>
        ) : (
          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400">{shot.scenario}</p>
        )}

        {stage === 'storyboard' && !editing && (
          <button
            type="button"
            disabled={requestVideo.isPending}
            onClick={() => requestVideo.mutate(shot.id)}
            className="mt-1 rounded-full py-1.5 text-[11.5px] font-bold text-[#02170f] disabled:opacity-60"
            style={{ background: '#10b981' }}
          >
            {requestVideo.isPending ? 'در حال ارسال...' : 'ساخت ویدیوی این صحنه'}
          </button>
        )}

        {effectiveStatus === 'FAILED' && (
          <button
            type="button"
            disabled={requestVideo.isPending}
            onClick={() => requestVideo.mutate(shot.id)}
            className="mt-1 rounded-full py-1.5 text-[11.5px] font-bold text-red-100 disabled:opacity-60"
            style={{ background: 'rgba(248,113,113,0.25)', border: '1px solid rgba(248,113,113,0.4)' }}
          >
            تلاش دوباره
          </button>
        )}
      </div>
    </div>
  )
}

export function ShotGrid({
  projectId,
  shots,
  stage,
  compact,
  onOpenPlayer,
}: {
  projectId: string
  shots: StudioShot[]
  stage: VideoStudioStage
  compact?: boolean
  onOpenPlayer: (videoKey: string, previewImageKey: string | null) => void
}) {
  const sorted = [...shots].sort((a, b) => a.order - b.order)
  return (
    <div className={compact ? 'flex gap-3 overflow-x-auto pb-1' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
      {sorted.map(shot => (
        <ShotCard key={shot.id} projectId={projectId} shot={shot} stage={stage} compact={compact} onOpenPlayer={onOpenPlayer} />
      ))}
    </div>
  )
}

export function ResultActionBar({ shots }: { shots: StudioShot[] }) {
  const [downloading, setDownloading] = useState(false)
  const readyShots = shots.filter(s => s.videoStatus === 'SUCCEEDED' && s.videoKey)

  // طبق PRD صریحاً: هیچ ادغام خودکار پشت‌صحنه‌ای برای «تدوین یکجا» وجود ندارد — این دکمه فقط
  // دانلود پشت‌سرهم تک‌تک کلیپ‌ها را تریگر می‌کند، نه ساخت یک فایل ویدیوی واحد
  async function downloadAllSequentially() {
    setDownloading(true)
    try {
      for (const shot of readyShots) {
        const res = await api.get(assetSrc(shot.videoKey!), { responseType: 'blob' })
        const url = URL.createObjectURL(res.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${shot.title || `scene-${shot.order}`}.mp4`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        // فاصله‌ی کوتاه بین دانلودها تا مرورگر همه را یکجا بلاک نکند
        await new Promise(r => setTimeout(r, 400))
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)' }}
    >
      <div className="text-[12.5px] leading-relaxed" style={{ color: '#a7f3d0' }}>
        هر صحنه یک فایل ویدیوی جدا است — «تدوین یکجا» فعلاً همه‌ی کلیپ‌ها را پشت‌سرهم دانلود می‌کند، نه ادغام خودکار در یک فایل.
      </div>
      <button
        type="button"
        disabled={downloading || readyShots.length === 0}
        onClick={() => void downloadAllSequentially()}
        className="shrink-0 rounded-full px-5 py-2.5 text-[12.5px] font-bold text-[#02170f] disabled:opacity-50"
        style={{ background: '#10b981' }}
      >
        {downloading ? 'در حال دانلود...' : `تدوین یکجا (دانلود ${readyShots.length} کلیپ)`}
      </button>
    </div>
  )
}
