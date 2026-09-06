import { ProviderIcon } from '@/components/models/ProviderIcon'
import { ModelPickerModal, type ModelPickerItem } from '@/components/models/ModelPickerModal'
import type { ModelCatalogEntry } from '@/queries/plans.queries'
import {
  formatDurationRange,
  formatOrientationTags,
  getVideoModelBlurb,
  getVideoPriceTier,
  VIDEO_PRICE_TIER_COLOR,
  VIDEO_PRICE_TIER_LABEL,
} from './curatedModels'

// دستور صریح کاربر: دراپ‌دون کوچک انتخاب مدل ویدیو بد است — روی موبایل باید یک مدال تمام‌صفحه‌ی
// انیمیشن‌دار باز شود، روی دسکتاپ یک مدال بزرگ و قشنگ؛ هرکدام کارت مدل با توضیح «به چه دردی
// می‌خورد» و امکاناتش را نشان بدهند. این کامپوننت حالا فقط یک adapter نازک روی
// `ModelPickerModal` مشترک است (که با همین ظاهر برای مدل‌های چت/عکس هم استفاده می‌شود، طبق
// دستور کاربر: «برای عکس و متن هم عیناً همین شکلی بکن») — فقط توضیح/چیپ/قیمت مخصوص ویدیو را
// می‌سازد و بقیه را به کامپوننت مشترک می‌سپارد.
function toItem(model: ModelCatalogEntry): ModelPickerItem {
  const durationLabel = formatDurationRange(model.videoGenSupportedDurationsSec)
  const orientations = formatOrientationTags(model.videoGenSupportedSizes)
  const tier = getVideoPriceTier(model.videoGenPricePerSecondUsd)
  return {
    key: model.name,
    icon: <ProviderIcon provider={model.provider} size={17} />,
    name: model.displayName,
    blurb: getVideoModelBlurb(model),
    chips: [durationLabel, ...orientations].filter(Boolean) as string[],
    tier: tier ? { label: VIDEO_PRICE_TIER_LABEL[tier], ...VIDEO_PRICE_TIER_COLOR[tier] } : null,
  }
}

export function VideoModelPickerModal({
  open,
  onClose,
  models,
  selectedName,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  models: ModelCatalogEntry[]
  selectedName: string | null
  onSelect: (name: string) => void
}) {
  return (
    <ModelPickerModal
      open={open}
      onClose={onClose}
      items={models.map(toItem)}
      selectedKey={selectedName}
      onSelect={onSelect}
      title="انتخاب مدل ویدیو"
      subtitle="هر مدل رو با کارایی و قیمتش ببین و انتخاب کن"
    />
  )
}
