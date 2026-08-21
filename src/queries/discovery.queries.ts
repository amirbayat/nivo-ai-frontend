import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { CreativePromptCatalogItem, CreativeGenerationResult, CreativeCategory, CreativeGalleryItem, ProjectCustomization, ExtractionHistoryItem } from '@/types/api'

// docs/PRD-discovery-and-credits.md بخش ۵.۳/۵.۴ — کاتالوگ سبک‌های آماده + تولید + درخت دسته‌بندی

export type DiscoverySort = 'sortOrder' | 'newest' | 'cheapest' | 'priciest'

export function useDiscoveryCatalog(params: {
  outputType?: 'IMAGE' | 'TEXT'
  categoryId?: string
  sort?: DiscoverySort
}) {
  return useQuery({
    queryKey: keys.discovery.catalog(params.outputType, params.categoryId, params.sort),
    queryFn: () =>
      api
        .get<CreativePromptCatalogItem[]>('/v2/discovery/catalog', {
          params: { outputType: params.outputType, categoryId: params.categoryId, sort: params.sort },
        })
        .then(r => r.data),
  })
}

// یک آیتم کاتالوگ با id — برای دیپ‌لینک عمومی (نیوو استودیو، مثلاً nivoai.ir/studio?id=...)
export function useDiscoveryCatalogItem(id: string | undefined) {
  return useQuery({
    queryKey: keys.discovery.catalogItem(id),
    queryFn: () => api.get<CreativePromptCatalogItem>(`/v2/discovery/catalog/${id}`).then(r => r.data),
    enabled: !!id,
    retry: false,
  })
}

export function useDiscoveryCategories() {
  return useQuery({
    queryKey: keys.discovery.categories(),
    queryFn: () => api.get<CreativeCategory[]>('/v2/discovery/categories').then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useDiscoveryGallery(projectId?: string) {
  return useQuery({
    queryKey: keys.discovery.gallery(projectId),
    queryFn: () =>
      api.get<CreativeGalleryItem[]>('/v2/discovery/gallery', { params: { projectId } }).then(r => r.data),
  })
}

// متن‌های سفارشی‌سازی قبلی کاربر توی یک پروژه‌ی خاص — برای چیپ‌های «استفاده‌ی قبلی» در
// workspace پروژه (ProjectDetailPage) — از سرور: جدیدترین اول، dedupe شده، سقف ۲۰ تا
export function useProjectCustomizations(projectId: string) {
  return useQuery({
    queryKey: keys.discovery.customizations(projectId),
    queryFn: () =>
      api.get<ProjectCustomization[]>(`/v2/discovery/projects/${projectId}/customizations`).then(r => r.data),
    enabled: !!projectId,
  })
}

export function useGenerateCreative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { promptId: string; userInput?: string; projectId?: string; conversationId?: string; inputImageKeys?: string[]; model?: string; preserveFace?: boolean; useSourceImage?: boolean }) =>
      api.post<CreativeGenerationResult>('/v2/discovery/generate', dto).then(r => r.data),
    // وقتی داخل یک پروژه تولید می‌شه (workspace پروژه‌ی پین‌شده) — گالری و لیست
    // «استفاده‌های قبلی» همون پروژه باید بلافاصله نتیجه‌ی تازه رو نشون بدن.
    // نکته: تاریخچه‌ی مکالمه (keys.conv.detail) عمداً اینجا invalidate نمی‌شود — نتیجه همین‌الان
    // با virtualMessages محلی (ChatPage) نشان داده می‌شود؛ اگر همینجا هم refetch کنیم، همون
    // تولید یک بار از virtualMessages و یک بار از نسخه‌ی merge‌شده‌ی سرور تکراری نشان داده
    // می‌شود. با رفرش/بازگشت بعدی به این مکالمه (remount)، سرور خودش آن را در تاریخچه می‌آورد.
    onSuccess: (_data, vars) => {
      if (!vars.projectId) return
      void qc.invalidateQueries({ queryKey: keys.discovery.gallery(vars.projectId) })
      void qc.invalidateQueries({ queryKey: keys.discovery.customizations(vars.projectId) })
    },
  })
}

// قبل از generate برای سبک‌های requiresUserImage=true — یک data URL (نتیجه‌ی FileReader) می‌فرسته،
// کلید MinIO برمی‌گرده که بعداً توی inputImageKeys بالا استفاده می‌شه
export function useUploadDiscoveryImage() {
  return useMutation({
    mutationFn: (dataUrl: string) =>
      api.post<{ key: string }>('/v2/discovery/upload-image', { image: dataUrl }).then(r => r.data),
  })
}

export interface ExtractionModelOption {
  id: string
  name: string
  displayName: string
  provider: string
  tier: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'
  estimatedCreditCost: number
}

export interface ExtractionModelOptions {
  models: ExtractionModelOption[]
  auto: {
    bestAnswer: { modelId: string; estimatedCreditCost: number }
    costOptimized: { modelId: string; estimatedCreditCost: number }
  } | null
}

// مدل‌های قابل‌انتخاب برای «تبدیل عکس به پرامپت» + هزینه‌ی تخمینی هرکدام و دو حالت خودکار
// (بهترین نتیجه/مصرف بهینه) — قبل از آپلود/استخراج به کاربر نشون داده می‌شه
export function useExtractionModels() {
  return useQuery({
    queryKey: keys.discovery.extractionModels(),
    queryFn: () =>
      api.get<ExtractionModelOptions>('/v2/discovery/prompt-extractions/models').then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

// نتیجه دقیقاً شکل CreativePromptCatalogItem + extractedPrompt (متن استخراج‌شده) + usedModel
export function useExtractPrompt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { imageKey: string; modelId?: string; selectionMode?: 'cost_optimized' | 'best_answer' }) =>
      api
        .post<CreativePromptCatalogItem & { extractedPrompt: string; usedModel: { name: string; displayName: string } }>(
          '/v2/discovery/prompt-extractions',
          dto,
        )
        .then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.discovery.extractionHistory() }),
  })
}

// تاریخچه‌ی استخراج‌های قبلی کاربر — برای استفاده‌ی دوباره از یک پرامپت قبلاً استخراج‌شده
export function useExtractionHistory() {
  return useQuery({
    queryKey: keys.discovery.extractionHistory(),
    queryFn: () =>
      api.get<ExtractionHistoryItem[]>('/v2/discovery/prompt-extractions/history').then(r => r.data),
  })
}

// اسم‌گذاری/تغییر اسم یک پرامپت استخراج‌شده‌ی خودِ کاربر
export function useRenameExtraction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { id: string; title: string }) =>
      api.patch<{ id: string; title: string }>(`/v2/discovery/prompt-extractions/${dto.id}`, { title: dto.title }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.discovery.extractionHistory() }),
  })
}
