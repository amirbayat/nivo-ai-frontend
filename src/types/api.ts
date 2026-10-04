import type { InputFieldsSchema, FieldValues } from './inputFields'

export interface User {
  id: string
  phone: string
  name: string | null
  role: 'USER' | 'ADMIN'
  isActive: boolean
  subscription: Subscription | null
  // پلن مؤثر کاربر — همیشه پر است (چه کاربر Subscription واقعی داشته باشد چه رایگان و
  // بدون Subscription)؛ برای اطلاعات پلن (مدل‌های مجاز/ویژه و ...) از این استفاده کن، نه از
  // subscription?.plan — چون کاربر رایگان subscription ندارد و آن مسیر همیشه undefined می‌ماند.
  plan: Plan | null
  referralCode: string
}

export interface OnboardingGiftStatus {
  eligible: boolean
  phase: 'trial' | 'grace' | null
  graceDeadline: string | null
  welcomeDiscountValidHours: number
  gift: { title: string; description: string; audioUrl: string | null } | null
}

export interface ClaimGiftResult {
  code: string
  discountPercent: number
  expiresAt: string | null
}

export interface MyDiscountCode {
  id: string
  code: string
  discountPercent: number
  source: 'WELCOME_GIFT' | 'EXPIRY_REMINDER' | 'REFERRAL' | 'MANUAL'
  expiresAt: string | null
}

export interface Plan {
  id: string
  name: string
  priceMonthly: number
  dailyFreeTokens: number
  monthlyTotalTokens: number
  allowedModels: string[]
  features: Record<string, unknown>
  sortOrder: number
  isActive: boolean
  isPopular: boolean
  featuredModels: string[]
  featuredModelsCount: number
  maxInputTokens: number
  outputThrottleSteps: { afterMessages: number; maxOutputTokens: number }[]
  dailyMessageLimit: number | null
  throttledMessageCount: number | null
  throttledInputTokens: number | null
  throttledOutputTokens: number | null
  rollingWindowLimit: number | null
  rollingWindowHours: number
  isPayAsYouGo: boolean
  payAsYouGoMarkup: number | null
  payAsYouGoMinActivationToman: number | null
  payAsYouGoMinTopupToman: number | null
  payAsYouGoTopupPresets: number[] | null
  defaultImageGenModel: string | null
  maxImageGenPerDay: number | null
  maxImageGenPerWindow: number | null
  imageGenWindowHours: number | null
}

export interface WalletTransaction {
  id: string
  type: 'CREDIT' | 'DEBIT'
  amountToman: number
  description: string | null
  createdAt: string
}

// docs/PRD-discovery-and-credits.md — «نیوو» واحد نمایشی روی همان Wallet.balanceToman
export interface CreditsBalance {
  credits: number
  balanceToman: number
  tomanPerCredit: number
}

export interface CreditPackage {
  id: string
  credits: number
  discountPercent: number
  isPopular: boolean
  isBestValue: boolean
  isCustomAmount: boolean
  isActive: boolean
  sortOrder: number
  priceToman: number
}

// docs/PRD-product-strategy-and-roadmap.md بخش ۳.۱ — امتیاز تکمیل‌بودن، محاسبه‌شده در بک‌اند
export interface ProductCompleteness {
  percent: number
  missing: string[]
}

// docs/PRD-product-video.md بخش ۴ — Product.videos (چندویدیویی)، جایگزین videoKey/videoDurationSec تک‌مقداری
export interface ProductVideoItem {
  key: string
  durationSec: number
}

// docs/PRD-mvp-launch-plan.md گام ۰ — فروشگاه ایجنت فروش دایرکت/تلگرام
export interface SellerProduct {
  id: string
  storeId: string
  name: string
  basePrice: number
  stock: number
  images: string[]
  videos: ProductVideoItem[]
  description: string | null
  // docs/PRD-seller-knowledge-base.md بخش ۹.۲ (سوم) — قبلاً suggestedSpecs فقط به متن description
  // اضافه می‌شد؛ حالا جدا و ساختاریافته هم ذخیره می‌شود
  specs: ProductSpecSuggestion[] | null
  // docs/PRD-telegram-bot-channel.md بخش ۹.۳ — کد کوتاه اختیاری روی محتوای تبلیغاتی فروشنده
  code: string | null
  createdAt: string
  // فقط GET /v2/stores/:id/products این را پر می‌کند (نه SellerStore.products از GET me)
  completeness?: ProductCompleteness
  // docs/PRD-sales-agent-persuasion-principles.md بخش ۶ — کلید به‌ازای این محصول (AND با
  // SellerStore.persuasionTechniquesEnabled)
  persuasionTechniquesEnabled: boolean
  // docs/PRD-product-display-focus-and-variations.md §۴.۱ — فقط GET /v2/stores/:id/products
  // این را پر می‌کند (عیناً مثل completeness بالا)؛ خالی/نبودن یعنی محصول ساده (بدون گزینه) است
  optionTypes?: ProductOptionType[]
  variants?: ProductVariant[]
}

