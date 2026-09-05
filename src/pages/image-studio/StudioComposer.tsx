import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useUploadDiscoveryImage } from '@/queries/discovery.queries'
import { useChatStore, type ImageAspectRatio } from '@/store/chat.store'
import { useToastStore } from '@/store/toast.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { resizeImage } from '@/components/chat/MessageInput'
import { ProviderIcon } from '@/components/models/ProviderIcon'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import type { CreativePromptCatalogItem } from '@/types/api'

// پنل کنترل استودیوی عکس — پیکسل‌به‌پیکسل مطابق آرتبورد ImageStudioWorkspace.dc.html در
// دیزاین‌کنوس (docs/PRD-openrouter-migration.md §۱۳-۱۴). عمداً یک کامپوننت جدا از
// MessageInput.tsx است، نه یک حالت/variant داخل آن — چیدمانش (textarea بدون قاب + ردیف دکمه‌ها
// زیرش با یک خط جداکننده + دکمه‌ی تمام‌عرض «ساخت عکس») آنقدر با نوار فشرده‌ی چت فرق دارد که
// شاخه‌زدن داخل همان کامپوننت باعث می‌شد چت معمولی هم ریسک رگرسیون بگیرد. فقط resizeImage
// (تغییر اندازه‌ی عکس مرجع) از آنجا export و بازاستفاده شده، نه کل منطق.
//
// روی موبایل این پنل به‌جای اینکه انتهای صفحه (بعد از گالری) قرار بگیرد و برای رسیدن بهش لازم
// باشد تا ته صفحه اسکرول کنی، به‌صورت یک شیت چسبیده به پایین (fixed) با یک نوار جمع‌شده (فقط
// input + دکمه‌ی ارسال) نمایش داده می‌شود؛ زدن نوار/دستگیره پنل کامل را باز می‌کند. دسکتاپ
// (sm:+) بدون تغییر همان ستون ثابت همیشه-باز قبلی است.
export function StudioComposer({
  onSend,
  disabled,
  sending,
  selectedCreativePrompt,
  onClearCreativePrompt,
  onOpenPromptLibrary,
  onGenerateCreative,
  onCreativeSubmitStart,
  onCreativeSubmitEnd,
  generatingCreative,
  creativeError,
  onRetryCreative,
  walletBalanceToman,
}: {
  onSend: (
    content: string,
    images?: string[],
    imageModel?: string,
    preserveFace?: boolean,
    imageAspectRatio?: ImageAspectRatio,
  ) => void
  disabled?: boolean
  sending?: boolean
  // وقتی یک سبک از کتابخانه‌ی پرامپت‌های آماده انتخاب شده باشد، composer به‌جای onSend معمولی
  // از مسیر generateCreative استفاده می‌کند — دقیقاً همان مکانیزمی که MessageInput.tsx برای چت دارد
  selectedCreativePrompt?: CreativePromptCatalogItem | null
  onClearCreativePrompt?: () => void
  onOpenPromptLibrary?: () => void
  onGenerateCreative?: (promptId: string, userInput: string, inputImageKeys?: string[], imagePreviews?: string[], preserveFace?: boolean) => void
  // بلافاصله روی کلیک (قبل از آپلود عکس‌های مرجع) صدا زده می‌شود تا اسپینر گالری همون لحظه
  // ظاهر شود، نه فقط بعد از این‌که آپلود تمام شد و generateCreative.isPending شروع شد
  onCreativeSubmitStart?: () => void
  // فقط وقتی خود آپلود عکس مرجع fail شود صدا زده می‌شود (قبل از این‌که generateCreative اصلاً
  // صدا زده شود) — تا اسپینر گالری برای همیشه روشن نماند؛ اگر آپلود موفق بود، خاموش‌شدن اسپینر
  // با onSuccess/onError خودِ generateCreative (سمت ImageStudioPage) هندل می‌شود
  onCreativeSubmitEnd?: () => void
  generatingCreative?: boolean
  creativeError?: string | null
  onRetryCreative?: () => void
  // موجودی کیف‌پول (فقط پلن Pay-as-you-go) — null یعنی پلن این کاربر اصلاً کیف‌پول تومانی ندارد
  walletBalanceToman?: number | null
}) {
  const navigate = useNavigate()
  const { data: flags } = useFeatureFlags()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024

  const { data: catalog } = useModelCatalog()
  const selectedImageGenModel = useChatStore(s => s.selectedImageGenModel)
  const setSelectedImageGenModel = useChatStore(s => s.setSelectedImageGenModel)
  const imageGenModels = useMemo(() => (catalog ?? []).filter(m => m.supportsImageGen), [catalog])
  const pinnedModel = imageGenModels.find(m => m.name === selectedImageGenModel)
  // imageGenModels از همان ترتیب sortOrder سرور می‌آید — اولین مورد یعنی «دیفالت» واقعی
  // (یا مدل پیش‌فرض این پلن، اگر ادمین از صفحه‌ی پلن‌ها ستش کرده باشد)، نه یک نام هاردکد
  const modelLabel = pinnedModel?.displayName ?? imageGenModels[0]?.displayName ?? 'مدل پیش‌فرض'

  // value/images/preserveFace عمداً در chat.store (نه useState محلی) نگه داشته می‌شوند — چیپ
  // «تغییر مدل» به /models navigate می‌کند که این کامپوننت را unmount می‌کند؛ useState محلی با
  // آن remount از دست می‌رفت (این دقیقاً باگی بود که کاربر گزارش داد: «مدل رو عوض می‌کنم، پرامپت
  // بسته می‌شود»)
  const value = useChatStore(s => s.studioDraftValue)
  const setValue = useChatStore(s => s.setStudioDraftValue)
  const images = useChatStore(s => s.studioDraftImages)
  const setImages = useChatStore(s => s.setStudioDraftImages)
  const preserveFace = useChatStore(s => s.studioDraftPreserveFace)
  const setPreserveFace = useChatStore(s => s.setStudioDraftPreserveFace)
  const aspectRatio = useChatStore(s => s.studioDraftAspectRatio)
  const setAspectRatio = useChatStore(s => s.setStudioDraftAspectRatio)
  const resetStudioDraft = useChatStore(s => s.resetStudioDraft)
  const [isFocused, setIsFocused] = useState(false)
  const [creativeImageError, setCreativeImageError] = useState<string | null>(null)
  // فقط روی موبایل معنا دارد (دسکتاپ همیشه باز است، پایین‌تر با sm: بازنویسی می‌شود) — با
  // انتخاب یک سبک تازه از کتابخانه، مدال خودکار باز می‌شود تا کاربر بلافاصله عکس مرجع را ببیند
  const [mobileExpanded, setMobileExpanded] = useState(false)
  // فقط روی موبایل معنا دارد — کدام پنل داخل مدال تمام‌صفحه دیده می‌شود. زدن «تغییر مدل»
  // به‌جای navigate به یک صفحه‌ی جدا (که پنل رو unmount می‌کرد)، همین‌جا به لیست مدل‌ها سوییچ
  // می‌کند؛ خود مدال باز می‌ماند و چیزی از دست نمی‌رود
  const [mobileView, setMobileView] = useState<'compose' | 'models'>('compose')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const uploadDiscoveryImage = useUploadDiscoveryImage()

  useEffect(() => {
    if (selectedCreativePrompt) setMobileExpanded(true)
  }, [selectedCreativePrompt])

  function closeMobileModal() {
    setMobileExpanded(false)
    setMobileView('compose')
  }

  function selectImageGenModel(model: string | null) {
    track('image_gen_model_selected', { model: model ?? 'auto', source: 'image_studio_inline' })
    setSelectedImageGenModel(model)
    if (model) localStorage.setItem('nivo:selectedImageGenModel', model)
    else localStorage.removeItem('nivo:selectedImageGenModel')
    setMobileView('compose')
  }

  const canSend = selectedCreativePrompt
    ? !disabled && !sending && !generatingCreative && !uploadDiscoveryImage.isPending &&
      (!selectedCreativePrompt.requiresUserImage || images.length > 0)
    : (value.trim() || images.length > 0) && !disabled && !sending

  // سوییچ «حفظ چهره» فقط وقتی معنا دارد که عکسی برای حفظ چهره در آن وجود داشته باشد؛ برای
  // سبک‌های کتابخانه که خودشان صراحتاً به عکس کاربر نیاز دارند (مثل پروفایل‌ها) هم باید در
  // دسترس باشد، نه فقط در حالت «بدون سبک انتخابی»
  const showPreserveFace = images.length > 0 && (!selectedCreativePrompt || selectedCreativePrompt.requiresUserImage)

  const submit = async () => {
    if (!canSend) return
    if (selectedCreativePrompt) {
      setCreativeImageError(null)
      // همین‌جا (قبل از await آپلود) صدا زده می‌شود تا اسپینر گالری بلافاصله روی کلیک ظاهر شود،
      // نه فقط بعد از تمام‌شدن آپلود عکس‌های مرجع (که ممکن است چند ثانیه طول بکشد)
      onCreativeSubmitStart?.()
      try {
        // سبک‌های دیسکاوری کلید MinIO می‌خواهند (نه data URL خام) — قبل از generate آپلود می‌شوند
        const inputImageKeys = images.length
          ? await Promise.all(images.map(src => uploadDiscoveryImage.mutateAsync(src).then(r => r.key)))
          : undefined
        onGenerateCreative?.(selectedCreativePrompt.id, value.trim(), inputImageKeys, images.length ? images : undefined, preserveFace)
        resetStudioDraft()
        closeMobileModal()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      } catch {
        setCreativeImageError(fa.discover.uploadImageFailed)
        onCreativeSubmitEnd?.()
      }
      return
    }
    // چند خروجی هم‌زمان هنوز سمت بک‌اند پشتیبانی نمی‌شود (docs/EXECUTION-PLAN.md، سوال باز) —
    // فعلاً همیشه دقیقاً ۱ خروجی ساخته می‌شود، بدون هیچ گزینه‌ای در UI (چون چیزی برای انتخاب نیست)
    onSend(value.trim(), images.length ? images : undefined, pinnedModel?.name, preserveFace, aspectRatio ?? undefined)
    resetStudioDraft()
    closeMobileModal()
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

  const promptLibraryLabel = selectedCreativePrompt ? 'تغییر سبک' : 'پرامپت آماده'
  // خلاصه‌ی نوار جمع‌شده‌ی موبایل — همان چیزی که کاربر تایپ کرده، یا وضعیت سبک/پلیس‌هولدر
  const collapsedSummary =
    value || (selectedCreativePrompt ? `سبک: ${selectedCreativePrompt.title}` : 'چه تصویری می‌خوای بسازی؟')

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => void handleFiles(e.target.files)}
      />

      {/* نوار جمع‌شده‌ی موبایل — فقط زمانی که شیت کامل باز نیست. عمداً absolute نه fixed: باید
          نسبت به کانتینر positioned ریشه‌ی ChatLayout (که با useVisualViewportHeight ارتفاعش
          را با کیبورد iOS هماهنگ نگه می‌دارد) جای بگیرد، نه نسبت به viewport خام مرورگر —
          وگرنه با باز شدن کیبورد ممکن است پشت آن پنهان شود */}
      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 z-20 items-center gap-2 border-t border-slate-700/50 bg-[#020C18] px-3 py-2.5 sm:hidden',
          mobileExpanded ? 'hidden' : 'flex',
        )}
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || images.length >= MAX_IMAGES}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-300 disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.22)' }}
          aria-label="افزودن عکس مرجع"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMobileExpanded(true)}
          className="flex-1 truncate rounded-full px-4 py-2.5 text-start text-[13px] text-slate-400"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.16)' }}
        >
          {collapsedSummary}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors"
          style={
            canSend
              ? { background: '#10b981', color: '#02170f', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }
              : { background: 'rgba(16,185,129,0.3)', color: 'rgba(2,23,15,0.55)' }
          }
          aria-label="ساخت عکس"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* پنل کامل — دسکتاپ: همیشه در ستون ثابت (بدون تغییر). موبایل: یک مدال تمام‌صفحه با
          انیمیشن اسلاید+محو (نه شیت نیمه‌باز قبلی) — inset-0 (نه فقط inset-x-0 bottom-0) کل
          کانتینر positioned ریشه‌ی ChatLayout را می‌پوشاند، دقیقاً معادل «تمام صفحه» روی موبایل.
          z-25 عمداً زیر overlay/drawer سایدبار (z-30/z-40 در ChatLayout.tsx) است */}
      <div
        className={clsx(
          'absolute inset-0 z-[25] flex flex-col overflow-hidden bg-[#020C18] transition-[transform,opacity] duration-300 ease-out',
          mobileExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none',
          'sm:static sm:z-auto sm:inset-auto sm:flex sm:h-full sm:flex-1 sm:translate-y-0 sm:opacity-100 sm:pointer-events-auto sm:overflow-visible sm:bg-transparent sm:transition-none',
        )}
      >
        {/* هدر مدال — فقط موبایل. عنوان بسته به پنل فعلی عوض می‌شود؛ ضربدر همیشه کل مدال را می‌بندد */}
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/50 px-4 pb-3 sm:hidden"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
        >
          <span className="text-[14.5px] font-bold text-white">
            {mobileView === 'models' ? 'انتخاب مدل تولید عکس' : 'ساخت عکس'}
          </span>
          <button
            type="button"
            onClick={closeMobileModal}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.24)' }}
            aria-label="بستن"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* دو پنل کنار هم (نوشتن پرامپت / انتخاب مدل) که با اسلاید افقی بین‌شون سوییچ می‌شه —
            فقط روی موبایل؛ دسکتاپ با sm:contents از چیدمان کنار می‌ره و پنل مدل اصلاً دیده
            نمی‌شه (دسکتاپ همچنان با چیپ «تغییر مدل» به /models می‌ره، بدون تغییر) */}
        <div className="relative flex-1 overflow-hidden sm:contents">
          <div
            className={clsx(
              'absolute inset-0 flex flex-col gap-4 overflow-y-auto px-4 pt-3 transition-transform duration-300 ease-out',
              mobileView === 'models' ? '-translate-x-full' : 'translate-x-0',
              'sm:static sm:inset-auto sm:flex sm:h-full sm:flex-1 sm:translate-x-0 sm:overflow-visible sm:px-0 sm:pt-0 sm:transition-none',
            )}
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
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
          /* چیپ مدل — دسکتاپ: navigate به صفحه‌ی مدل‌ها (بدون تغییر). موبایل: همون مدال باز
             می‌ماند، فقط به پنل «انتخاب مدل» سوییچ می‌کند (بدون navigate/unmount) */
          <button
            onClick={() => (isDesktop ? navigate('/models?context=image-studio') : setMobileView('models'))}
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
            'flex flex-1 flex-col rounded-[26px] p-6 transition-shadow duration-300',
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
                  {idx === 0 && selectedCreativePrompt?.requiresUserImage && (
                    <span
                      className="absolute inset-x-0 bottom-0 rounded-b-2xl py-0.5 text-center text-[8.5px] font-semibold text-emerald-200"
                      style={{ background: 'rgba(2,4,10,0.65)' }}
                    >
                      مرجع اصلی
                    </span>
                  )}
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
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-red-400">{creativeImageError}</p>
              <button
                type="button"
                onClick={() => void submit()}
                className="shrink-0 text-xs font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                {fa.chat.retry}
              </button>
            </div>
          )}

          {showPreserveFace && (
            <label className="mt-1 mb-2 flex items-center gap-2 text-xs text-slate-300">
              <button
                type="button"
                role="switch"
                aria-checked={preserveFace}
                onClick={() => setPreserveFace(!preserveFace)}
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

          {/* نسبت تصویر — اختیاری، نخواستن (پیش‌فرض «خودکار») یعنی رفتار قبلی، بدون override
              روی سایز مدل انتخابی. برخلاف preserveFace، همیشه در دسترس است چون هم برای تولید
              از صفر هم برای ویرایش معنا دارد. */}
          <div className="mt-1 mb-2 flex items-center gap-1.5 self-start rounded-full p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)' }}>
            {(
              [
                { value: null, label: 'خودکار' },
                { value: '1:1' as const, label: '۱:۱' },
                { value: '16:9' as const, label: '۱۶:۹' },
                { value: '9:16' as const, label: '۹:۱۶' },
              ]
            ).map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAspectRatio(opt.value)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  aspectRatio === opt.value ? 'bg-emerald-500 text-[#02170f]' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
                {promptLibraryLabel}
              </button>
            </div>

            <p className="text-center text-[11.5px]" style={{ color: '#64748b' }}>
              حداکثر {MAX_IMAGES} عکس مرجع در هر درخواست
            </p>

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
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-center text-[12px] text-red-400">{creativeError}</p>
            {onRetryCreative && (
              <button
                type="button"
                onClick={onRetryCreative}
                className="text-[12px] font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                {fa.chat.retry}
              </button>
            )}
          </div>
        )}
          </div>

          {/* پنل انتخاب مدل — فقط موبایل (دسکتاپ هیچ‌وقت mobileView را عوض نمی‌کند) */}
          <div
            className={clsx(
              'absolute inset-0 flex flex-col gap-2.5 overflow-y-auto px-4 pt-3 transition-transform duration-300 ease-out sm:hidden',
              mobileView === 'models' ? 'translate-x-0' : 'translate-x-full',
            )}
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >
            {/* برگشت به پرامپت بدون انتخاب مدل تازه — chevron رو به راست، چون این حرکت
                «بازگشت» است (CLAUDE.md: فلش بازگشت در RTL باید رو به راست باشد) */}
            <button
              type="button"
              onClick={() => setMobileView('compose')}
              className="flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-slate-400"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              بازگشت به پرامپت
            </button>

            <button
              type="button"
              onClick={() => selectImageGenModel(null)}
              className={clsx(
                'flex items-center gap-3 rounded-2xl border p-3.5 text-right',
                selectedImageGenModel === null ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700/60 bg-slate-800/40',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-emerald-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z" /></svg>
              </span>
              <span className="flex-1">
                <span className="block text-[13px] font-bold text-slate-100">خودکار (پیش‌فرض)</span>
                <span className="block text-[11px] text-slate-500">کیفیت/ابعاد بر اساس توصیف و اعتبار</span>
              </span>
              {selectedImageGenModel === null && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-500"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
            {imageGenModels.map(model => (
              <button
                key={model.name}
                type="button"
                onClick={() => selectImageGenModel(model.name)}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border p-3.5 text-right',
                  selectedImageGenModel === model.name ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-700/60 bg-slate-800/40',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <ProviderIcon provider={model.provider} size={16} />
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-bold text-slate-100">{model.displayName}</span>
                  {model.description && <span className="block text-[11px] text-slate-500">{model.description}</span>}
                </span>
                {selectedImageGenModel === model.name && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-emerald-500"><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
