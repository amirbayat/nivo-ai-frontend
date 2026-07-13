export interface User {
  id: string
  phone: string
  name: string | null
  role: 'USER' | 'ADMIN'
  isActive: boolean
  subscription: Subscription | null
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

export interface MessageQuota {
  todayCount: number
  N: number | null
  M: number
  stage: 'normal' | 'throttled' | 'blocked'
  remainingNormal: number | null
  remainingThrottled: number | null
  throttledInputTokens: number | null
  throttledOutputTokens: number | null
  resetAt: string
  planTier: string
  rollingWindow: { blocked: boolean; resetAt: string | null } | null
  budget: { blocked: boolean; reason: 'exceeded' | 'session_limit' | null; resetAt: string }
}
