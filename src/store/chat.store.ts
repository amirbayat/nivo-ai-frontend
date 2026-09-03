import { create } from 'zustand'
import type { CreativePromptCatalogItem } from '@/types/api'

export type ThinkingMode = 'fast' | 'smart'

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
  chatError: string | null
  chatErrorCode: string | null
  selectedModel: string | null
  // مستقل از selectedModel — چون مدل‌های تولید عکس modelType متفاوتی دارند (IMAGE_GEN) و
  // هرگز نباید به‌جای مدل چت معمولی به سرور فرستاده شوند؛ null یعنی «خودکار» (پیش‌فرض،
  // بر اساس پیچیدگی prompt و کیف‌پول انتخاب می‌شود)
  selectedImageGenModel: string | null
  // دراپ‌دون «سریع/هوشمند» کنار دکمه‌ی ارسال — فقط روی reasoning effort اثر دارد، نه انتخاب مدل
  thinkingMode: ThinkingMode
  // سبک انتخاب‌شده از استودیوی محتوا (DiscoverPage) — تا برگشت به چت حفظ می‌شود؛ MessageInput
  // با وجود این مقدار به‌جای ارسال پیام معمولی، generate آن سبک را صدا می‌زند (docs/PRD-discovery-and-credits.md)
  selectedCreativePrompt: CreativePromptCatalogItem | null
  // پیش‌نویس پنل استودیوی عکس (StudioComposer) — چیپ «تغییر مدل» به‌جای دراپ‌داون، به یک
  // صفحه‌ی جدا (/models) navigate می‌کند که کل ImageStudioPage را unmount می‌کند؛ اگر این مقادیر
  // useState محلی همان کامپوننت بودند، با هر تغییر مدل، متن/عکس‌های تایپ‌شده پاک می‌شدند
  studioDraftValue: string
  studioDraftImages: string[]
  studioDraftPreserveFace: boolean
  setSelectedConvId: (id: string | null) => void
  setStreamingContent: (text: string) => void
  appendStreamingContent: (chunk: string) => void
  setIsStreaming: (v: boolean) => void
  setIsReasoning: (v: boolean) => void
  appendReasoningText: (chunk: string) => void
  setIsGeneratingImage: (v: boolean) => void
  setGeneratingImagePreview: (image: string | null) => void
  resetStreaming: () => void
  setChatError: (msg: string | null, code?: string | null) => void
  setSelectedModel: (model: string) => void
  setSelectedImageGenModel: (model: string | null) => void
  setThinkingMode: (mode: ThinkingMode) => void
  setSelectedCreativePrompt: (prompt: CreativePromptCatalogItem | null) => void
  setStudioDraftValue: (value: string) => void
  setStudioDraftImages: (images: string[] | ((prev: string[]) => string[])) => void
  setStudioDraftPreserveFace: (v: boolean) => void
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
  chatError: null,
  chatErrorCode: null,
  // پیش‌فرض جدید «مصرف بهینه» (۱۴۰۵/۰۶) — کاربری که هنوز چیزی انتخاب نکرده روی این حالت می‌افتد
  // 'optimal' مقدار قدیمی سنتینل «خودکار» است (قبل از معرفی دو حالت مصرف‌بهینه/بهترین‌پاسخ) —
  // معادل 'best_answer' فعلی در نظر گرفته می‌شود تا کاربرهای قدیمی رفتار قبلی رو حفظ کنن
  selectedModel: typeof window !== 'undefined'
    ? (() => {
        const stored = localStorage.getItem('nivo:selectedModel')
        return stored === 'optimal' ? 'best_answer' : (stored ?? 'cost_optimized')
      })()
    : 'cost_optimized',
  selectedImageGenModel: typeof window !== 'undefined' ? localStorage.getItem('nivo:selectedImageGenModel') : null,
  thinkingMode:
    (typeof window !== 'undefined' ? (localStorage.getItem('nivo:thinkingMode') as ThinkingMode | null) : null) ?? 'smart',
  selectedCreativePrompt: null,
  studioDraftValue: '',
  studioDraftImages: [],
  studioDraftPreserveFace: true,

  setSelectedConvId: id => set({ selectedConvId: id }),
  setStreamingContent: text => set({ streamingContent: text }),
  appendStreamingContent: chunk => set(s => ({ streamingContent: s.streamingContent + chunk })),
  setIsStreaming: v => set({ isStreaming: v }),
  setIsReasoning: v => set({ isReasoning: v }),
  appendReasoningText: chunk => set(s => ({ reasoningText: s.reasoningText + chunk })),
  setIsGeneratingImage: v => set({ isGeneratingImage: v }),
  setGeneratingImagePreview: image => set({ generatingImagePreview: image }),
  resetStreaming: () => set({
    streamingContent: '', isStreaming: false, isReasoning: false, reasoningText: '',
    isGeneratingImage: false, generatingImagePreview: null,
  }),
  setChatError: (msg, code = null) => set({ chatError: msg, chatErrorCode: code }),
  setSelectedModel: model => set({ selectedModel: model }),
  setSelectedImageGenModel: model => set({ selectedImageGenModel: model }),
  setThinkingMode: mode => {
    localStorage.setItem('nivo:thinkingMode', mode)
    set({ thinkingMode: mode })
  },
  setSelectedCreativePrompt: prompt => set({ selectedCreativePrompt: prompt }),
  setStudioDraftValue: value => set({ studioDraftValue: value }),
  setStudioDraftImages: images => set(s => ({
    studioDraftImages: typeof images === 'function' ? images(s.studioDraftImages) : images,
  })),
  setStudioDraftPreserveFace: v => set({ studioDraftPreserveFace: v }),
  resetStudioDraft: () => set({ studioDraftValue: '', studioDraftImages: [], studioDraftPreserveFace: true }),
}))
