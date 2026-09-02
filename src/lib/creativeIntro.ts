import type { CreativePromptCatalogItem } from '@/types/api'

// یک پیام محلی/مصنوعی داخل جریان مکالمه‌ی سبک دیسکاوری — هیچ‌کدام Message واقعی بک‌اند
// نیستند (با رفرش صفحه یا عوض کردن مکالمه از بین می‌روند)، اما دقیقاً با همان کامپوننت
// MessageBubble پیام‌های واقعی رندر می‌شوند. مشترک بین ChatPage و ImageStudioPage — هر دو با
// انتخاب یک سبک از کتابخانه‌ی پرامپت‌های آماده همین را نشان می‌دهند.
export interface VirtualMessage {
  id: string
  role: 'ASSISTANT' | 'USER'
  content: string
  images?: string[]
}

export function creativeIntroMessage(prompt: CreativePromptCatalogItem): VirtualMessage {
  const ask = prompt.requiresUserImage
    ? `عکستو برام بفرست تا با سبک «${prompt.title}» عوضش کنم.`
    : `بگو با سبک «${prompt.title}» چی می‌خوای برات بسازم.`
  return {
    id: `virtual-intro-${prompt.id}`,
    role: 'ASSISTANT',
    content: prompt.description ? `${ask}\n\n${prompt.description}` : ask,
  }
}
