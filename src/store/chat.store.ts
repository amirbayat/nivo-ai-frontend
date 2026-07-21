import { create } from 'zustand'

export type MessageStage = 'normal' | 'throttled' | 'blocked'
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
  messageStage: MessageStage
  remainingNormal: number | null
  remainingThrottled: number | null
  selectedModel: string | null
  // مستقل از selectedModel — چون مدل‌های تولید عکس modelType متفاوتی دارند (IMAGE_GEN) و
  // هرگز نباید به‌جای مدل چت معمولی به سرور فرستاده شوند؛ null یعنی «خودکار» (پیش‌فرض،
  // بر اساس پیچیدگی prompt و کیف‌پول انتخاب می‌شود)
  selectedImageGenModel: string | null
  // دراپ‌دون «سریع/هوشمند» کنار دکمه‌ی ارسال — فقط روی reasoning effort اثر دارد، نه انتخاب مدل
  thinkingMode: ThinkingMode
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
  setMessageStage: (stage: MessageStage, remainingNormal: number | null, remainingThrottled: number | null) => void
  setSelectedModel: (model: string) => void
  setSelectedImageGenModel: (model: string | null) => void
  setThinkingMode: (mode: ThinkingMode) => void
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
  messageStage: 'normal',
  remainingNormal: null,
  remainingThrottled: null,
  // «حالت بهینه» پیش‌فرض جدید — مسیریاب مدل بر اساس سختی پیام، مدل واقعی را انتخاب می‌کند
  selectedModel: typeof window !== 'undefined' ? (localStorage.getItem('nivo:selectedModel') ?? 'optimal') : 'optimal',
  selectedImageGenModel: typeof window !== 'undefined' ? localStorage.getItem('nivo:selectedImageGenModel') : null,
  thinkingMode:
    (typeof window !== 'undefined' ? (localStorage.getItem('nivo:thinkingMode') as ThinkingMode | null) : null) ?? 'smart',

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
  setMessageStage: (stage, remainingNormal, remainingThrottled) =>
    set({ messageStage: stage, remainingNormal, remainingThrottled }),
  setSelectedModel: model => set({ selectedModel: model }),
  setSelectedImageGenModel: model => set({ selectedImageGenModel: model }),
  setThinkingMode: mode => {
    localStorage.setItem('nivo:thinkingMode', mode)
    set({ thinkingMode: mode })
  },
}))
