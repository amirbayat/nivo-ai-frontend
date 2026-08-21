import { useEffect, useState, useRef, useMemo, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useUploadDiscoveryImage } from '@/queries/discovery.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import { ThinkingModeToggle } from './ThinkingModeToggle'

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const MAX_DIM = 1024
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}

interface MessageInputProps {
  onSend: (content: string, images?: string[], model?: string, generateImage?: boolean) => void
  disabled?: boolean
  // برخلاف disabled، فقط دکمه‌ی ارسال (و Enter) را غیرفعال می‌کند — کاربر همچنان می‌تواند
  // در حین تولید پاسخ هوش مصنوعی تایپ کند و پیام بعدی‌اش را آماده کند
  sending?: boolean
  // وقتی selectedCreativePrompt (store) ست باشد، submit به‌جای onSend این را صدا می‌زند —
  // مسیر تولید دیسکاوری کاملاً جدا از استریم چت است (ChatPage.tsx: handleGenerateCreative).
  // imagePreviews (data URL) صرفاً برای نمایش فوری عکس کاربر به‌عنوان پیام واقعی توی خود
  // مکالمه است — چیزی که سرور برمی‌گرداند فقط inputImageKeys (کلید MinIO) است
  onGenerateCreative?: (promptId: string, userInput: string, inputImageKeys?: string[], imagePreviews?: string[], preserveFace?: boolean) => void
  generatingCreative?: boolean
}

