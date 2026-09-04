import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { CodeBlock, PrePassthrough } from '@/components/chat/CodeBlock'
import { useSubmitMessageFeedback } from '@/queries/message-feedback.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { ImageLightbox, downloadImage } from '@/components/ui/ImageLightbox'
import { fa } from '@/locales/fa'
import { track } from '@/lib/events'
import type { Message } from '@/types/api'

function LinkNewTab({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

// wrapper مشترک روی <img> برای عکس‌های پیام — چون src ممکن است مسیر نسبی auth-dار بک‌اند
// باشد (نه یک URL مستقیم قابل‌نمایش)، تا وقتی useAuthedImageUrl آن را resolve کند یک
// اسکلت خاکستری نشان می‌دهیم به‌جای <img> شکسته
// export شده تا ImageStudioPage.tsx هم بتواند برای گالری از همین wrapper (auth-دار) استفاده کند
export function ChatImage({ src, className, alt, onClick }: {
  src: string
  className?: string
  alt: string
  onClick?: () => void
}) {
  const url = useAuthedImageUrl(src)
  if (!url) return <div className={clsx(className, 'animate-pulse bg-slate-700/50')} />
  return <img src={url} className={className} onClick={onClick} alt={alt} />
}

interface MessageListProps {
  messages: Message[]
  // محتوای اضافه (مثل کارت‌های نتیجه‌ی تولید دیسکاوری) که بعد از پیام‌های واقعی، همون توی
  // اسکرول این لیست نشون داده می‌شود — فقط state محلی فرانت است، ردیف Message واقعی نیست
  // (ChatPage.tsx: virtualMessages). به‌شکل تابع می‌گیریمش (نه ReactNode مستقیم) تا همون
  // onImageClick لایت‌باکس داخلی این کامپوننت به عکس‌های داخل extraContent هم وصل شود —
  // وگرنه کلیک روی عکس تولیدشده‌ی یک سبک دیسکاوری هیچ‌کاری نمی‌کرد (نه بزرگ‌نمایی، نه دانلود)
  extraContent?: (onImageClick: (src: string) => void) => ReactNode
}

export function MessageList({ messages, extraContent }: MessageListProps) {
  const {
    streamingContent, isStreaming, isReasoning, reasoningText, chatError, chatErrorCode, isGeneratingImage,
    generatingImagePreview,
  } = useChatStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current; if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamingContent, reasoningText, chatError])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          id={msg.id}
          role={msg.role}
          content={msg.content}
          images={msg.images}
          feedback={msg.feedback}
          onImageClick={setLightboxSrc}
        />
      ))}

      {extraContent?.(setLightboxSrc)}

      {isGeneratingImage && <GeneratingImageBox preview={generatingImagePreview} />}

      {!isGeneratingImage && isStreaming && !streamingContent && reasoningText && (
        <ReasoningBox text={reasoningText} />
      )}

      {!isGeneratingImage && isStreaming && streamingContent && (
        <MessageBubble role="ASSISTANT" content={streamingContent} streaming />
      )}

      {!isGeneratingImage && isStreaming && !streamingContent && !reasoningText && isReasoning && (
        <div className="flex items-center gap-2.5 px-1 text-sm text-slate-400">
          <div className="size-8 rounded-full shrink-0 bg-gradient-to-br from-emerald-500 to-purple-600 shadow-[0_0_14px_rgba(16,185,129,0.25)] animate-pulse" />
          در حال فکر کردن...
        </div>
      )}

      {!isGeneratingImage && isStreaming && !streamingContent && !reasoningText && !isReasoning && (
        <div className="flex items-center gap-2.5 px-1">
          <div className="size-8 rounded-full shrink-0 bg-gradient-to-br from-emerald-500 to-purple-600 shadow-[0_0_14px_rgba(16,185,129,0.25)]" />
          <div className="flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {chatError && !isStreaming && (
        <ChatErrorBox message={chatError} code={chatErrorCode} />
      )}

    </div>
  )
}

