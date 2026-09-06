import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/store/chat.store'
import { useMe } from '@/queries/auth.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import {
  COST_OPTIMIZED_MODE,
  COST_OPTIMIZED_DESCRIPTION,
  BEST_ANSWER_MODE,
  BEST_ANSWER_DESCRIPTION,
  tierDescription,
  tierLabel,
  TIER_COLOR,
} from '@/lib/model-catalog'
import { ProviderIcon } from '@/components/models/ProviderIcon'
import { ModelPickerModal, type ModelPickerItem } from '@/components/models/ModelPickerModal'
import { track } from '@/lib/events'

const STORAGE_KEY = 'nivo:selectedModel'
const TOP_N = 4
// docs/PRD-model-selection-modes.md — این دو سنتینل «خودکار» هستند؛ بقیه‌ی مقادیر یک نام مدل واقعی است (انتخاب دستی)
const AUTO_MODES = [COST_OPTIMIZED_MODE, BEST_ANSWER_MODE]

function shortName(model: string): string {
  return model.includes('/') ? model.split('/')[1] : model
}

function OptimalIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
      <path
        d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z"
        fill="currentColor"
      />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="text-amber-400 shrink-0">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.4c0 1.9-5 .9-5 2.9 0 .9 1 1.6 2.5 1.6s2.5-.6 2.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function modeIcon(model: string) {
  if (model === COST_OPTIMIZED_MODE) return <CoinIcon />
  if (model === BEST_ANSWER_MODE) return <OptimalIcon />
  return null
}

