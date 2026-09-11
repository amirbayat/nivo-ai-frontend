import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'

interface FeatureFlags {
  showDailyBudget: boolean
  showMonthlyTokenUsage: boolean
  // docs/PRD-chat-images.md بخش ۵.۶ — از ChatConfig ادمین می‌آیند، نه ثابت در کد فرانت
  maxImagesPerMessage: number
  maxImageSizeMb: number
  // docs/PRD-chat-files-and-pdf.md بخش ۳
  maxFilesPerMessage: number
  maxFileSizeMb: number
  maxVideoSizeMb: number
  maxAudioSizeMb: number
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: keys.config.features(),
    queryFn: () => api.get<FeatureFlags>('/config/features').then(r => r.data),
    staleTime: 10 * 60_000,
    // اگر بک‌اند لحظه‌ای در دسترس نبود، پیش‌فرض «نمایش بده» تا چیزی به‌غلط قایم نشه
    placeholderData: {
      showDailyBudget: true, showMonthlyTokenUsage: true,
      maxImagesPerMessage: 4, maxImageSizeMb: 8,
      maxFilesPerMessage: 3, maxFileSizeMb: 10,
      maxVideoSizeMb: 12, maxAudioSizeMb: 10,
    },
  })
}
