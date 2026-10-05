import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type {
  AdPlacement,
  AdPlacementStatusResponse,
  AnalyzeOwnerNotesResult,
  BulkCompleteResult,
  CardDisplayPolicy,
  ChannelStat,
  ClassifyBusinessSetupResult,
  CompetitorAnalysisResult,
  ContentChangeSource,
  CreateKbEntryInput,
  NotesAnalysisEntityType,
  ExtractProductsResult,
  GenerateBrandIntroResult,
  GenerateProductDescriptionResult,
  GenerateProductOptionsResult,
  ImportProductsResult,
  KbCandidateEntry,
  NeededAttentionConversation,
  ProductAiCompleteFromPhotoResult,
  ProductAiCompleteResult,
  ProductEnrichmentDraft,
  ProductImportFromUrlResult,
  SellerBotStatus,
  SellerConversationDetail,
  SellerDashboard,
  SellerOrder,
  SellerOrderStatus,
  SellerProduct,
  SellerStore,
  StoreBankCard,
  StoreBankCardsResponse,
  StoreCompleteness,
  StoreDiscountCode,
  DiscountKind,
  StoreShippingRule,
  StoreCreditPackage,
  StoreCreditStatus,
  StoreKbEntry,
  StoreKbKind,
  UpdateProductInput,
} from '@/types/api'

export interface CreateStoreInput {
  name: string
  category?: string
  // docs/PRD-business-types-and-appointment-booking.md بخش ۴ — نفرستادن = پیش‌فرض PRODUCT_SALES سمت بک‌اند
  businessType?: 'PRODUCT_SALES' | 'APPOINTMENT_BOOKING'
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
  // docs/PRD-sales-agent-persuasion-principles.md بخش ۶
  persuasionTechniquesEnabled?: boolean
  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۲/۳
  pricingModel?: 'FIXED' | 'WEIGHT_BASED_FORMULA'
  weightGrams?: number
  purityKarat?: number
}

