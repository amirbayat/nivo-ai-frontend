import { useEffect, useState, useRef, useMemo, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import { useToastStore } from '@/store/toast.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useUploadDiscoveryImage } from '@/queries/discovery.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import { ThinkingModeToggle } from './ThinkingModeToggle'

// عکس‌های آیفون معمولاً با فرمت HEIC/HEIF می‌آیند که مرورگرهای کرومیوم/فایرفاکس (و مدل‌های
// هوش مصنوعی سمت سرور) قادر به decode آن نیستند — بدون این تبدیل، <img>.onerror سایلنت این
// فایل‌ها را در handleFiles حذف می‌کرد، بدون هیچ خطایی به کاربر
async function toDecodableBlob(file: File): Promise<Blob> {
  const isHeic = /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  if (!isHeic) return file
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  return Array.isArray(converted) ? converted[0] : converted
}

// export شده تا StudioComposer.tsx (ImageStudioPage) هم بدون کپی کردن منطق تغییر اندازه، از
// همین تابع برای پیش‌نمایش عکس مرجع استفاده کند
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        const blob = await toDecodableBlob(file)
        const url = URL.createObjectURL(blob)
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
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('image decode failed'))
        }
        img.src = url
      } catch (err) {
        reject(err instanceof Error ? err : new Error('heic conversion failed'))
      }
    })()
  })
}

interface MessageInputProps {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  disabled?: boolean
  // برخلاف disabled، فقط دکمه‌ی ارسال (و Enter) را غیرفعال می‌کند — کاربر همچنان می‌تواند
  // در حین تولید پاسخ هوش مصنوعی تایپ کند و پیام بعدی‌اش را آماده کند
  sending?: boolean
  // وقتی selectedCreativePrompt (store) ست باشد، submit به‌جای onSend این را صدا می‌زند —
  // مسیر تولید دیسکاوری کاملاً جدا از استریم چت است (ChatPage.tsx: handleGenerateCreative).
  // imagePreviews (data URL) صرفاً برای نمایش فوری عکس کاربر به‌عنوان پیام واقعی توی خود
  // مکالمه است — چیزی که سرور برمی‌گرداند فقط inputImageKeys (کلید MinIO) است
  onGenerateCreative?: (promptId: string, userInput: string, inputImageKeys?: string[], imagePreviews?: string[], preserveFace?: boolean, useSourceImage?: boolean) => void
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
  const pinnedImageGenModel = imageGenModels.find(m => m.name === selectedImageGenModel)

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
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
  // سوییچ «استفاده از عکس اصلی» — فقط برای سبک‌های استخراج‌شده (hasSourceImage) نشون داده
  // می‌شود؛ پیش‌فرض خاموش چون نیوو اضافه کسر می‌کند (creditConfig.sourceImageAccuracyCreditCost)
  const [useSourceImage, setUseSourceImage] = useState(false)
  // قیمت واقعی که با سوییچ بالا فعلاً کسر می‌شه — همون چیزی که generateImageOutput سمت سرور
  // هم حساب می‌کنه (prompt.creditCost + creditConfig.sourceImageAccuracyCreditCost)
  const effectiveCreditCost =
    (selectedCreativePrompt?.creditCost ?? 0) +
    (useSourceImage ? (selectedCreativePrompt?.sourceImageAccuracyCreditCost ?? 0) : 0)

  useEffect(() => {
    setCreativeImagePreview(null)
    setCreativeImageKey(null)
    setCreativeImageError(null)
    setPreserveFace(true)
    setUseSourceImage(false)
  }, [selectedCreativePrompt?.id])

