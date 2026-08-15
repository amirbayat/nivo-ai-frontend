import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useConversation, useCreateConversation } from '@/queries/conversation.queries'
import { useGenerateCreative } from '@/queries/discovery.queries'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chat.store'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { MessageLimitBanner } from '@/components/chat/MessageLimitBanner'
import { GiftBanner } from '@/components/chat/GiftBanner'
import { OutageBanner } from '@/components/chat/OutageBanner'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem, CreativeGenerationResult } from '@/types/api'

interface PendingMessage {
  content: string
  images?: string[]
  model?: string
  generateImage?: boolean
}

export function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  const { isStreaming } = useChatStore()
  const navigate = useNavigate()
  const createConv = useCreateConversation()

  const handleFirstMessage = async (
    content: string,
    images?: string[],
    model?: string,
    generateImage?: boolean,
  ) => {
    try {
      const conv = await createConv.mutateAsync('optimal')
      navigate(`/chat/${conv.id}`, {
        state: { initialMessage: { content, images, model, generateImage } },
        replace: true,
      })
    } catch {
      // ignore — user can retype and retry
    }
  }

  if (!id) {
    return <EmptyState onSend={handleFirstMessage} isCreating={createConv.isPending} />
  }

  // key={id} یعنی با عوض شدن مکالمه، state محلی creativeResults/... کاملاً ری‌مانت می‌شود —
  // نتایج دیسکاوری فقط state محلی این کامپوننت‌اند (نه Message واقعی)، پس نباید بین مکالمات نشت کنند
  return <ActiveChat key={id} conversationId={id} isStreaming={isStreaming} />
}

interface CreativeResultEntry {
  id: string
  prompt: CreativePromptCatalogItem
  result: CreativeGenerationResult
}

function ActiveChat({ conversationId, isStreaming }: { conversationId: string; isStreaming: boolean }) {
  const { data, isLoading } = useConversation(conversationId)
  const { sendMessage } = useChat(conversationId)
  const location = useLocation()
  const { selectedCreativePrompt } = useChatStore()
  const generateCreative = useGenerateCreative()
  const [creativeResults, setCreativeResults] = useState<CreativeResultEntry[]>([])
  const [creativeError, setCreativeError] = useState<string | null>(null)

  const pendingRef = useRef<PendingMessage | null>(
    (location.state as { initialMessage?: PendingMessage } | null)?.initialMessage ?? null,
  )

  useEffect(() => {
    const msg = pendingRef.current
    if (msg && !isLoading && data) {
      pendingRef.current = null
      window.history.replaceState({}, '')
      void sendMessage(msg.content, msg.images, msg.model, msg.generateImage)
    }
  }, [isLoading, data, sendMessage])

  // نتیجه‌ی تولید دیسکاوری همین‌جا (توی خود چت، بالای اینپوت) نشان داده می‌شود — نه یک ردیف
  // Message واقعی در بک‌اند؛ به همین دلیل با رفرش صفحه یا عوض کردن مکالمه از دست می‌رود
  // (نتیجه‌ی نهایی همچنان توی گالری دیسکاوری برای همیشه باقی می‌ماند)
  function handleGenerateCreative(promptId: string, userInput: string, inputImageKeys?: string[]) {
    if (!selectedCreativePrompt) return
    setCreativeError(null)
    const prompt = selectedCreativePrompt
    generateCreative.mutate(
      { promptId, userInput: userInput || undefined, inputImageKeys },
      {
        onSuccess: result => setCreativeResults(prev => [...prev, { id: result.id, prompt, result }]),
        onError: () => setCreativeError(fa.discover.generateFailed),
      },
    )
  }

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
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="truncate text-sm font-medium text-slate-200">
          {data.title ?? fa.chat.untitled}
        </h2>
        <div className="mr-auto flex items-center gap-2 shrink-0">
          <ModelSelector currentModel={data.model} />
          <FeedbackWidget />
        </div>
      </div>

      <MessageList
        messages={data.messages}
        extraContent={
          creativeResults.length > 0 || creativeError ? (
            <div className="space-y-3">
              {creativeResults.map(entry => (
                <CreativeResultCard key={entry.id} prompt={entry.prompt} result={entry.result} />
              ))}
              {creativeError && <p className="text-xs text-red-400">{creativeError}</p>}
            </div>
          ) : undefined
        }
      />
      <OutageBanner />
      <GiftBanner />
      <MessageLimitBanner />
      <MessageInput
        onSend={sendMessage}
        sending={isStreaming}
        onGenerateCreative={handleGenerateCreative}
        generatingCreative={generateCreative.isPending}
      />
    </div>
  )
}

// کارت نمایش نتیجه‌ی تولید دیسکاوری — دقیقاً هم‌الگوی نمایش نتیجه‌ی GenerateModal قدیمی
// (DiscoverPage.tsx)، فقط این‌جا بالای اینپوت خود چت رندر می‌شود
function CreativeResultCard({ prompt, result }: { prompt: CreativePromptCatalogItem; result: CreativeGenerationResult }) {
  const resultImageUrl = useAuthedImageUrl(
    result.outputImageKey ? `/v2/discovery/images/${result.outputImageKey}` : '',
  )

  return (
    <div className="mr-auto max-w-[85%] rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
      <p className="mb-2 text-[11px] font-medium text-emerald-400/80">{prompt.title}</p>
      {result.status === 'FAILED' ? (
        <p className="text-xs text-red-400">{fa.discover.generateFailed}</p>
      ) : result.outputType === 'TEXT' && result.outputText ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result.outputText}</p>
      ) : result.outputType === 'IMAGE' ? (
        resultImageUrl ? (
          <img src={resultImageUrl} alt={prompt.title} className="max-w-full rounded-xl" />
        ) : (
          <div className="flex justify-center py-6">
            <div className="size-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        )
      ) : null}
    </div>
  )
}

function EmptyState({ onSend, isCreating }: {
  onSend: (content: string, images?: string[], model?: string, generateImage?: boolean) => void
  isCreating: boolean
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="truncate text-sm font-medium text-slate-200">{fa.chat.untitled}</h2>
        <div className="mr-auto flex items-center gap-2 shrink-0">
          <ModelSelector />
          <FeedbackWidget />
        </div>
      </div>

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
      <OutageBanner />
      <GiftBanner />
      <MessageLimitBanner />
      <MessageInput onSend={onSend} disabled={isCreating} />
    </div>
  )
}
