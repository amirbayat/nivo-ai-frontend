import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import { useAnonStatus, useAnonConversation, useCreateAnonConversation } from '@/queries/anonChat.queries'
import { useAnonChat } from '@/hooks/useAnonChat'
import { getAnonConversationId, setAnonConversationId } from '@/lib/anonSession'
import { AnonSignupBanner } from '@/components/chat/AnonSignupBanner'
import { AnonDiscoveryTrial } from '@/pages/anon-chat/AnonDiscoveryTrial'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useChatStore } from '@/store/chat.store'
import { fa } from '@/locales/fa'
import type { AnonMessage } from '@/types/api'

// نسخه‌ی ساده‌شده‌ی ChatPage.tsx برای کاربر مهمان — بدون پارامتر مسیر (:id)، چون کاربر
// مهمان همیشه دقیقاً یک مکالمه دارد که شناسه‌اش در localStorage نگه داشته می‌شود.
// بدون ModelSelector/تولید عکس — مدل ثابت است و سمت سرور انتخاب می‌شود.
export function AnonChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(() => getAnonConversationId())
  const { data: status } = useAnonStatus()
  const { data: conversation, isLoading: convLoading } = useAnonConversation(conversationId)
  const createConv = useCreateAnonConversation()
  const { sendMessage, isStreaming, streamingContent, error } = useAnonChat(conversationId)
  const pendingRef = useRef<string | null>(null)
  const selectedCreativePrompt = useChatStore(s => s.selectedCreativePrompt)
  const setSelectedCreativePrompt = useChatStore(s => s.setSelectedCreativePrompt)

  // پیام اول: تا مکالمه ساخته و لود نشود، پیام را نگه می‌داریم (دقیقاً مثل الگوی
  // pendingRef در ChatPage.tsx/ActiveChat، فقط بدون ناوبری چون همه چیز در همین صفحه است)
  useEffect(() => {
    const msg = pendingRef.current
    if (msg && conversationId && !convLoading) {
      pendingRef.current = null
      void sendMessage(msg)
    }
  }, [conversationId, convLoading, sendMessage])

  const disabled = status?.stage === 'blocked'

  const handleSend = async (content: string) => {
    if (!conversationId) {
      pendingRef.current = content
      try {
        const conv = await createConv.mutateAsync()
        setAnonConversationId(conv.id)
        setConversationId(conv.id)
      } catch {
        pendingRef.current = null
        // نادیده گرفته می‌شود — کاربر می‌تواند دوباره تلاش کند
      }
      return
    }
    void sendMessage(content)
  }

  const messages: AnonMessage[] = conversation?.messages ?? []
  const hasThread = messages.length > 0 || isStreaming
  const userMessageCount = messages.filter(m => m.role === 'USER').length

  // کاربر از DiscoverPage یک سبک انتخاب کرده — به‌جای UI چت معمولی، پنل امتحان رایگان
  // یک‌باره‌ی استودیو محتوا را نشان بده (docs/PRD-discovery-and-credits.md). بعد از همه‌ی
  // hookها چک می‌شود تا ترتیب فراخوانی hook بین رندرها ثابت بماند (Rules of Hooks)
  if (selectedCreativePrompt) {
    return <AnonDiscoveryTrial prompt={selectedCreativePrompt} onExit={() => setSelectedCreativePrompt(null)} />
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {hasThread ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map(m => (
            <AnonMessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {isStreaming && streamingContent && (
            <AnonMessageBubble role="ASSISTANT" content={streamingContent} streaming />
          )}

          {isStreaming && !streamingContent && (
            <div className="flex gap-1 items-center px-2">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="size-2 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {error && !isStreaming && (
            <div className="flex justify-center">
              <div className="max-w-sm w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
                <p className="text-sm text-red-200/80 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-300">{status?.hintTitle ?? fa.chat.emptyTitle}</p>
              <p className="mt-1 text-sm text-slate-600">{status?.hintSubtitle ?? fa.chat.emptySubtitle}</p>
            </div>
            <AnonSamplePrompts prompts={status?.samplePrompts} onPick={handleSend} />
          </div>
        </div>
      )}

      <AnonSignupBanner status={status} userMessageCount={userMessageCount} />
      <AnonMessageInput onSend={handleSend} disabled={disabled || createConv.isPending} sending={isStreaming} />
    </div>
  )
}

const DEFAULT_SAMPLE_PROMPTS = [
  'این ایمیل رو رسمی‌تر و مودبانه‌تر بنویس',
  'خلاصه‌ی این متن رو در ۳ خط بگو',
  'یک برنامه‌ی غذایی هفتگی سالم پیشنهاد بده',
  'این کد رو دیباگ کن و توضیح بده مشکلش چیه',
  'برام یک کپشن جذاب برای اینستاگرام بنویس',
]

const SAMPLE_PROMPT_ROTATE_MS = 3500

// پرامپت نمونه‌ی رونده — هر چند ثانیه یکی از prompts (از ادمین، یا لیست پیش‌فرض) با
// انیمیشن fade عوض می‌شود؛ کلیک روی آن مستقیماً همان متن را می‌فرستد
function AnonSamplePrompts({ prompts, onPick }: { prompts?: string[]; onPick: (content: string) => void }) {
  const list = prompts?.length ? prompts : DEFAULT_SAMPLE_PROMPTS
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (list.length <= 1) return
    const id = setInterval(() => setIndex(i => (i + 1) % list.length), SAMPLE_PROMPT_ROTATE_MS)
    return () => clearInterval(id)
  }, [list.length])

  return (
    <button
      key={index}
      onClick={() => onPick(list[index % list.length])}
      className="anon-sample-prompt max-w-xs truncate rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 transition-colors hover:bg-emerald-500/20"
    >
      {list[index % list.length]}
    </button>
  )
}

