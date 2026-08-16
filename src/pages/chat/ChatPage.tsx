import { useEffect, useRef, useState, type ReactElement } from 'react'
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

// پرامپت‌های آماده‌ی صفحه‌ی خالی چت — جایگزین آیکون/متن راهنمای قبلی؛ کلیک روی هرکدام
// دقیقاً مثل تایپ همان متن و زدن ارسال است (همان مسیر onSend صفحه‌ی خالی)
const SUGGESTED_PROMPTS: { Icon: (props: { className?: string }) => ReactElement; label: string; prompt: string }[] = [
  {
    label: 'کپشن اینستاگرام',
    prompt: 'یه کپشن جذاب و خلاقانه برای پست اینستاگرام کسب‌وکارم بنویس، همراه با چندتا هشتگ مناسب.',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'ایمیل رسمی',
    prompt: 'یه ایمیل رسمی و کوتاه بنویس برای پیگیری یک همکاری با یک شرکت دیگه.',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 6.5l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'خلاصه‌ی متن',
    prompt: 'این متن رو براش خلاصه‌ی روان و کوتاه بنویس:\n\n',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'کمک برای کد',
    prompt: 'یه تابع جاوااسکریپت بنویس که یه آرایه از اعداد رو می‌گیره و میانگینشون رو برمی‌گردونه.',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'ایده و برنامه‌ریزی',
    prompt: 'یه برنامه‌ی محتوایی یک‌هفته‌ای برای پیج اینستاگرام کسب‌وکارم پیشنهاد بده.',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'تمرین زبان',
    prompt: 'بیا انگلیسی تمرین کنیم — یه مکالمه‌ی روزمره شروع کن و اشتباهات گرامری من رو تصحیح کن.',
    Icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

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

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 sm:p-8">
        <div className="text-center">
          <p className="text-lg font-medium text-slate-300">{fa.chat.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-600">{fa.chat.emptySubtitle}</p>
        </div>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {SUGGESTED_PROMPTS.map(({ Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              disabled={isCreating}
              onClick={() => onSend(prompt)}
              className="group flex flex-col items-start gap-2.5 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-3.5 text-right transition-all hover:border-emerald-500/40 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-50 sm:p-4"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400/80 transition-colors group-hover:bg-emerald-500/15 group-hover:text-emerald-400">
                <Icon className="size-4" />
              </div>
              <span className="text-xs font-medium leading-snug text-slate-300 sm:text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <OutageBanner />
      <GiftBanner />
      <MessageLimitBanner />
      <MessageInput onSend={onSend} disabled={isCreating} />
    </div>
  )
}
