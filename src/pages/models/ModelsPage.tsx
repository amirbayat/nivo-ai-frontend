import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useModelCatalog, type ModelCatalogEntry } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import {
  COST_OPTIMIZED_MODE, COST_OPTIMIZED_DESCRIPTION, BEST_ANSWER_MODE, BEST_ANSWER_DESCRIPTION,
  tierDescription, tierLabel, imageQualityLabel, type ModelTier,
} from '@/lib/model-catalog'
import { ProviderIcon } from '@/components/models/ProviderIcon'
import { track } from '@/lib/events'

const STORAGE_KEY = 'nivo:selectedModel'
const IMAGE_GEN_STORAGE_KEY = 'nivo:selectedImageGenModel'
const TIER_ORDER: ModelTier[] = ['COMPLEX', 'MEDIUM', 'SIMPLE']

function OptimalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" fill="currentColor" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-400 shrink-0">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.4c0 1.9-5 .9-5 2.9 0 .9 1 1.6 2.5 1.6s2.5-.6 2.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4 shrink-0 text-emerald-500">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z" fill="currentColor" />
    </svg>
  )
}

function ImageGenBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 px-2 py-0.5 text-[11px] font-medium text-fuchsia-300 ring-1 ring-fuchsia-500/30">
      <SparkleIcon className="size-2.5" />
      تولید عکس
    </span>
  )
}

