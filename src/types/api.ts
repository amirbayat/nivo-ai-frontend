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
}

// یک ردیف تاریخچه‌ی «تبدیل عکس به پرامپت» — همون CreativePromptCatalogItem + وضعیت بررسی ادمین،
// متن استخراج‌شده و تاریخ. مستقیماً قابل‌پاس‌دادن به onUsePrompt (همون handleSelectPrompt چت) است.
export interface ExtractionHistoryItem extends CreativePromptCatalogItem {
  extractedPrompt: string
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  isActive: boolean
  createdAt: string
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
}

export interface Message {
  id: string
  conversationId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  images?: string[] | null
  tokensInput: number
  tokensOutput: number
  createdAt: string
  // نکته: مدل واقعی پاسخ‌دهنده عمداً از API حذف شده — می‌تواند توسط مسیریاب مدل بی‌صدا override شده باشد
  feedback?: { vote: 'UP' | 'DOWN'; comment: string | null } | null
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

