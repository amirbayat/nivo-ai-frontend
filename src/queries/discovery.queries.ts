import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { CreativePromptCatalogItem, CreativeGenerationResult, CreativeCategory, CreativeGalleryItem, ProjectCustomization } from '@/types/api'

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
    mutationFn: (dto: { promptId: string; userInput?: string; projectId?: string; inputImageKeys?: string[]; model?: string }) =>
      api.post<CreativeGenerationResult>('/v2/discovery/generate', dto).then(r => r.data),
    // وقتی داخل یک پروژه تولید می‌شه (workspace پروژه‌ی پین‌شده) — گالری و لیست
    // «استفاده‌های قبلی» همون پروژه باید بلافاصله نتیجه‌ی تازه رو نشون بدن
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
  return useMutation({
    mutationFn: (dto: { imageKey: string; modelId?: string; selectionMode?: 'cost_optimized' | 'best_answer' }) =>
      api
        .post<CreativePromptCatalogItem & { extractedPrompt: string; usedModel: { name: string; displayName: string } }>(
          '/v2/discovery/prompt-extractions',
          dto,
        )
        .then(r => r.data),
  })
}