function AnonMessageBubble({ role, content, streaming }: {
  role: AnonMessage['role']
  content: string
  streaming?: boolean
}) {
  const isUser = role === 'USER'

  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={clsx(
          'size-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
          isUser ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300',
        )}
      >
        {isUser ? 'ش' : 'AI'}
      </div>

      {isUser ? (
        <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-emerald-600/20 text-emerald-50 rounded-tl-sm">
          {content}
        </div>
      ) : (
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
          {content}
          {streaming && <span className="inline-block w-0.5 h-4 bg-emerald-400 animate-pulse mr-0.5" />}
        </div>
      )}
    </div>
  )
}

// برخلاف MessageInput معمولی، عمداً بدون پیوست عکس/حالت تولید عکس — مدل کاربر مهمان
// ثابت است و v1 عکس را پشتیبانی نمی‌کند، پس نباید کنترل‌های بلااستفاده نشان داده شود
function AnonMessageInput({ onSend, disabled, sending }: {
  onSend: (content: string) => void
  disabled?: boolean
  sending?: boolean
}) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTouchDevice = useIsTouchDevice()

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || sending) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSend = Boolean(value.trim()) && !disabled && !sending

  return (
    <div className="border-t border-slate-700/50 p-4">
      <div
        className={clsx(
          'flex items-end gap-3 rounded-2xl border bg-slate-800/80 px-4 py-3 transition-colors',
          disabled ? 'border-slate-700/30' : 'border-slate-600/60 focus-within:border-emerald-500/50',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={onInput}
          disabled={disabled}
          placeholder={fa.chat.placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed"
          style={{ minHeight: '24px' }}
        />

        <button
          onClick={submit}
          disabled={!canSend}
          className={clsx(
            'shrink-0 size-9 rounded-xl flex items-center justify-center transition-all',
            canSend
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed',
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4 rotate-180">
            <path d="M12 4l8 8-8 8M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 text-center text-[11px] text-slate-600">
        {isTouchDevice ? 'برای ارسال، دکمه‌ی ارسال را بزنید' : 'Enter برای ارسال · Shift+Enter برای خط جدید'}
      </p>
    </div>
  )
}
