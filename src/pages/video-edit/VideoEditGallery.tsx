import { useState } from 'react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import type { VideoEditJob } from '@/types/api'

// docs/PRD-video-edit-omni-kie.md بخش ۸.۳ — گالری دقیقاً الگوی ShotCard/ShotGrid موجود
// (VideoStudioGallery.tsx): فریم/پخش‌کننده، بج وضعیت، overlay پردازش. با ارسال هر فرم یک
// کارت جدید بلافاصله بالای گرید با وضعیت PROCESSING اضافه می‌شود (نه یک ناحیه‌ی نتیجه‌ی جدا).

function assetSrc(key: string) {
  return `/video-edit/assets/${key}`
}

const STATUS_BADGE: Record<VideoEditJob['status'], { text: string; bg: string; color: string }> = {
  PENDING: { text: 'در صف', bg: 'rgba(251,191,36,0.85)', color: '#1c1305' },
  PROCESSING: { text: 'در حال پردازش...', bg: 'rgba(56,189,248,0.85)', color: '#03202e' },
  SUCCEEDED: { text: 'آماده', bg: 'rgba(16,185,129,0.9)', color: '#02170f' },
  FAILED: { text: 'خطا', bg: 'rgba(248,113,113,0.9)', color: '#2b0505' },
}

function ModeBadge({ mode }: { mode: VideoEditJob['mode'] }) {
  const isEdit = mode === 'EDIT'
  return (
    <span
      className="absolute right-2 top-2 rounded-full px-2 py-1 text-[9.5px] font-bold"
      style={{ background: isEdit ? 'rgba(244,63,94,0.92)' : 'rgba(16,185,129,0.9)', color: isEdit ? '#2b0410' : '#02170f' }}
    >
      {isEdit ? 'ادیت' : 'تولید'}
    </span>
  )
}

async function downloadResult(key: string, filename: string) {
  const res = await api.get(assetSrc(key), { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function JobCard({ job }: { job: VideoEditJob }) {
  const [playing, setPlaying] = useState(false)
  const videoUrl = useAuthedImageUrl(job.resultVideoKey ? assetSrc(job.resultVideoKey) : '')
  const badge = STATUS_BADGE[job.status]
  const isBusy = job.status === 'PENDING' || job.status === 'PROCESSING'

  return (
    <div className="overflow-hidden rounded-[18px]" style={{ border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.02)' }}>
      <div className="relative aspect-video bg-[#0b1220]">
        {job.status === 'SUCCEEDED' && videoUrl ? (
          playing ? (
            <video src={videoUrl} controls autoPlay playsInline className="size-full object-cover" />
          ) : (
            <button type="button" className="absolute inset-0 flex items-center justify-center bg-black/25" onClick={() => setPlaying(true)}>
              <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#02170f]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          )
        ) : (
          <div className={clsx('flex size-full flex-col items-center justify-center gap-2', isBusy && 'bg-black/40')}>
            {isBusy && <div className="size-7 animate-spin rounded-full border-2 border-slate-300/30" style={{ borderTopColor: '#38bdf8' }} />}
            {job.status === 'FAILED' && (
              <span className="px-4 text-center text-[11px] text-red-300">{job.errorMessage ?? 'پردازش ناموفق بود'}</span>
            )}
          </div>
        )}
        <ModeBadge mode={job.mode} />
        <span className="absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold text-slate-100" style={{ background: badge.bg, color: badge.color }}>
          {badge.text}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold text-slate-100">{job.prompt}</p>
          <p className="text-[10.5px]" style={{ color: '#64748b' }}>
            {job.mode === 'EDIT' ? 'ادیت ویدیو' : 'تولید ویدیو'}
            {job.aspectRatio ? ` · ${job.aspectRatio}` : ''}
          </p>
        </div>
        {job.status === 'SUCCEEDED' && job.resultVideoKey && (
          <button
            type="button"
            onClick={() => void downloadResult(job.resultVideoKey!, `video-edit-${job.id}.mp4`)}
            aria-label="دانلود"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function VideoEditGallery({ jobs }: { jobs: VideoEditJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3.5 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-[20px]" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#34d399' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.5" y="5.5" width="15" height="13" rx="2.5" /><polygon points="22.5 7.5 16.5 12 22.5 16.5 22.5 7.5" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-slate-100">هنوز ویدیویی نساخته/ویرایش نکردی</p>
        <p className="max-w-[280px] text-[13.5px] leading-relaxed" style={{ color: '#64748b' }}>
          از پنل «تولید یا ادیت» شروع کن — نتیجه همین‌جا ظاهر می‌شود
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