export function MessageInput({ onSend, disabled, sending, onGenerateCreative, generatingCreative }: MessageInputProps) {
  const { data: flags } = useFeatureFlags()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024

  const { data: catalog } = useModelCatalog()
  const { selectedImageGenModel, selectedCreativePrompt, setSelectedCreativePrompt } = useChatStore()
  const navigate = useNavigate()
  // مسیر نسبی (پرامپت‌های تازه‌استخراج‌شده‌ی خود کاربر) و URL مطلق (سبک‌های عمومیِ کاتالوگ) هر دو
  // با همین هوک کار می‌کنند — useAuthedImageUrl پشت سر هم آدرس عمومی یا احراز-هویت‌شده را می‌فچد
  const selectedPromptImageUrl = useAuthedImageUrl(selectedCreativePrompt?.exampleImageUrl ?? '')
  const uploadDiscoveryImage = useUploadDiscoveryImage()
  // [DISABLED ۱۴۰۵/۰۵/۳۰ — تصمیم محصول: هیچ پلنی دیگر به allowedModels محدود نمی‌شود؛ کل
  // کاتالوگ فعال supportsImageGen در دسترس است]. پیش‌فرض: کیفیت/اندازه بر اساس متن پیام و
  // (برای Pay-as-you-go) موجودی کیف‌پول خودکار انتخاب می‌شود — اما اگر کاربر از صفحه‌ی «انتخاب
  // مدل» یک مدل تولید عکس مشخص pin کرده باشد (selectedImageGenModel)، همان صریح فرستاده می‌شود
  const imageGenModels = useMemo(() => {
    return (catalog ?? []).filter(m => m.supportsImageGen)
  }, [catalog])
  const hasImageGenModels = imageGenModels.length > 0
  const pinnedImageGenModel = imageGenModels.find(m => m.name === selectedImageGenModel)

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageMode, setImageMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const creativeFileRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()

  // عکس ورودی سبک‌های requiresUserImage=true — مستقل از images بالا (که مخصوص حالت تولید عکس
  // چت معمولی/ویرایش است)؛ با هر سبک تازه‌انتخاب‌شده پاک می‌شود
  const [creativeImagePreview, setCreativeImagePreview] = useState<string | null>(null)
  const [creativeImageKey, setCreativeImageKey] = useState<string | null>(null)
  const [creativeImageError, setCreativeImageError] = useState<string | null>(null)
  // سوییچ «تغییر ندادن چهره» — پیش‌فرض روشن؛ فقط وقتی عکس ورودی داریم اثر واقعی دارد
  // (توی بک‌اند هم همین‌طور: بدون عکس نادیده گرفته می‌شود)
  const [preserveFace, setPreserveFace] = useState(true)

  useEffect(() => {
    setCreativeImagePreview(null)
    setCreativeImageKey(null)
    setCreativeImageError(null)
    setPreserveFace(true)
  }, [selectedCreativePrompt?.id])

  function handleCreativeFileSelected(file: File) {
    setCreativeImageError(null)
    setCreativeImageKey(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCreativeImagePreview(dataUrl)
      uploadDiscoveryImage.mutate(dataUrl, {
        onSuccess: data => setCreativeImageKey(data.key),
        onError: () => {
          setCreativeImageError(fa.discover.uploadImageFailed)
          setCreativeImagePreview(null)
        },
      })
    }
    reader.readAsDataURL(file)
  }

  function toggleImageMode() {
    if (!hasImageGenModels) return
    setImageMode(v => {
      const next = !v
      track('image_gen_mode_toggled', { enabled: next })
      return next
    })
    // عکس‌های پیوست‌شده نگه داشته می‌شوند — اگر کاربر قبلاً عکس آپلود کرده و بعد حالت تولید عکس
    // را فعال کند، یعنی می‌خواهد همون عکس‌ها ویرایش/ترکیب شوند (images/edits)، نه یک تولید از صفر
  }

  const submit = () => {
    const trimmed = value.trim()
    if (disabled || sending) return
    if (selectedCreativePrompt) {
      if (generatingCreative || uploadDiscoveryImage.isPending) return
      if (selectedCreativePrompt.requiresUserImage && !creativeImageKey) {
        setCreativeImageError(fa.discover.imageRequiredError)
        return
      }
      if (!onGenerateCreative) return
      onGenerateCreative(
        selectedCreativePrompt.id,
        trimmed,
        creativeImageKey ? [creativeImageKey] : undefined,
        creativeImagePreview ? [creativeImagePreview] : undefined,
        preserveFace,
      )
      setValue('')
      setCreativeImagePreview(null)
      setCreativeImageKey(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }
    if (imageMode) {
      if (!trimmed) return
      track('image_gen_requested', { model: pinnedImageGenModel?.name, hasSourceImages: images.length > 0 })
      onSend(trimmed, images.length ? images : undefined, pinnedImageGenModel?.name, true)
    } else {
      if (!trimmed && !images.length) return
      onSend(trimmed, images.length ? images : undefined)
    }
    setValue('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const onFocus = () => {
    // iOS Safari doesn't reliably scroll the focused field above the keyboard on its own
    setTimeout(() => textareaRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }), 300)
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

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const canSend = selectedCreativePrompt
    ? !disabled && !sending && !generatingCreative && !uploadDiscoveryImage.isPending &&
      (!selectedCreativePrompt.requiresUserImage || Boolean(creativeImageKey))
    : imageMode
      ? Boolean(value.trim()) && !disabled && !sending
      : (value.trim() || images.length > 0) && !disabled && !sending

  return (
    <div className="border-t border-slate-700/50 p-4">
      {selectedCreativePrompt && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          {selectedCreativePrompt.outputType === 'IMAGE' && selectedPromptImageUrl && (
            <img
              src={selectedPromptImageUrl}
              alt=""
              className="size-14 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-emerald-400/80">{fa.discover.selectedStyleLabel}</p>
            <p className="truncate text-sm font-semibold text-slate-100">{selectedCreativePrompt.title}</p>
            <p className="mt-0.5 text-xs text-emerald-400">{fa.discover.creditCost(selectedCreativePrompt.creditCost)}</p>

            {selectedCreativePrompt.outputType === 'IMAGE' && (
              <div className="mt-2">
                <input
                  ref={creativeFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleCreativeFileSelected(file)
                    e.target.value = ''
                  }}
                />
                {creativeImagePreview ? (
                  <div className="relative inline-block overflow-hidden rounded-lg border border-slate-700">
                    <img src={creativeImagePreview} alt="" className="h-16 w-16 object-cover" />
                    {uploadDiscoveryImage.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                        <div className="size-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      </div>
                    )}
                    {creativeImageKey && !uploadDiscoveryImage.isPending && (
                      <button
                        onClick={() => { setCreativeImagePreview(null); setCreativeImageKey(null) }}
                        className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-0.5 text-[10px] text-slate-300 hover:text-red-400 transition-colors"
                      >
                        {fa.discover.removeImage}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => creativeFileRef.current?.click()}
                    className="rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                  >
                    {selectedCreativePrompt.requiresUserImage
                      ? fa.discover.uploadImageLabel
                      : fa.discover.uploadImageLabelOptional}
                  </button>
                )}
                {creativeImageError && <p className="mt-1 text-[11px] text-red-400">{creativeImageError}</p>}

                {/* فقط وقتی عکس ورودی واقعاً اضافه شده باشد نشون داده می‌شود — بدون عکس این
                    سوییچ اصلاً اثری ندارد (توضیح بالای preserveFace) */}
                {creativeImagePreview && (
                  <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-300">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preserveFace}
                      aria-label={fa.discover.preserveFaceLabel}
                      onClick={() => setPreserveFace(v => !v)}
                      className={clsx(
                        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                        preserveFace ? 'bg-emerald-500' : 'bg-slate-600',
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-block size-3.5 rounded-full bg-white transition-transform',
                          // در RTL باید معکوس حالت LTR باشد: روشن → چپ، خاموش → راست
                          preserveFace ? 'translate-x-[3px]' : 'translate-x-[18px]',
                        )}
                      />
                    </button>
                    <span>{fa.discover.preserveFaceLabel}</span>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
            >
              {fa.discover.changeStyle}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCreativePrompt(null)}
              aria-label={fa.discover.exitStyleMode}
              className="flex size-6 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!selectedCreativePrompt && imageMode && (
        <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-fuchsia-300/80">
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5 shrink-0">
            <path
              d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z"
              fill="currentColor"
            />
          </svg>
          <span>
            {images.length > 0
              ? `ویرایش/ترکیب همین ${images.length} عکس بر اساس توصیفت`
              : pinnedImageGenModel
                ? `با مدل «${pinnedImageGenModel.displayName}» ساخته می‌شود`
                : 'کیفیت و ابعاد بر اساس توصیفت و اعتبار حسابت خودکار انتخاب می‌شود'}
          </span>
        </div>
      )}

      {!selectedCreativePrompt && images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="relative group">
              <img
                src={src}
                className="h-20 w-20 rounded-xl object-cover border border-slate-600"
                alt={`پیش‌نمایش عکس پیوست‌شده، شماره ${idx + 1}`}
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-slate-900 border border-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs leading-none"
                aria-label="حذف تصویر"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={clsx(
          'flex items-end gap-3 rounded-2xl border bg-slate-800/80 px-4 py-3 transition-colors',
          disabled ? 'border-slate-700/30' : 'border-slate-600/60 focus-within:border-emerald-500/50',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
        />

        {!selectedCreativePrompt && (
          <button
            type="button"
            disabled={disabled || images.length >= MAX_IMAGES}
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'shrink-0 size-7 rounded-lg flex items-center justify-center transition-colors',
              images.length >= MAX_IMAGES || disabled
                ? 'text-slate-600 cursor-not-allowed'
                : imageMode
                  ? 'text-fuchsia-300/70 hover:text-fuchsia-300 hover:bg-slate-700'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700',
            )}
            aria-label={imageMode ? 'پیوست عکس برای ویرایش/ترکیب' : 'پیوست تصویر'}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="m3 15 5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {!selectedCreativePrompt && hasImageGenModels && (
          <button
            type="button"
            disabled={disabled}
            onClick={toggleImageMode}
            className={clsx(
              'shrink-0 size-7 rounded-lg flex items-center justify-center transition-all duration-200',
              imageMode
                ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                : 'text-slate-400 hover:text-fuchsia-400 hover:bg-slate-700',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            aria-label="حالت تولید عکس"
            aria-pressed={imageMode}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <path
                d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={onInput}
          onFocus={onFocus}
          disabled={disabled}
          placeholder={
            selectedCreativePrompt
              ? fa.discover.inputPlaceholder
              : imageMode
                ? images.length > 0 ? 'چی می‌خوای با این عکس(ها) درست کنم؟' : 'چی می‌خوای برات بسازم؟'
                : fa.chat.placeholder
          }
          rows={1}
          className={clsx(
            'flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500',
            'focus:outline-none leading-relaxed',
          )}
          style={{ minHeight: '24px' }}
        />

        {/* در حالت تولید عکس/سبک دیسکاوری، reasoning effort اثری ندارد — هردو کاملاً جدا از streamText چت‌اند */}
        {!imageMode && !selectedCreativePrompt && <ThinkingModeToggle disabled={disabled} />}

        <button
          onClick={submit}
          disabled={!canSend}
          className={clsx(
            'shrink-0 size-9 rounded-xl flex items-center justify-center transition-all',
            canSend && imageMode
              ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white hover:brightness-110 active:scale-95'
              : canSend
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4 rotate-180">
            <path d="M12 4l8 8-8 8M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 text-center text-[11px] text-slate-600">
        {isTouchDevice ? 'برای ارسال، دکمه‌ی ارسال را بزنید' : 'Enter برای ارسال · Shift+Enter برای خط جدید'}
      </p>
    </div>
  )
}
