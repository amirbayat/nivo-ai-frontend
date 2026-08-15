import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { CreativePromptCatalogItem, CreativeGenerationResult, CreativeCategory, CreativeGalleryItem } from '@/types/api'

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

export function useGenerateCreative() {
  return useMutation({
    mutationFn: (dto: { promptId: string; userInput?: string; projectId?: string; inputImageKeys?: string[] }) =>
      api.post<CreativeGenerationResult>('/v2/discovery/generate', dto).then(r => r.data),
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