export function ModelSelector({ currentModel }: { currentModel?: string }) {
  const { selectedModel, setSelectedModel, selectedCreativePrompt } = useChatStore()
  const { data: me } = useMe()
  const { data: catalog } = useModelCatalog()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // پیش‌فرض: فقط مدل‌های چت (نه IMAGE_GEN) — چون این دراپ‌داون قرار است برای پیام‌های متنی
  // استفاده شود. اما اگر یک سبک تصویری استودیو انتخاب شده باشد (selectedCreativePrompt)،
  // برعکس می‌شود: فقط مدل‌های تولید عکس قابل‌انتخاب‌اند — همان مدلی که به generate() می‌رود
  const wantsImageGen = selectedCreativePrompt?.outputType === 'IMAGE'
  const matchesRequiredType = (name: string) => {
    const m = catalog?.find(m => m.name === name)
    if (!m) return false
    // مدل‌های تولید عکس یا modelType=IMAGE_GEN اختصاصی‌اند یا (دسته‌ی رایج‌تر در پروداکشن)
    // یک مدل چت چندمنظوره با supportsImageGen=true (مثل gpt-5-image/Nano Banana)
    return wantsImageGen ? (m.modelType === 'IMAGE_GEN' || m.supportsImageGen) : m.modelType !== 'IMAGE_GEN'
  }
  // [DISABLED ۱۴۰۵/۰۵/۳۰ — تصمیم محصول: هیچ پلنی دیگر به allowedModels محدود نمی‌شود — کل
  // کاتالوگ فعال در دسترس است، فقط بر اساس outputType سبک استودیو (اگر انتخاب شده) فیلتر می‌شود]
  const catalogModelNames = (catalog ?? []).map(m => m.name)
  const allowedModels: string[] = catalogModelNames.filter(matchesRequiredType)
  const featuredModels = wantsImageGen
    ? undefined
    : me?.plan?.featuredModels?.filter(matchesRequiredType)
  // اگر پلن مدل‌های ویژه تنظیم نکرده باشد، fallback به ۴ تای اول allowedModels (رفتار قبلی)
  const topModels = featuredModels?.length ? featuredModels : allowedModels.slice(0, TOP_N)
  const moreCount = allowedModels.length - topModels.length

  function displayName(model: string): string {
    if (model === COST_OPTIMIZED_MODE) return 'مصرف بهینه'
    if (model === BEST_ANSWER_MODE) return 'بهترین پاسخ'
    return catalog?.find(m => m.name === model)?.displayName ?? shortName(model)
  }

  function descriptionOf(model: string): string | null {
    if (model === COST_OPTIMIZED_MODE) return COST_OPTIMIZED_DESCRIPTION
    if (model === BEST_ANSWER_MODE) return BEST_ANSWER_DESCRIPTION
    return null
  }

  function providerOf(model: string): string {
    return catalog?.find(m => m.name === model)?.provider ?? 'openai'
  }

  // دو حالت خودکار (مصرف بهینه / بهترین پاسخ) همیشه به‌عنوان اولین گزینه‌ها در دسترس هستند —
  // سرویس مسیریاب مدل خودش بین مدل‌های مجاز پلن انتخاب می‌کند (docs/PRD-model-selection-modes.md)
  const options: string[] = [COST_OPTIMIZED_MODE, BEST_ANSWER_MODE, ...topModels]

  // پیکربندی هر گزینه به شکل ModelPickerItem مشترک (همون کامپوننتی که مدال ویدیو استفاده می‌کند،
  // طبق دستور کاربر: «برای عکس و متن هم عیناً همین شکلی بکن») — بج «سطح» از tier مدل ساخته می‌شود
  const items: ModelPickerItem[] = options.map(model => {
    const entry = catalog?.find(m => m.name === model)
    return {
      key: model,
      icon: modeIcon(model) ?? <ProviderIcon provider={providerOf(model)} size={17} />,
      name: displayName(model),
      blurb: descriptionOf(model) ?? entry?.description ?? (entry ? tierDescription(entry.tier) : ''),
      chips: entry?.badges ?? [],
      tier: entry ? { label: tierLabel(entry.tier), ...TIER_COLOR[entry.tier] } : null,
    }
  })

  // pick active: selectedModel if valid, else fallback to currentModel or cost-optimized mode
  const active = (selectedModel && [...AUTO_MODES, ...allowedModels].includes(selectedModel))
    ? selectedModel
    : (currentModel && [...AUTO_MODES, ...allowedModels].includes(currentModel) ? currentModel : COST_OPTIMIZED_MODE)

  // sync store when stale localStorage value is not valid anymore
  useEffect(() => {
    if (active && active !== selectedModel) setSelectedModel(active)
  }, [active, selectedModel, setSelectedModel])

  function select(model: string) {
    track('model_selected', { model, previousModel: selectedModel, source: 'header_dropdown' })
    setSelectedModel(model)
    localStorage.setItem(STORAGE_KEY, model)
  }

  function goToModelsPage() {
    track('models_page_opened')
    setOpen(false)
    navigate('/models')
  }

  return (
    <div dir="rtl">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-purple-500/[0.08] border border-purple-400/25 px-3 py-1.5 hover:bg-purple-500/[0.13] transition-colors group"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {modeIcon(active) ?? <ProviderIcon provider={providerOf(active)} />}
        <span className="text-xs font-medium text-purple-200 group-hover:text-purple-100 transition-colors">
          {displayName(active)}
        </span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          className={`w-2.5 h-2.5 text-purple-400/70 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ModelPickerModal
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        selectedKey={active}
        onSelect={select}
        title="انتخاب مدل"
        subtitle="هر مدل رو با تخصص و قیمتش ببین و انتخاب کن"
        footer={
          <button
            type="button"
            onClick={goToModelsPage}
            className="mt-3 w-full rounded-2xl border border-slate-700/60 py-2.5 text-center text-[12.5px] font-semibold text-emerald-400 hover:bg-slate-800/40"
          >
            {moreCount > 0 ? `مدل‌های بیشتر (${moreCount} مورد دیگر) ←` : 'مشاهده همه مدل‌ها ←'}
          </button>
        }
      />
    </div>
  )
}
