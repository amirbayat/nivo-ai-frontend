import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { resizeImage } from '@/components/chat/MessageInput'
import { useModelCatalog } from '@/queries/plans.queries'
import { useGenerateSimpleVideo, useUploadVideoStudioImage } from '@/queries/videoStudio.queries'
import type { StudioAspectRatio } from '@/types/api'
import { AspectRatioSegmented, ModelDropdownChip } from './ModelPickers'
import { MediaPickerModal } from './MediaPickerModal'

// فاز اول ساده‌شده‌ی استودیوی ویدیو (دستور صریح کاربر ۱۴۰۵-۰۶-۱۳): به‌جای چت آزاد و تشخیص
// intent (که با خطای provider ناپایدار بود)، یک فرم قطعی — متن + عکس اختیاری + مدل + سایز →
// مستقیم یک ویدیو. جایگزین نقطه‌ی ورود پیش‌فرض صفحه‌ی /video؛ فلوی چت‌محور قدیمی (پروژه‌ی از‌قبل
// باز، /video/:id) دست‌نخورده می‌ماند.
export function SimpleVideoForm({ onCreated }: { onCreated: (projectId: string) => void }) {
  const { data: catalog } = useModelCatalog()
  const videoModels = (catalog ?? []).filter(m => m.modelType === 'VIDEO_GEN')

  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [videoModelId, setVideoModelId] = useState<string | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<StudioAspectRatio>('16:9')
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadImage = useUploadVideoStudioImage()
  const generate = useGenerateSimpleVideo()
  const busy = uploadImage.isPending || generate.isPending

  const selectedModelName = videoModelId ?? videoModels[0]?.name ?? null
  const selectedModel = videoModels.find(m => m.name === selectedModelName)
  const supportedDurations = selectedModel?.videoGenSupportedDurationsSec ?? []

  // وقتی مدل عوض می‌شود، اگر طول مدت انتخاب‌شده‌ی قبلی دیگر جزو گزینه‌های مدل تازه نباشد
  // (یا هنوز چیزی انتخاب نشده)، به اولین مقدار پشتیبانی‌شده‌ی همین مدل برمی‌گردیم — دقیقاً
  // همان رفتار قبلی سرور (fallback به [0]) وقتی کاربر خودش چیزی مشخص نکرده
  useEffect(() => {
    if (supportedDurations.length && (videoDurationSec === null || !supportedDurations.includes(videoDurationSec))) {
      setVideoDurationSec(supportedDurations[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelName])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    try {
      setImage(await resizeImage(file))
      setError(null)
    } catch {
      setError('پردازش عکس ناموفق بود')
    }
  }

  async function submit() {
    if (!prompt.trim() || !selectedModelName || busy) return
    setError(null)
    let imageKey: string | undefined
    if (image) {
      try {
        imageKey = (await uploadImage.mutateAsync(image)).key
      } catch {
        setError('آپلود عکس ناموفق بود، دوباره امتحان کن')
        return
      }
    }
    try {
      const result = await generate.mutateAsync({
        prompt: prompt.trim(),
        imageKey,
        videoModelId: selectedModelName,
        videoAspectRatio,
        ...(videoDurationSec != null ? { videoDurationSec } : {}),
      })
      onCreated(result.projectId)
    } catch {
      setError('ساخت ویدیو ناموفق بود، دوباره امتحان کن')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-5 px-5 py-8 sm:px-0">
      <div className="text-center">
        <p className="text-[17px] font-bold text-white">ساخت ویدیو</p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#64748b' }}>
          ایده‌ی ویدیوت رو بنویس، اگه خواستی یه عکس هم اضافه کن، مدل و سایز رو انتخاب کن و بساز
        </p>
      </div>

      <div
        className="flex flex-col gap-4 rounded-[28px] p-5"
        style={{
          background: 'linear-gradient(165deg, rgba(16,185,129,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
          border: '1.5px solid rgba(16,185,129,0.30)',
        }}
      >
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="مثلاً: یک پسر بچه در حال دویدن توی جنگل، نور غروب..."
          className="w-full resize-none rounded-2xl bg-black/20 p-3.5 text-[14.5px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ border: '1px solid rgba(148,163,184,0.2)' }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        {image ? (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img src={image} className="size-14 rounded-xl border object-cover" style={{ borderColor: 'rgba(16,185,129,0.35)' }} alt="عکس مرجع" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border text-xs leading-none text-slate-300"
                style={{ background: '#0f172a', borderColor: 'rgba(148,163,184,0.3)' }}
                aria-label="حذف عکس مرجع"
              >
                ×
              </button>
            </div>
            <span className="text-[12px] text-slate-400">این عکس به‌عنوان مرجع تصویری ویدیو استفاده می‌شود</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-slate-400"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              افزودن عکس (اختیاری)
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-slate-400"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              انتخاب از تولیدات قبلی
            </button>
          </div>
        )}
        {pickerOpen && (
          <MediaPickerModal
            onClose={() => setPickerOpen(false)}
            onSelect={dataUrl => {
              setImage(dataUrl)
              setPickerOpen(false)
            }}
          />
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <ModelDropdownChip
            label="مدل ویدیو"
            models={videoModels}
            selectedName={selectedModelName}
            onSelect={setVideoModelId}
          />
          <AspectRatioSegmented value={videoAspectRatio} onChange={setVideoAspectRatio} size="sm" />
          {supportedDurations.length > 1 && (
            <div className="flex items-center gap-1 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)' }}>
              {supportedDurations.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setVideoDurationSec(sec)}
                  className={clsx(
                    'rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                    videoDurationSec === sec ? 'bg-emerald-500 text-[#02170f]' : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!prompt.trim() || !selectedModelName || busy}
          className="w-full rounded-full py-3.5 text-[15px] font-bold text-[#02170f] transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg,#10b981,#34d399)' }}
        >
          {busy ? 'در حال ساخت...' : 'ساخت ویدیو'}
        </button>
      </div>
    </div>
  )
}