export interface ProductOptionType {
  id: string
  name: string
  position: number
  values: { id: string; value: string; position: number }[]
}

export interface ProductVariant {
  id: string
  optionValues: Record<string, string>
  priceOverride: number | null
  stock: number
  sku: string | null
}

export interface SellerStore {
  id: string
  sellerId: string
  slug: string
  name: string
  category: string | null
  bankCardNumber: string
  bankOwnerName: string
  instagramUrl: string | null
  telegramUrl: string | null
  websiteUrl: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  // docs/PRD-seller-credit-billing.md بخش ۱/۵
  creditBalanceToman: number
  // docs/PRD-product-strategy-and-roadmap.md بخش ۳.۲
  shippingInfo: string | null
  returnPolicy: string | null
  brandIntro: string | null
  workingHoursStart: string | null
  workingHoursEnd: string | null
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۰ بند ۴
  postPurchaseFollowUpEnabled: boolean
  abandonedCartReminderEnabled: boolean
  // docs/PRD-sales-agent-persuasion-principles.md بخش ۶
  persuasionTechniquesEnabled: boolean
  // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۱ — false = فروش حضوری/دیجیتال
  requiresShipping: boolean
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — عکس پروفایل فروشگاه (کلید MinIO، نه URL)
  logoImageKey: string | null
  createdAt: string
  updatedAt: string
  products: SellerProduct[]
}

// بخش ۳.۱ — کارت «خانه»‌ی پنل
export interface StoreCompleteness {
  overallScorePercent: number
  checklist: {
    hasProductWithPhoto: boolean
    hasEnoughKbEntries: boolean
    hasShippingPolicy: boolean
  }
}

export interface StoreCreditStatus {
  balanceToman: number
  freeQuotaUsedToday: number
  freeQuotaLimit: number
  // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۶ — فقط وقتی واقعاً فعال است
  trialCreditRemainingToman: number
  trialEndsAt: string | null
}

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۱.۱
export interface SellerDashboard {
  revenueTodayToman: number
  revenueWeekToman: number
  revenueMonthToman: number
  orderCountsByStatus: Record<SellerOrderStatus, number>
  dailyRevenueTrend: { date: string; totalToman: number }[]
  topProducts: { productId: string; name: string; qty: number }[]
  uniqueCustomerCount: number
  averageOrderValueToman: number
}

// docs/PRD-seller-advertising-placements.md — جایگاه تبلیغاتی/Boost در جستجوی تلگرام
// docs/PRD-product-display-focus-and-variations.md §۳ — GREETING_FEATURED_PRODUCT (محصول‌محور)
export interface AdPlacement {
  id: string
  storeId: string
  productId?: string | null
  placement: 'TELEGRAM_STORE_SEARCH' | 'MARKETPLACE_FEATURED' | 'GREETING_FEATURED_PRODUCT'
  startsAt: string
  endsAt: string
  priceToman: number
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
}

export interface AdPlacementPriceTier {
  durationDays: 7 | 30
  priceToman: number
}

export interface AdPlacementStatusResponse {
  active: AdPlacement | null
  priceTiers: AdPlacementPriceTier[]
}

// docs/PRD-sales-agent-admin-analytics.md بخش ۴ — مقایسه‌ی نرخ تبدیل وب در برابر تلگرام
export interface ChannelStat {
  group: 'WEB' | 'TELEGRAM'
  conversations: number
  avgClarifyAttempts: number
  stuckHandoffRate: number
  approvedOrderRate: number
  aiCalls: number
  fallbackRate: number
  avgLatencyMs: number
}

export interface StoreCreditPackage {
  id: string
  credits: number
  discountPercent: number
  isPopular: boolean
  isBestValue: boolean
  priceToman: number
  creditToman: number
}

// docs/PRD-seller-multi-bank-card-rotation.md
export type CardDisplayPolicy = 'THRESHOLD' | 'PERCENTAGE' | 'EQUAL'

export interface StoreBankCard {
  id: string
  storeId: string
  cardNumber: string
  ownerName: string
  isActive: boolean
  sortOrder: number
  thresholdToman: number | null
  percentWeight: number | null
  totalConfirmedToman: number
  createdAt: string
}

export interface StoreBankCardsResponse {
  policy: CardDisplayPolicy
  cards: StoreBankCard[]
}

// docs/PRD-customer-comments-and-discounts.md بخش ۷/۸
export type DiscountKind = 'PERCENT' | 'FIXED_AMOUNT'

