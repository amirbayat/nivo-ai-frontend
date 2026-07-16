import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'
import { useChatStore } from '@/store/chat.store'
import { CodeBlock, PrePassthrough } from '@/components/chat/CodeBlock'
import { useSubmitMessageFeedback } from '@/queries/message-feedback.queries'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import type { Message } from '@/types/api'

function LinkNewTab({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

// دانلود واقعی فایل (نه فقط باز شدن URL خام) — attribute «download» ساده روی لینک نامعتبر
// می‌شود. src یا یک data: URL خام قدیمی است (نیاز به auth ندارد) یا مسیر نسبی بک‌اند خودمان
// (GET /conversations/:id/images/:filename) که باید با هدر Authorization واقعی خوانده شود —
// یک fetch خام بدون auth برای حالت دوم ۴۰۱ می‌گیرد
async function downloadImage(src: string, filename: string) {
  try {
    const blob = src.startsWith('data:')
      ? await (await fetch(src)).blob()
      : (await api.get(src, { responseType: 'blob' })).data
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // fallback: حداقل توی تب جدید باز شود تا کاربر دستی ذخیره کند
    window.open(src, '_blank')
  }
}

// wrapper مشترک روی <img> برای عکس‌های پیام — چون src ممکن است مسیر نسبی auth-dار بک‌اند
// باشد (نه یک URL مستقیم قابل‌نمایش)، تا وقتی useAuthedImageUrl آن را resolve کند یک
// اسکلت خاکستری نشان می‌دهیم به‌جای <img> شکسته
function ChatImage({ src, className, alt, onClick }: {
  src: string
  className?: string
  alt: string
  onClick?: () => void
}) {
  const url = useAuthedImageUrl(src)
  if (!url) return <div className={clsx(className, 'animate-pulse bg-slate-700/50')} />
  return <img src={url} className={className} onClick={onClick} alt={alt} />
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const url = useAuthedImageUrl(src)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); void downloadImage(src, 'nivo-image.png') }}
          className="flex size-10 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="دانلود عکس"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M8 1v9m0 0l-3-3m3 3l3-3M2 12v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-slate-800/90 text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="بستن"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {url && (
        <img
          src={url}
          alt="نمایش بزرگ‌شده‌ی تصویر"
          onClick={e => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      )}
    </div>
  )
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
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
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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

      {isGeneratingImage && <GeneratingImageBox preview={generatingImagePreview} />}

      {!isGeneratingImage && isStreaming && !streamingContent && reasoningText && (
        <ReasoningBox text={reasoningText} />
      )}

      {!isGeneratingImage && isStreaming && streamingContent && (
        <MessageBubble role="ASSISTANT" content={streamingContent} streaming />
      )}

      {!isGeneratingImage && isStreaming && !streamingContent && !reasoningText && isReasoning && (
        <div className="flex items-center gap-2 px-2 text-sm text-slate-400">
          <span className="animate-pulse">🤔</span>
          در حال فکر کردن...
        </div>
      )}

      {!isGeneratingImage && isStreaming && !streamingContent && !reasoningText && !isReasoning && (
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
// طول می‌کشد)؛ یک جعبه‌ی اسکلتی/blur تا رسیدن رویداد image-generated نشان داده می‌شود
// وقتی provider هنوز هیچ پیش‌نمایشی نفرستاده، shimmer تزئینی نشون می‌دیم؛ به محض رسیدن اولین
// partial_image، همون عکس واقعی (هرچند محو/ناقص) رو نشون می‌دیم — دقیقاً افکت progressive-reveal
// شبکه‌ی ۶×۶ که موج‌دار (قطری) روشن/خاموش می‌شود — الگوی ثابت (نه Math.random در هر رندر)
// تا با هر re-render جابه‌جا نشود؛ delay هر خونه بر اساس فاصله‌ی قطری‌اش از گوشه محاسبه می‌شود
const TILE_GRID_SIZE = 6
const TILE_CELLS = Array.from({ length: TILE_GRID_SIZE * TILE_GRID_SIZE }, (_, i) => {
  const row = Math.floor(i / TILE_GRID_SIZE)
  const col = i % TILE_GRID_SIZE
  return { key: i, delay: (row + col) * 0.1 }
})

// چند «ستاره»‌ی ریز با موقعیت ثابت برای حس فضایی پس‌زمینه
const STARS = [
  { top: '12%', left: '18%', delay: '0s' },
  { top: '22%', left: '78%', delay: '0.6s' },
  { top: '68%', left: '85%', delay: '1.2s' },
  { top: '80%', left: '12%', delay: '0.3s' },
  { top: '45%', left: '92%', delay: '1.6s' },
  { top: '8%', left: '55%', delay: '0.9s' },
]

function GeneratingImageBox({ preview }: { preview: string | null }) {
  return (
    <div className="flex gap-3">
      <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
        AI
      </div>
      <div className="flex flex-col gap-2 rounded-2xl rounded-tr-sm bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-300">
          <svg viewBox="0 0 24 24" fill="none" className="image-gen-sparkle size-3.5">
            <path d="M12 3l1.8 4.6L18 9.5l-4.2 1.4L12 16l-1.8-5.1L6 9.5l4.2-1.9L12 3z" fill="currentColor" />
          </svg>
          <span>{preview ? 'در حال تکمیل عکس...' : 'در حال ساخت عکس...'}</span>
        </div>
        <div className="image-gen-canvas relative h-48 w-48 overflow-hidden rounded-xl">
          <div className="image-gen-nebula-blob image-gen-nebula-blob-1" />
          <div className="image-gen-nebula-blob image-gen-nebula-blob-2" />
          {STARS.map((s, i) => (
            <span
              key={i}
              className="image-gen-star"
              style={{ top: s.top, left: s.left, animationDelay: s.delay }}
            />
          ))}
          {preview ? (
            <img
              src={preview}
              alt="پیش‌نمایش در حال تکمیل عکس تولیدشده"
              className="image-gen-reveal absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid grid-cols-6 gap-1.5 p-4">
              {TILE_CELLS.map(cell => (
                <div
                  key={cell.key}
                  className="image-gen-tile"
                  style={{ animationDelay: `${cell.delay}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// این باکس فقط برای خطاهای عمومی/غیرمنتظره است (مدل در دسترس نیست، قطعی شبکه و ...) —
// خطاهای «محدودیت» (سقف روزانه/پنجره‌ی لغزان/بودجه‌ی توکن) توسط بنر پایدار بالای اینپوت
// (MessageLimitBanner) پوشش داده می‌شوند، نه اینجا.
function ChatErrorBox({ message, code }: { message: string; code: string | null }) {
  const heading = code === 'model_unavailable' ? 'مدل در دسترس نیست' : 'خطایی رخ داد'

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
      </div>
    </div>
  )
}

function MessageBubble({
  id,
  role,
  content,
  images,
  feedback,
  streaming,
  onImageClick,
}: {
  id?: string
  role: Message['role']
  content: string
  images?: string[] | null
  feedback?: Message['feedback']
  streaming?: boolean
  onImageClick?: (src: string) => void
}) {
  const isUser = role === 'USER'

  return (
    <div>
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
          <div
            className={clsx(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              'bg-slate-800 text-slate-100 rounded-tr-sm ai-content',
              streaming && 'border border-emerald-500/30',
            )}
          >
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
                      onClick={e => { e.stopPropagation(); void downloadImage(src, 'nivo-image.png') }}
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

      {!isUser && !streaming && id && <MessageFeedbackRow messageId={id} initial={feedback} />}
    </div>
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
    submitFeedback.mutate({ messageId, vote: v })
  }

  function submitComment() {
    if (!vote || !comment.trim()) return
    submitFeedback.mutate(
      { messageId, vote, comment: comment.trim() },
      { onSuccess: () => setCommentSent(true) },
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
