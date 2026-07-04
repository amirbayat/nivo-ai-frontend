import { useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useConversation, useCreateConversation } from '@/queries/conversation.queries'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chat.store'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { BudgetWarningBox } from '@/components/chat/BudgetWarningBox'
import { MessageLimitBanner } from '@/components/chat/MessageLimitBanner'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { fa } from '@/locales/fa'
import { env } from '@/env'

export function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  const { isStreaming } = useChatStore()
  const navigate = useNavigate()
  const createConv = useCreateConversation()

  const handleFirstMessage = async (content: string, _images?: string[]) => {
    try {
      const conv = await createConv.mutateAsync(env.VITE_DEFAULT_MODEL)
      navigate(`/chat/${conv.id}`, { state: { initialMessage: content }, replace: true })
    } catch {
      // ignore — user can retype and retry
    }
  }

  if (!id) {
    return (
      <>
        <EmptyState onSend={handleFirstMessage} isCreating={createConv.isPending} />
        <BudgetWarningBox />
      </>
    )
  }

  return (
    <>
      <ActiveChat conversationId={id} isStreaming={isStreaming} />
      <BudgetWarningBox />
    </>
  )
}

function ActiveChat({ conversationId, isStreaming }: { conversationId: string; isStreaming: boolean }) {
  const { data, isLoading } = useConversation(conversationId)
  const { sendMessage } = useChat(conversationId)
  const location = useLocation()

  const pendingRef = useRef<string | null>(
    (location.state as { initialMessage?: string } | null)?.initialMessage ?? null,
  )

  useEffect(() => {
    const msg = pendingRef.current
    if (msg && !isLoading && data) {
      pendingRef.current = null
      window.history.replaceState({}, '')
      void sendMessage(msg)
    }
  }, [isLoading, data, sendMessage])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500 text-sm">
        {fa.common.error}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-6 py-4">
        <h2 className="truncate text-sm font-medium text-slate-200">
          {data.title ?? fa.chat.untitled}
        </h2>
        <div className="mr-auto flex items-center gap-2 shrink-0">
          <ModelSelector currentModel={data.model} />
          <FeedbackWidget />
        </div>
      </div>

      <MessageList messages={data.messages} />
      <MessageLimitBanner />
      <MessageInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}

function EmptyState({ onSend, isCreating }: { onSend: (content: string, images?: string[]) => void; isCreating: boolean }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="size-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="size-10 text-emerald-500/60">
            <path
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-300">{fa.chat.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{fa.chat.emptySubtitle}</p>
        </div>
      </div>
      <MessageLimitBanner />
      <MessageInput onSend={onSend} disabled={isCreating} />
    </div>
  )
}