export interface StoreDiscountCode {
  id: string
  storeId: string
  code: string
  kind: DiscountKind
  value: number
  maxRedemptions: number | null
  redemptionCount: number
  expiresAt: string | null
  isActive: boolean
  // docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۵ مورد ۵ — تخفیف پلکانی
  minQuantity: number | null
  createdAt: string
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۲ (فاز ۱.۵) — provinces خالی =
// ردیف پیش‌فرض «کل ایران»؛ یک ردیف می‌تواند چند استان را هم‌زمان پوشش دهد
export interface StoreShippingRule {
  id: string
  storeId: string
  provinces: string[]
  cost: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// docs/PRD-mvp-launch-plan.md گام ۲ — چت عمومی /shop/:slug؛ عیناً مطابق
// nivo-ai-backend/src/modules/sales-agent/sales-agent.types.ts
export type ShopUiBlock =
  | {
      type: 'PRODUCT_CARD'
      products: { id: string; name: string; basePrice: number; stock: number; images: string[]; videos: ProductVideoItem[] }[]
    }
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۳ — برخلاف PRODUCT_CARD که فقط اولین
  // عکس هر محصول را می‌دهد، این بلاک همه‌ی عکس‌های یک محصول را حمل می‌کند (وقتی مشتری صریح
  // عکس بیشتر خواسته). docs/PRD-product-video.md بخش ۴ — videos هم اضافه شد
  | { type: 'PRODUCT_PHOTOS'; productId: string; productName: string; images: string[]; videos: ProductVideoItem[] }
  | {
      type: 'CART_SUMMARY'
      // docs/PRD-product-display-focus-and-variations.md §۴ — variantId/variantLabel اختیاری؛
      // محصول بدون واریانت این دو را ندارد
      items: { productId: string; name: string; unitPrice: number; qty: number; variantId?: string; variantLabel?: string }[]
      total: number
    }
  | { type: 'PAYMENT_INSTRUCTIONS'; cardNumber: string; ownerName: string; amount: number }
  | { type: 'ORDER_STATUS'; orderId: string; status: string }
  // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۱ + docs/PRD-buyer-saved-addresses.md
  | {
      type: 'ADDRESS_PROMPT'
      mode: 'CHOOSE_SAVED' | 'CHOOSE_PROVINCE' | 'CONFIRM' | 'ASK_SAVE'
      addresses?: { id: string; summary: string }[]
      // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۲ (فاز ۱.۵) — فقط CHOOSE_PROVINCE
      provinces?: string[]
      summary?: string
      shippingCostToman?: number
      provinceCovered?: boolean
    }
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۲) — سفارش مجدد با یک دکمه
  | {
      type: 'ORDER_LIST'
      orders: {
        id: string
        createdAt: string
        items: { productId: string; name: string; unitPrice: number; qty: number; variantId?: string; variantLabel?: string }[]
        totalAmount: number
        status: string
      }[]
    }
  // همان بخش، مورد ۴ — مقایسه‌ی ۲-۳ محصول کنار هم
  | {
      type: 'COMPARE_CARD'
      products: { id: string; name: string; basePrice: number; stock: number; specs: ProductSpecSuggestion[] }[]
    }
  // docs/PRD-product-display-focus-and-variations.md §۴.۲ — چیپ انتخاب سریع واریانت؛
  // mode=DIMENSION یعنی values مقادیر یک گزینه (سایز) هستند، mode=ALTERNATIVES یعنی ترکیب
  // انتخابی تمام شده و values معادل‌های موجود — هر دو با همون SELECT_VARIANT_VALUE جواب داده می‌شوند
  | {
      type: 'VARIANT_PROMPT'
      productId: string
      productName: string
      optionName: string | null
      values: { label: string; value: string }[]
      selectedSoFar: Record<string, string>
      mode: 'DIMENSION' | 'ALTERNATIVES'
    }
  | { type: 'NONE' }

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — حالت «فروشگاه»؛ پاسخ GET
// /v2/stores/:slug/public-products (عمومی، بدون auth) — همان فیلدهای نمایشی PRODUCT_CARD بالا + description
export interface PublicProduct {
  id: string
  name: string
  basePrice: number
  stock: number
  images: string[]
  videos: ProductVideoItem[]
  description: string | null
}

export interface PublicProductsPage {
  items: PublicProduct[]
  total: number
  page: number
  pageSize: number
}

// docs/PRD-marketplace-explore-cross-store.md بخش ۷ (فاز ۵ MVP) — GET /v2/marketplace/stores
// (عمومی، بدون auth)؛ فهرست ساده‌ی فروشگاه‌های فعال، بدون جست‌وجو/دسته‌بندی
export interface MarketplaceStore {
  id: string
  slug: string
  name: string
  category: string | null
  logoImageKey: string | null
}

// همون بخش — «سفارش‌های من، همه‌ی فروشگاه‌ها»؛ پاسخ GET /v2/marketplace/orders
// (Authorization: Bearer <توکن کوتاه‌مدت بعد از تأیید OTP>)
export interface MarketplaceStoreOrders {
  storeId: string
  storeName: string
  storeSlug: string
  orders: {
    id: string
    createdAt: string
    items: { productId: string; name: string; unitPrice: number; qty: number }[]
    totalAmount: number
    status: string
  }[]
}

export interface ShopMessage {
  id: string
  role: 'customer' | 'agent'
  text: string
  uiBlock?: ShopUiBlock
  // docs/PRD-sales-agent-voice.md بخش ۱.۲ — وقتی پاسخ بلند بود و وویس در حال تولید است،
  // سرور voiceEventId می‌دهد؛ کلاینت کوتاه پول می‌کند تا voiceKey برسد
  voiceEventId?: string
  voiceKey?: string
  // فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — پیام صوتیِ خودِ خریدار (نه پاسخ ایجنت). وقتی true و text خالی
  // است یعنی هنوز در حال تبدیل گفتار به متن (ASR سمت سرور) — useShopChat.ts's sendVoiceMessage
  isVoice?: boolean
}

// دکمه‌های UiBlock دیگر جمله‌ی فارسی نمی‌سازند تا از NLU رد شوند — productId مستقیم پاس
// می‌شود (فیدبک اول پایلوت — sales-agent.types.ts SalesAction)
export type ShopAction =
  | { type: 'ADD_TO_CART'; productId: string; qty?: number }
  | { type: 'CONFIRM_CART' }
  // docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۱ — دکمه‌های فلوی آدرس
  | { type: 'SELECT_ADDRESS'; addressId: string }
  | { type: 'NEW_ADDRESS' }
  // بخش ۲ (فاز ۱.۵) — انتخاب استان دکمه‌ای
  | { type: 'SELECT_PROVINCE'; province: string }
  | { type: 'CONFIRM_ADDRESS' }
  | { type: 'EDIT_ADDRESS' }
  | { type: 'SAVE_ADDRESS' }
  | { type: 'SKIP_SAVE_ADDRESS' }
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸)
  | { type: 'VIEW_ORDERS' }
  | { type: 'TOGGLE_SAVE_PRODUCT'; productId: string }
  | { type: 'REORDER'; orderId: string }
  // docs/PRD-product-display-focus-and-variations.md §۴.۲ — جواب چیپ VARIANT_PROMPT
  | { type: 'SELECT_VARIANT_VALUE'; value: string }