// حداکثر طول متن قابل‌نمایش از reasoning — این یک «پنجره‌ی لغزان» روی آخرین بخش متن است، نه کل
// تاریخچه؛ وگرنه هرچه استریم جلوتر می‌رفت این باکس بی‌نهایت بلند می‌شد (متن استدلال می‌تواند
// چند هزار کاراکتر باشد). فقط آخرین ~۲۲۰ کاراکتر (تقریباً یک پاراگراف کوتاه) نشان داده می‌شود.
const REASONING_VISIBLE_CHARS = 220

// متن زنده‌ی استدلال مدل (اگر Liara/مدل reasoning_content برگرداند) — کم‌رنگ و جدا از حباب
// پاسخ اصلی، دقیقاً مثل الگوی «Thinking» در ChatGPT/Claude؛ فقط تا قبل از شروع متن واقعی نشان
// داده می‌شود (بخش بالاتر در MessageList با isStreaming && !streamingContent گیت شده)
function ReasoningBox({ text }: { text: string }) {
  const visible =
    text.length > REASONING_VISIBLE_CHARS ? `…${text.slice(-REASONING_VISIBLE_CHARS)}` : text

  return (
    <div className="flex gap-3">
      <div className="size-8 shrink-0" />
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm border border-slate-700/50 bg-slate-800/30 px-4 py-3 opacity-60">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="animate-pulse">🤔</span>
          در حال فکر کردن...
        </div>
        <p className="whitespace-pre-wrap text-xs italic leading-relaxed text-slate-400">{visible}</p>
      </div>
    </div>
  )
}

