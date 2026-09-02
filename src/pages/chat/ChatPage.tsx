import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useConversation, useCreateConversation } from '@/queries/conversation.queries'
import { useGenerateCreative } from '@/queries/discovery.queries'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/store/chat.store'
import { MessageList, MessageBubble } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { MessageLimitBanner } from '@/components/chat/MessageLimitBanner'
import { GiftBanner } from '@/components/chat/GiftBanner'
import { OutageBanner } from '@/components/chat/OutageBanner'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { ChatHeroComposer } from './ChatHeroComposer'
import { creativeIntroMessage, type VirtualMessage } from '@/lib/creativeIntro'
import { fa } from '@/locales/fa'

interface PendingMessage {
  content: string
  images?: string[]
  imageModel?: string
  preserveFace?: boolean
}

export function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  const { isStreaming } = useChatStore()
  const navigate = useNavigate()
  const location = useLocation()
  const createConv = useCreateConversation()

  // اگر از ProjectDetailPage با «چت جدید در این پروژه» به اینجا اومده باشیم، این چت تازه
  // باید از همون ابتدا به همون پروژه وصل بشه (context تجمیعی پروژه رو از همون پیام اول بخونه)
  const projectId = (location.state as { projectId?: string } | null)?.projectId

  const handleFirstMessage = async (
    content: string,
    images?: string[],
    imageModel?: string,
    preserveFace?: boolean,
  ) => {
    try {
      const conv = await createConv.mutateAsync({ model: 'optimal', projectId })
      navigate(`/chat/${conv.id}`, {
        state: { initialMessage: { content, images, imageModel, preserveFace } },
        replace: true,
      })
    } catch {
      // ignore — user can retype and retry
    }
  }

  if (!id) {
    return (
      <EmptyState
        onSend={handleFirstMessage}
        isCreating={createConv.isPending}
      />
    )
  }

  // key={id} یعنی با عوض شدن مکالمه، state محلی creativeResults/... کاملاً ری‌مانت می‌شود —
  // نتایج دیسکاوری فقط state محلی این کامپوننت‌اند (نه Message واقعی)، پس نباید بین مکالمات نشت کنند
  return <ActiveChat key={id} conversationId={id} isStreaming={isStreaming} />
}

