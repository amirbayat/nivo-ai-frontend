import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopUiBlockView } from '@/components/shop/ShopUiBlocks'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { ShopMessage } from '@/types/api'

// HANDOFF_HUMAN عمداً اینجا نیست — بعد از escalate، مشتری باید بتواند مستقیم با فروشنده
// چت کند (پنل فروشنده، تب «نیاز به توجه»)؛ فقط COMPLETED/REJECTED واقعاً پایانی‌اند
const TERMINAL_STATES = ['COMPLETED', 'REJECTED']

function voiceAudioUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/voice/${key}`
}

// docs/PRD-sales-agent-voice.md بخش ۱.۵ — پخش وویس پاسخ (وقتی آماده شد)؛ تا وقتی voiceKey
// نرسیده و voiceEventId هست، یک وضعیت «در حال آمادگی» کوچک نشان می‌دهد
function VoiceIndicator({ message, conversationId }: { message: ShopMessage; conversationId: string }) {
  if (!message.voiceEventId) return null
  if (!message.voiceKey) {
    return <p className="mt-1 text-[11px] text-slate-500">{fa.shop.voicePreparing}</p>
  }
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- پیام صوتی خودِ ایجنت است، نه محتوای رسانه‌ای مستقل
    <audio controls src={voiceAudioUrl(conversationId, message.voiceKey)} className="mt-1.5 h-8 w-full max-w-[240px]" />
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
    sendMessage,
    sendAction,
    uploadReceipt,
    sendVoiceMessage,
  } = useShopChat(slug, productId)
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const disabled = sending || TERMINAL_STATES.includes(state)

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    void sendMessage(text)
  }

  // docs/PRD-sales-agent-voice.md بخش ۲.۲ — ضبط با MediaRecorder، فرمت هرچی مرورگر پیش‌فرضش
  // باشد (معمولاً webm/opus)؛ بک‌اند خودش با ffmpeg نرمال‌سازی می‌کند، اینجا نیازی به انتخاب
  // فرمت خاصی نیست
  async function toggleRecording() {
    if (disabled) return
    if (recording) {
      recorderRef.current?.stop()
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
    } catch {
      alert(fa.shop.micNotSupported)
    }
  }

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
    <div className="flex min-h-screen flex-col bg-slate-950 light:bg-white" dir="rtl">
      <div className="border-b border-slate-800 light:border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-200 light:text-slate-900">{storeName}</p>
        <p className="text-xs text-slate-500">دستیار فروش</p>
      </div>

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
                }`}
              >
                {m.text}
              </div>
              {conversationId && m.role === 'agent' && <VoiceIndicator message={m} conversationId={conversationId} />}
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
              ? 'bg-red-500 text-white'
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
