import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMe } from '@/queries/auth.queries'
import { useModelCatalog, type ModelCatalogEntry } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import { env } from '@/env'
import { OPTIMAL_MODE, OPTIMAL_DESCRIPTION, tierDescription, tierLabel, type ModelTier } from '@/lib/model-catalog'
import { ProviderIcon } from '@/components/models/ProviderIcon'

const STORAGE_KEY = 'nivo:selectedModel'
const TIER_ORDER: ModelTier[] = ['SIMPLE', 'MEDIUM', 'COMPLEX']

function OptimalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" fill="currentColor" />
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

export function ModelsPage() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const { data: catalog, isLoading } = useModelCatalog()
  const { selectedModel, setSelectedModel } = useChatStore()

  const allowedModels: string[] = me?.subscription?.plan?.allowedModels ?? [env.VITE_DEFAULT_MODEL]

  function select(model: string) {
    setSelectedModel(model)
    localStorage.setItem(STORAGE_KEY, model)
    navigate(-1)
  }

  function ModelCard({ model }: { model: ModelCatalogEntry }) {
    const isAllowed = allowedModels.includes(model.name)
    const isActive = selectedModel === model.name

    // مدل قفل‌شده هم باید کلیک‌پذیر بماند (کل کارت برود به /pricing) — به همین دلیل
    // دیگه button-در-button نداریم (که HTML نامعتبر بود و باعث می‌شد فقط دکمه‌ی
    // داخلی کوچیک کلیک‌پذیر باشه، نه کل کارت)
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => (isAllowed ? select(model.name) : navigate('/pricing'))}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') (isAllowed ? select(model.name) : navigate('/pricing'))
        }}
        className={clsx(
          'flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-5 text-right transition-all',
          !isAllowed && 'opacity-50',
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
          {!isAllowed && (
            <span className="mt-2.5 block text-xs font-medium text-emerald-400">
              نیاز به ارتقا پلن ←
            </span>
          )}
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
          {/* بهینه — همیشه اول و در دسترس */}
          <button
            onClick={() => select(OPTIMAL_MODE)}
            className={clsx(
              'flex w-full items-start gap-4 rounded-2xl border p-5 text-right transition-all',
              selectedModel === OPTIMAL_MODE
                ? 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600',
            )}
          >
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <OptimalIcon />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100">مدل بهینه</h3>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">پیشنهادی</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{OPTIMAL_DESCRIPTION}</p>
            </div>
            {selectedModel === OPTIMAL_MODE && <Check />}
          </button>

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
              const models = (catalog ?? []).filter(m => m.tier === tier)
              if (!models.length) return null
              return (
                <div key={tier} className="space-y-3 pt-2">
                  <p className="text-xs font-medium text-slate-500">سطح {tierLabel(tier)}</p>
                  {models.map(model => <ModelCard key={model.name} model={model} />)}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