// docs/PRD-chat-images.md بخش ۶.۱ — تولید عکس برخلاف استریم متن فوری شروع نمی‌شود (چند ثانیه
// طول می‌کشد)؛ تا رسیدن رویداد image-generated یک ابر نرم محو (که به‌آرامی نفس می‌کشد) با یک
// هاله‌ی ظریف دور یک آیکون ساده نشان داده می‌شود. به محض رسیدن اولین partial_image، همون تصویر
// واقعی (هرچند محو/ناقص) با یک محو-شدن نرم (image-gen-reveal) جایگزین می‌شود — بدون جهش ناگهانی.
// استخراج‌شده تا هم اینجا (حباب چت) هم گالری استودیوی عکس (ImageStudioPage.tsx) از همین
// انیمیشن استفاده کنند — سایز از بیرون کنترل می‌شود (className)
export function ImageGenCanvas({ preview, className }: { preview: string | null; className?: string }) {
  return (
    <div className={clsx('image-gen-canvas relative overflow-hidden rounded-xl', className)}>
      <span className="image-gen-glow image-gen-glow-a" />
      <span className="image-gen-glow image-gen-glow-b" />
      <span className="image-gen-shimmer" />
      {preview ? (
        <img
          src={preview}
          alt="پیش‌نمایش در حال تکمیل عکس تولیدشده"
          className="image-gen-reveal absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="image-gen-mark">
          <span className="image-gen-halo" />
          <svg viewBox="0 0 24 24" fill="none" className="image-gen-spark">
            <path d="M12 3.5l1.6 4.1 4.1 1.6-4.1 1.6-1.6 4.1-1.6-4.1-4.1-1.6 4.1-1.6L12 3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

function GeneratingImageBox({ preview }: { preview: string | null }) {
  return (
    <div className="flex gap-3">
      <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
        AI
      </div>
      <div className="flex flex-col gap-2 rounded-2xl rounded-tr-sm bg-slate-800 px-4 py-3">
        <div className="text-xs font-medium text-slate-400">
          {preview ? 'در حال تکمیل عکس...' : 'در حال ساخت عکس...'}
        </div>
        <ImageGenCanvas preview={preview} className="h-48 w-48" />
      </div>
    </div>
  )
}

// این باکس فقط برای خطاهای عمومی/غیرمنتظره است (مدل در دسترس نیست، قطعی شبکه و ...) —
// خطاهای «محدودیت» (سقف روزانه/پنجره‌ی لغزان/بودجه‌ی توکن) توسط بنر پایدار بالای اینپوت
// (MessageLimitBanner) پوشش داده می‌شوند، نه اینجا.
export function ChatErrorBox({ message, code, onRetry }: { message: string; code: string | null; onRetry?: () => void }) {
  const navigate = useNavigate()
  const isImageGenNotSupported = code === 'IMAGE_GEN_NOT_SUPPORTED'

  useEffect(() => {
    if (isImageGenNotSupported) track('image_gen_blocked_not_supported', { code })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImageGenNotSupported, code])

  const heading = isImageGenNotSupported
    ? 'پلن شما این قابلیت را ندارد'
    : code === 'model_unavailable'
      ? 'مدل در دسترس نیست'
      : 'خطایی رخ داد'

  return (
    <div className="flex justify-center">
      <div className="max-w-sm w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg viewBox="0 0 24 24" fill="none" className="size-5 text-red-400 shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold text-red-300">{heading}</span>
        </div>
        <p className="text-sm text-red-200/80 leading-relaxed">{message}</p>
        {isImageGenNotSupported ? (
          <button
            onClick={() => navigate('/pricing')}
            className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
          >
            {fa.chat.limitUpgrade}
          </button>
        ) : (
          onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors"
            >
              {fa.chat.retry}
            </button>
          )
        )}
      </div>
    </div>
  )
}

// disableFeedback: برای پیام‌های مصنوعی/محلی (مثل پیام‌های سبک‌های دیسکاوری داخل چت —
// ChatPage.tsx) که id واقعی Message ندارند؛ حتی اگر id ساختگی پاس داده شود، نباید ردیف
// پسندیدن/نپسندیدن نشان داده شود چون messageId واقعی برای ثبت فیدبک وجود ندارد
export function MessageBubble({
  id,
  role,
  content,
  images,
  feedback,
  streaming,
  disableFeedback,
  onImageClick,
}: {
  id?: string
  role: Message['role']
  content: string
  images?: string[] | null
  feedback?: Message['feedback']
  streaming?: boolean
  disableFeedback?: boolean
  onImageClick?: (src: string) => void
}) {
  const isUser = role === 'USER'

  return (
    <div>
      <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
        <div
          className={clsx(
            'size-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
            isUser
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-gradient-to-br from-emerald-500 to-purple-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.25)]',
          )}
        >
          {isUser ? 'ش' : 'AI'}
        </div>

        {isUser ? (
          <div
            className={clsx(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
              'bg-emerald-500/[0.14] border border-emerald-500/[0.18] text-emerald-50 rounded-tl-sm',
              streaming && 'border-emerald-500/30',
            )}
          >
            {images && images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((src, i) => (
                  <ChatImage
                    key={i}
                    src={src}
                    className="max-h-48 max-w-[200px] rounded-lg object-cover cursor-pointer"
                    onClick={() => onImageClick?.(src)}
                    alt={`عکس پیوست‌شده‌ی شما، شماره ${i + 1}`}
                  />
                ))}
              </div>
            )}
            {content}
            {streaming && <span className="inline-block w-0.5 h-4 bg-emerald-400 animate-pulse mr-0.5" />}
          </div>
        ) : (
          <div className="min-w-0 flex-1 text-sm leading-relaxed text-slate-100 ai-content">
            {images && images.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {images.map((src, i) => (
                  <div key={i} className="image-gen-reveal relative group w-fit">
                    <ChatImage
                      src={src}
                      className="max-h-72 max-w-[280px] rounded-lg object-cover cursor-pointer ring-1 ring-fuchsia-500/25 shadow-lg shadow-fuchsia-950/30"
                      onClick={() => onImageClick?.(src)}
                      alt="تصویر ساخته‌شده توسط هوش مصنوعی"
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        track('generated_image_downloaded', { source: 'inline' })
                        void downloadImage(src, 'nivo-image.png')
                      }}
                      className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-lg bg-slate-900/80 text-slate-200 opacity-90 group-hover:opacity-100 transition-opacity hover:bg-slate-900"
                      aria-label="دانلود عکس"
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                        <path d="M8 1v9m0 0l-3-3m3 3l3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {content && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ code: CodeBlock, pre: PrePassthrough, a: LinkNewTab }}
              >
                {content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>

      {!streaming && content && (
        <div className={clsx('mt-1.5 flex items-center gap-1', isUser ? 'justify-start pl-11' : 'pr-11')}>
          <MessageCopyButton text={content} role={role} />
        </div>
      )}

      {!isUser && !streaming && !disableFeedback && id && <MessageFeedbackRow messageId={id} initial={feedback} />}
    </div>
  )
}

// دکمه‌ی کپی زیر هر آیتم چت (هم پرامپت کاربر، هم پاسخ دستیار) — استایل و آیکون هم‌راستا
// با CopyButton بلوک کد (CodeBlock.tsx) تا حس یکپارچه‌ای در کل چت داشته باشد
function MessageCopyButton({ text, role }: { text: string; role: Message['role'] }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(text)
    track('message_copied', { role })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        'flex size-6 items-center justify-center rounded-md transition-colors',
        copied ? 'text-emerald-400' : 'text-slate-600 hover:bg-slate-800 hover:text-slate-400',
      )}
      aria-label={copied ? 'کپی شد' : 'کپی متن پیام'}
      title={copied ? 'کپی شد' : 'کپی'}
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="none" className="size-3.5">
          <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="size-3.5">
          <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.5 12.5V4.5a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

function MessageFeedbackRow({ messageId, initial }: { messageId: string; initial?: Message['feedback'] }) {
  const [vote, setVote] = useState<'UP' | 'DOWN' | null>(initial?.vote ?? null)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [comment, setComment] = useState('')
  const [commentSent, setCommentSent] = useState(false)
  const submitFeedback = useSubmitMessageFeedback()

  function vote_(v: 'UP' | 'DOWN') {
    setVote(v)
    setShowCommentBox(true)
    submitFeedback.mutate(
      { messageId, vote: v },
      { onSuccess: () => track('message_feedback_submitted', { messageId, vote: v }) },
    )
  }

  function submitComment() {
    if (!vote || !comment.trim()) return
    const commentLength = comment.trim().length
    submitFeedback.mutate(
      { messageId, vote, comment: comment.trim() },
      {
        onSuccess: () => {
          setCommentSent(true)
          track('message_feedback_comment_submitted', { messageId, vote, commentLength })
        },
      },
    )
  }

  return (
    <div className="pr-11 mt-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => vote_('UP')}
          className={clsx(
            'size-6 rounded-md flex items-center justify-center transition-colors',
            vote === 'UP' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800',
          )}
          aria-label="پاسخ مفید بود"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
            <path
              d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4.5-8a2 2 0 013.5 1.34V9h4.28a2 2 0 011.98 2.28l-1.14 8A2 2 0 0117.66 21H10a3 3 0 01-3-3v-7z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={() => vote_('DOWN')}
          className={clsx(
            'size-6 rounded-md flex items-center justify-center transition-colors',
            vote === 'DOWN' ? 'text-red-400 bg-red-500/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800',
          )}
          aria-label="پاسخ مفید نبود"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5 rotate-180">
            <path
              d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1h3zm0 0l4.5-8a2 2 0 013.5 1.34V9h4.28a2 2 0 011.98 2.28l-1.14 8A2 2 0 0117.66 21H10a3 3 0 01-3-3v-7z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showCommentBox && !commentSent && (
        <div className="mt-1.5 flex items-center gap-1.5 max-w-xs">
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitComment()}
            placeholder={fa.messageFeedback.commentPlaceholder}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={submitComment}
            disabled={!comment.trim()}
            className="shrink-0 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-40 transition-colors"
          >
            {fa.messageFeedback.submit}
          </button>
        </div>
      )}
      {commentSent && (
        <p className="mt-1 text-[11px] text-slate-600">{fa.messageFeedback.thanks}</p>
      )}
    </div>
  )
}