export interface ShopStartChatResponse {
  conversationId: string
  sessionToken: string
  storeId: string
  storeName: string
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — کلید MinIO، نه URL (مثل Product.images)
  storeLogoKey: string | null
  responseStrategy: ShopResponseStrategy
  // فقط وقتی لینک اختصاصی یک محصول باز شده (?product=) و آن محصول واقعاً پیدا شد
  initialReply?: string
  initialUiBlocks?: ShopUiBlock[]
  initialState?: string
  initialVoiceEventId?: string
}

export interface ShopSendMessageResponse {
  reply: string
  uiBlocks: ShopUiBlock[]
  state: string
  voiceEventId?: string
  // فقط پاسخ voice-message این را دارد — متن واقعی تبدیل‌شده‌ی صدای مشتری با ASR
  transcript?: string
}

export interface ShopVoiceStatusResponse {
  voiceKey: string | null
  pending: boolean
}

// docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — پاسخ
// GET /v2/chat/:conversationId/saved-products
export interface ShopSavedProductsResponse {
  productIds: string[]
}

export interface ShopConversationEvent {
  type: 'CUSTOMER_MESSAGE' | 'SELLER_MESSAGE' | 'AGENT_REPLY' | 'TOOL_CALL' | 'STATE_TRANSITION' | 'SYSTEM'
  payload: { text?: string; uiBlock?: ShopUiBlock }
  createdAt: string
}

// docs/PRD-sales-agent-tool-calling-architecture.md بخش ۷ (فاز ۳) — FULL_AGENT سومین گزینه،
// فقط برای تست دستی خریدار
export type ShopResponseStrategy = 'RULE_BASED' | 'SIMPLE_AGENT' | 'FULL_AGENT'

export interface ShopGetConversationResponse {
  state: string
  storeId: string
  storeName: string
  storeLogoKey: string | null
  responseStrategy: ShopResponseStrategy
  events: ShopConversationEvent[]
}

// docs/PRD-conversation-history.md بخش ۳ — یک ردیف در تاریخچه (فعال یا آرشیوشده)
export interface ShopHistoryEntry {
  conversationId: string
  storeName: string
  lastProductName: string | null
  status: 'COMPLETED' | 'REJECTED' | 'IN_PROGRESS' | 'NEEDS_ATTENTION'
  updatedAt: string
}

// docs/PRD-mvp-launch-plan.md گام ۳ — پنل فروشنده
export interface UpdateProductInput {
  name?: string
  basePrice?: number
  stock?: number
  description?: string
  code?: string
  // docs/PRD-seller-knowledge-base.md بخش ۹.۲ (سوم) — null برای پاک‌کردن
  specs?: ProductSpecSuggestion[] | null
  // docs/PRD-sales-agent-persuasion-principles.md بخش ۶
  persuasionTechniquesEnabled?: boolean
}

// docs/PRD-seller-knowledge-base.md بخش ۲ — دستیار تکمیل محصول با AI
export interface ProductSpecSuggestion {
  label: string
  value: string
}

export interface ProductAiCompleteResult {
  suggestedDescription: string
  suggestedQuestions: string[]
  // بخش ۲.۳ — فقط وقتی withWebSearch=true درخواست شده باشد پر می‌شوند
  suggestedSpecs?: ProductSpecSuggestion[]
  sourceNote?: string
}

