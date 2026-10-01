import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopUiBlockView } from '@/components/shop/ShopUiBlocks'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { ShopHistoryEntry, ShopMessage } from '@/types/api'

// HANDOFF_HUMAN عمداً اینجا نیست — بعد از escalate، مشتری باید بتواند مستقیم با فروشنده
// چت کند (پنل فروشنده، تب «نیاز به توجه»)؛ فقط COMPLETED/REJECTED واقعاً پایانی‌اند
const TERMINAL_STATES = ['COMPLETED', 'REJECTED']

function voiceAudioUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/voice/${key}`
}

// docs/PRD-sales-agent-voice.md بخش ۱.۵ — پخش وویس پاسخ (وقتی آماده شد)؛ تا وقتی voiceKey
// نرسیده و voiceEventId هست، یک وضعیت «در حال آمادگی» کوچک نشان می‌دهد
function VoiceIndicator({
  message,
  conversationId,
  onPlay,
}: {
  message: ShopMessage
  conversationId: string
  onPlay: (key: string) => void
}) {
  if (!message.voiceEventId) return null
  if (!message.voiceKey) {
    return <p className="mt-1 text-[11px] text-slate-500">{fa.shop.voicePreparing}</p>
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- پیام صوتی خودِ ایجنت است، نه محتوای رسانه‌ای مستقل
    <audio
      controls
      src={voiceAudioUrl(conversationId, message.voiceKey)}
      className="mt-1.5 h-8 w-full max-w-[240px]"
      // docs/PRD-sales-agent-voice.md بخش ۶.۵ — فقط یک‌بار (سرور هم idempotent است)، همین که
      // پخش واقعاً شروع شد، نه فقط فایل لود شد
      onPlay={() => onPlay(message.voiceKey!)}
    />
  )
}

const HISTORY_STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-rose-500/15 text-rose-400',
  IN_PROGRESS: 'bg-sky-500/15 text-sky-400',
  NEEDS_ATTENTION: 'bg-amber-500/15 text-amber-400',
}

// فیدبک: «کاربر چت جدید نمی‌تونه باز کنه» + «منو کشویی از راست» — تاریخچه‌ی واقعی سمت سرور
// (docs/PRD-conversation-history.md)، هر آیتم: نام فروشگاه/آخرین محصول/وضعیت رنگی
function HistoryDrawer({
  entries,
  onSelect,
  onClose,
}: {
  entries: ShopHistoryEntry[]
  onSelect: (entry: ShopHistoryEntry) => void
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col bg-slate-900 light:bg-white shadow-xl transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.history}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ×
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">{fa.shop.historyEmpty}</p>
        ) : (
          <ul className="flex-1 divide-y divide-slate-800 light:divide-slate-100 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.conversationId}>
                <button
                  onClick={() => onSelect(entry)}
                  className="flex w-full flex-col gap-1 px-4 py-3 text-start hover:bg-slate-800/60 light:hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{entry.storeName}</span>
                  <span className="text-xs text-slate-400 light:text-slate-500">
                    {entry.lastProductName ?? fa.shop.historyNoProduct}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${HISTORY_STATUS_STYLES[entry.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                  >
                    {fa.shop.historyStatusLabels[entry.status] ?? entry.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function ShopChatPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  // فیدبک اول پایلوت — لینک اختصاصی یک محصول («فروشنده در استوری گذاشته»): /shop/:slug?product=<id>
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product') ?? undefined
  const {
    storeName,
    notFound,
    conversationId,
    messages,
    state,
    loading,
    sending,
    error,
    history,
    viewingHistory,
    sendMessage,
    sendAction,
    uploadReceipt,
    sendVoiceMessage,
    markVoiceHeard,
    startNewChat,
    viewHistoryEntry,
    returnToCurrentChat,
  } = useShopChat(slug, productId)
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 100vh/100dvh روی خیلی از مرورگرهای موبایل با بازشدن کیبورد صفحه شرینک نمی‌شه (مخصوصاً
  // سافاری قدیمی‌تر) — یعنی اینپوت پایین یک کادر که دیگه بزرگ‌تر از ویوپورت واقعی‌ست میره،
  // پشت کیبورد قایم می‌شه. visualViewport همیشه ارتفاع واقعی دیده‌شده (بعد از کیبورد) رو
  // می‌ده؛ کانتینر رو دقیقاً همون ارتفاع می‌ذاریم تا اینپوت همیشه لبه‌ی همون ارتفاع (یعنی
  // بالای کیبورد) بمونه، نه پشتش
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function update() {
      setViewportHeight(vv!.height)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, viewportHeight])

  const disabled = sending || viewingHistory || TERMINAL_STATES.includes(state)

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    void sendMessage(text)
  }

  function handleNewChat() {
    if (!confirm(fa.shop.newChatConfirm)) return
    setInput('')
    void startNewChat()
  }

  function handleSelectHistory(entry: ShopHistoryEntry) {
    setHistoryOpen(false)
    void viewHistoryEntry(entry)
  }

  // docs/PRD-sales-agent-voice.md بخش ۲.۲ — ضبط با MediaRecorder، فرمت هرچی مرورگر پیش‌فرضش
  // باشد (معمولاً webm/opus)؛ بک‌اند خودش با ffmpeg نرمال‌سازی می‌کند، اینجا نیازی به انتخاب
  // فرمت خاصی نیست. تایمر ثانیه‌شمار فقط فیدبک بصری «داره ضبط می‌کنه» است، به سرور فرستاده نمی‌شود
  async function toggleRecording() {
    if (disabled) return
    if (recording) {
      recorderRef.current?.stop()
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(fa.shop.micNotSupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        void sendVoiceMessage(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      alert(fa.shop.micNotSupported)
    }
  }

  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
  }, [])

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="rtl">
        <div className="text-center">
          <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.shop.notFoundHeading}</h1>
          <p className="text-sm text-slate-500">{fa.shop.notFoundBody}</p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-slate-950 light:bg-white" />

  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-slate-950 light:bg-white"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-200 light:text-slate-900">{storeName}</p>
          <p className="text-xs text-slate-500">دستیار فروش</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryOpen(true)}
            title={fa.shop.history}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-4.5">
              <path d="M4 4v4h4M4.5 8a6.5 6.5 0 111.6 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={handleNewChat}
            title={fa.shop.newChat}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-4.5">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {viewingHistory && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          <span>{fa.shop.viewingHistoryBanner}</span>
          <button onClick={() => void returnToCurrentChat()} className="shrink-0 font-semibold underline">
            {fa.shop.backToCurrentChat}
          </button>
        </div>
      )}

      {historyOpen && (
        <HistoryDrawer entries={history} onSelect={handleSelectHistory} onClose={() => setHistoryOpen(false)} />
      )}

      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[85%]">
              <div
                dir="auto"
                className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-start ${
                  m.role === 'agent'
                    ? 'rounded-tr-sm bg-slate-700/70 text-slate-200 light:bg-slate-100 light:text-slate-800'
                    : 'rounded-tl-sm border border-emerald-500/20 bg-emerald-500/20 text-emerald-100 light:text-emerald-900'
                } ${m.isVoice && !m.text ? 'italic text-emerald-200/70 light:text-emerald-900/60' : ''}`}
              >
                {/* فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — تا transcript برسد (isVoice && !text)، یک وضعیت
                    pending نشان می‌دهیم؛ بعد از آن میکروفون کنار متن واقعی می‌ماند تا خریدار
                    بفهمد این پیام از وویس آمده، نه تایپ */}
                {m.isVoice && !m.text ? fa.shop.customerVoiceTranscribing : m.isVoice ? `🎙️ ${m.text}` : m.text}
              </div>
              {conversationId && m.role === 'agent' && (
                <VoiceIndicator message={m} conversationId={conversationId} onPlay={markVoiceHeard} />
              )}
              {m.uiBlock && (
                <ShopUiBlockView
                  block={m.uiBlock}
                  disabled={disabled}
                  onAddToCart={(productId) => void sendAction({ type: 'ADD_TO_CART', productId })}
                  onConfirmCart={() => void sendAction({ type: 'CONFIRM_CART' })}
                  onUploadReceipt={(file) => void uploadReceipt(file)}
                />
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm bg-slate-700/70 light:bg-slate-100 px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-red-400 light:text-red-600">{error}</p>}
      </div>

      {(TERMINAL_STATES.includes(state) || state === 'HANDOFF_HUMAN') && (
        <div className="border-t border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 px-4 py-2 text-center text-xs text-slate-500">
          {fa.shop.conversationEnded}
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-2 border-t border-slate-800 light:border-slate-200 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          <span>{fa.shop.recordingLabel}</span>
          <span dir="ltr" className="font-mono">
            {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-slate-800 light:border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={fa.shop.inputPlaceholder}
          dir="auto"
          className="flex-1 resize-none rounded-xl border border-slate-600/60 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 outline-none placeholder:text-slate-500 disabled:opacity-50"
        />
        <button
          onClick={() => void toggleRecording()}
          disabled={disabled}
          title={recording ? fa.shop.voiceRecording : undefined}
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-30 ${
            recording
              ? 'animate-pulse bg-red-500 text-white'
              : 'border border-slate-600/60 light:border-slate-300 text-slate-300 light:text-slate-700 hover:border-slate-500'
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
            <path d="M5.5 9a.75.75 0 00-1.5 0 6 6 0 005.25 5.955V17H7a.75.75 0 000 1.5h6A.75.75 0 0013 17h-2.75v-2.045A6 6 0 0016 9a.75.75 0 00-1.5 0 4.5 4.5 0 01-9 0z" />
          </svg>
        </button>
        <button
          onClick={send}
          disabled={disabled || !input.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-30"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 -scale-x-100">
            <path d="M3 10l14-7-4 7 4 7-14-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
