import { createContext, useContext } from 'react'

// docs/PRD-nivo-lead-shop-seller-signup.md §4.3 — هوک‌های گفتگو (شماره‌ی لید، اتصال به User، رویداد فانل) برای کارت ثبت‌نام؛
// کارت از داخل ChatThread/ShopUiBlockView رندر می‌شود و نمی‌خواهیم این توابع را از چند لایه prop بدهیم
export interface LeadSignupApi {
  conversationId: string | null
  submitPhone: (phone: string) => Promise<void>
  markVerified: () => Promise<void>
  logEvent: (name: string) => void
}

export const LeadSignupContext = createContext<LeadSignupApi | null>(null)

export function useLeadSignup(): LeadSignupApi | null {
  return useContext(LeadSignupContext)
}
