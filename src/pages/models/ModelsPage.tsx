import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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

// docs/PRD-openrouter-migration.md §۱۳.۴/۱۴.۴ — فیلترهای صفحه‌ی انتخاب مدل. ترند/محبوب از
// AiModel.badges می‌آیند (متن آزاد ادمین)، ارزان/گران از قیمت واقعی محاسبه می‌شود (نسبت به
// میانه‌ی کل کاتالوگ فعلی)، حرفه‌ای همان tier=COMPLEX موجود است — بدون نیاز به ستون جدید
type CatalogFilter = 'all' | 'trending' | 'popular' | 'cheap' | 'expensive' | 'pro'
const FILTERS: { key: CatalogFilter; label: string }[] = [
  { key: 'all', label: 'همه' },
  { key: 'trending', label: 'ترند' },
  { key: 'popular', label: 'محبوب' },
  { key: 'cheap', label: 'ارزان' },
  { key: 'expensive', label: 'گران' },
  { key: 'pro', label: 'حرفه‌ای' },
]

// چیپ‌های «دنبال چی هستی؟» — میان‌بر روی همون سه‌سطحِ tier موجود (SIMPLE/MEDIUM/COMPLEX)، فقط با
// یک برچسب کاربردی‌تر؛ هدف کمک به کاربر برای پیدا کردن مدل مناسب، بدون نیاز به دیتای تازه
const QUICK_PICKS: { tier: ModelTier; label: string }[] = [
  { tier: 'SIMPLE', label: 'سریع و ارزون' },
  { tier: 'MEDIUM', label: 'متعادل و همه‌کاره' },
  { tier: 'COMPLEX', label: 'قدرتمند و استدلالی' },
]

function totalPrice(m: ModelCatalogEntry) {
  return (m.inputPricePerM ?? 0) + (m.outputPricePerM ?? 0)
}

function median(nums: number[]) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// سرعت/دقت صرفاً از tier می‌آد (تنها سیگنال واقعی موجود برای این دو)؛ هزینه نسبی به میانه‌ی
// قیمت واقعی کاتالوگ (همون priceMedian که فیلتر ارزان/گران هم استفاده می‌کنه) حساب می‌شه —
// هیچ‌کدوم عدد ساختگی نیست، هر سه از دیتای واقعی ModelCatalogEntry مشتق شدن
const TIER_SPEED: Record<ModelTier, number> = { SIMPLE: 5, MEDIUM: 4, COMPLEX: 2 }
const TIER_QUALITY: Record<ModelTier, number> = { SIMPLE: 2, MEDIUM: 3, COMPLEX: 5 }

function costLevel(price: number, median: number): number {
  if (median <= 0) return 3
  const ratio = price / median
  if (ratio <= 0.4) return 1
  if (ratio <= 0.8) return 2
  if (ratio <= 1.3) return 3
  if (ratio <= 2) return 4
  return 5
}

function Dots({ n, className }: { n: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, n))
  return <span className={clsx('tracking-widest', className)}>{'●'.repeat(filled)}{'○'.repeat(5 - filled)}</span>
}

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

