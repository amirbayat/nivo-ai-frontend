import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type {
  CreateNutritionProfileInput,
  NivoCalDailySummary,
  NivoCalLog,
  NivoCalScanResult,
  NutritionProfile,
  WeightLogEntry,
} from '@/types/api'

export function useFoodLogs() {
  return useQuery({
    queryKey: keys.nivoCal.logs(),
    queryFn: () => api.get<NivoCalLog[]>('/nivo-cal/logs').then(r => r.data),
  })
}

export function useScanFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { image: string; note?: string }) =>
      api.post<NivoCalScanResult & { id: string; imageUrl: string; createdAt: string }>('/nivo-cal/scan', dto).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.nivoCal.logs() })
      void qc.invalidateQueries({ queryKey: keys.nivoCal.dailySummary() })
    },
  })
}

// null یعنی کاربر هنوز پروفایل نساخته — این حالت خطا نیست، تصمیم UI (نمایش CTA یا داشبورد) را می‌سازد.
// بک‌اند { profile } را برمی‌گرداند نه مستقیم null — یک پاسخ کنترلر که دقیقاً null باشد باعث
// می‌شود NestJS بدنه‌ی پاسخ را کاملاً خالی بفرستد (نه JSON literal «null»)، که اینجا با یک رشته‌ی
// خالی (نه null) به دستمان می‌رسید و چک‌های profile===null را همیشه false می‌کرد.
export function useNutritionProfile() {
  return useQuery({
    queryKey: keys.nivoCal.profile(),
    queryFn: () => api.get<{ profile: NutritionProfile | null }>('/nivo-cal/profile').then(r => r.data.profile),
  })
}

export function useCreateNutritionProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateNutritionProfileInput) =>
      api.post<NutritionProfile>('/nivo-cal/profile', dto).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.nivoCal.profile() })
      void qc.invalidateQueries({ queryKey: keys.nivoCal.dailySummary() })
    },
  })
}

export function useDailySummary(enabled = true) {
  return useQuery({
    queryKey: keys.nivoCal.dailySummary(),
    queryFn: () => api.get<NivoCalDailySummary>('/nivo-cal/daily-summary').then(r => r.data),
    enabled,
  })
}

export function useLogWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weightKg: number) =>
      api.post<WeightLogEntry>('/nivo-cal/weight', { weightKg }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.nivoCal.dailySummary() }),
  })
}

// برای حذف اسکن‌های اشتباهی/تستی از تاریخچه یا فهرست وعده‌های امروز
export function useDeleteFoodLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/nivo-cal/logs/${id}`).then(() => id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.nivoCal.logs() })
      void qc.invalidateQueries({ queryKey: keys.nivoCal.dailySummary() })
    },
  })
}