  // همین سوییچ برای پیوست عکس در چت معمولی (بدون سبک استودیو) هم استفاده می‌شود — با خالی‌شدن
  // عکس‌های پیوست‌شده (ارسال یا حذف همه) دوباره به پیش‌فرض روشن برمی‌گردد
  useEffect(() => {
    if (!selectedCreativePrompt && images.length === 0) setPreserveFace(true)
  }, [selectedCreativePrompt, images.length])

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
        useSourceImage,
      )
      setValue('')
      setCreativeImagePreview(null)
      setCreativeImageKey(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }
    if (!trimmed && !images.length) return
    if (images.length) {
      track('image_gen_requested', { model: pinnedImageGenModel?.name, hasSourceImages: true })
    }
    // imageModel همیشه پاس داده می‌شود (چه عکسی ضمیمه باشد چه نه) — تشخیص اینکه این پیام واقعاً
    // باید عکس تولید/ویرایش کند یا صرفاً چت/تحلیل معمولی است، کاملاً سمت بک‌اند انجام می‌شود
    // (classifyImageIntent در chat.service.ts)، نه اینجا
    onSend(trimmed, images.length ? images : undefined, pinnedImageGenModel?.name, preserveFace)
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
    let failed = 0
    for (const file of toProcess) {
      // بعضی فایل‌منیجرهای اندروید برای HEIC فیلد type را خالی می‌فرستند — اسم فایل هم چک می‌شود
      if (!file.type.startsWith('image/') && !/\.hei[cf]$/i.test(file.name)) continue
      if (file.size > MAX_SIZE_BYTES) continue
      try {
        results.push(await resizeImage(file))
      } catch { failed++ }
    }
    setImages(prev => [...prev, ...results].slice(0, MAX_IMAGES))
    if (fileRef.current) fileRef.current.value = ''
    if (failed > 0) useToastStore.getState().addToast(fa.chat.imageProcessFailed(failed))
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const canSend = selectedCreativePrompt
    ? !disabled && !sending && !generatingCreative && !uploadDiscoveryImage.isPending &&
      (!selectedCreativePrompt.requiresUserImage || Boolean(creativeImageKey))
    : (value.trim() || images.length > 0) && !disabled && !sending

  return (
    <div className="border-t border-slate-700/30 p-4">
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
            <p className="mt-0.5 text-xs text-emerald-400">{fa.discover.creditCost(effectiveCreditCost)}</p>

            {/* style direction:ltr لازم است — توضیح کامل بالای سوییچ preserveFace */}
            {selectedCreativePrompt.hasSourceImage && (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                <button
                  type="button"
                  role="switch"
                  aria-checked={useSourceImage}
                  aria-label={fa.discover.useSourceImageLabel}
                  onClick={() => setUseSourceImage(v => !v)}
                  className={clsx(
                    'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    useSourceImage ? 'bg-emerald-500' : 'bg-slate-600',
                  )}
                  style={{ direction: 'ltr' }}
                >
                  <span
                    className={clsx(
                      'inline-block size-3.5 rounded-full bg-white transition-transform',
                      useSourceImage ? 'translate-x-[18px]' : 'translate-x-[3px]',
                    )}
                  />
                </button>
                <span>{fa.discover.useSourceImageLabel}</span>
                <span className="text-amber-400/90">
                  {fa.discover.useSourceImageExtraCost(selectedCreativePrompt.sourceImageAccuracyCreditCost)}
                </span>
              </label>
            )}

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
                    سوییچ اصلاً اثری ندارد (توضیح بالای preserveFace).
                    style direction:ltr روی خودِ دکمه لازم است: index.css یک قانون سراسری
                    `* { direction: rtl }` دارد که specificity بالاتری از attribute دیر
                    `dir="ltr"` دارد و آن را بی‌اثر می‌کند؛ بدونش این فلکس تک-فرزندی
                    flex-start را از راست می‌گیرد و knob با translate-x از کادر سوییچ بیرون
                    می‌زند (نه صرفاً جهتش برعکس می‌شود) */}
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
                      style={{ direction: 'ltr' }}
                    >
                      <span
                        className={clsx(
                          'inline-block size-3.5 rounded-full bg-white transition-transform',
                          preserveFace ? 'translate-x-[18px]' : 'translate-x-[3px]',
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

      {!selectedCreativePrompt && images.length > 0 && pinnedImageGenModel && (
        <div className="mb-2 flex items-center gap-1.5 px-1 text-xs text-fuchsia-300/80">
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5 shrink-0">
            <path
              d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z"
              fill="currentColor"
            />
          </svg>
          <span>{`اگر بخوای این عکس(ها) رو ویرایش/ترکیب کنم، با مدل «${pinnedImageGenModel.displayName}» انجام می‌شه`}</span>
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

      {!selectedCreativePrompt && images.length > 0 && (
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-300">
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
            style={{ direction: 'ltr' }}
          >
            <span
              className={clsx(
                'inline-block size-3.5 rounded-full bg-white transition-transform',
                preserveFace ? 'translate-x-[18px]' : 'translate-x-[3px]',
              )}
            />
          </button>
          <span>{fa.discover.preserveFaceLabel}</span>
        </label>
      )}

      <div
        className={clsx(
          'flex items-end gap-3 rounded-[20px] border bg-slate-800/70 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.22)] transition-colors',
          disabled ? 'border-slate-700/30' : 'border-slate-600/50 focus-within:border-emerald-500/50 focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_8px_28px_rgba(0,0,0,0.22)]',
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
                : 'text-slate-400 hover:text-fuchsia-400 hover:bg-slate-700',
            )}
            aria-label="پیوست عکس برای ویرایش/ترکیب"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="m3 15 5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
              : images.length > 0
                ? 'چیزی درباره‌ی این عکس(ها) بپرس، یا بخواه ویرایششون کنم'
                : fa.chat.placeholder
          }
          rows={1}
          className={clsx(
            'flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500',
            'focus:outline-none leading-relaxed',
          )}
          style={{ minHeight: '24px' }}
        />

        {/* در حالت سبک دیسکاوری reasoning effort اثری ندارد — کاملاً جدا از streamText چت است.
            برای پیوست عکس معمولی، چون تشخیص تحلیل/ویرایش سمت بک‌اند است، ممکن است مسیر چت
            معمولی طی شود، پس thinkingMode همچنان معنا دارد و مخفی نمی‌شود */}
        {!selectedCreativePrompt && <ThinkingModeToggle disabled={disabled} />}

        <button
          onClick={submit}
          disabled={!canSend}
          className={clsx(
            'shrink-0 size-9 rounded-xl flex items-center justify-center transition-all',
            canSend
              ? 'bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:bg-emerald-600 active:scale-95'
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