function ActiveChat({ conversationId, isStreaming }: { conversationId: string; isStreaming: boolean }) {
  const { data, isLoading } = useConversation(conversationId)
  const { sendMessage } = useChat(conversationId)
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedCreativePrompt, selectedModel } = useChatStore()
  const generateCreative = useGenerateCreative()
  const [virtualMessages, setVirtualMessages] = useState<VirtualMessage[]>([])
  const [creativeError, setCreativeError] = useState<string | null>(null)

  const pendingRef = useRef<PendingMessage | null>(
    (location.state as { initialMessage?: PendingMessage } | null)?.initialMessage ?? null,
  )

  useEffect(() => {
    const msg = pendingRef.current
    if (msg && !isLoading && data) {
      pendingRef.current = null
      window.history.replaceState({}, '')
      void sendMessage(msg.content, msg.images, msg.imageModel, msg.preserveFace)
    }
  }, [isLoading, data, sendMessage])

  // با انتخاب سبک (یا عوض‌شدنش)، پیام معرفی سبک به‌عنوان اولین پیام مصنوعی گفت‌وگو اضافه می‌شود
  useEffect(() => {
    if (selectedCreativePrompt) setVirtualMessages([creativeIntroMessage(selectedCreativePrompt)])
  }, [selectedCreativePrompt])

  function handleGenerateCreative(
    promptId: string,
    userInput: string,
    inputImageKeys?: string[],
    imagePreviews?: string[],
    preserveFace?: boolean,
    useSourceImage?: boolean,
  ) {
    if (!selectedCreativePrompt) return
    setCreativeError(null)
    setVirtualMessages(prev => [
      ...prev,
      { id: `virtual-user-${prev.length}`, role: 'USER', content: userInput, images: imagePreviews },
    ])
    generateCreative.mutate(
      { promptId, userInput: userInput || undefined, inputImageKeys, model: selectedModel ?? undefined, preserveFace, useSourceImage, conversationId },
      {
        onSuccess: result =>
          setVirtualMessages(prev => [
            ...prev,
            {
              id: `virtual-result-${result.id}`,
              role: 'ASSISTANT',
              content: result.status === 'FAILED' ? fa.discover.generateFailed : (result.outputText ?? ''),
              images:
                result.status === 'SUCCEEDED' && result.outputType === 'IMAGE' && result.outputImageKey
                  ? [`/v2/discovery/images/${result.outputImageKey}`]
                  : undefined,
            },
          ]),
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
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 500px at 70% -10%, rgba(124,58,237,0.05), transparent 60%), radial-gradient(ellipse 900px 600px at 20% 110%, rgba(16,185,129,0.045), transparent 60%)',
      }}
    >
      <div className="flex items-center gap-3 border-b border-slate-700/30 px-4 py-3 sm:px-6 sm:py-4">
        <button
          onClick={() => navigate('/')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
          aria-label="بازگشت به خانه"
        >
          {/* chevron-right — «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
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
        extraContent={onImageClick =>
          virtualMessages.length > 0 || creativeError ? (
            <>
              {virtualMessages.map(m => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  images={m.images}
                  disableFeedback
                  onImageClick={onImageClick}
                />
              ))}
              {generateCreative.isPending && <GeneratingCreativeBubble />}
              {creativeError && <p className="px-2 text-xs text-red-400">{creativeError}</p>}
            </>
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

// نشانگر «در حال ساخت عکس» برای پیام‌های مصنوعی سبک دیسکاوری — هم‌سبک بسته‌ی «AI»ی که
// MessageList برای تولید عکس چت معمولی نشان می‌دهد (رنگ فوشیا مخصوص تولید عکس)
function GeneratingCreativeBubble() {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-xs font-bold text-white">
        AI
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tr-sm bg-slate-800 px-4 py-3 text-sm text-fuchsia-300">
        <div className="size-3.5 rounded-full border-2 border-fuchsia-400 border-t-transparent animate-spin" />
        در حال ساخت عکس...
      </div>
    </div>
  )
}

function EmptyState({ onSend, isCreating }: {
  onSend: (content: string, images?: string[], imageModel?: string, preserveFace?: boolean) => void
  isCreating: boolean
}) {
  const navigate = useNavigate()
  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 900px 500px at 70% -10%, rgba(124,58,237,0.05), transparent 60%), radial-gradient(ellipse 900px 600px at 20% 110%, rgba(16,185,129,0.045), transparent 60%)',
      }}
    >
      <div className="flex items-center gap-3 border-b border-slate-700/30 px-4 py-3 sm:px-6 sm:py-4">
        <button
          onClick={() => navigate('/')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
          aria-label="بازگشت به خانه"
        >
          {/* chevron-right — «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h2 className="truncate text-sm font-medium text-slate-200">{fa.chat.untitled}</h2>
        <div className="mr-auto flex items-center gap-2 shrink-0">
          <ModelSelector />
          <FeedbackWidget />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 sm:p-8">
        <div className="text-center">
          <p className="text-[22px] font-bold text-white sm:text-[30px]">{fa.chat.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{fa.chat.emptySubtitle}</p>
        </div>

        {/* بازطراحی هاب/چت (docs/PRD-openrouter-migration.md §۱۴.۴) — composer وسط‌چین
            پیکسل‌به‌پیکسل مطابق ChatEmpty.dc.html، فقط در حالت خالی؛ بعد از اولین پیام،
            ActiveChat مثل قبل از MessageInput مشترک/چسبیده‌به‌پایین استفاده می‌کند */}
        <ChatHeroComposer onSend={onSend} disabled={isCreating} />
      </div>
      <OutageBanner />
      <GiftBanner />
      <MessageLimitBanner />
    </div>
  )
}
