import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/store/chat.store'
import { useMe } from '@/queries/auth.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { env } from '@/env'
import { COST_OPTIMIZED_MODE, COST_OPTIMIZED_DESCRIPTION, BEST_ANSWER_MODE, BEST_ANSWER_DESCRIPTION } from '@/lib/model-catalog'
import { ProviderIcon } from '@/components/models/ProviderIcon'
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
      <path
        d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z"
        fill="currentColor"
      />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-amber-400 shrink-0">
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
  const ref = useRef<HTMLDivElement>(null)

  // پیش‌فرض: فقط مدل‌های چت (نه IMAGE_GEN) — چون این دراپ‌داون قرار است برای پیام‌های متنی
  // استفاده شود. اما اگر یک سبک تصویری استودیو انتخاب شده باشد (selectedCreativePrompt)،
  // برعکس می‌شود: فقط مدل‌های تولید عکس قابل‌انتخاب‌اند — همان مدلی که به generate() می‌رود
  const wantsImageGen = selectedCreativePrompt?.outputType === 'IMAGE'
  const matchesRequiredType = (name: string) => {
    const modelType = catalog?.find(m => m.name === name)?.modelType
    return wantsImageGen ? modelType === 'IMAGE_GEN' : modelType !== 'IMAGE_GEN'
  }
  // پلن‌های اعتباری (PAYG) محدود به plan.allowedModels نیستند — کل کاتالوگ فعال در دسترس است
  const catalogModelNames = (catalog ?? []).map(m => m.name)
  const planAllowedModels = me?.plan?.isPayAsYouGo
    ? catalogModelNames
    : (me?.plan?.allowedModels ?? [env.VITE_DEFAULT_MODEL])
  const allowedModels: string[] = planAllowedModels.filter(matchesRequiredType)
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

  // pick active: selectedModel if valid, else fallback to currentModel or best-answer mode
  const active = (selectedModel && [...AUTO_MODES, ...allowedModels].includes(selectedModel))
    ? selectedModel
    : (currentModel && [...AUTO_MODES, ...allowedModels].includes(currentModel) ? currentModel : BEST_ANSWER_MODE)

  // sync store when stale localStorage value is not valid anymore
  useEffect(() => {
    if (active && active !== selectedModel) setSelectedModel(active)
  }, [active, selectedModel, setSelectedModel])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(model: string) {
    track('model_selected', { model, previousModel: selectedModel, source: 'header_dropdown' })
    setSelectedModel(model)
    localStorage.setItem(STORAGE_KEY, model)
    setOpen(false)
  }

  function goToModelsPage() {
    track('models_page_opened')
    setOpen(false)
    navigate('/models')
  }

  return (
    <div ref={ref} className="relative" dir="rtl">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-700/60 px-2.5 py-1 hover:bg-slate-700 transition-colors group"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {modeIcon(active) ?? <ProviderIcon provider={providerOf(active)} />}
        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
          {displayName(active)}
        </span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          className={`w-2.5 h-2.5 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/*
        این دراپ‌داون داخل هدر چت با mr-auto به سمت چپ صفحه هل داده می‌شود (docs: چیدمان header چت) —
        اگر با right-0 انکر شود، از همون سمت چپ که به آن نزدیک است باز می‌شود و از صفحه بیرون می‌زند.
        با left-0 انکر می‌کنیم تا به سمت راست (جایی که فضای خالی هست) باز شود؛ عرض هم به viewport کلمپ می‌شود
        تا در موبایل هم بیرون نزند.
      */}
      {open && (
        <div dir="rtl" className="absolute top-full left-0 mt-1.5 z-50 w-[min(280px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-x-hidden">
          {options.map((model, idx) => (
            <div key={model}>
              {/* جداکننده‌ی بصری بین دو حالت خودکار و لیست انتخاب دستی مدل‌های مشخص */}
              {idx === AUTO_MODES.length && (
                <div className="border-t border-slate-700/70 px-3 pt-2 pb-1 text-[11px] font-medium text-slate-600">
                  انتخاب دستی مدل
                </div>
              )}
              <button
                onClick={() => select(model)}
                className={`w-full flex flex-col gap-1 px-3 py-2.5 text-right text-sm transition-colors
                  ${model === active
                    ? 'bg-slate-700 text-slate-200'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
              >
                <span className="flex w-full items-center gap-2">
                  {modeIcon(model) ?? <ProviderIcon provider={providerOf(model)} />}
                  {displayName(model)}
                  {model === active && (
                    <svg viewBox="0 0 12 12" fill="none" className="mr-auto w-3 h-3 text-emerald-500 shrink-0">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {descriptionOf(model) && (
                  <span dir="rtl" className="pr-5 text-[11px] leading-relaxed text-slate-500 text-right">{descriptionOf(model)}</span>
                )}
              </button>
            </div>
          ))}

          <button
            onClick={goToModelsPage}
            className="w-full border-t border-slate-700/70 px-3 py-2.5 text-right text-xs font-medium text-emerald-400 hover:bg-slate-700/50 transition-colors"
          >
            {moreCount > 0 ? `مدل‌های بیشتر (${moreCount} مورد دیگر) ←` : 'مشاهده همه مدل‌ها ←'}
          </button>
        </div>
      )}
    </div>
  )
}
