import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { clsx } from 'clsx'
import {
  useCreateVideoEditJob,
  useUploadVideoEditImage,
  useUploadVideoEditVideo,
  useVideoEditPublicConfig,
} from '@/queries/videoEdit.queries'
import type { KieVideoModel } from '@/types/api'

// docs/PRD-video-edit-omni-kie.md بخش ۲ — GENERATE و EDIT یک endpoint واحد Kie می‌زنند، ولی
// دو فرم کاملاً جدا هستند (نه فیلدهای شرطی در یک فرم مشترک) چون قرارداد ورودی بنیادین فرق
// دارد: GENERATE پرامپت+عکس/ویدیوی مرجع اختیاری می‌گیرد، EDIT فقط دقیقاً یک ویدیو+پرامپت.
// طراحی/زبان بصری دقیقاً از آرتیفکت طراحی‌شده (کارت‌های گرد گرادیانی سبز/بنفش، دکمه‌ی گرادیانی).

const ASPECT_RATIOS = ['16:9', '9:16'] as const

// پیام واقعی بک‌اند (مثلاً «برای این کار ۵۶,۷۰۰ تومان لازم است...») را نشان می‌دهد، نه یک
// متن ثابت — بک‌اند برای خطاهای ساختاریافته {message, code, ...} برمی‌گرداند (دقیقاً همون
// الگوی extractErrorMessage در PromptExtractionCard.tsx/NivoCalPage.tsx)
function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

function fmtDur(sec: number) {
  const s = Math.round(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-bold" style={{ color: '#cbd5e1' }}>{children}</div>
}

function Caveat({ tone = 'warn', children }: { tone?: 'warn' | 'ok' | 'err'; children: React.ReactNode }) {
  const palette = {
    warn: { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)', color: '#fcd34d' },
    ok: { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.28)', color: '#6ee7b7' },
    err: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.35)', color: '#fca5a5' },
  }[tone]
  return (
    <div
      className="rounded-2xl px-3 py-2.5 text-[11.5px] leading-relaxed"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color }}
    >
      {children}
    </div>
  )
}

function DropWell({
  wide,
  accent,
  label,
  hint,
  preview,
  onPick,
  onClear,
  accept,
}: {
  wide?: boolean
  accent: 'emerald' | 'rose'
  label: string
  hint: string
  preview: { kind: 'image' | 'video'; src: string; sizeLabel: string } | null
  onPick: (file: File) => void
  onClear: () => void
  accept: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const tint = accent === 'emerald' ? '#34d399' : '#fb7185'
  const tintBg = accent === 'emerald' ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'

  if (preview) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ minHeight: wide ? 160 : 108, border: `1.5px solid ${accent === 'emerald' ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.4)'}` }}
      >
        {preview.kind === 'image' ? (
          <img src={preview.src} alt="پیش‌نمایش" className="size-full object-cover" style={{ minHeight: wide ? 160 : 108 }} />
        ) : (
          <video src={preview.src} muted playsInline className="size-full object-cover" style={{ minHeight: wide ? 160 : 108 }} />
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label="حذف"
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full text-[13px] text-white"
          style={{ background: 'rgba(2,4,10,0.75)' }}
        >
          ×
        </button>
        <span
          className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-50"
          style={{ background: 'rgba(2,4,10,0.55)' }}
        >
          {preview.sizeLabel}
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center"
      style={{ minHeight: wide ? 160 : 108, border: '1.5px dashed rgba(148,163,184,0.20)', background: 'rgba(0,0,0,0.20)' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      <div className="flex size-8 items-center justify-center rounded-[10px]" style={{ background: tintBg, color: tint }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <span className="text-[11.5px] font-bold" style={{ color: '#cbd5e1' }}>{label}</span>
      <span className="text-[10.5px]" style={{ color: '#64748b' }}>{hint}</span>
    </div>
  )
}

function RatioSegmented({ value, onChange }: { value: '16:9' | '9:16'; onChange: (v: '16:9' | '9:16') => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}>
      {ASPECT_RATIOS.map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={clsx('rounded-full px-2.5 py-1.5 text-[11.5px] font-bold', value === r ? 'text-[#02170f]' : '')}
          style={{ background: value === r ? '#10b981' : 'transparent', color: value === r ? '#02170f' : '#94a3b8' }}
        >
          {r === '16:9' ? '۱۶:۹' : '۹:۱۶'}
        </button>
      ))}
    </div>
  )
}

