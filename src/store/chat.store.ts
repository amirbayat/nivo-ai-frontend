import { create } from 'zustand'

export type MessageStage = 'normal' | 'throttled' | 'blocked'

interface ChatState {
  selectedConvId: string | null
  streamingContent: string
  isStreaming: boolean
  isReasoning: boolean
  reasoningText: string
  chatError: string | null
  chatErrorCode: string | null
  messageStage: MessageStage
  remainingNormal: number | null
  remainingThrottled: number | null
  selectedModel: string | null
  setSelectedConvId: (id: string | null) => void
  setStreamingContent: (text: string) => void
  appendStreamingContent: (chunk: string) => void
  setIsStreaming: (v: boolean) => void
  setIsReasoning: (v: boolean) => void
  appendReasoningText: (chunk: string) => void
  resetStreaming: () => void
  setChatError: (msg: string | null, code?: string | null) => void
  setMessageStage: (stage: MessageStage, remainingNormal: number | null, remainingThrottled: number | null) => void
  setSelectedModel: (model: string) => void
}

export const useChatStore = create<ChatState>(set => ({
  selectedConvId: null,
  streamingContent: '',
  isStreaming: false,
  isReasoning: false,
  reasoningText: '',
  chatError: null,
  chatErrorCode: null,
  messageStage: 'normal',
  remainingNormal: null,
  remainingThrottled: null,
  // «حالت بهینه» پیش‌فرض جدید — مسیریاب مدل بر اساس سختی پیام، مدل واقعی را انتخاب می‌کند
  selectedModel: typeof window !== 'undefined' ? (localStorage.getItem('nivo:selectedModel') ?? 'optimal') : 'optimal',

  setSelectedConvId: id => set({ selectedConvId: id }),
  setStreamingContent: text => set({ streamingContent: text }),
  appendStreamingContent: chunk => set(s => ({ streamingContent: s.streamingContent + chunk })),
  setIsStreaming: v => set({ isStreaming: v }),
  setIsReasoning: v => set({ isReasoning: v }),
  appendReasoningText: chunk => set(s => ({ reasoningText: s.reasoningText + chunk })),
  resetStreaming: () => set({ streamingContent: '', isStreaming: false, isReasoning: false, reasoningText: '' }),
  setChatError: (msg, code = null) => set({ chatError: msg, chatErrorCode: code }),
  setMessageStage: (stage, remainingNormal, remainingThrottled) =>
    set({ messageStage: stage, remainingNormal, remainingThrottled }),
  setSelectedModel: model => set({ selectedModel: model }),
}))
