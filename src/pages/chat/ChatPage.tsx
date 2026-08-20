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
import { TrendingPromptGrid } from '@/components/chat/TrendingPromptGrid'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem } from '@/types/api'

interface PendingMessage {
  content: string
  images?: string[]
  model?: string
  generateImage?: boolean
}

export function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  const { isStreaming } = useChatStore()
  const setSelectedCreativePrompt = useChatStore(s => s.setSelectedCreativePrompt)
  const navigate = useNavigate()
  const location = useLocation()
  const createConv = useCreateConversation()

  // اگر از ProjectDetailPage با «چت جدید در این پروژه» به اینجا اومده باشیم، این چت تازه
  // باید از همون ابتدا به همون پروژه وصل بشه (context تجمیعی پروژه رو از همون پیام اول بخونه)
  const projectId = (location.state as { projectId?: string } | null)?.projectId

  const handleFirstMessage = async (
    content: string,
    images?: string[],
    model?: string,
    generateImage?: boolean,
  ) => {
    try {
      const conv = await createConv.mutateAsync({ model: 'optimal', projectId })
      navigate(`/chat/${conv.id}`, {
        state: { initialMessage: { content, images, model, generateImage } },
        replace: true,
      })
    } catch {
      // ignore — user can retype and retry
    }
  }

  // انتخاب یک پرامپت آماده‌ی عکسی از صفحه‌ی خالی — دقیقاً هم‌الگوی DiscoverPage.handleSelectPrompt:
  // سبک را در استور مشترک می‌گذاریم و مکالمه‌ی تازه می‌سازیم؛ MessageInput خودِ ActiveChat
  // (که selectedCreativePrompt را از استور می‌خواند) بعد از mount شدن، UI تولید عکس را نشان می‌دهد
  const handleSelectCreativePrompt = async (item: CreativePromptCatalogItem) => {
    setSelectedCreativePrompt(item)
    try {
      const conv = await createConv.mutateAsync({ model: 'optimal', projectId })
      navigate(`/chat/${conv.id}`)
    } catch {
      // ignore — سبک انتخاب‌شده در استور می‌ماند، کاربر می‌تواند دوباره تلاش کند
    }
  }

  if (!id) {
    return (
      <EmptyState
        onSend={handleFirstMessage}
        onSelectCreativePrompt={handleSelectCreativePrompt}
        isCreating={createConv.isPending}
      />
    )
  }

  // key={id} یعنی با عوض شدن مکالمه، state محلی creativeResults/... کاملاً ری‌مانت می‌شود —
  // نتایج دیسکاوری فقط state محلی این کامپوننت‌اند (نه Message واقعی)، پس نباید بین مکالمات نشت کنند
  return <ActiveChat key={id} conversationId={id} isStreaming={isStreaming} />
}

// یک پیام محلی/مصنوعی داخل جریان مکالمه‌ی سبک دیسکاوری — هیچ‌کدام Message واقعی بک‌اند
// نیستند (با رفرش صفحه یا عوض کردن مکالمه از بین می‌روند)، اما دقیقاً با همان کامپوننت
// MessageBubble پیام‌های واقعی رندر می‌شوند تا از نگاه کاربر «توی خودِ چت» و به‌شکل واقعی
// پیش برود: یک پیام دستیار که سبک را معرفی و درخواست عکس/توضیح می‌کند، پیام کاربر با عکس
// آپلودی‌اش، و در آخر پیام دستیار با عکس تولیدشده
interface VirtualMessage {
  id: string
  role: 'ASSISTANT' | 'USER'
  content: string
  images?: string[]
}

function creativeIntroMessage(prompt: CreativePromptCatalogItem): VirtualMessage {
  const ask = prompt.requiresUserImage
    ? `عکستو برام بفرست تا با سبک «${prompt.title}» عوضش کنم.`
    : `بگو با سبک «${prompt.title}» چی می‌خوای برات بسازم.`
  return {
    id: `virtual-intro-${prompt.id}`,
    role: 'ASSISTANT',
    content: prompt.description ? `${ask}\n\n${prompt.description}` : ask,
  }
}

function ActiveChat({ conversationId, isStreaming }: { conversationId: string; isStreaming: boolean }) {
  const { data, isLoading } = useConversation(conversationId)
  const { sendMessage } = useChat(conversationId)
  const location = useLocation()
  const { selectedCreativePrompt } = useChatStore()
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
      void sendMessage(msg.content, msg.images, msg.model, msg.generateImage)
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
  ) {
    if (!selectedCreativePrompt) return
    setCreativeError(null)
    setVirtualMessages(prev => [
      ...prev,
      { id: `virtual-user-${prev.length}`, role: 'USER', content: userInput, images: imagePreviews },
    ])
    generateCreative.mutate(
      { promptId, userInput: userInput || undefined, inputImageKeys },
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
          virtualMessages.length > 0 || creativeError ? (
            <>
              {virtualMessages.map(m => (
                <MessageBubble key={m.id} role={m.role} content={m.content} images={m.images} disableFeedback />
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

function EmptyState({ onSend, onSelectCreativePrompt, isCreating }: {
  onSend: (content: string, images?: string[], model?: string, generateImage?: boolean) => void
  onSelectCreativePrompt: (item: CreativePromptCatalogItem) => void
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

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 sm:p-8">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-300">{fa.chat.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{fa.chat.emptySubtitle}</p>
        </div>

        <TrendingPromptGrid onSelect={onSelectCreativePrompt} disabled={isCreating} />
      </div>
      <OutageBanner />
      <GiftBanner />
      <MessageLimitBanner />
      <MessageInput onSend={onSend} disabled={isCreating} />
    </div>
  )
}