// وقتی مدل فقط یک رزولوشن دارد (اکثر مدل‌های Kie) یک FixedChip ساده کافی‌ست؛ وقتی چندتا دارد
// (اکثر مدل‌های OpenRouter، مثلاً Seedance 2.0: 480p/720p/1080p/4K) کاربر واقعاً انتخاب می‌کند
function ResolutionPicker({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  if (options.length <= 1) return <FixedChip>{options[0] ?? '720p'}</FixedChip>
  return (
    <div className="flex items-center gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}>
      {options.map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={clsx('rounded-full px-2.5 py-1.5 text-[11.5px] font-bold', value === r ? 'text-[#02170f]' : '')}
          style={{ background: value === r ? '#10b981' : 'transparent', color: value === r ? '#02170f' : '#94a3b8' }}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

function FixedChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)', color: '#94a3b8' }}
    >
      {icon}
      {children}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function GenerateVideoForm({ model, onCreated }: { model: KieVideoModel; onCreated: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<{ file: File; previewUrl: string; key?: string } | null>(null)
  const [video, setVideo] = useState<{ file: File; previewUrl: string; key?: string } | null>(null)
  const [ratio, setRatio] = useState<'16:9' | '9:16'>('16:9')
  const [resolution, setResolution] = useState(model.resolutions[0] ?? '720p')
  const [error, setError] = useState<string | null>(null)

  const { data: publicConfig } = useVideoEditPublicConfig()
  const uploadImage = useUploadVideoEditImage()
  const uploadVideo = useUploadVideoEditVideo()
  const createJob = useCreateVideoEditJob()
  const busy = uploadImage.isPending || uploadVideo.isPending || createJob.isPending

  // اگه کاربر از انتخابگر مدل (VideoEditPage.tsx) به مدلی با رزولوشن‌های متفاوت سوییچ کند، مقدار
  // قبلی ممکن است دیگر جزو model.resolutions نباشد — سرور آن را رد می‌کند، پس اینجا ریست می‌شود
  useEffect(() => {
    setResolution(model.resolutions[0] ?? '720p')
  }, [model.id])

  async function submit() {
    if (!prompt.trim() || busy) return
    setError(null)
    try {
      let referenceImageKeys: string[] | undefined
      let videoKey: string | undefined
      if (image) referenceImageKeys = [(await uploadImage.mutateAsync(image.file)).key]
      if (video) videoKey = (await uploadVideo.mutateAsync({ file: video.file })).key

      await createJob.mutateAsync({
        mode: 'GENERATE',
        kieVideoModelId: model.id,
        prompt: prompt.trim(),
        referenceImageKeys,
        videoKey,
        videoWindowStartSec: video ? 0 : undefined,
        videoWindowEndSec: video ? Math.min(3, model.maxVideoWindowSec ?? 3) : undefined,
        aspectRatio: ratio,
        resolution,
      })
      setPrompt('')
      setImage(null)
      setVideo(null)
      onCreated()
    } catch (err) {
      setError(extractErrorMessage(err, 'ساخت ویدیو ناموفق بود، دوباره امتحان کن'))
    }
  }

  return (
    <div
      className="flex flex-col gap-3.5 rounded-[24px] p-[18px]"
      style={{
        background: 'linear-gradient(165deg, rgba(16,185,129,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
        border: '1.5px solid rgba(16,185,129,0.30)',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel>پرامپت</FieldLabel>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="مثلاً: یه فضانورد که کنار یه دریاچه‌ی نئونی قدم می‌زنه، سینمایی و آروم"
          className="w-full resize-none rounded-2xl p-3.5 text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
        />
      </div>

      {(model.supportsImages || model.supportsVideo) && (
        <div className="grid grid-cols-2 gap-2.5">
          {model.supportsImages && (
            <DropWell
              accent="emerald"
              accept="image/*"
              label="افزودن عکس (اختیاری)"
              hint="سوژه/سبک از این عکس"
              preview={image ? { kind: 'image', src: image.previewUrl, sizeLabel: `${Math.round(image.file.size / 1024)} KB` } : null}
              onPick={file => setImage({ file, previewUrl: URL.createObjectURL(file) })}
              onClear={() => setImage(null)}
            />
          )}
          {model.supportsVideo && (
            <DropWell
              accent="emerald"
              accept="video/mp4,video/quicktime"
              label="افزودن ویدیو (اختیاری)"
              hint="حرکت/سبک از این ویدیو"
              preview={video ? { kind: 'video', src: video.previewUrl, sizeLabel: `${Math.round(video.file.size / 1024)} KB` } : null}
              onPick={file => setVideo({ file, previewUrl: URL.createObjectURL(file) })}
              onClear={() => setVideo(null)}
            />
          )}
        </div>
      )}

      {video && model.maxVideoWindowSec && (
        <Caveat tone="warn">
          فقط <b>{model.maxVideoWindowSec} ثانیه‌ی اول</b> این ویدیو به‌عنوان مرجعِ حرکت/سبک استفاده می‌شه — یه ویدیوی
          <b> تازه</b> ساخته می‌شه، نه ویرایش این یکی. برای ویرایش خودِ ویدیو، از تب «ادیت» استفاده کن. همچنین وقتی
          ویدیوی مرجع می‌دی، مدت زمان خروجی رو نمی‌شه انتخاب کرد — از همون ویدیوی مرجع تبعیت می‌کنه.
        </Caveat>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {model.supportsAspectRatio && <RatioSegmented value={ratio} onChange={setRatio} />}
        {/* وقتی ویدیوی مرجع داده شده، مدت زمان خروجی از خودِ ویدیو تبعیت می‌کنه (نه مقدار ثابت
            تولید) — چه برای Kie (video_list باعث نادیده‌گرفتن duration می‌شه) چه برای OpenRouter
            (duration باید -1 فرستاده بشه، video-edit.processor.ts/buildOpenRouterInput) — پس
            نشون‌دادن مدت ثابت اینجا گمراه‌کننده‌ست */}
        {model.supportsDuration && !video && (
          <FixedChip icon={<ClockIcon />}>
            {publicConfig ? `${publicConfig.generateFixedDurationSec.toLocaleString('fa-IR')} ثانیه` : '…'}
          </FixedChip>
        )}
        <ResolutionPicker options={model.resolutions} value={resolution} onChange={setResolution} />
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!prompt.trim() || busy}
        className="w-full rounded-full py-3.5 text-[14.5px] font-bold text-[#02170f] transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#10b981,#34d399)' }}
      >
        {busy ? 'در حال ساخت...' : 'بساز ویدیو'}
      </button>
    </div>
  )
}

// تریمر دو-دستگیره‌ی کشیدنی — دقیقاً مثل تایم‌لاین برش ویدیوی اپ‌های ادیت (کل بازه‌ی فایل +
// یه بخش هایلایت‌شده‌ی قابل‌کشیدن). عمداً dir="ltr" است، مستقل از جهت RTL صفحه — یه تایم‌لاین
// همیشه زمان را همون جهت متعارف (چپ→راست) نشون می‌ده، دقیقاً مثل نوار پخش خودِ ویدیو.
function VideoWindowTrimmer({
  durationSec,
  maxWidth,
  value,
  onChange,
}: {
  durationSec: number
  maxWidth: number
  value: [number, number]
  onChange: (next: [number, number]) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragKind = useRef<'start' | 'end' | 'region' | null>(null)
  const dragOffsetSec = useRef(0)
  const [start, end] = value
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

  function secAtClientX(clientX: number): number {
    const el = trackRef.current
    if (!el || durationSec <= 0) return 0
    const rect = el.getBoundingClientRect()
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * durationSec
  }

  function onMove(e: React.PointerEvent) {
    if (!dragKind.current) return
    const sec = secAtClientX(e.clientX)
    if (dragKind.current === 'start') {
      const next = clamp(sec, Math.max(0, end - maxWidth), end - 1)
      onChange([next, end])
    } else if (dragKind.current === 'end') {
      const next = clamp(sec, start + 1, Math.min(durationSec, start + maxWidth))
      onChange([start, next])
    } else {
      const width = end - start
      const next = clamp(sec - dragOffsetSec.current, 0, durationSec - width)
      onChange([next, next + width])
    }
  }

  function beginDrag(kind: 'start' | 'end' | 'region') {
    return (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragKind.current = kind
      if (kind === 'region') dragOffsetSec.current = secAtClientX(e.clientX) - start
    }
  }

  function endDrag(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragKind.current = null
  }

  const startPct = durationSec > 0 ? (start / durationSec) * 100 : 0
  const endPct = durationSec > 0 ? (end / durationSec) * 100 : 0
  const atMaxWidth = end - start >= maxWidth - 0.05

  function applyPreset(preset: 'first' | 'middle' | 'last') {
    const width = Math.min(maxWidth, durationSec)
    if (preset === 'first') onChange([0, width])
    else if (preset === 'last') onChange([durationSec - width, durationSec])
    else {
      const mid = durationSec / 2
      onChange([clamp(mid - width / 2, 0, durationSec - width), clamp(mid + width / 2, width, durationSec)])
    }
  }

  return (
    <div className="flex flex-col gap-2.5" dir="ltr">
      <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: '#e2e8f0' }}>
        <span style={{ color: '#fb7185' }} className="tabular-nums">
          {fmtDur(start)} – {fmtDur(end)}
        </span>
        <span style={{ color: '#94a3b8' }}>{fmtDur(end - start)} از {fmtDur(durationSec)} انتخاب شده</span>
      </div>

      <div ref={trackRef} className="relative h-9 select-none" onPointerMove={onMove}>
        {/* ریل کامل ویدیو */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ background: 'rgba(148,163,184,0.20)' }} />
        {/* بازه‌ی انتخاب‌شده — خودش هم قابل‌کشیدنه (جابه‌جایی کل پنجره) */}
        <div
          onPointerDown={beginDrag('region')}
          onPointerUp={endDrag}
          className="absolute top-1/2 h-1.5 -translate-y-1/2 cursor-grab rounded-full active:cursor-grabbing"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%`, background: 'linear-gradient(90deg,#f43f5e,#fb7185)' }}
        />
        {/* دستگیره‌ی شروع */}
        <button
          type="button"
          aria-label="شروع بازه"
          onPointerDown={beginDrag('start')}
          onPointerUp={endDrag}
          className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 shadow"
          style={{ left: `${startPct}%`, background: '#fff', borderColor: '#fb7185' }}
        />
        {/* دستگیره‌ی پایان */}
        <button
          type="button"
          aria-label="پایان بازه"
          onPointerDown={beginDrag('end')}
          onPointerUp={endDrag}
          className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 shadow"
          style={{ left: `${endPct}%`, background: '#fff', borderColor: '#fb7185' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => applyPreset('first')} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            ابتدای ویدیو
          </button>
          <button type="button" onClick={() => applyPreset('middle')} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            وسط ویدیو
          </button>
          <button type="button" onClick={() => applyPreset('last')} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            انتهای ویدیو
          </button>
        </div>
        {atMaxWidth && <span className="text-[10px] font-bold" style={{ color: '#fbbf24' }}>حداکثر پهنای بازه ({maxWidth}ث)</span>}
      </div>
    </div>
  )
}

export function EditVideoForm({ model, onCreated }: { model: KieVideoModel; onCreated: () => void }) {
  const [prompt, setPrompt] = useState('')
  const [source, setSource] = useState<{ file: File; previewUrl: string; durationSec: number } | null>(null)
  const [windowRange, setWindowRange] = useState<[number, number]>([0, 8])
  const [resolution, setResolution] = useState(model.resolutions[0] ?? '720p')
  const [error, setError] = useState<string | null>(null)

  const uploadVideo = useUploadVideoEditVideo()
  const createJob = useCreateVideoEditJob()
  const busy = uploadVideo.isPending || createJob.isPending
  const maxWidth = model.maxVideoWindowSec ?? 10

  useEffect(() => {
    if (!source) return
    const end = Math.min(source.durationSec, maxWidth)
    setWindowRange([0, end])
  }, [source, maxWidth])

  useEffect(() => {
    setResolution(model.resolutions[0] ?? '720p')
  }, [model.id])

  async function pickFile(file: File) {
    setError(null)
    try {
      const { key, durationSec } = await uploadVideo.mutateAsync({ file })
      setSource({ file, previewUrl: URL.createObjectURL(file), durationSec })
      // کلید آپلودشده را روی همون فایل نگه می‌داریم تا submit دوباره آپلود نکند
      ;(file as unknown as { __uploadedKey?: string }).__uploadedKey = key
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود ویدیو ناموفق بود — فرمت باید mp4/mov باشد'))
    }
  }

  async function submit() {
    if (!prompt.trim() || !source || busy) return
    setError(null)
    const key = (source.file as unknown as { __uploadedKey?: string }).__uploadedKey
    if (!key) {
      setError('آپلود هنوز کامل نشده، کمی صبر کن')
      return
    }
    try {
      await createJob.mutateAsync({
        mode: 'EDIT',
        kieVideoModelId: model.id,
        prompt: prompt.trim(),
        videoKey: key,
        videoWindowStartSec: windowRange[0],
        videoWindowEndSec: windowRange[1],
        resolution,
      })
      setPrompt('')
      setSource(null)
      onCreated()
    } catch (err) {
      setError(extractErrorMessage(err, 'ویرایش ویدیو ناموفق بود، دوباره امتحان کن'))
    }
  }

  return (
    <div
      className="flex flex-col gap-3.5 rounded-[24px] p-[18px]"
      style={{
        background: 'linear-gradient(165deg, rgba(244,63,94,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
        border: '1.5px solid rgba(244,63,94,0.30)',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel>ویدیوی مبدأ</FieldLabel>
        <DropWell
          wide
          accent="rose"
          accept="video/mp4,video/quicktime"
          label={uploadVideo.isPending ? 'در حال آپلود...' : 'ویدیوت رو انتخاب کن'}
          hint={`حداکثر ${maxWidth} ثانیه از یک فایل تا ۳۰ ثانیه — mp4 یا mov`}
          preview={source ? { kind: 'video', src: source.previewUrl, sizeLabel: fmtDur(source.durationSec) } : null}
          onPick={file => void pickFile(file)}
          onClear={() => setSource(null)}
        />
      </div>

      {source && (
        <div className="flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(148,163,184,0.16)', borderRadius: 16, padding: '12px 14px' }}>
          <FieldLabel>کدوم بخش ویدیو ویرایش بشه؟</FieldLabel>
          <VideoWindowTrimmer durationSec={source.durationSec} maxWidth={maxWidth} value={windowRange} onChange={setWindowRange} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel>چی می‌خوای عوض بشه؟</FieldLabel>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          placeholder="مثلاً: پس‌زمینه رو به یه غروب پاییزی کنار دریا تغییر بده، بقیه رو دست‌نزن"
          className="w-full resize-none rounded-2xl p-3.5 text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
        />
      </div>

      <Caveat tone="ok">
        بقیه‌ی صحنه — حرکت دوربین، شخصیت، زمان‌بندی — دست‌نخورده می‌مونه؛ فقط همونی که تو پرامپت خواستی عوض می‌شه.
      </Caveat>

      <div className="flex flex-wrap items-center gap-2">
        <ResolutionPicker options={model.resolutions} value={resolution} onChange={setResolution} />
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!prompt.trim() || !source || busy}
        className="w-full rounded-full py-3.5 text-[14.5px] font-bold transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#f43f5e,#fb7185)', color: '#2b0410' }}
      >
        {busy ? 'در حال ویرایش...' : 'ویرایش کن'}
      </button>
    </div>
  )
}
