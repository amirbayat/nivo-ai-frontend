import { useState, useRef, useEffect, useId } from 'react'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'

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
  silver: 'نقره‌ای',
  gold: 'طلایی',
}

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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatId = useId()

  useEffect(() => {
    localStorage.setItem('nivo:sales-session', sessionId.current)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      const res = await api.post<{ reply: string; isDone: boolean; recommendedPlan?: string }>(
        '/sales/chat',
        { messages: nextMessages, sessionId: sessionId.current },
      )
      const { reply, isDone: done, recommendedPlan: plan } = res.data

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (done) setIsDone(true)
      if (plan) setRecommendedPlan(plan)
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

  return (
    <div className="sales-chatbot-wrap" aria-label="دستیار فروش نیوو" role="region">
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
          className="flex flex-col gap-3 overflow-y-auto mb-4"
          style={{ maxHeight: '340px', minHeight: '120px' }}
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
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[82%]
                  ${msg.role === 'assistant'
                    ? 'bg-slate-700/70 text-slate-200 rounded-tr-sm'
                    : 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/20 rounded-tl-sm'
                  }`}
              >
                {msg.content}
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

          <div ref={bottomRef} />
        </div>

        {/* CTA after done */}
        {isDone && (
          <div className="mb-4">
            {recommendedPlan && (
              <p className="mb-2 text-xs text-emerald-400">
                پلن پیشنهادی برای تو: <strong>{PLAN_LABELS[recommendedPlan] ?? recommendedPlan}</strong>
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCTA}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 active:scale-95 transition-all"
              >
                {me ? 'شروع مکالمه ←' : 'ثبت‌نام رایگان ←'}
              </button>
              {!me && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-400 hover:border-slate-500 transition-colors"
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
