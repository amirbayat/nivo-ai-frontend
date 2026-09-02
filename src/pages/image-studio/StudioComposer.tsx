import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { resizeImage } from '@/components/chat/MessageInput'

// پنل کنترل استودیوی عکس — پیکسل‌به‌پیکسل مطابق آرتبورد ImageStudioWorkspace.dc.html در
// دیزاین‌کنوس (docs/PRD-openrouter-migration.md §۱۳-۱۴). عمداً یک کامپوننت جدا از
// MessageInput.tsx است، نه یک حالت/variant داخل آن — چیدمانش (textarea بدون قاب + ردیف دکمه‌ها
// زیرش با یک خط جداکننده + دکمه‌ی تمام‌عرض «ساخت عکس») آنقدر با نوار فشرده‌ی چت فرق دارد که
// شاخه‌زدن داخل همان کامپوننت باعث می‌شد چت معمولی هم ریسک رگرسیون بگیرد. فقط resizeImage
// (تغییر اندازه‌ی عکس مرجع) از آنجا export و بازاستفاده شده، نه کل منطق.
export function StudioComposer({ onSend, disabled, sending }: {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  disabled?: boolean
  sending?: boolean
}) {
  const navigate = useNavigate()
  const { data: flags } = useFeatureFlags()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024

  const { data: catalog } = useModelCatalog()
  const selectedImageGenModel = useChatStore(s => s.selectedImageGenModel)
  const imageGenModels = useMemo(() => (catalog ?? []).filter(m => m.supportsImageGen), [catalog])
  const pinnedModel = imageGenModels.find(m => m.name === selectedImageGenModel)
  const modelLabel = pinnedModel?.displayName ?? 'GPT Image 2'

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [preserveFace, setPreserveFace] = useState(true)
  const [outputCount, setOutputCount] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()

  const canSend = (value.trim() || images.length > 0) && !disabled && !sending

  const submit = () => {
    if (!canSend) return
    // n>1 هنوز سمت بک‌اند پشتیبانی نمی‌شود (docs/EXECUTION-PLAN.md، سوال باز) — فعلاً فقط ۱
    // خروجی واقعی ارسال می‌شود، گزینه‌های ۲/۳/۴ در UI غیرفعال‌اند (پایین‌تر)
    onSend(value.trim(), images.length ? images : undefined, pinnedModel?.name, preserveFace)
    setValue('')
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault()
      submit()
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = MAX_IMAGES - images.length
    const toProcess = Array.from(files).slice(0, remaining)
    const results: string[] = []
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_SIZE_BYTES) continue
      try {
        results.push(await resizeImage(file))
      } catch { /* skip */ }
    }
    setImages(prev => [...prev, ...results].slice(0, MAX_IMAGES))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      {/* چیپ مدل */}
      <button
        onClick={() => navigate('/models')}
        className="flex items-center gap-2.5 self-start rounded-full px-3.5 py-2 text-[13px]"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.24)', color: '#d1fae5' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15.5l-5.2-5.2-9.3 9.3" />
        </svg>
        <span className="font-semibold">{modelLabel}</span>
        <span style={{ width: 1, height: 12, background: 'rgba(148,163,184,0.3)' }} />
        <span className="flex items-center gap-1" style={{ color: '#94a3b8' }}>
          تغییر مدل
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </span>
      </button>

      {/* جعبه‌ی اصلی */}
      <div
        className="flex flex-1 flex-col rounded-[20px] p-[18px]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(16,185,129,0.28)',
          boxShadow: '0 0 40px rgba(16,185,129,0.06)',
        }}
      >
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {images.map((src, idx) => (
              <div key={idx} className="group relative">
                <img src={src} className="size-14 rounded-xl border border-slate-600 object-cover" alt={`عکس مرجع ${idx + 1}`} />
                <button
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs leading-none text-slate-300 hover:text-white"
                  aria-label="حذف عکس مرجع"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="عکسی که می‌خوای بسازی رو توصیف کن..."
          rows={3}
          className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />

        {images.length > 0 && (
          <label className="mt-1 mb-2 flex items-center gap-2 text-xs text-slate-300">
            <button
              type="button"
              role="switch"
              aria-checked={preserveFace}
              onClick={() => setPreserveFace(v => !v)}
              className={clsx(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                preserveFace ? 'bg-emerald-500' : 'bg-slate-600',
              )}
              style={{ direction: 'ltr' }}
            >
              <span className={clsx('inline-block size-3.5 rounded-full bg-white transition-transform', preserveFace ? 'translate-x-[18px]' : 'translate-x-[3px]')} />
            </button>
            <span>حفظ چهره</span>
          </label>
        )}

        <div className="mt-4 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: 'rgba(148,163,184,0.14)' }}>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled || images.length >= MAX_IMAGES}
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold text-slate-100 disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.25)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              افزودن عکس
            </button>
            <Link
              to="/discover"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold text-slate-100"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.25)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
              </svg>
              پرامپت آماده
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[12.5px]" style={{ color: '#64748b' }}>تعداد خروجی</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  disabled={n !== 1}
                  title={n !== 1 ? 'چند خروجی هم‌زمان به‌زودی' : undefined}
                  onClick={() => setOutputCount(n)}
                  className={clsx(
                    'flex size-7 items-center justify-center rounded-[9px] text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                    outputCount === n ? 'bg-emerald-500 text-[#02170f]' : 'text-slate-500',
                  )}
                  style={outputCount === n ? undefined : { border: '1px solid rgba(148,163,184,0.2)' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!canSend}
            className="rounded-full py-3.5 text-[15px] font-bold transition-all"
            style={
              canSend
                ? { background: '#10b981', color: '#02170f', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }
                : { background: 'rgba(16,185,129,0.35)', color: 'rgba(2,23,15,0.6)' }
            }
          >
            ساخت عکس
          </button>
        </div>
      </div>

      <p className="text-center text-[12px]" style={{ color: '#64748b' }}>
        حداکثر {MAX_IMAGES} عکس مرجع در هر درخواست
      </p>
    </div>
  )
}