// docs/PRD-seller-knowledge-base.md بخش ۹.۲ (دوم، مورد ۵) — استخراج از عکس محصول
export interface ProductAiCompleteFromPhotoResult {
  suggestedName?: string
  suggestedDescription: string
  suggestedSpecs?: ProductSpecSuggestion[]
}

// بخش ۹.۲ (دوم، مورد ۶) — تکمیل خودکار همه‌ی محصولات کم‌تکمیل فروشگاه، یک‌جا
export interface BulkCompleteResultItem {
  productId: string
  productName: string
  suggestedDescription?: string
  suggestedSpecs?: ProductSpecSuggestion[]
  sourceNote?: string
  error?: string
}

export interface BulkCompleteResult {
  items: BulkCompleteResultItem[]
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۹ (رصد رقبا)
export interface CompetitorAnalysisResult {
  competitors: { name: string; highlight: string }[]
  suggestions: string[]
}

// بخش ۹ (پروفایل برند عمیق‌تر در آنبوردینگ)
export interface GenerateBrandIntroResult {
  suggestedBrandIntro: string
}

// فیدبک کاربر ۱۴۰۵/۰۷/۱۱ — دستیار «نوشتن توضیحات با کمک AI» از روی یادداشت خام فروشنده
export interface GenerateProductDescriptionResult {
  suggestedDescription: string
}

// docs/PRD-product-display-focus-and-variations.md §۴.۱.۱ (فاز ۲) — پیشنهاد گزینه/مقدار واریانت
// از توضیح متنی آزاد؛ auto-save ممنوع، فقط پیش‌پرکردن جدول ترکیب‌های ProductVariantsEditor
export interface GenerateProductOptionsResult {
  optionTypes: { name: string; values: string[] }[]
  assumptions: string[]
}

// docs/PRD-admin-product-enrichment-review.md — پیشنهاد تایید‌شده‌ی ادمین، در انتظار تصمیم فروشنده
export interface ProductEnrichmentDraft {
  id: string
  productId: string
  suggestedDescription: string
  suggestedQuestions: string[]
  suggestedSpecs: ProductSpecSuggestion[] | null
  sourceNote: string | null
}

// بخش ۲.۵ — ورود سریع محصول از لینک؛ فقط پیش‌نمایش، هیچ‌چیز خودکار ذخیره نمی‌شود
export interface ProductImportFromUrlResult {
  name: string
  suggestedDescription: string
  suggestedSpecs?: ProductSpecSuggestion[]
  priceHint?: number
  imageUrls: string[]
}

// بخش ۱.۲/۳ — باکس دانش فروشگاه
export type StoreKbKind = 'FAQ' | 'POLICY' | 'PRODUCT_INFO' | 'GENERAL'

export interface StoreKbEntry {
  id: string
  storeId: string
  kind: StoreKbKind
  relatedProductId: string | null
  question: string
  answer: string
  tags: string[]
  isActive: boolean
  createdAt: string
}

export interface CreateKbEntryInput {
  kind: StoreKbKind
  question: string
  answer: string
  tags?: string[]
  relatedProductId?: string | null
}

// بخش ۳.۳ — کاندید استخراج‌شده از فایل، قبل از تأیید فروشنده (هنوز ذخیره نشده)
export interface KbCandidateEntry {
  kind: StoreKbKind
  question: string
  answer: string
}

export interface ImportProductsResult {
  created: number
  errors: { row: number; message: string }[]
}

export type SellerOrderStatus = 'PENDING_PAYMENT' | 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface SellerOrder {
  id: string
  storeId: string
  conversationId: string
  items: { productId: string; name: string; unitPrice: number; qty: number }[]
  totalAmount: number
  status: SellerOrderStatus
  receiptImageKey: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

export interface NeededAttentionConversation {
  id: string
  customerLabel: string
  currentState: string
  updatedAt: string
}

export interface SellerConversationDetail {
  id: string
  isMutedForHuman: boolean
  currentState: string
  customerLabel: string
  events: ShopConversationEvent[]
}

export interface Project {
  id: string
  name: string
  platform: 'GENERAL' | 'INSTAGRAM' | 'YOUTUBE' | 'BUSINESS'
  niche: string | null
  contextMd: string
  brandColor: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  pinnedPromptId: string | null
  // فقط همین ۵ فیلد — نه template/context زیرین پرامپت (همون‌طور که CreativePromptCatalogItem
  // هم همیشه اون فیلدهای proprietary رو مخفی نگه می‌داره)
  pinnedPrompt: {
    id: string
    title: string
    exampleImageUrl: string | null
    creditCost: number
    outputType: 'IMAGE' | 'TEXT'
  } | null
}

// خروجی GET /v2/discovery/projects/:projectId/customizations — متن‌های سفارشی‌سازی قبلی
// کاربر توی این پروژه (جدیدترین اول، dedupe شده، سقف ۲۰ تا) — برای چیپ‌های «استفاده‌ی قبلی»
export interface ProjectCustomization {
  text: string
  createdAt: string
}

export interface CreativeCategory {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
}

export interface CreativePromptCatalogItem {
  id: string
  title: string
  outputType: 'IMAGE' | 'TEXT'
  segment: 'GENERAL' | 'INSTAGRAM' | 'YOUTUBE' | 'BUSINESS'
  description: string | null
  exampleImageUrl: string | null
  aspectRatio: string | null
  categoryId: string | null
  requiresUserImage: boolean
  creditCost: number
  isTrending: boolean
  tags: string[]
  sortOrder: number
  hasSourceImage: boolean
  sourceImageAccuracyCreditCost: number
  // فقط برای پرامپت‌های AGENT_DISCOVERED پر می‌شود — سبک‌های CURATED عمداً template را
  // به فرانت لو نمی‌دهند (docs/PRD-daily-content-prompt-agent.md بخش ۷.۳)
  userPromptTemplate?: string
  // اگر true، «استفاده» فقط userPromptTemplate را عیناً توی composer آزاد می‌ریزد و مدل
  // قفل نمی‌شود (کاربر خودش انتخاب می‌کند) — به‌جای فلوی سبک‌قفل‌شده‌ی selectedCreativePrompt
  isFreeformPrompt?: boolean
  // فقط وقتی isFreeformPrompt=true لو می‌رود — پیش‌انتخاب چیپ مدل، نه قفل
  preferredModel?: string | null
}

// یک ردیف تاریخچه‌ی «تبدیل عکس به پرامپت» — همون CreativePromptCatalogItem + وضعیت بررسی ادمین،
// متن استخراج‌شده و تاریخ. مستقیماً قابل‌پاس‌دادن به onUsePrompt (همون handleSelectPrompt چت) است.
export interface ExtractionHistoryItem extends CreativePromptCatalogItem {
  extractedPrompt: string
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  isActive: boolean
  createdAt: string
}

// docs/PRD-nivo-cal.md فاز ۱ — خروجی ساخت‌یافته‌ی تحلیل عکس غذا؛ NutritionResultCard فقط از
// همین فیلدها رندر می‌کند، هیچ متن خام مدل مستقیم نمایش داده نمی‌شود
export interface NivoCalFoodItem {
  nameFa: string
  portionEstimate: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number | null
  sugarG: number | null
}

export interface NivoCalScanResult {
  isFood: boolean
  confidence: 'high' | 'medium' | 'low'
  items: NivoCalFoodItem[]
  totalCalories: number
  healthScore: 'healthy' | 'moderate' | 'unhealthy'
  healthNotes: string[]
}

export interface NivoCalLog extends NivoCalScanResult {
  id: string
  imageUrl: string
  note?: string | null
  createdAt: string
}

// docs/PRD-nivo-cal.md فاز ۲ — پروفایل تغذیه؛ dailyCalorieTarget/proteinTargetG/... خروجی
// قطعی فرمول Mifflin-St Jeor سمت بک‌اند هستند، هیچ‌وقت حدس مدل نیستند
export type NivoCalGender = 'MALE' | 'FEMALE'
export type NivoCalActivityLevel = 'SEDENTARY' | 'LIGHT' | 'ACTIVE' | 'VERY_ACTIVE'
export type NivoCalGoal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_WEIGHT'

export interface NutritionProfile {
  id: string
  userId: string
  gender: NivoCalGender
  age: number
  heightCm: number
  activityLevel: NivoCalActivityLevel
  goal: NivoCalGoal
  goalPaceLevel: number
  dailyCalorieTarget: number
  proteinTargetG: number
  carbsTargetG: number
  fatTargetG: number
  createdAt: string
  updatedAt: string
}

export interface CreateNutritionProfileInput {
  gender: NivoCalGender
  age: number
  heightCm: number
  weightKg: number
  activityLevel: NivoCalActivityLevel
  goal: NivoCalGoal
  goalPaceLevel?: number
}

export interface WeightLogEntry {
  id: string
  weightKg: number
  createdAt: string
  deltaKg: number | null
}

export interface WeightTrend {
  points: { date: string; weightKg: number }[]
  deltaKg: number
  periodDays: number
}

export interface WeeklyAdherenceDay {
  date: string
  consumedCalories: number
  targetCalories: number
  status: 'under' | 'onTarget' | 'over' | 'noData'
}

export interface NivoCalDailySummary {
  profile: NutritionProfile
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number }
  remainingCalories: number
  meals: NivoCalLog[]
  weightTrend: WeightTrend
  streakDays: number
  weeklyAdherence: WeeklyAdherenceDay[]
}

export interface CreativeGalleryItem {
  id: string
  outputType: 'IMAGE' | 'TEXT'
  inputImageKeys: string[] | null
  outputImageKey: string | null
  outputText: string | null
  creditCost: number
  createdAt: string
  prompt: { title: string; outputType: 'IMAGE' | 'TEXT' }
  project: { name: string } | null
}

export interface CreativeGenerationResult {
  id: string
  outputType: 'IMAGE' | 'TEXT'
  outputImageKey: string | null
  outputText: string | null
  creditCost: number
  status: 'SUCCEEDED' | 'FAILED'
}

// امتحان رایگان یک‌باره‌ی استودیو محتوا برای کاربر مهمان — کاملاً ephemeral (بدون id/persist)
export interface AnonDiscoveryStatus {
  available: boolean
  usedAt: string | null
}

export interface AnonCreativeGenerationResult {
  outputType: 'IMAGE' | 'TEXT'
  outputText?: string
  outputImageDataUrl?: string
}

export interface Subscription {
  id: string
  planId: string
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'
  periodStart: string
  periodEnd: string
  cancelAtPeriodEnd: boolean
  plan: Plan
}

export interface Conversation {
  id: string
  title: string | null
  model: string
  totalTokens: number
  lastMessageAt: string
  createdAt: string
  // docs/PRD-openrouter-migration.md §۱۴.۲/۱۴.۶ — شمارنده‌ی denormalized عکس‌های تولیدشده‌ی
  // موفق در این گفتگو (برای سقف توصیه‌ای/badge استودیوی عکس)
  imageGenCount: number
}

export interface ChatCitation {
  url: string
  title: string
}

export interface ChatAttachment {
  key: string
  filename: string
  mime: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  images?: string[] | null
  // docs/PRD-chat-models-web-search-and-files.md §۳.۳ — فقط روی پیام‌های ASSISTANT‌ای پر می‌شود
  // که جستجوی وب واقعاً نتیجه داشته
  citations?: ChatCitation[] | null
  // docs/PRD-chat-files-and-pdf.md بخش ۶ — فایل‌های غیرعکس پیوست‌شده به پیام USER
  attachments?: ChatAttachment[] | null
  tokensInput: number
  tokensOutput: number
  createdAt: string
  // نکته: مدل واقعی پاسخ‌دهنده عمداً از API حذف شده — می‌تواند توسط مسیریاب مدل بی‌صدا override شده باشد
  feedback?: { vote: 'UP' | 'DOWN'; comment: string | null } | null
  // دکمه‌ی «توقف تولید پاسخ» — true یعنی این پاسخ دستیار قبل از پایان طبیعی استریم نیمه‌کاره ذخیره شده
  wasInterrupted?: boolean
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface UsageToday {
  freeUsed: number
  freeLimit: number
  paidUsed: number
  paidLimit: number
}

export interface ConversationsPage {
  items: Conversation[]
  nextCursor: string | null
}

// «انتخاب از تولیدات قبلی» در استودیو ویدیو — imageUrl مسیر نسبی امن موجود است
// (/conversations/:conversationId/images/:filename)، دقیقاً همان چیزی که useAuthedImageUrl می‌فهمد
export interface MyImageItem {
  messageId: string
  conversationId: string
  imageUrl: string
  createdAt: string
}

export interface MyImagesPage {
  items: MyImageItem[]
  nextCursor: string | null
}

export interface UsageHistory {
  date: string
  freeTokensUsed: number
  paidTokensUsed: number
  requestsCount: number
}

export interface PaymentRecord {
  id: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  refId: string | null
  createdAt: string
  plan: { name: string }
}

export interface Invoice {
  id: string
  number: number
  paymentId: string
  planName: string
  amount: number
  taxAmount: number
  provider: 'ZARINPAL' | 'VANDAR' | 'ZIBAL'
  refId: string | null
  buyerName: string | null
  buyerPhone: string
  issuedAt: string
}

export interface BudgetStatus {
  dailyBudgetToman: number
  spentTodayToman: number
  remainingTodayToman: number
  monthlyBudgetToman: number
  spentMonthToman: number
  walletBalanceToman: number
  warningLevel: 'none' | 'warning' | 'critical' | 'session_limit' | 'exceeded'
  usagePct: number
  upsellSuggestion: string | null
  usdtToman: number
  resetAt: string
}

export interface Ticket {
  id: string
  subject: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  createdAt: string
  updatedAt: string
}

export interface TicketReply {
  id: string
  fromAdmin: boolean
  body: string
  createdAt: string
}

export interface TicketDetail extends Ticket {
  body: string
  adminNote: string | null
  replies: TicketReply[]
}

// ── چت مهمان (بدون ثبت‌نام) ──────────────────────────────────────────────
export interface AnonChatStatus {
  enabled: boolean
  stage: 'normal' | 'limited' | 'blocked'
  message: string
  hintTitle: string
  hintSubtitle: string
  remainingFree: number
  remainingToday: number | null
  resetAt: string | null
  signupBannerAfterMessages: number
  samplePrompts: string[]
}

export interface AnonConversation {
  id: string
  sessionId: string
  model: string
  title: string | null
  totalTokens: number
  lastMessageAt: string
  createdAt: string
  migratedConversationId: string | null
}

export interface AnonMessage {
  id: string
  conversationId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  tokensInput: number
  tokensOutput: number
  model: string | null
  createdAt: string
}

export interface AnonConversationDetail extends AnonConversation {
  messages: AnonMessage[]
}

// docs/PRD-video-auto-captions.md §۶ — استودیوی زیرنویس خودکار
export type CaptionProjectStatus =
  | 'UPLOADED'
  | 'TRANSCRIBING'
  | 'READY_FOR_EDIT'
  | 'RENDERING'
  | 'DONE'
  | 'FAILED'

export interface CaptionWord {
  word: string
  start: number
  end: number
  speaker: string | null
}

export interface CaptionSegment {
  id: string
  startMs: number
  endMs: number
  text: string
  words: CaptionWord[]
}

export interface CaptionStyleOverrides {
  fontFamily?: string
  textColor?: string
  highlightColor?: string
  backgroundMode?: 'none' | 'translucent' | 'solid'
  fontSizePx?: number
  position?: 'top' | 'center' | 'bottom'
  positionX?: number
  positionY?: number
  wordsPerLine?: number
  linesPerCue?: number
  styleId?: string
}

export interface CaptionProject {
  id: string
  userId: string
  status: CaptionProjectStatus
  sourceVideoKey: string
  sourceDurationSec: number | null
  sourceWidth: number | null
  sourceHeight: number | null
  sourceDeletedAt: string | null
  asrModelName: string | null
  transcriptWords: CaptionWord[] | null
  segments: CaptionSegment[] | null
  styleId: string | null
  styleOverrides: CaptionStyleOverrides | null
  renderProgress: number
  renderedVideoKey: string | null
  renderCreditCost: number | null
  createdAt: string
  updatedAt: string
}

// docs/PRD-video-edit-omni-kie.md — «استودیوی ویدیو» با Kie.ai
export type KieVideoCategory =
  | 'GENERATE'
  | 'EDIT'
  | 'UPSCALE'
  | 'LIPSYNC'
  | 'DUBBING'
  | 'MOTION_TRANSFER'
  | 'EXTEND'
  | 'OTHER'

export type VideoModelProvider = 'KIE' | 'OPENROUTER' | 'VEO' | 'RUNWAY'
export type KieInputSchema = 'OMNI' | 'SEEDANCE' | 'WAN_V2V' | 'WAN_R2V' | 'WAN_VIDEO_EDIT'

export interface KieVideoModel {
  id: string
  provider: VideoModelProvider
  slug: string
  displayName: string
  category: KieVideoCategory
  isActive: boolean
  sortOrder: number
  supportsImages: boolean
  maxImages: number | null
  supportsVideo: boolean
  maxVideoDurationSec: number | null
  maxVideoWindowSec: number | null
  supportsAspectRatio: boolean
  supportsDuration: boolean
  resolutions: string[]
  pricePerSecondUsdConfirmed: number | null
  pricingNote: string | null
  estimatedCostPerSecondUsd?: number | null
  estimatedCreditCostPerSecond?: number | null
  kieInputSchema: KieInputSchema
  supportsScenePreservingEdit: boolean
  fixedDurations: number[]
  // معماری data-driven (بخش ۳ پلن استودیوی ویدیو) — null یعنی این مدل هنوز روی معماری قدیمی
  // enum-dispatch است (فرم VideoEditForm)؛ غیر-null یعنی VideoStudioForm عمومی رندرش می‌کند
  inputFields: InputFieldsSchema | null
}

export type VideoEditMode = 'GENERATE' | 'EDIT'
export type VideoJobStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'

export interface VideoEditJob {
  id: string
  userId: string
  sessionId: string
  kieVideoModelId: string
  kieVideoModel?: KieVideoModel
  mode: VideoEditMode
  prompt: string
  referenceImageKeys: string[]
  videoKey: string | null
  videoWindowStartSec: number | null
  videoWindowEndSec: number | null
  aspectRatio: string | null
  resolution: string
  status: VideoJobStatus
  kieTaskId: string | null
  resultVideoKey: string | null
  errorMessage: string | null
  creditsConsumedRaw: number | null
  creditCost: number | null
  // معماری data-driven — values-by-field-key که VideoStudioForm ساخته؛ null برای جاب‌های
  // مدل‌های قدیمی (ستون‌های flat بالا معتبرند)
  valuesJson: FieldValues | null
  // پراگرس واقعی (نه فیک) — kieState آخرین state خام provider؛ progressPercent فقط وقتی
  // provider واقعاً عدد بدهد پر می‌شود (اکثر مدل‌های Kie نمی‌دهند)
  kieState: string | null
  progressPercent: number | null
  createdAt: string
  completedAt: string | null
}

export interface VideoEditSession {
  id: string
  userId: string
  title: string | null
  createdAt: string
  jobs: VideoEditJob[]
}

export interface VideoEditConfig {
  isEnabled: boolean
  generateFixedDurationSec: number
  maxConcurrentJobsPerUser: number
  maxJobsPerDayPerUser: number | null
  updatedAt: string
}

