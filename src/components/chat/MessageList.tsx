import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { renderMarkdown } from '@/lib/markdown'
import type { Message } from '@/types/api'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const { streamingContent, isStreaming, chatError, limitPlanTier } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, chatError])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map(msg => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {isStreaming && streamingContent && (
        <MessageBubble role="ASSISTANT" content={streamingContent} streaming />
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

      {chatError && !isStreaming && <LimitBox message={chatError} planTier={limitPlanTier} />}

      <div ref={bottomRef} />
    </div>
  )
}

function LimitBox({ message, planTier }: { message: string; planTier: string | null }) {
  return (
    <div className="flex justify-center">
      <div className="max-w-sm w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg viewBox="0 0 24 24" fill="none" className="size-5 text-red-400 shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-red-300">به محدودیت رسیدید</span>
        </div>
        <p className="text-sm text-red-200/80 leading-relaxed mb-3">{message}</p>

        {planTier && (
          <div className="flex gap-2 flex-wrap">
            {(planTier === 'free' || planTier === 'pro') && (
              <a
                href="/pricing"
                className="flex-1 min-w-0 rounded-xl bg-emerald-500 py-2 text-center text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
              >
                {planTier === 'free' ? 'ارتقاء به پرو' : 'ارتقاء به ویژه'}
              </a>
            )}
            {/* wallet CTA disabled
            {(planTier === 'pro' || planTier === 'premium') && (
              <a
                href="/settings/profile"
                className="flex-1 min-w-0 rounded-xl border border-slate-600 py-2 text-center text-xs text-slate-300 hover:bg-slate-700 transition-colors"
              >
                شارژ کیف پول
              </a>
            )}
            */}
            {planTier === 'free' && (
              <a
                href="/settings/profile"
                className="flex-1 min-w-0 rounded-xl border border-slate-600 py-2 text-center text-xs text-slate-300 hover:bg-slate-700 transition-colors"
              >
                مشاهده پروفایل
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: Message['role']
  content: string
  streaming?: boolean
}) {
  const isUser = role === 'USER'
  const sanitizedHtml = !isUser
    ? DOMPurify.sanitize(renderMarkdown(content))
    : null

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
        <div
          className={clsx(
            'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
            'bg-emerald-600/20 text-emerald-50 rounded-tl-sm',
            streaming && 'border border-emerald-500/30',
          )}
        >
          {content}
          {streaming && <span className="inline-block w-0.5 h-4 bg-emerald-400 animate-pulse mr-0.5" />}
        </div>
      ) : (
        <div
          className={clsx(
            'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
            'bg-slate-800 text-slate-100 rounded-tr-sm ai-content',
            streaming && 'border border-emerald-500/30',
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml! }}
        />
      )}
    </div>
  )
}