function Check({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className ?? 'size-4 shrink-0 text-emerald-500'}>
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 17l-3.8-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

function ModelBadges({ badges }: { badges: string[] }) {
  if (!badges.length) return null
  return (
    <>
      {badges.map(b => (
        <span
          key={b}
          className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] text-cyan-300"
        >
          {b}
        </span>
      ))}
    </>
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
  const [searchParams] = useSearchParams()
  const { data: catalog, isLoading } = useModelCatalog()
  const { selectedModel, setSelectedModel, selectedImageGenModel, setSelectedImageGenModel, selectedCreativePrompt } = useChatStore()
  const [filter, setFilter] = useState<CatalogFilter>('all')
  const [search, setSearch] = useState('')
  // برخلاف filter (که لیست رو مخفی/نمایان می‌کنه)، activeTier فقط کارت‌های غیرمرتبط رو کم‌رنگ
  // می‌کنه — چون هدف «کمک به مقایسه» است، نه پنهان کردن گزینه‌ها
  const [activeTier, setActiveTier] = useState<ModelTier | null>(null)

  // میانه‌ی قیمت کل کاتالوگ فعلی — مبنای فیلتر ارزان/گران (نسبی به همین لحظه، نه یک عدد ثابت)
  const priceMedian = useMemo(() => median((catalog ?? []).map(totalPrice)), [catalog])

  const matchesFilter = (m: ModelCatalogEntry) => {
    switch (filter) {
      case 'trending': return m.badges.includes('ترند') || m.badges.includes('trending')
      case 'popular': return m.badges.includes('محبوب') || m.badges.includes('popular')
      case 'cheap': return totalPrice(m) <= priceMedian
      case 'expensive': return totalPrice(m) > priceMedian
      case 'pro': return m.tier === 'COMPLEX'
      default: return true
    }
  }

  const searchQuery = search.trim().toLowerCase()
  const matchesSearch = (m: ModelCatalogEntry) => {
    if (!searchQuery) return true
    return (
      m.displayName.toLowerCase().includes(searchQuery) ||
      m.name.toLowerCase().includes(searchQuery) ||
      m.provider.toLowerCase().includes(searchQuery) ||
      (m.description ?? '').toLowerCase().includes(searchQuery)
    )
  }

  // [DISABLED ۱۴۰۵/۰۵/۳۰ — تصمیم محصول: هیچ پلنی دیگر به allowedModels محدود نمی‌شود، کل
  // کاتالوگ فعال برای همه در دسترس است (فقط بر اساس موجودی کیف‌پول محدود می‌شود، نه اینجا)]
  const chatModels = (catalog ?? []).filter(m => m.modelType !== 'IMAGE_GEN').filter(matchesFilter).filter(matchesSearch)
  // مدل‌های تولید عکس دو دسته‌اند: modelType=IMAGE_GEN (اختصاصی، مثل openai/gpt-image-2)، و
  // مدل‌های چندمنظوره‌ی جدید (modelType=CHAT با supportsImageGen=true، مثل gpt-5-image/Nano
  // Banana) — قبلاً فقط دسته‌ی اول چک می‌شد، بنابراین دسته‌ی دوم (که در پروداکشن تنها دسته‌ی
  // موجود است) هیچ‌وقت اینجا دیده نمی‌شد
  const imageGenModels = (catalog ?? []).filter(m => m.modelType === 'IMAGE_GEN' || m.supportsImageGen).filter(matchesFilter).filter(matchesSearch)

  // وقتی یک سبک استودیو انتخاب شده باشد، انتخاب مدل این صفحه باید بر اساس outputType همان
  // سبک فیلتر شود (سبک تصویری → فقط مدل‌های تولید عکس، سبک متنی → فقط مدل‌های چت) — همان‌طور
  // که دراپ‌داون هدر چت (ModelSelector.tsx) هم رفتار می‌کند
  const inStudioMode = Boolean(selectedCreativePrompt)
  const studioWantsImageGen = selectedCreativePrompt?.outputType === 'IMAGE'
  // از چیپ «تغییر مدل» توی استودیوی تولید عکس (StudioComposer.tsx) — همان‌طور که کاربر خواسته،
  // آنجا فقط باید مدل‌های تولید عکس دیده شوند، نه کل کاتالوگ چت
  const fromImageStudio = searchParams.get('context') === 'image-studio'
  const imageOnlyMode = fromImageStudio || (inStudioMode && studioWantsImageGen)
  const showChatModels = !imageOnlyMode
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
    // اگر از خود استودیوی عکس اومده بودیم (چیپ «تغییر مدل»)، باید به همون گفتگو برگردیم؛ ولی
    // از هر جای دیگه (مثلاً «مدل‌های بیشتر» توی هدر چت) که یک مدل تولید عکس رو انتخاب می‌کنه،
    // باید مستقیم بره توی صفحه‌ی تولید عکس، نه برگرده به چتی که این مدل توش کاربردی نداره
    if (fromImageStudio) navigate(-1)
    else navigate('/image')
  }

  function ModelCard({ model }: { model: ModelCatalogEntry }) {
    const isActive = selectedModel === model.name
    const isQuickMatch = activeTier === model.tier
    const isDimmed = Boolean(activeTier) && !isQuickMatch

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
            : isQuickMatch
              ? 'border-cyan-500/50 bg-cyan-500/[0.06]'
              : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
          isDimmed && 'opacity-40',
        )}
      >
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
          <ProviderIcon provider={model.provider} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-100">{model.displayName}</h3>
            <ModelBadges badges={model.badges} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {model.description || tierDescription(model.tier)}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span>سرعت <Dots n={TIER_SPEED[model.tier]} className="text-emerald-400" /></span>
            <span>دقت <Dots n={TIER_QUALITY[model.tier]} className="text-violet-400" /></span>
            <span>هزینه <Dots n={costLevel(totalPrice(model), priceMedian)} className="text-amber-400" /></span>
          </div>
        </div>
        {isActive && <Check />}
      </div>
    )
  }

  // در حالت استودیوی تصویری، انتخاب مدل باید همان selectedModel عمومی را ست کند (همانی که به
  // generateCreative فرستاده می‌شود)، نه selectedImageGenModel (که مخصوص حالت «تولید عکس» چت معمولی است)
  //
  // grid=true (imageOnlyMode — از چیپ استودیوی عکس یا سبک تصویری): کارت بزرگ‌تر با آیکون بالا،
  // چون اینجا تنها محتوای صفحه است. grid=false (بخش فرعیِ زیر لیست مدل‌های چت روی /models عادی):
  // همان ردیف فشرده‌ی قبلی، بدون تغییر
  function ImageGenCard({ model, grid }: { model: ModelCatalogEntry; grid?: boolean }) {
    const isActive = studioWantsImageGen ? selectedModel === model.name : selectedImageGenModel === model.name
    const onSelect = () => (studioWantsImageGen ? select(model.name) : selectImageGenModel(model.name))

    if (grid) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onSelect()
          }}
          className={clsx(
            'group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl border p-5 text-right transition-all cursor-pointer',
            isActive
              ? 'border-fuchsia-500/60 bg-fuchsia-500/[0.07] shadow-[0_0_28px_rgba(217,70,239,0.12)]'
              : 'border-slate-700/60 bg-slate-800/40 hover:border-fuchsia-500/30 hover:bg-slate-800/60',
          )}
        >
          {isActive && (
            <div className="absolute left-4 top-4 flex size-6 items-center justify-center rounded-full bg-fuchsia-500 text-white">
              <Check className="size-3.5 text-white" />
            </div>
          )}
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-purple-600/25 ring-1 ring-fuchsia-500/30">
            <ProviderIcon provider={model.provider} size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-100">{model.displayName}</h3>
              <ModelBadges badges={model.badges} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {model.description || imageQualityLabel(model.tier)}
            </p>
          </div>
        </div>
      )
    }

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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-100">{model.displayName}</h3>
            <ImageGenBadge />
            <ModelBadges badges={model.badges} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {model.description || imageQualityLabel(model.tier)}
          </p>
        </div>
        {isActive && <Check />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16" dir="rtl">
      <div className={clsx('mx-auto', imageOnlyMode ? 'max-w-4xl' : 'max-w-3xl')}>
        <div className="mb-10 text-center">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            → بازگشت
          </button>
          {imageOnlyMode ? (
            <>
              <div className="mb-3 flex justify-center">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-[0_0_20px_rgba(217,70,239,0.4)]">
                  <SparkleIcon className="size-5 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-100">انتخاب مدل تولید عکس</h1>
              <p className="mt-2 text-slate-500">مدلی که تصویرهات باهاش ساخته بشه رو انتخاب کن</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-100">انتخاب مدل</h1>
              <p className="mt-2 text-slate-500">مدلی که می‌خوای پاسخ‌هات باهاش ساخته شه رو انتخاب کن</p>
            </>
          )}
        </div>

        <div className="mb-6">
          <div className="relative mx-auto max-w-sm">
            <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجوی مدل..."
              className="w-full rounded-full border border-slate-700/60 bg-slate-800/40 py-2.5 pr-10 pl-4 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {!imageOnlyMode && (
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700/60 text-slate-400 hover:border-slate-600',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {!imageOnlyMode && (
          <div className="mb-6">
            <p className="mb-2 text-center text-xs text-slate-600">دنبال چی هستی؟</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PICKS.map(q => (
                <button
                  key={q.tier}
                  onClick={() => setActiveTier(t => (t === q.tier ? null : q.tier))}
                  className={clsx(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                    activeTier === q.tier
                      ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-700/60 text-slate-400 hover:border-slate-600',
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!imageOnlyMode && (
          <div className="space-y-4">
            {/* دو حالت خودکار — همیشه اول و در دسترس (docs/PRD-model-selection-modes.md)؛ حین
                جستجو مخفی می‌شن چون این‌ها مدل مشخصی نیستن که با متن جستجو مچ بشن */}
            {!searchQuery && (
              <>
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
              </>
            )}

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
                ) : chatModels.length === 0 && searchQuery ? (
                  <p className="py-6 text-center text-sm text-slate-500">موردی برای «{search.trim()}» پیدا نشد</p>
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
        )}

        {/* بخش مدل‌های تولید عکس: در حالت عادی برای pin کردن مدل «تولید عکس» چت است؛ وقتی سبک
            استودیوی تصویری یا خود استودیوی عکس فعال باشد، همین لیست برای انتخاب مدل استفاده
            می‌شود (imageOnlyMode) — طراحی گرید بزرگ‌تر چون اینجا تنها محتوای صفحه می‌شود */}
        {!isLoading && imageGenModels.length > 0 && (showGenericImageGenSection || studioWantsImageGen) && (
          <div className={imageOnlyMode ? '' : 'mt-14'}>
            {!imageOnlyMode && (
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
            )}

            <div className={clsx('grid gap-4', imageOnlyMode && 'sm:grid-cols-2')}>
              {showGenericImageGenSection && imageOnlyMode && (
                <button
                  onClick={() => selectImageGenModel(null)}
                  className={clsx(
                    'group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl border p-5 text-right transition-all',
                    selectedImageGenModel === null
                      ? 'border-fuchsia-500/60 bg-fuchsia-500/[0.07] shadow-[0_0_28px_rgba(217,70,239,0.12)]'
                      : 'border-slate-700/60 bg-slate-800/40 hover:border-fuchsia-500/30 hover:bg-slate-800/60',
                  )}
                >
                  {selectedImageGenModel === null && (
                    <div className="absolute left-4 top-4 flex size-6 items-center justify-center rounded-full bg-fuchsia-500 text-white">
                      <Check className="size-3.5 text-white" />
                    </div>
                  )}
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-purple-600/25 ring-1 ring-fuchsia-500/30">
                    <SparkleIcon className="size-6 text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-100">خودکار (پیش‌فرض)</h3>
                      <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] text-fuchsia-300">پیشنهادی</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      کیفیت و ابعاد بر اساس توصیف خودت و اعتبار حسابت خودکار انتخاب می‌شود
                    </p>
                  </div>
                </button>
              )}

              {showGenericImageGenSection && !imageOnlyMode && (
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
                <ImageGenCard key={model.name} model={model} grid={imageOnlyMode} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