// docs/PRD-product-display-focus-and-variations.md §۴.۱ — همیشه جایگزین کامل (نه patch)
export interface ReplaceProductVariantsInput {
  optionTypes: { name: string; values: string[] }[]
  variants: {
    optionValues: Record<string, string>
    stock: number
    priceOverride?: number | null
    sku?: string
    // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۴ — فقط برای محصول
    // WEIGHT_BASED_FORMULA، خالی = از مقدار سطح محصول استفاده کن
    weightGrams?: number
    purityKarat?: number
  }[]
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

// docs/PRD-ai-assisted-business-setup.md — قدم ۱ ویزارد، قبل از ساخت فروشگاه (بدون storeId،
// عیناً الگوی useGenerateBrandIntroAi پایین‌تر)
export function useClassifyBusinessSetup() {
  return useMutation({
    mutationFn: (rawText: string) =>
      api.post<ClassifyBusinessSetupResult>('/v2/stores/classify-business-setup', { rawText }).then(r => r.data),
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
  // docs/PRD-seller-guide-assistant-modal.md بخش ۱.۲ — قبلاً فقط در ساخت فروشگاه قابل‌تنظیم بود
  category?: string
  shippingInfo?: string
  returnPolicy?: string
  brandIntro?: string
  // docs/PRD-seller-guide-assistant-modal.md بخش ۱.۲/۱.۳
  ownerNotes?: string
  source?: ContentChangeSource
  workingHoursStart?: string
  workingHoursEnd?: string
  postPurchaseFollowUpEnabled?: boolean
  abandonedCartReminderEnabled?: boolean
  // docs/PRD-sales-agent-persuasion-principles.md بخش ۶
  persuasionTechniquesEnabled?: boolean
  // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۱
  requiresShipping?: boolean
  // docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۳ — یک‌بار برای کل فروشگاه
  goldWageType?: 'PERCENT' | 'FIXED_PER_GRAM'
  goldWageValue?: number
  goldProfitPercent?: number
  goldVatPercent?: number
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

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۱.۱ — داشبورد فروش فروشنده
export function useSellerDashboard(storeId: string) {
  return useQuery({
    queryKey: keys.seller.dashboard(storeId),
    queryFn: () => api.get<SellerDashboard>(`/v2/stores/${storeId}/dashboard`).then(r => r.data),
    enabled: !!storeId,
  })
}

// بخش ۱.۲ — سه خروجی CSV؛ همون الگوی downloadCaptionSubtitle در captionStudio.queries.ts
// (مسیر پشت JwtGuard است، نه لینک مستقیم قابل‌کلیک)
async function downloadCsv(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

export function useExportOrdersCsv(storeId: string) {
  return useMutation({
    mutationFn: () => downloadCsv(`/v2/stores/${storeId}/export/orders.csv`, 'orders.csv'),
  })
}

export function useExportProductsCsv(storeId: string) {
  return useMutation({
    mutationFn: () => downloadCsv(`/v2/stores/${storeId}/export/products.csv`, 'products.csv'),
  })
}

export function useExportCreditUsageCsv(storeId: string) {
  return useMutation({
    mutationFn: () => downloadCsv(`/v2/stores/${storeId}/export/credit-usage.csv`, 'credit-usage.csv'),
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

// docs/PRD-product-display-focus-and-variations.md §۴.۱
export function useReplaceProductVariants(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, dto }: { productId: string; dto: ReplaceProductVariantsInput }) =>
      api.put<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/variants`, dto).then(r => r.data),
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

// فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — میکروفون کنار توضیحات محصول؛ همان الگوی sendVoiceMessage در
// useShopChat.ts (ضبط با MediaRecorder، آپلود multipart)، ولی بدون semantics مکالمه
export function useTranscribeAudio(storeId: string) {
  return useMutation({
    mutationFn: (blob: Blob) => {
      const form = new FormData()
      form.append('file', blob, 'voice.webm')
      return api
        .post<{ text: string }>(`/v2/stores/${storeId}/transcribe`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}

// docs/PRD-bulk-product-import-from-document.md — نسخه‌ی فایل‌آپلودی useTranscribeAudio بالا
// (نه ضبط میکروفون)؛ اسم فایل واقعی فرستاده می‌شود تا extractAudio سمت بک‌اند پسوند را درست
// تشخیص بدهد (آن تابع اسم ثابت 'voice.webm' می‌فرستد که برای فایل آپلودی درست نیست)
export function useTranscribeAudioFile(storeId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file, file.name)
      return api
        .post<{ text: string }>(`/v2/stores/${storeId}/transcribe`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — عکس پروفایل فروشگاه (تک‌فایل، نه آرایه)
export function useUploadStoreLogo(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<SellerStore>(`/v2/stores/${storeId}/logo`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
  })
}

export function useRemoveStoreLogo(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<SellerStore>(`/v2/stores/${storeId}/logo`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
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

// docs/PRD-product-video.md بخش ۴ — چندویدیویی (سقف ۴ تا مثل images)، عیناً الگوی useUploadProductImages
export function useUploadProductVideo(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/video`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) }),
  })
}

export function useRemoveProductVideo(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, key }: { productId: string; key: string }) =>
      api.delete<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/video/${key}`).then(r => r.data),
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
    mutationFn: ({ productId, withWebSearch, currentDraft }: { productId: string; withWebSearch?: boolean; currentDraft?: string }) =>
      api
        .post<ProductAiCompleteResult>(
          `/v2/stores/${storeId}/products/${productId}/ai-complete`,
          currentDraft ? { currentDraft } : undefined,
          { params: withWebSearch ? { withWebSearch: true } : undefined },
        )
        .then(r => r.data),
  })
}

// docs/PRD-seller-knowledge-base.md بخش ۹.۲ (دوم، مورد ۵) — نتیجه هم مثل useCompleteProductInfo
// ذخیره نمی‌شود، فروشنده در همان مدال تأیید/ویرایش می‌کند
export function useCompleteProductInfoFromPhoto(storeId: string) {
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ProductAiCompleteFromPhotoResult>(
          `/v2/stores/${storeId}/products/${productId}/ai-complete-from-photo`,
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        .then(r => r.data)
    },
  })
}

// بخش ۹.۲ (دوم، مورد ۶) — تکمیل خودکار دسته‌ای؛ چیزی خودکار persist نمی‌شود، تایید هرکدام
// جدا با همان useUpdateProduct بالا انجام می‌شود
export function useBulkCompleteProducts(storeId: string) {
  return useMutation({
    mutationFn: (withWebSearch: boolean) =>
      api
        .post<BulkCompleteResult>(`/v2/stores/${storeId}/products/ai-complete-bulk`, undefined, {
          params: withWebSearch ? { withWebSearch: true } : undefined,
        })
        .then(r => r.data),
  })
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۹ (رصد رقبا) — استاتلس، مثل
// useCompleteProductInfo؛ چیزی ذخیره نمی‌شود، فقط نمایش برای الهام فروشنده
export function useAnalyzeCompetitors(storeId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<CompetitorAnalysisResult>(`/v2/stores/${storeId}/competitor-analysis`).then(r => r.data),
  })
}

// بخش ۹ (پروفایل برند عمیق‌تر در آنبوردینگ) — فقط پیشنهاد؛ ذخیره‌ی واقعی با useUpdateStore انجام می‌شود
export function useGenerateBrandIntroAi(storeId: string) {
  return useMutation({
    mutationFn: (rawText: string) =>
      api.post<GenerateBrandIntroResult>(`/v2/stores/${storeId}/brand-intro-ai`, { rawText }).then(r => r.data),
  })
}

// فیدبک کاربر ۱۴۰۵/۰۷/۱۱ — دستیار «نوشتن توضیحات با کمک AI» از روی یادداشت خام فروشنده؛
// خروجی مستقیم ذخیره نمی‌شود، فروشنده در مدال «اعمال» می‌کند (همون الگوی useGenerateBrandIntroAi)
export function useGenerateProductDescriptionFromNotes(storeId: string) {
  return useMutation({
    mutationFn: ({ productId, rawText }: { productId: string; rawText: string }) =>
      api
        .post<GenerateProductDescriptionResult>(`/v2/stores/${storeId}/products/${productId}/describe-from-notes`, { rawText })
        .then(r => r.data),
  })
}

// docs/PRD-seller-guide-assistant-modal.md بخش ۱.۲ — فروشنده نتیجه‌ی ChatGPT بیرونی (یا
// یادداشت دستی) را این‌جا پیست می‌کند؛ append به ownerNotes + پیشنهاد برای فیلدهای دیگر.
// rawText اختیاری: خالی برای دکمه‌ی «تحلیل دوباره» (فقط ownerNotes فعلی را دوباره تحلیل می‌کند)
export function useAnalyzeOwnerNotes(storeId: string) {
  return useMutation({
    mutationFn: (dto: { entityType: NotesAnalysisEntityType; productId?: string; rawText?: string }) =>
      api.post<AnalyzeOwnerNotesResult>(`/v2/stores/${storeId}/notes-analysis`, dto).then(r => r.data),
  })
}

// docs/PRD-seller-knowledge-base.md بخش ۲.۵ — فقط پیش‌نمایش، چیزی ذخیره نمی‌شود
// docs/PRD-product-display-focus-and-variations.md §۴.۱.۱ (فاز ۲) — عیناً الگوی
// useGenerateProductDescriptionFromNotes؛ خروجی مستقیم ذخیره نمی‌شود، فروشنده در
// ProductVariantsEditor چیپ‌های پیش‌پرشده را تأیید/ویرایش می‌کند
// docs/PRD-category-specific-product-pricing-and-attributes.md بخش ۳.۲ — پیش‌نمایش زنده‌ی
// قیمت طلا حین پرکردن فرم، قبل از ذخیره
export function useGoldPricePreview(storeId: string, weightGrams: number | null, purityKarat: number | null) {
  return useQuery({
    queryKey: ['seller', 'goldPricePreview', storeId, weightGrams, purityKarat],
    queryFn: () =>
      api
        .get<{ price: number | null; error: string | null }>(`/v2/stores/${storeId}/gold-price-preview`, {
          params: { weightGrams, purityKarat },
        })
        .then(r => r.data),
    enabled: !!storeId && !!weightGrams && !!purityKarat,
  })
}

export function useGenerateProductOptionsFromText(storeId: string) {
  return useMutation({
    mutationFn: ({ productId, rawText }: { productId: string; rawText: string }) =>
      api
        .post<GenerateProductOptionsResult>(`/v2/stores/${storeId}/products/${productId}/options-from-text`, { rawText })
        .then(r => r.data),
  })
}

// docs/PRD-bulk-product-import-from-document.md — فایل (PDF/Word) که چند محصول را با هم
// توصیف می‌کند → استخراج لیست محصولات؛ چیزی ذخیره نمی‌شود، فروشنده در شیت مرور هرکدام را
// تأیید می‌کند و همان useCreateProduct/useUpdateProduct معمولی را صدا می‌زند
export function useExtractProductsFromFile(storeId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<ExtractProductsResult>(`/v2/stores/${storeId}/products/extract-from-file`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}

// همان استخراج بالا برای متن پیست‌شده یا رونویسی صوت (صوت اول با useTranscribeAudio متن می‌شود)
export function useExtractProductsFromText(storeId: string) {
  return useMutation({
    mutationFn: (rawText: string) =>
      api
        .post<ExtractProductsResult>(`/v2/stores/${storeId}/products/extract-from-text`, { rawText })
        .then(r => r.data),
  })
}

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

// فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — مسیر مخصوص فروشگاه (نه v2/credits/packages عمومی قبلی) تا
// بسته‌های «مخصوص همین فروشگاه» (CreditPackage.storeId) هم کنار بسته‌های عمومی دیده شوند
export function useStoreCreditPackages(storeId: string) {
  return useQuery({
    queryKey: keys.seller.creditPackages(storeId),
    queryFn: () => api.get<StoreCreditPackage[]>(`/v2/stores/${storeId}/credit/packages`).then(r => r.data),
    enabled: !!storeId,
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

// docs/PRD-product-display-focus-and-variations.md §۳ — جایگاه فاز ۲: نمایش یک محصول مشخص
// در اولین پیام مکالمه؛ همان الگوی useAdPlacement/usePurchaseAdPlacement بالا، per-product
export function useProductAdPlacement(storeId: string, productId: string) {
  return useQuery({
    queryKey: keys.seller.productAdPlacement(storeId, productId),
    queryFn: () =>
      api
        .get<AdPlacementStatusResponse>(`/v2/stores/${storeId}/products/${productId}/ad-placement`)
        .then(r => r.data),
    enabled: !!storeId && !!productId,
  })
}

export function usePurchaseProductAdPlacement(storeId: string, productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (durationDays: 7 | 30) =>
      api
        .post<AdPlacement>(`/v2/stores/${storeId}/products/${productId}/ad-placement/purchase`, { durationDays })
        .then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.productAdPlacement(storeId, productId) })
      void qc.invalidateQueries({ queryKey: keys.seller.credit(storeId) })
    },
  })
}

// docs/PRD-product-display-focus-and-variations.md §۲.۴ — کد کوتاه لینک تلگرامی محصول را
// می‌گیرد (در صورت نبود، بک‌اند همین‌جا می‌سازد)
export function useProductTelegramLink(storeId: string) {
  return useMutation({
    mutationFn: (productId: string) =>
      api
        .post<{ shortCode: string }>(`/v2/stores/${storeId}/products/${productId}/telegram-link`)
        .then(r => r.data),
  })
}

// docs/PRD-admin-product-enrichment-review.md — پیشنهاد تایید‌شده‌ی ادمین در انتظار تصمیم
// فروشنده برای این محصول (یا null اگر چیزی در انتظار نیست)
export function usePendingEnrichmentDraft(storeId: string, productId: string) {
  return useQuery({
    queryKey: keys.seller.enrichmentDraft(storeId, productId),
    queryFn: () =>
      api
        .get<ProductEnrichmentDraft | null>(`/v2/stores/${storeId}/products/${productId}/enrichment-draft`)
        .then(r => r.data),
    enabled: !!storeId && !!productId,
  })
}

export function useApproveEnrichmentDraft(storeId: string, productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api
        .post<SellerProduct>(`/v2/stores/${storeId}/products/${productId}/enrichment-draft/approve`)
        .then(r => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.seller.enrichmentDraft(storeId, productId) })
      void qc.invalidateQueries({ queryKey: keys.seller.products(storeId) })
    },
  })
}

export function useRejectEnrichmentDraft(storeId: string, productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api
        .post(`/v2/stores/${storeId}/products/${productId}/enrichment-draft/reject`)
        .then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.enrichmentDraft(storeId, productId) }),
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
  // docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۵ مورد ۵ — تخفیف پلکانی
  minQuantity?: number
  // docs/PRD-customer-comments-and-discounts.md بخش ۱۳ — محدود کردن کد به یک محصول خاص
  productId?: string
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

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۲
export function useShippingRules(storeId: string) {
  return useQuery({
    queryKey: keys.seller.shippingRules(storeId),
    queryFn: () =>
      api.get<StoreShippingRule[]>(`/v2/stores/${storeId}/shipping-rules`).then(r => r.data),
    enabled: !!storeId,
  })
}

export interface CreateShippingRuleInput {
  provinces?: string[]
  cost: number
  enabled?: boolean
}

export function useAddShippingRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateShippingRuleInput) =>
      api.post<StoreShippingRule>(`/v2/stores/${storeId}/shipping-rules`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.shippingRules(storeId) }),
  })
}

export function useUpdateShippingRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, ...dto }: { ruleId: string; provinces?: string[]; cost?: number; enabled?: boolean }) =>
      api.patch<StoreShippingRule>(`/v2/stores/${storeId}/shipping-rules/${ruleId}`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.shippingRules(storeId) }),
  })
}

export function useDeleteShippingRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/v2/stores/${storeId}/shipping-rules/${ruleId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.shippingRules(storeId) }),
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

// docs/PRD-seller-telegram-management-bot.md — بات دوم (مدیریت پنل)؛ اتصال خودش از داخل بات
// انجام می‌شود (اشتراک شماره + OTP)، این فقط وضعیت را نشان می‌دهد/قطع می‌کند
export function useSellerBotStatus(storeId: string) {
  return useQuery({
    queryKey: keys.seller.sellerBotStatus(storeId),
    queryFn: () => api.get<SellerBotStatus>(`/v2/stores/${storeId}/seller-bot-status`).then(r => r.data),
    enabled: !!storeId,
  })
}

export function useDisconnectSellerBot(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<SellerBotStatus>(`/v2/stores/${storeId}/seller-bot-disconnect`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.sellerBotStatus(storeId) }),
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

// همان استخراج بالا برای متن مستقیم پیست‌شده (بدون فایل)
export function useExtractKbFromText(storeId: string) {
  return useMutation({
    mutationFn: (rawText: string) =>
      api
        .post<KbCandidateEntry[]>(`/v2/stores/${storeId}/knowledge/extract-text`, { rawText })
        .then(r => r.data),
  })
}
