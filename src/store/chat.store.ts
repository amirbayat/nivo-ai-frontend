import { create } from 'zustand'
import type { CreativePromptCatalogItem } from '@/types/api'

export type ThinkingMode = 'fast' | 'smart'
export type ImageAspectRatio = '1:1' | '16:9' | '9:16'

interface ChatState {
  selectedConvId: string | null
  streamingContent: string
  isStreaming: boolean
  isReasoning: boolean
  reasoningText: string
  isGeneratingImage: boolean
  // پیش‌نمایش تدریجی واقعی (نه انیمیشن تزئینی) — provider تا ۲ نسخه‌ی جزئی و واضح‌ترشونده
  // قبل از تصویر نهایی می‌فرستد؛ null یعنی هنوز هیچ پیش‌نمایشی نرسیده (فقط shimmer نشون بده)
  generatingImagePreview: string | null
  // docs/PRD-chat-models-web-search-and-files.md §۳.۳ — منابع پیام در حال استریم (قبل از این‌که
  // invalidate/refetch پایان پیام، citations واقعی را از DB برگرداند)؛ در MessageBubble برای
  // پیام‌های قبلی از Message.citations خود API استفاده می‌شود، این فقط برای «همین لحظه»‌ی استریم است
  streamingSources: { url: string; title: string }[] | null
  // toggle روشن بوده ولی مدل نهایی جستجوی وب را پشتیبانی نکرد — یک اطلاع کوتاه، نه خطا
  webSearchUnavailable: boolean
  chatError: string | null
  chatErrorCode: string | null
  selectedModel: string | null
  // مستقل از selectedModel — چون مدل‌های تولید عکس modelType متفاوتی دارند (IMAGE_GEN) و
  // هرگز نباید به‌جای مدل چت معمولی به سرور فرستاده شوند؛ null یعنی «خودکار» (پیش‌فرض،
  // بر اساس پیچیدگی prompt و کیف‌پول انتخاب می‌شود)
  selectedImageGenModel: string | null
  // دراپ‌دون «سریع/هوشمند» کنار دکمه‌ی ارسال — فقط روی reasoning effort اثر دارد، نه انتخاب مدل
  thinkingMode: ThinkingMode
  // توگل globe «جستجوی وب» کنار دکمه‌ی ارسال — پیش‌فرض خاموش، در localStorage پایدار می‌ماند
  // (سطح مرورگر، نه سطح مکالمه در DB — docs/PRD-chat-models-web-search-and-files.md §۳.۱)
  webSearchEnabled: boolean
  // سبک انتخاب‌شده از استودیوی محتوا (DiscoverPage) — تا برگشت به چت حفظ می‌شود؛ MessageInput
  // با وجود این مقدار به‌جای ارسال پیام معمولی، generate آن سبک را صدا می‌زند (docs/PRD-discovery-and-credits.md)
  selectedCreativePrompt: CreativePromptCatalogItem | null
  // پیش‌نویس پنل استودیوی عکس (StudioComposer) — چیپ «تغییر مدل» به‌جای دراپ‌داون، به یک
  // صفحه‌ی جدا (/models) navigate می‌کند که کل ImageStudioPage را unmount می‌کند؛ اگر این مقادیر
  // useState محلی همان کامپوننت بودند، با هر تغییر مدل، متن/عکس‌های تایپ‌شده پاک می‌شدند
  studioDraftValue: string
  studioDraftImages: string[]
  studioDraftPreserveFace: boolean
  // انتخاب اختیاری نسبت تصویر — null یعنی «پیش‌فرض مدل» (رفتار قبلی، بدون override). برخلاف
  // studioDraftImages، این یک «تنظیم» شبیه انتخاب مدل است، نه یک پیوست یک‌بارمصرف — پس در
  // resetStudioDraft پاک نمی‌شود و بین پیام‌های پشت‌سرهم باقی می‌ماند
  studioDraftAspectRatio: ImageAspectRatio | null
  setSelectedConvId: (id: string | null) => void
  setStreamingContent: (text: string) => void
  appendStreamingContent: (chunk: string) => void
  setIsStreaming: (v: boolean) => void
  setIsReasoning: (v: boolean) => void
  appendReasoningText: (chunk: string) => void
  setIsGeneratingImage: (v: boolean) => void
  setGeneratingImagePreview: (image: string | null) => void
  setStreamingSources: (sources: { url: string; title: string }[] | null) => void
  setWebSearchUnavailable: (v: boolean) => void
  resetStreaming: () => void
  setChatError: (msg: string | null, code?: string | null) => void
  setSelectedModel: (model: string) => void
  setSelectedImageGenModel: (model: string | null) => void
  setThinkingMode: (mode: ThinkingMode) => void
  setWebSearchEnabled: (v: boolean) => void
  setSelectedCreativePrompt: (prompt: CreativePromptCatalogItem | null) => void
  setStudioDraftValue: (value: string) => void
  setStudioDraftImages: (images: string[] | ((prev: string[]) => string[])) => void
  setStudioDraftPreserveFace: (v: boolean) => void
  setStudioDraftAspectRatio: (v: ImageAspectRatio | null) => void
  resetStudioDraft: () => void
}

