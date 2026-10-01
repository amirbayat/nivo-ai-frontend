import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type {
  AdPlacement,
  AdPlacementStatusResponse,
  CardDisplayPolicy,
  ChannelStat,
  CreateKbEntryInput,
  ImportProductsResult,
  KbCandidateEntry,
  NeededAttentionConversation,
  ProductAiCompleteResult,
  ProductImportFromUrlResult,
  SellerConversationDetail,
  SellerOrder,
  SellerOrderStatus,
  SellerProduct,
  SellerStore,
  StoreBankCard,
  StoreBankCardsResponse,
  StoreCompleteness,
  StoreDiscountCode,
  DiscountKind,
  StoreCreditPackage,
  StoreCreditStatus,
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
  code?: string
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

// docs/PRD-product-strategy-and-roadmap.md بخش ۳.۲ — فیلدهای ساختاریافته‌ی فروشگاه (ارسال/
// مرجوعی/معرفی برند/ساعت پاسخ‌گویی)، قابل ویرایش بعد از ثبت‌نام
export interface UpdateStoreInput {
  shippingInfo?: string
  returnPolicy?: string
  brandIntro?: string
  workingHoursStart?: string
  workingHoursEnd?: string
  postPurchaseFollowUpEnabled?: boolean
  abandonedCartReminderEnabled?: boolean
}

export function useUpdateStore(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateStoreInput) => api.patch<SellerStore>(`/v2/stores/${storeId}`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
  })
}

// بخش ۳.۱ — امتیاز کلی تکمیل‌بودن فروشگاه + چک‌لیست، برای کارت «خانه»‌ی پنل
export function useStoreCompleteness(storeId: string) {
  return useQuery({
    queryKey: keys.seller.completeness(storeId),
    queryFn: () => api.get<StoreCompleteness>(`/v2/stores/${storeId}/completeness`).then(r => r.data),
    enabled: !!storeId,
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
    mutationFn: ({ productId, withWebSearch }: { productId: string; withWebSearch?: boolean }) =>
      api
        .post<ProductAiCompleteResult>(`/v2/stores/${storeId}/products/${productId}/ai-complete`, undefined, {
          params: withWebSearch ? { withWebSearch: true } : undefined,
        })
        .then(r => r.data),
  })
}

// docs/PRD-seller-knowledge-base.md بخش ۲.۵ — فقط پیش‌نمایش، چیزی ذخیره نمی‌شود
export function useImportProductFromUrl(storeId: string) {
  return useMutation({
    mutationFn: (url: string) =>
      api
        .post<ProductImportFromUrlResult>(`/v2/stores/${storeId}/products/import-from-url`, { url })
        .then(r => r.data),
  })
}

