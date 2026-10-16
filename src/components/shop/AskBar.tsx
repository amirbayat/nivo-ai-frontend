import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { fa } from '@/locales/fa'
import { useToastStore } from '@/store/toast.store'

interface AskBarProps {
  // ارسال/ضبط/پیوست وقتی گفتگو قفل است یا پیامی در حال ارسال است غیرفعال می‌شود
  disabled: boolean
  // عکس: هنگام نظردهی یا گفتگوی انسانی با فروشنده؛ ویدیو: فقط هنگام نظردهی
  canAttachImage: boolean
  canAttachVideo: boolean
  // یادداشت بالای نوار (پایان گفتگو / منتظر نظر / منتظر پاسخ رضایت) — متن آماده
  notice: { text: string; tone: 'muted' | 'hint' } | null
  placeholder: string
  // با هر تغییر این عدد، فیلد متن فوکوس می‌گیرد («سوال دارم» از شیت محصول)
  focusToken: number
  onSendText: (text: string) => void
  onSendImage: (file: File) => void
  onSendVideo: (file: File) => void
  onSendVoice: (blob: Blob) => void
}

const iconBtn =
  'flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--shop-border)] text-[var(--shop-text)] disabled:opacity-30'

// docs/PRD-buyer-chat-redesign.md §5/§6.5 — نوار پرسش: متن، میکروفون، پیوست‌ها، ارسال. منطق ضبط
// (MediaRecorder) و قواعد پیوست عیناً قبلی است؛ پیام‌های خطای میکروفون با toast درون‌برنامه نشان داده می‌شود.
// ردیف چیپ‌های میان‌بر («سفارش‌هام / دیدن محصولات / صحبت با فروشنده») حذف شد: به منو و کنترل
// «محصولات | گفتگو» رفتند
export function AskBar({ disabled, canAttachImage, canAttachVideo, notice, placeholder, focusToken, onSendText, onSendImage, onSendVideo, onSendVoice }: AskBarProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSendText(text)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    onSendImage(file)
  }

  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱ — هم‌الگوی onPickImage
  function onPickVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    onSendVideo(file)
  }

  // docs/PRD-sales-agent-voice.md بخش ۲.۲ — ضبط با MediaRecorder، فرمت هرچی مرورگر پیش‌فرضش باشد
  // (معمولاً webm/opus)؛ بک‌اند خودش با ffmpeg نرمال‌سازی می‌کند. تایمر ثانیه‌شمار فقط فیدبک بصری
  // «داره ضبط می‌کنه» است
  async function toggleRecording() {
    if (disabled) return
    if (recording) {
      recorderRef.current?.stop()
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast(fa.shop.micNotSupported)
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
        onSendVoice(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      addToast(fa.shop.v2.micDenied)
    }
  }

  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
  }, [])

  useEffect(() => {
    if (focusToken > 0) textRef.current?.focus()
  }, [focusToken])

  return (
    <div className="bg-[var(--shop-bg)] pb-[env(safe-area-inset-bottom)]">
      {notice && (
        <div
          className={`border-t border-[var(--shop-border)] px-4 py-2 text-center text-xs ${
            notice.tone === 'hint' ? 'bg-emerald-500/10 text-[var(--shop-accent)]' : 'bg-[var(--shop-surface)] text-[var(--shop-text-2)]'
          }`}
        >
          {notice.text}
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-2 border-t border-[var(--shop-border)] bg-red-500/10 px-4 py-2 text-xs font-semibold text-[var(--shop-danger)]">
          <span className="size-2 animate-pulse rounded-full bg-[var(--shop-danger)]" />
          <span>{fa.shop.recordingLabel}</span>
          <span dir="ltr" className="font-mono">
            {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-[var(--shop-border)] p-3">
        <textarea
          ref={textRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          dir="auto"
          aria-label={placeholder}
          className="min-h-11 flex-1 resize-none rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3.5 py-2.5 text-[15px] text-[var(--shop-text)] outline-none placeholder:text-[var(--shop-text-2)] focus:border-[var(--shop-accent)] disabled:opacity-50"
        />
        {canAttachImage && (
          <>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={disabled} aria-label={fa.shop.attachImage} className={iconBtn}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
              </svg>
            </button>
            {canAttachVideo && (
              <>
                {/* ویدیو فقط در لحظه‌ی awaitingReview معنا دارد (docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱) */}
                <input ref={videoInputRef} type="file" accept="video/*" onChange={onPickVideo} className="hidden" />
                <button type="button" onClick={() => videoInputRef.current?.click()} disabled={disabled} aria-label={fa.shop.attachVideo} className={iconBtn}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                    <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h6.5A2.25 2.25 0 0012 13.75v-7.5A2.25 2.25 0 009.75 4h-6.5zM19 7.3a1 1 0 00-1.6-.8L14 8.7v2.6l3.4 2.2a1 1 0 001.6-.8V7.3z" />
                  </svg>
                </button>
              </>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => void toggleRecording()}
          disabled={disabled}
          aria-label={recording ? fa.shop.voiceRecording : fa.shop.recordingLabel}
          className={
            recording
              ? 'flex size-11 shrink-0 animate-pulse items-center justify-center rounded-xl bg-red-500 text-white disabled:opacity-30'
              : iconBtn
          }
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
            <path d="M10 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
            <path d="M5.5 9a.75.75 0 00-1.5 0 6 6 0 005.25 5.955V17H7a.75.75 0 000 1.5h6A.75.75 0 0013 17h-2.75v-2.045A6 6 0 0016 9a.75.75 0 00-1.5 0 4.5 4.5 0 01-9 0z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={send}
          disabled={disabled || !input.trim()}
          aria-label={fa.shop.v2.sendLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--shop-accent-fill)] text-[var(--shop-accent-text)] disabled:opacity-30"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 -scale-x-100" aria-hidden>
            <path d="M3 10l14-7-4 7 4 7-14-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
