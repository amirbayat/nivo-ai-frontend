import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type {
  CreateKbEntryInput,
  ImportProductsResult,
  KbCandidateEntry,
  NeededAttentionConversation,
  ProductAiCompleteResult,
  SellerConversationDetail,
  SellerOrder,
  SellerOrderStatus,
  SellerProduct,
  SellerStore,
  StoreKbEntry,
  StoreKbKind,
  UpdateProductInput,
} from '@/types/api'

export interface CreateStoreInput {
  name: string
  category?: string
  slug: string
  bankCardNumber: string
  bankOwnerName: string
  instagramUrl?: string
  telegramUrl?: string
  websiteUrl?: string
}

export interface CreateProductInput {
  name: string
  basePrice: number
  stock?: number
  description?: string
}

export function useMyStores() {
  return useQuery({
    queryKey: keys.seller.stores(),
    queryFn: () => api.get<SellerStore[]>('/v2/stores/me').then(r => r.data),
    enabled: !!localStorage.getItem('access_token'),
  })
}

// debounce بیرون از این هوک انجام می‌شود (صدا زدن با یک slug که با تایپ‌کردن تغییر می‌کند)
export function useCheckSlugAvailable(slug: string) {
  return useQuery({
    queryKey: keys.seller.slugAvailable(slug),
    queryFn: () => api.get<{ available: boolean }>('/v2/stores/slug-available', { params: { slug } }).then(r => r.data.available),
    enabled: slug.length >= 3,
    staleTime: 10_000,
  })
}

export function useCreateStore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateStoreInput) => api.post<SellerStore>('/v2/stores', dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
  })
}

export function useCreateProduct(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateProductInput) =>
      api.post<SellerProduct>(`/v2/stores/${storeId}/products`, dto).then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.stores() })
      void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) })
    },
  })
}

// docs/PRD-mvp-launch-plan.md گام ۳ — پنل فروشنده

export function useProducts(storeId: string) {
  return useQuery({
    queryKey: keys.seller.products(storeId),
    queryFn: () => api.get<SellerProduct[]>(`/v2/stores/${storeId}/products`).then(r => r.data),
    enabled: !!storeId,
  })
}

export function useUpdateProduct(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, dto }: { productId: string; dto: UpdateProductInput }) =>
      api.patch<SellerProduct>(`/v2/stores/${storeId}/products/${productId}`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useDeleteProduct(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => api.delete(`/v2/stores/${storeId}/products/${productId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

// فیدبک اول پایلوت — آپلود/حذف عکس محصول (حداکثر ۴ تا)
export function useUploadProductImages(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, files }: { productId: string; files: File[] }) => {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      return api
        .post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/images`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useDeleteProductImage(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, key }: { productId: string; key: string }) =>
      api.delete<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/images/${key}`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useImportProducts(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ImportProductsResult>(`/v2/stores/${storeId}/products/import`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useOrders(storeId: string, status?: SellerOrderStatus) {
  return useQuery({
    queryKey: keys.seller.orders(storeId, status),
    queryFn: () =>
      api
        .get<SellerOrder[]>(`/v2/stores/${storeId}/orders`, { params: status ? { status } : undefined })
        .then(r => r.data),
    enabled: !!storeId,
  })
}

export function useApproveOrder(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<SellerOrder>(`/v2/stores/${storeId}/orders/${orderId}/approve`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.orders(storeId) }),
  })
}

export function useRejectOrder(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      api.post<SellerOrder>(`/v2/stores/${storeId}/orders/${orderId}/reject`, { reason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.orders(storeId) }),
  })
}

export function useNeededAttention(storeId: string) {
  return useQuery({
    queryKey: keys.seller.attention(storeId),
    queryFn: () =>
      api.get<NeededAttentionConversation[]>(`/v2/stores/${storeId}/conversations`).then(r => r.data),
    enabled: !!storeId,
    refetchInterval: 20_000,
  })
}

export function useSellerConversation(storeId: string, conversationId: string) {
  return useQuery({
    queryKey: keys.seller.conversation(storeId, conversationId),
    queryFn: () =>
      api
        .get<SellerConversationDetail>(`/v2/stores/${storeId}/conversations/${conversationId}`)
        .then(r => r.data),
    enabled: !!storeId && !!conversationId,
    refetchInterval: 3500,
  })
}

export function useSendSellerMessage(storeId: string, conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      api.post(`/v2/stores/${storeId}/conversations/${conversationId}/messages`, { text }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.conversation(storeId, conversationId) }),
  })
}

export function useUnmuteConversation(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/v2/stores/${storeId}/conversations/${conversationId}/unmute`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.attention(storeId) })
      void qc.invalidateQueries({ queryKey: keys.seller.stores() })
    },
  })
}

// docs/PRD-seller-knowledge-base.md بخش ۲ — دستیار تکمیل محصول با AI (نتیجه ذخیره نمی‌شود،
// فروشنده در همان شیت تأیید/ویرایش می‌کند و بعد save می‌زند)
export function useCompleteProductInfo(storeId: string) {
  return useMutation({
    mutationFn: (productId: string) =>
      api
        .post<ProductAiCompleteResult>(`/v2/stores/${storeId}/products/${productId}/ai-complete`)
        .then(r => r.data),
  })
}

// بخش ۳ — باکس دانش فروشگاه
export function useKbEntries(storeId: string, kind?: StoreKbKind) {
  return useQuery({
    queryKey: keys.seller.kbEntries(storeId, kind),
    queryFn: () =>
      api
        .get<StoreKbEntry[]>(`/v2/stores/${storeId}/knowledge`, { params: kind ? { kind } : undefined })
        .then(r => r.data),
    enabled: !!storeId,
  })
}

export function useCreateKbEntry(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateKbEntryInput) =>
      api.post<StoreKbEntry>(`/v2/stores/${storeId}/knowledge`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.kbEntries(storeId) }),
  })
}

export function useDeleteKbEntry(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v2/stores/${storeId}/knowledge/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.kbEntries(storeId) }),
  })
}

// آپلود فایل → کاندیدهای استخراج‌شده (هنوز ذخیره نشده — بخش ۳.۳، فروشنده باید هرکدام را
// جدا با useCreateKbEntry تأیید کند)
export function useExtractKbFile(storeId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<KbCandidateEntry[]>(`/v2/stores/${storeId}/knowledge/extract-file`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}