export function ModelsPage() {
  const navigate = useNavigate()
  const { data: catalog, isLoading } = useModelCatalog()
  const { selectedModel, setSelectedModel, selectedImageGenModel, setSelectedImageGenModel, selectedCreativePrompt } = useChatStore()

  // [DISABLED ۱۴۰۵/۰۵/۳۰ — تصمیم محصول: هیچ پلنی دیگر به allowedModels محدود نمی‌شود، کل
  // کاتالوگ فعال برای همه در دسترس است (فقط بر اساس موجودی کیف‌پول محدود می‌شود، نه اینجا)]
  const chatModels = (catalog ?? []).filter(m => m.modelType !== 'IMAGE_GEN')
  const imageGenModels = (catalog ?? []).filter(m => m.modelType === 'IMAGE_GEN')

  // وقتی یک سبک استودیو انتخاب شده باشد، انتخاب مدل این صفحه باید بر اساس outputType همان
  // سبک فیلتر شود (سبک تصویری → فقط مدل‌های تولید عکس، سبک متنی → فقط مدل‌های چت) — همان‌طور
  // که دراپ‌داون هدر چت (ModelSelector.tsx) هم رفتار می‌کند
  const inStudioMode = Boolean(selectedCreativePrompt)
  const studioWantsImageGen = selectedCreativePrompt?.outputType === 'IMAGE'
  const showChatModels = !inStudioMode || !studioWantsImageGen
  const showGenericImageGenSection = !inStudioMode

  function select(model: string) {
    track('model_selected', { model, previousModel: selectedModel, source: 'models_page' })
    setSelectedModel(model)
    localStorage.setItem(STORAGE_KEY, model)
    navigate(-1)
  }

  function selectImageGenModel(model: string | null) {
    track('image_gen_model_selected', { model: model ?? 'auto' })
    setSelectedImageGenModel(model)
    if (model) localStorage.setItem(IMAGE_GEN_STORAGE_KEY, model)
    else localStorage.removeItem(IMAGE_GEN_STORAGE_KEY)
    navigate(-1)
  }

  function ModelCard({ model }: { model: ModelCatalogEntry }) {
    const isActive = selectedModel === model.name

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(model.name)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') select(model.name)
        }}
        className={clsx(
          'flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-5 text-right transition-all',
          isActive
            ? 'border-emerald-500/60 bg-emerald-500/5'
            : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
        )}
      >
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
          <ProviderIcon provider={model.provider} size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-100">{model.displayName}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{tierDescription(model.tier)}</p>
        </div>
        {isActive && <Check />}
      </div>
    )
  }

  // در حالت استودیوی تصویری، انتخاب مدل باید همان selectedModel عمومی را ست کند (همانی که به
  // generateCreative فرستاده می‌شود)، نه selectedImageGenModel (که مخصوص حالت «تولید عکس» چت معمولی است)
  function ImageGenCard({ model }: { model: ModelCatalogEntry }) {
    const isActive = studioWantsImageGen ? selectedModel === model.name : selectedImageGenModel === model.name
    const onSelect = () => (studioWantsImageGen ? select(model.name) : selectImageGenModel(model.name))

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onSelect()
        }}
        className={clsx(
          'flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-5 text-right transition-all',
          isActive
            ? 'border-fuchsia-500/60 bg-fuchsia-500/5'
            : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
        )}
      >
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
          <ProviderIcon provider={model.provider} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-100">{model.displayName}</h3>
            <ImageGenBadge />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{imageQualityLabel(model.tier)}</p>
        </div>
        {isActive && <Check />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            → بازگشت
          </button>
          <h1 className="text-2xl font-bold text-slate-100">انتخاب مدل</h1>
          <p className="mt-2 text-slate-500">مدلی که می‌خوای پاسخ‌هات باهاش ساخته شه رو انتخاب کن</p>
        </div>

        <div className="space-y-4">
          {/* دو حالت خودکار — همیشه اول و در دسترس (docs/PRD-model-selection-modes.md) */}
          <button
            onClick={() => select(COST_OPTIMIZED_MODE)}
            className={clsx(
              'flex w-full items-start gap-4 rounded-2xl border p-5 text-right transition-all',
              selectedModel === COST_OPTIMIZED_MODE
                ? 'border-amber-500/60 bg-amber-500/5'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
            )}
          >
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <CoinIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-100">مصرف بهینه</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{COST_OPTIMIZED_DESCRIPTION}</p>
            </div>
            {selectedModel === COST_OPTIMIZED_MODE && <Check />}
          </button>

          <button
            onClick={() => select(BEST_ANSWER_MODE)}
            className={clsx(
              'flex w-full items-start gap-4 rounded-2xl border p-5 text-right transition-all',
              selectedModel === BEST_ANSWER_MODE
                ? 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
            )}
          >
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <OptimalIcon />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100">بهترین پاسخ</h3>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">پیشنهادی</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{BEST_ANSWER_DESCRIPTION}</p>
            </div>
            {selectedModel === BEST_ANSWER_MODE && <Check />}
          </button>

          {showChatModels && (
            <>
              <div className="flex items-center gap-3 pt-2 pb-1">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-xs text-slate-600">یا یک مدل مشخص رو انتخاب کن</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="size-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                TIER_ORDER.map(tier => {
                  const models = chatModels.filter(m => m.tier === tier)
                  if (!models.length) return null
                  return (
                    <div key={tier} className="space-y-3 pt-2">
                      <p className="text-xs font-medium text-slate-500">سطح {tierLabel(tier)}</p>
                      {models.map(model => <ModelCard key={model.name} model={model} />)}
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>

        {/* بخش مدل‌های تولید عکس: در حالت عادی برای pin کردن مدل «تولید عکس» چت است؛ وقتی سبک
            استودیوی تصویری فعال باشد، همین لیست برای انتخاب مدل آن سبک استفاده می‌شود (نه هر دو با هم) */}
        {!isLoading && imageGenModels.length > 0 && (showGenericImageGenSection || studioWantsImageGen) && (
          <div className="mt-14">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-[0_0_16px_rgba(217,70,239,0.35)]">
                <SparkleIcon className="size-4.5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-100">مدل‌های تولید عکس</h2>
                <p className="text-xs text-slate-500">
                  {studioWantsImageGen
                    ? 'برای سبک انتخاب‌شده از استودیوی محتوا استفاده می‌شود'
                    : 'برای حالت «تولید عکس» توی چت استفاده می‌شوند، نه چت متنی معمولی'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {showGenericImageGenSection && (
                <button
                  onClick={() => selectImageGenModel(null)}
                  className={clsx(
                    'flex w-full items-start gap-4 rounded-2xl border p-5 text-right transition-all',
                    selectedImageGenModel === null
                      ? 'border-fuchsia-500/60 bg-fuchsia-500/5'
                      : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
                  )}
                >
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <SparkleIcon className="size-5 text-fuchsia-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100">خودکار (پیش‌فرض)</h3>
                      <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] text-fuchsia-300">پیشنهادی</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      کیفیت و ابعاد بر اساس توصیف خودت و اعتبار حسابت خودکار انتخاب می‌شود
                    </p>
                  </div>
                  {selectedImageGenModel === null && <Check />}
                </button>
              )}

              {imageGenModels.map(model => (
                <ImageGenCard key={model.name} model={model} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