export function useAddProductImagesFromUrl(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, urls }: { productId: string; urls: string[] }) =>
      api
        .post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/images/from-url`, { urls })
        .then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
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

// docs/PRD-seller-credit-billing.md بخش ۱/۵/۷ — موجودی اعتبار AI + خرید self-serve
export function useStoreCredit(storeId: string) {
  return useQuery({
    queryKey: keys.seller.credit(storeId),
    queryFn: () => api.get<StoreCreditStatus>(`/v2/stores/${storeId}/credit`).then(r => r.data),
    enabled: !!storeId,
  })
}

export function useStoreCreditPackages() {
  return useQuery({
    queryKey: keys.seller.creditPackages(),
    queryFn: () =>
      api
        .get<StoreCreditPackage[]>('/v2/credits/packages', { params: { scope: 'STORE_AI_CREDIT' } })
        .then(r => r.data),
  })
}

export function usePurchaseStoreCredit(storeId: string) {
  return useMutation({
    mutationFn: (packageId: string) =>
      api
        .post<{ paymentUrl: string }>(`/v2/stores/${storeId}/credit/purchase`, { packageId })
        .then(r => r.data),
  })
}

// docs/PRD-seller-advertising-placements.md — وضعیت فعلی + بازه‌های قیمتی ثابت جایگاه تبلیغاتی
export function useAdPlacement(storeId: string) {
  return useQuery({
    queryKey: keys.seller.adPlacement(storeId),
    queryFn: () =>
      api.get<AdPlacementStatusResponse>(`/v2/stores/${storeId}/ad-placement`).then(r => r.data),
    enabled: !!storeId,
  })
}

export function usePurchaseAdPlacement(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (durationDays: 7 | 30) =>
      api
        .post<AdPlacement>(`/v2/stores/${storeId}/ad-placement/purchase`, { durationDays })
        .then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.adPlacement(storeId) })
      void qc.invalidateQueries({ queryKey: keys.seller.credit(storeId) })
    },
  })
}

// docs/PRD-seller-multi-bank-card-rotation.md
export function useBankCards(storeId: string) {
  return useQuery({
    queryKey: keys.seller.bankCards(storeId),
    queryFn: () =>
      api.get<StoreBankCardsResponse>(`/v2/stores/${storeId}/bank-cards`).then(r => r.data),
    enabled: !!storeId,
  })
}

export interface CreateBankCardInput {
  cardNumber: string
  ownerName: string
  sortOrder?: number
  thresholdToman?: number
  percentWeight?: number
}

export function useAddBankCard(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateBankCardInput) =>
      api.post<StoreBankCard>(`/v2/stores/${storeId}/bank-cards`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.bankCards(storeId) }),
  })
}

export interface UpdateBankCardInput {
  isActive?: boolean
  ownerName?: string
  sortOrder?: number
  thresholdToman?: number
  percentWeight?: number
}

export function useUpdateBankCard(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, dto }: { cardId: string; dto: UpdateBankCardInput }) =>
      api.patch<StoreBankCard>(`/v2/stores/${storeId}/bank-cards/${cardId}`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.bankCards(storeId) }),
  })
}

// docs/PRD-sales-agent-admin-analytics.md بخش ۴ — مقایسه‌ی نرخ تبدیل وب در برابر تلگرام
export function useChannelStats(storeId: string) {
  return useQuery({
    queryKey: keys.seller.channelStats(storeId),
    queryFn: () => api.get<ChannelStat[]>(`/v2/stores/${storeId}/channel-stats`).then(r => r.data),
    enabled: !!storeId,
  })
}

// docs/PRD-customer-comments-and-discounts.md بخش ۸
export function useDiscountCodes(storeId: string) {
  return useQuery({
    queryKey: keys.seller.discountCodes(storeId),
    queryFn: () =>
      api.get<StoreDiscountCode[]>(`/v2/stores/${storeId}/discount-codes`).then(r => r.data),
    enabled: !!storeId,
  })
}

export interface CreateDiscountCodeInput {
  code: string
  kind: DiscountKind
  value: number
  maxRedemptions?: number
  expiresAt?: string
}

export function useAddDiscountCode(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateDiscountCodeInput) =>
      api.post<StoreDiscountCode>(`/v2/stores/${storeId}/discount-codes`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.discountCodes(storeId) }),
  })
}

export function useUpdateDiscountCode(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ codeId, isActive }: { codeId: string; isActive: boolean }) =>
      api.patch<StoreDiscountCode>(`/v2/stores/${storeId}/discount-codes/${codeId}`, { isActive }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.discountCodes(storeId) }),
  })
}

export function useUpdateCardPolicy(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (policy: CardDisplayPolicy) =>
      api.patch(`/v2/stores/${storeId}/card-policy`, { policy }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.bankCards(storeId) }),
  })
}

// docs/PRD-telegram-bot-channel.md بخش ۹.۱ — توکن یک‌بارمصرف برای دیپ‌لینک اتصال تلگرام
// شخصی فروشنده؛ نیازی به invalidate نیست چون خودش هیچ‌جا cache نمی‌شود، فقط یک‌بار مصرف می‌شود
export function useCreateTelegramConnectToken(storeId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<{ token: string }>(`/v2/stores/${storeId}/telegram-connect-token`).then(r => r.data),
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
