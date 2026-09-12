import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useImagePromptReview } from '@/queries/imageStudio.queries'
import { extractErrorMessage } from '../video-edit/VideoStudioFieldWidgets'

// docs/PRD-image-prompt-coach.md بخش ۴.۲ — کپی+تطبیق video-edit/PromptReviewModal.tsx. الگوی
// ظاهری از PromptLibraryModal.tsx (overlay + کارت گرد slate-950)، رنگ تاکیدی بنفش (نه سبز برند)
// طبق دیزاین. تاریخچه فقط در state این کامپوننت زندگی می‌کند — با بسته‌شدن مودال از بین می‌رود
// (هیچ رکورد جدیدی در دیتابیس ساخته نمی‌شود).

const SUGGESTION_MARKER = '---پیشنهاد نهایی---'
const EXPECTED_OUTPUT_MARKER = '---خروجی مورد انتظار---'

type ChatMsg =
  | { role: 'user'; text: string }
  | { role: 'assistant'; critique: string; suggestedPrompt: string | null; expectedOutput: string | null }
  | { role: 'error'; text: string }

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12h15M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// بازساختِ متن خامی که مدل واقعاً تولید کرده (نقد + مارکر + پیشنهاد) — برای این‌که وقتی این پیام
// به‌عنوان تاریخچه به بک‌اند برمی‌گردد، دقیقاً همان چیزی باشد که مدل قبلاً نوشته بود
function toRawAssistantContent(m: Extract<ChatMsg, { role: 'assistant' }>): string {
  if (m.suggestedPrompt == null) return m.critique
  let out = `${m.critique}\n${SUGGESTION_MARKER}\n${m.suggestedPrompt}`
  if (m.expectedOutput != null) {
    out += `\n${EXPECTED_OUTPUT_MARKER}\n${m.expectedOutput}`
  }
  return out
}

// پرامپت نهایی که در فیلد اصلی جای می‌گیرد باید متن ساده باشد — اگر مدل با وجود دستور سیستم‌پرامپت
// باز هم تاکید مارک‌داون گذاشت، این‌جا پاک می‌شود تا `**`/`_` خام وارد پرامپت واقعی تولید عکس نشود
function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

export function ImagePromptReviewModal({
  open,
  onClose,
  initialPrompt,
  initialReferenceImages,
  onApplyPrompt,
}: {
  open: boolean
  onClose: () => void
  initialPrompt: string
  initialReferenceImages: string[]
  onApplyPrompt: (prompt: string) => void
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const review = useImagePromptReview()
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  function send(history: ChatMsg[], referenceImages?: string[]) {
    // پیام‌های خطا فقط محلی/نمایشی‌اند — هرگز به بک‌اند برنمی‌گردند تا تاریخچه‌ی مدل را با یک
    // پیام کاربر خالی/جعلی آلوده نکنند
    const payloadMessages = history
      .filter((m): m is Extract<ChatMsg, { role: 'user' | 'assistant' }> => m.role !== 'error')
      .map(m =>
        m.role === 'assistant'
          ? { role: 'assistant' as const, content: toRawAssistantContent(m) }
          : { role: 'user' as const, content: m.text },
      )
    review.mutate(
      { referenceImages, messages: payloadMessages },
      {
        onSuccess: res => {
          setMessages(prev => [...prev, { role: 'assistant', critique: res.critique, suggestedPrompt: res.suggestedPrompt, expectedOutput: res.expectedOutput }])
        },
        onError: err => {
          setMessages(prev => [...prev, { role: 'error', text: extractErrorMessage(err, 'بررسی پرامپت الان جواب نداد، دوباره امتحان کن') }])
        },
      },
    )
  }

  // روی هر باز شدنِ تازه‌ی مودال (لبه‌ی false → true)، یک گفتگوی نو با آخرین initialPrompt/
  // initialReferenceImages شروع کن — بستن و بازکردن دوباره یعنی تاریخچه پاک شود
  useEffect(() => {
    if (open && !wasOpen.current) {
      const first: ChatMsg = { role: 'user', text: initialPrompt }
      setMessages([first])
      setDraft('')
      send([first], initialReferenceImages)
    }
    wasOpen.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, review.isPending])

  if (!open) return null

  function submitDraft() {
    const text = draft.trim()
    if (!text || review.isPending) return
    const next: ChatMsg[] = [...messages, { role: 'user', text }]
    setMessages(next)
    setDraft('')
    send(next)
  }

  function apply(prompt: string) {
    onApplyPrompt(prompt)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-950 sm:max-h-[80vh] sm:max-w-xl sm:rounded-3xl"
        style={{ border: '1px solid rgba(148,163,184,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(167,139,250,0.30)' }}
            >
              <SparkleIcon className="size-4 text-[#c4b5fd]" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-100">بررسی پرامپت</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="بستن"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((m, i) => {
            if (m.role === 'user') {
              return (
                <div key={i} className="flex flex-row-reverse gap-3">
                  <div
                    className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.18)', color: '#ecfdf5' }}
                  >
                    {m.text}
                  </div>
                </div>
              )
            }
            if (m.role === 'error') {
              return (
                <div key={i} className="rounded-2xl px-4 py-3 text-sm text-red-300" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
                  {m.text}
                </div>
              )
            }
            return (
              <div key={i} className="flex flex-col gap-2.5">
                <div className="ai-content text-sm leading-relaxed text-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.critique}</ReactMarkdown>
                </div>
                {m.suggestedPrompt && (
                  <div
                    className="flex flex-col gap-2.5 rounded-2xl p-4"
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(167,139,250,0.35)' }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>پیشنهاد پرامپت بهتر</span>
                    <div className="ai-content text-sm leading-relaxed text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.suggestedPrompt}</ReactMarkdown>
                    </div>
                    <button
                      onClick={() => apply(stripMarkdownEmphasis(m.suggestedPrompt!))}
                      className="self-start rounded-full px-4 py-2 text-[13px] font-bold"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#f5f3ff' }}
                    >
                      استفاده از این پرامپت
                    </button>
                  </div>
                )}
                {m.suggestedPrompt && m.expectedOutput && (
                  <div
                    className="flex flex-col gap-2 rounded-2xl p-4"
                    style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(125,211,252,0.30)' }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: '#7dd3fc' }}>خروجی مورد انتظار</span>
                    <div className="ai-content text-sm leading-relaxed text-slate-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.expectedOutput}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {review.isPending && (
            <div className="flex items-center gap-2 text-[13px] text-slate-500">
              <div className="size-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
              در حال فکر کردن...
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-slate-800 p-3.5">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitDraft() }}
            placeholder="سوال یا اصلاح دیگری بپرس..."
            disabled={review.isPending}
            className="flex-1 rounded-full px-4 py-2.5 text-[13.5px] text-slate-100 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
          />
          <button
            onClick={submitDraft}
            disabled={review.isPending || !draft.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#f5f3ff' }}
            aria-label="ارسال"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
