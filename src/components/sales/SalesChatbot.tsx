import { useState, useRef, useEffect, useId } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { CodeBlock, PrePassthrough } from '@/components/chat/CodeBlock'

function LinkNewTab({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  source?: string
}

const OPENING_MESSAGE = 'سلام! 👋 با ۴ سوال کوتاه بهت می‌گم نیوو دقیقاً کجاها می‌تونه وقتت رو آزاد کنه. شروع کنیم؟'

function generateSessionId(): string {
  return `sales-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

const PLAN_LABELS: Record<string, string> = {
  free: 'رایگان',
  silver: 'اکو',
  gold: 'پلاس',
}

const IRAN_MOBILE_RE = /^09\d{9}$/

export function SalesChatbot({ source = 'pricing_page' }: Props) {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const sessionId = useRef(localStorage.getItem('nivo:sales-session') ?? generateSessionId())
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [recommendedPlan, setRecommendedPlan] = useState<string | null>(null)
  const [offerDiscount, setOfferDiscount] = useState(false)
  const [discountDone, setDiscountDone] = useState(false)
  const [discountPhone, setDiscountPhone] = useState('')
  const [discountJob, setDiscountJob] = useState('')
  const [discountSubmitting, setDiscountSubmitting] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatId = useId()

  // «حالت theater» — به محض اولین پیام کاربر، کل باکس بزرگ‌تر می‌شود (مثل تئاتر یوتیوب)
  const hasStarted = messages.length > 1

  useEffect(() => {
    localStorage.setItem('nivo:sales-session', sessionId.current)
  }, [])

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function send() {
    const content = input.trim()
    if (!content || loading || isDone) return

    const userMsg: Message = { role: 'user', content }
    const nextMessages = [...messages, userMsg]

    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    // save lead data incrementally
    void api.post('/sales/lead', {
      sessionId: sessionId.current,
      chatHistory: nextMessages,
      source,
    }).catch(() => { /* best-effort */ })

    try {
      const res = await api.post<{ reply: string; isDone: boolean; recommendedPlan?: string; offerDiscount?: boolean }>(
        '/sales/chat',
        { messages: nextMessages, sessionId: sessionId.current },
      )
      const { reply, isDone: done, recommendedPlan: plan, offerDiscount: discount } = res.data

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (done) setIsDone(true)
      if (plan) setRecommendedPlan(plan)
      if (discount && !discountDone) setOfferDiscount(true)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'متأسفم، مشکلی پیش اومد. دوباره امتحان کن.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function handleCTA() {
    navigate(me ? '/chat' : '/login')
  }

  function dismissDiscountOffer() {
    setOfferDiscount(false)
  }

  async function submitDiscountOffer() {
    if (!IRAN_MOBILE_RE.test(discountPhone)) {
      setDiscountError('شماره موبایل معتبر نیست (مثلاً 09123456789)')
      return
    }
    setDiscountError(null)
    setDiscountSubmitting(true)
    try {
      await api.post('/sales/lead', {
        sessionId: sessionId.current,
        phone: discountPhone,
        ...(discountJob.trim() && { jobTitle: discountJob.trim() }),
        discountRequested: true,
        source,
      })
      setDiscountDone(true)
      setOfferDiscount(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'ممنون! 🎁 کد تخفیفت رو به همین شماره برات می‌فرستیم.',
      }])
    } catch {
      setDiscountError('مشکلی پیش اومد، دوباره امتحان کن.')
    } finally {
      setDiscountSubmitting(false)
    }
  }

  return (
    <div
      className="sales-chatbot-wrap"
      aria-label="دستیار فروش نیوو"
      role="region"
      style={{ width: '100%', maxWidth: hasStarted ? 680 : 420, margin: '0 auto', transition: 'max-width 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="sales-chatbot-inner">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/60">
          <div className="size-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="size-4 text-emerald-400">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">دستیار هوشمند نیوو</p>
            <p className="text-xs text-slate-500">می‌پرسم تا بهترین پلن رو بهت پیشنهاد بدم</p>
          </div>
        </div>

        {/* Messages */}
        <div
          id={chatId}
          ref={messagesRef}
          className="flex flex-col gap-3 overflow-y-auto mb-4"
          style={{ maxHeight: hasStarted ? 520 : 340, minHeight: 120, transition: 'max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }}
          role="log"
          aria-live="polite"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              style={{ animation: `salesFadeIn 0.25s ease both` }}
            >
              <div
                dir="auto"
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[82%] text-start
                  ${msg.role === 'assistant'
                    ? 'bg-slate-700/70 text-slate-200 rounded-tr-sm ai-content'
                    : 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/20 rounded-tl-sm'
                  }`}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{ code: CodeBlock, pre: PrePassthrough, a: LinkNewTab }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-slate-700/70 px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* پیشنهاد تخفیف — گرفتن شماره وقتی به نظر می‌رسد کاربر الان تصمیم به خرید ندارد */}
        {offerDiscount && !discountDone && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <p className="mb-2.5 text-xs text-emerald-300">
              🎁 یه کد تخفیف ویژه برات کنار می‌ذاریم — شماره‌ت رو بده تا برات بفرستیم.
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="tel"
                inputMode="numeric"
                value={discountPhone}
                onChange={e => setDiscountPhone(e.target.value.trim())}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200
                  placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 text-left"
                aria-label="شماره موبایل"
              />
              <input
                type="text"
                value={discountJob}
                onChange={e => setDiscountJob(e.target.value)}
                placeholder="چیکاره‌ای؟ (اختیاری)"
                className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200
                  placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                aria-label="شغل (اختیاری)"
              />
              {discountError && <p className="text-xs text-red-400">{discountError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => void submitDiscountOffer()}
                  disabled={discountSubmitting || !discountPhone}
                  className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-400
                    active:scale-95 disabled:opacity-40 transition-all"
                >
                  {discountSubmitting ? 'در حال ارسال...' : 'ارسال کد تخفیف'}
                </button>
                <button
                  onClick={dismissDiscountOffer}
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  الان نه
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA after done — عمداً بزرگ و پررنگ برای تمرکز بیشتر، دکمه‌ها زیر هم (نه کنار هم) تا در موبایل هم تمیز و کامل رندر شوند */}
        {isDone && (
          <div
            className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-center sm:p-5"
            style={{ animation: 'salesFadeIn 0.3s ease both' }}
          >
            {recommendedPlan && (
              <p className="mb-3 text-sm text-emerald-300">
                پلن پیشنهادی برای تو: <strong className="text-emerald-200">{PLAN_LABELS[recommendedPlan] ?? recommendedPlan}</strong>
              </p>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleCTA}
                className="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-bold text-white hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                {me ? 'شروع مکالمه ←' : 'شروع رایگان ←'}
              </button>
              {!me && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full rounded-xl border border-slate-600 py-3 text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-slate-200 transition-colors"
                >
                  مشاهده پلن‌ها
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        {!isDone && (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="پاسخت را اینجا بنویس..."
              disabled={loading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-600/60 bg-slate-800/60 px-3.5 py-2.5
                text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50
                focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-40 direction-rtl"
              style={{ lineHeight: '1.5', maxHeight: '100px' }}
              aria-label="پیام شما"
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0
                hover:bg-emerald-400 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all
                focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="ارسال"
            >
              <svg viewBox="0 0 16 16" fill="none" className="size-4 text-white">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* CTA همیشگی زیر باکس پیام — از همون پیام اول، تا کاربر مجبور نباشه صبر کنه تا مکالمه تمام شود */}
        {!isDone && hasStarted && (
          <div className="mt-3 flex gap-2" style={{ animation: 'salesFadeIn 0.3s ease both' }}>
            <button
              onClick={handleCTA}
              className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold
                text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all"
            >
              {me ? 'شروع مکالمه ←' : 'شروع رایگان ←'}
            </button>
            {!me && (
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 rounded-lg border border-slate-700 py-2 text-xs text-slate-400
                  hover:border-slate-600 hover:text-slate-300 transition-colors"
              >
                مشاهده پلن‌ها
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes salesFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sales-chatbot-wrap {
          position: relative;
          border-radius: 20px;
          padding: 2px;
          background: conic-gradient(from var(--sales-angle, 0deg), #4A8FFF, #7C3AED, #0EA5E9, #10B981, #4A8FFF);
          animation: salesSpinBorder 3s linear infinite;
        }
        @keyframes salesSpinBorder {
          from { --sales-angle: 0deg; }
          to   { --sales-angle: 360deg; }
        }
        @property --sales-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .sales-chatbot-inner {
          background: #0F1929;
          border-radius: 18px;
          padding: 20px;
        }
      `}</style>
    </div>
  )
}
