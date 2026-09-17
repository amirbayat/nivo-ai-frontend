import { ProviderIcon } from '@/components/models/ProviderIcon'
import { type ModelPickerItem } from '@/components/models/ModelPickerModal'
import { imageQualityLabel, tierDescription, TIER_COLOR } from '@/lib/model-catalog'
import { track } from '@/lib/events'
import { fa } from '@/locales/fa'
import type { ModelCatalogEntry } from '@/queries/plans.queries'

const IMAGE_GEN_MODEL_STORAGE_KEY = 'nivo:selectedImageGenModel'

// همون منطق کارت‌سازی مدال انتخاب مدل که قبلاً جدا-جدا در StudioComposer.tsx و ModelsPage.tsx
// تکرار شده بود — یک نسخه‌ی مشترک تا استفاده‌کننده‌ی تازه (MessageInput.tsx) هم آن را کپی نکند.
export function buildImageGenModelPickerItems(imageGenModels: ModelCatalogEntry[]): ModelPickerItem[] {
  return [
    {
      key: '__auto__',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
          <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z" />
        </svg>
      ),
      name: 'خودکار (پیش‌فرض)',
      blurb: 'کیفیت/ابعاد بر اساس توصیف و اعتبار انتخاب می‌شود.',
    },
    ...imageGenModels.map(model => ({
      key: model.name,
      icon: <ProviderIcon provider={model.provider} size={17} />,
      name: model.displayName,
      blurb: model.description || tierDescription(model.tier),
      tier: { label: imageQualityLabel(model.tier), ...TIER_COLOR[model.tier] },
      chips: model.estimatedImageGenCreditCost != null
        ? [`حدود ${fa.discover.creditCost(model.estimatedImageGenCreditCost)}`]
        : undefined,
    })),
  ]
}

// پایدارسازی انتخاب مدل تولید عکس به‌عنوان دیفالت مرورگر — store + localStorage با هم، دقیقاً
// همان دو خط تکراری در StudioComposer.tsx/ModelsPage.tsx
export function persistImageGenModelChoice(
  model: string | null,
  setSelectedImageGenModel: (model: string | null) => void,
  source: string,
) {
  track('image_gen_model_selected', { model: model ?? 'auto', source })
  setSelectedImageGenModel(model)
  if (model) localStorage.setItem(IMAGE_GEN_MODEL_STORAGE_KEY, model)
  else localStorage.removeItem(IMAGE_GEN_MODEL_STORAGE_KEY)
}