export const useChatStore = create<ChatState>(set => ({
  selectedConvId: null,
  streamingContent: '',
  isStreaming: false,
  isReasoning: false,
  reasoningText: '',
  isGeneratingImage: false,
  generatingImagePreview: null,
  streamingSources: null,
  webSearchUnavailable: false,
  chatError: null,
  chatErrorCode: null,
  // پیش‌فرض «مصرف بهینه» — تنها حالت خودکار چت (۱۴۰۵/۰۶/۱۹: حالت «بهترین پاسخ» حذف شد).
  // 'optimal' و 'best_answer' مقادیر قدیمی سنتینل «خودکار» هستند (از قبل از حذف این حالت) —
  // هر دو به 'cost_optimized' map می‌شوند تا کاربرهای قدیمی روی یک حالت واقعاً فعال بیفتند
  selectedModel: typeof window !== 'undefined'
    ? (() => {
        const stored = localStorage.getItem('nivo:selectedModel')
        return stored === 'optimal' || stored === 'best_answer' ? 'cost_optimized' : (stored ?? 'cost_optimized')
      })()
    : 'cost_optimized',
  selectedImageGenModel: typeof window !== 'undefined' ? localStorage.getItem('nivo:selectedImageGenModel') : null,
  thinkingMode:
    (typeof window !== 'undefined' ? (localStorage.getItem('nivo:thinkingMode') as ThinkingMode | null) : null) ?? 'smart',
  webSearchEnabled: typeof window !== 'undefined' && localStorage.getItem('nivo:webSearchEnabled') === 'true',
  selectedCreativePrompt: null,
  studioDraftValue: '',
  studioDraftImages: [],
  studioDraftPreserveFace: true,
  studioDraftAspectRatio: null,

  setSelectedConvId: id => set({ selectedConvId: id }),
  setStreamingContent: text => set({ streamingContent: text }),
  appendStreamingContent: chunk => set(s => ({ streamingContent: s.streamingContent + chunk })),
  setIsStreaming: v => set({ isStreaming: v }),
  setIsReasoning: v => set({ isReasoning: v }),
  appendReasoningText: chunk => set(s => ({ reasoningText: s.reasoningText + chunk })),
  setIsGeneratingImage: v => set({ isGeneratingImage: v }),
  setGeneratingImagePreview: image => set({ generatingImagePreview: image }),
  setStreamingSources: sources => set({ streamingSources: sources }),
  setWebSearchUnavailable: v => set({ webSearchUnavailable: v }),
  resetStreaming: () => set({
    streamingContent: '', isStreaming: false, isReasoning: false, reasoningText: '',
    isGeneratingImage: false, generatingImagePreview: null,
    streamingSources: null, webSearchUnavailable: false,
  }),
  setChatError: (msg, code = null) => set({ chatError: msg, chatErrorCode: code }),
  setSelectedModel: model => set({ selectedModel: model }),
  setSelectedImageGenModel: model => set({ selectedImageGenModel: model }),
  setThinkingMode: mode => {
    localStorage.setItem('nivo:thinkingMode', mode)
    set({ thinkingMode: mode })
  },
  setWebSearchEnabled: v => {
    localStorage.setItem('nivo:webSearchEnabled', String(v))
    set({ webSearchEnabled: v })
  },
  setSelectedCreativePrompt: prompt => set({ selectedCreativePrompt: prompt }),
  setStudioDraftValue: value => set({ studioDraftValue: value }),
  setStudioDraftImages: images => set(s => ({
    studioDraftImages: typeof images === 'function' ? images(s.studioDraftImages) : images,
  })),
  setStudioDraftPreserveFace: v => set({ studioDraftPreserveFace: v }),
  setStudioDraftAspectRatio: v => set({ studioDraftAspectRatio: v }),
  resetStudioDraft: () => set({ studioDraftValue: '', studioDraftImages: [], studioDraftPreserveFace: true }),
}))
