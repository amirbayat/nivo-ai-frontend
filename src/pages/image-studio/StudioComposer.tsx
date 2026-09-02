import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useUploadDiscoveryImage } from '@/queries/discovery.queries'
import { useChatStore } from '@/store/chat.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { resizeImage } from '@/components/chat/MessageInput'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem } from '@/types/api'

// پنل کنترل استودیوی عکس — پیکسل‌به‌پیکسل مطابق آرتبورد ImageStudioWorkspace.dc.html در
// دیزاین‌کنوس (docs/PRD-openrouter-migration.md §۱۳-۱۴). عمداً یک کامپوننت جدا از
// MessageInput.tsx است، نه یک حالت/variant داخل آن — چیدمانش (textarea بدون قاب + ردیف دکمه‌ها
// زیرش با یک خط جداکننده + دکمه‌ی تمام‌عرض «ساخت عکس») آنقدر با نوار فشرده‌ی چت فرق دارد که
// شاخه‌زدن داخل همان کامپوننت باعث می‌شد چت معمولی هم ریسک رگرسیون بگیرد. فقط resizeImage
// (تغییر اندازه‌ی عکس مرجع) از آنجا export و بازاستفاده شده، نه کل منطق.
export function StudioComposer({
  onSend,
  disabled,
  sending,
  selectedCreativePrompt,
  onClearCreativePrompt,
  onOpenPromptLibrary,
  onGenerateCreative,
  generatingCreative,
  creativeError,
  walletBalanceToman,
}: {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  disabled?: boolean
  sending?: boolean
  // وقتی یک سبک از کتابخانه‌ی پرامپت‌های آماده انتخاب شده باشد، composer به‌جای onSend معمولی
  // از مسیر generateCreative استفاده می‌کند — دقیقاً همان مکانیزمی که MessageInput.tsx برای چت دارد
  selectedCreativePrompt?: CreativePromptCatalogItem | null
  onClearCreativePrompt?: () => void
  onOpenPromptLibrary?: () => void
  onGenerateCreative?: (promptId: string, userInput: string, inputImageKeys?: string[], imagePreviews?: string[]) => void
  generatingCreative?: boolean
  creativeError?: string | null
  // موجودی کیف‌پول (فقط پلن Pay-as-you-go) — null یعنی پلن این کاربر اصلاً کیف‌پول تومانی ندارد
  walletBalanceToman?: number | null
}) {
  const navigate = useNavigate()
  const { data: flags } = useFeatureFlags()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024

  const { data: catalog } = useModelCatalog()
  const selectedImageGenModel = useChatStore(s => s.selectedImageGenModel)
  const imageGenModels = useMemo(() => (catalog ?? []).filter(m => m.supportsImageGen), [catalog])
  const pinnedModel = imageGenModels.find(m => m.name === selectedImageGenModel)
  // imageGenModels از همان ترتیب sortOrder سرور می‌آید — اولین مورد یعنی «دیفالت» واقعی
  // (یا مدل پیش‌فرض این پلن، اگر ادمین از صفحه‌ی پلن‌ها ستش کرده باشد)، نه یک نام هاردکد
  const modelLabel = pinnedModel?.displayName ?? imageGenModels[0]?.displayName ?? 'مدل پیش‌فرض'

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [preserveFace, setPreserveFace] = useState(true)
  const [outputCount, setOutputCount] = useState(1)
  const [isFocused, setIsFocused] = useState(false)
  const [creativeImageError, setCreativeImageError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()
  const uploadDiscoveryImage = useUploadDiscoveryImage()

  const canSend = selectedCreativePrompt
    ? !disabled && !sending && !generatingCreative && !uploadDiscoveryImage.isPending &&
      (!selectedCreativePrompt.requiresUserImage || images.length > 0)
    : (value.trim() || images.length > 0) && !disabled && !sending

  const submit = async () => {
    if (!canSend) return
    if (selectedCreativePrompt) {
      setCreativeImageError(null)
      try {
        // سبک‌های دیسکاوری کلید MinIO می‌خواهند (نه data URL خام) — قبل از generate آپلود می‌شوند
        const inputImageKeys = images.length
          ? await Promise.all(images.map(src => uploadDiscoveryImage.mutateAsync(src).then(r => r.key)))
          : undefined
        onGenerateCreative?.(selectedCreativePrompt.id, value.trim(), inputImageKeys, images.length ? images : undefined)
        setValue('')
        setImages([])
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      } catch {
        setCreativeImageError(fa.discover.uploadImageFailed)
      }
      return
    }
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
      void submit()
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
    <div className="flex h-full flex-1 flex-col gap-4 px-4 pb-4 sm:px-0">
      {walletBalanceToman !== null && walletBalanceToman !== undefined && (
        <div className="flex items-center justify-between gap-2 self-start rounded-full px-3.5 py-1.5 text-[12px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)', color: '#94a3b8' }}>
          <span>موجودی کیف‌پول:</span>
          <span className="font-semibold" dir="ltr" style={{ color: '#a7f3d0' }}>
            {walletBalanceToman.toLocaleString('fa-IR')} تومان
          </span>
        </div>
      )}

      {selectedCreativePrompt ? (
        /* چیپ سبک انتخاب‌شده — جایگزین چیپ مدل، چون مدل تولید این حالت خودکار/سرور-محور است */
        <div
          className="flex items-center justify-between gap-2.5 self-start rounded-full py-2 pr-3.5 pl-2 text-[13px]"
          style={{ background: 'rgba(217,70,239,0.08)', border: '1px solid rgba(217,70,239,0.28)', color: '#f5d0fe' }}
        >
          <span className="font-semibold">
            {fa.discover.selectedStyleLabel}: {selectedCreativePrompt.title}
          </span>
          <button
            onClick={onClearCreativePrompt}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-fuchsia-200/80 transition-colors hover:bg-fuchsia-500/20 hover:text-white"
            aria-label={fa.discover.exitStyleMode}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : (
        /* چیپ مدل */
        <button
          onClick={() => navigate('/models?context=image-studio')}
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
      )}

      {selectedCreativePrompt?.description && (
        <p className="-mt-2 text-[12.5px] leading-relaxed" style={{ color: '#94a3b8' }}>
          {selectedCreativePrompt.description}
        </p>
      )}

      {/* جعبه‌ی اصلی — عمداً بزرگ و پررنگ، چون کانون توجه اصلی این صفحه است. h-full/flex-1
          تضمین می‌کند این جعبه کل ارتفاع ستون کنترل را پر کند (مطابق دیزاین)، نه فقط به‌اندازه‌ی
          محتوای textarea */}
      <div
        className={clsx(
          'flex h-full flex-1 flex-col rounded-[26px] p-6 transition-shadow duration-300',
          isFocused ? 'shadow-[0_0_56px_rgba(16,185,129,0.16)]' : 'shadow-[0_0_40px_rgba(16,185,129,0.06)]',
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(16,185,129,0.05) 0%, rgba(255,255,255,0.025) 100%)',
          border: `1px solid ${isFocused ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.28)'}`,
        }}
      >
        {images.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2.5">
            {images.map((src, idx) => (
              <div key={idx} className="group relative">
                <img src={src} className="size-16 rounded-2xl border border-slate-600 object-cover" alt={`عکس مرجع ${idx + 1}`} />
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
          onChange={e => {
            setValue(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 280)}px`
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={
            selectedCreativePrompt
              ? fa.discover.inputPlaceholder
              : 'عکسی که می‌خوای بسازی رو توصیف کن... مثلاً «یک گربه‌ی نارنجی روی مبل مخملی آبی، نور نرم غروب»'
          }
          rows={5}
          style={{ minHeight: 132 }}
          className="flex-1 resize-none bg-transparent text-[16.5px] leading-[1.8] text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />

        {selectedCreativePrompt?.requiresUserImage && images.length === 0 && (
          <p className="mt-1 text-xs" style={{ color: '#fbbf24' }}>{fa.discover.requiresImageNotice}</p>
        )}
        {creativeImageError && (
          <p className="mt-1 text-xs text-red-400">{creativeImageError}</p>
        )}

        {!selectedCreativePrompt && images.length > 0 && (
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
            <button
              type="button"
              onClick={onOpenPromptLibrary}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-semibold text-slate-100"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.25)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
              </svg>
              پرامپت آماده
            </button>
          </div>

          {!selectedCreativePrompt && (
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
          )}

          <button
            onClick={() => void submit()}
            disabled={!canSend}
            className="rounded-full py-3.5 text-[15px] font-bold transition-all"
            style={
              canSend
                ? { background: '#10b981', color: '#02170f', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }
                : { background: 'rgba(16,185,129,0.35)', color: 'rgba(2,23,15,0.6)' }
            }
          >
            {generatingCreative || uploadDiscoveryImage.isPending ? fa.discover.generating : 'ساخت عکس'}
          </button>
        </div>
      </div>

      {creativeError && (
        <p className="text-center text-[12px] text-red-400">{creativeError}</p>
      )}

      {!selectedCreativePrompt && (
        <p className="text-center text-[12px]" style={{ color: '#64748b' }}>
          حداکثر {MAX_IMAGES} عکس مرجع در هر درخواست
        </p>
      )}
    </div>
  )
}
