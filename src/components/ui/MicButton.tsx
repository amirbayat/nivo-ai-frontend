import { useEffect, useRef, useState } from 'react'
import { useTranscribeAudio } from '@/queries/seller.queries'
import { fa } from '@/locales/fa'

const toFaDigits = (s: string) => s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

const MAX_SECONDS = 90

interface MicButtonProps {
  storeId: string
  onText: (text: string) => void
  disabled?: boolean
  className?: string
}

// docs/PRD-seller-panel-simplification.md §4.1 — ضبط و رونویسی صدا (از SellerProductEditPage
// بیرون کشیده شد). حالت‌ها: idle، recording (تایمر؛ لمس دوباره = توقف؛ حداکثر ۹۰ ثانیه)،
// transcribing، error. درخواست دسترسی میکروفون فقط با لمس دکمه.
export function MicButton({ storeId, onText, disabled, className = '' }: MicButtonProps) {
  const transcribe = useTranscribeAudio(storeId)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [denied, setDenied] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stop = () => {
    stopTimer()
    recorderRef.current?.stop()
    setRecording(false)
  }

  useEffect(
    () => () => {
      stopTimer()
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
        recorderRef.current.stream.getTracks().forEach(t => t.stop())
      }
    },
    [],
  )

  async function start() {
    setDenied(false)
    if (!navigator.mediaDevices?.getUserMedia) {
      setDenied(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        transcribe.mutate(blob, {
          onSuccess: ({ text }) => {
            const trimmed = text.trim()
            if (trimmed) onText(trimmed)
          },
        })
      }
      recorderRef.current = recorder
      recorder.start()
      setSeconds(0)
      setRecording(true)
      let elapsed = 0
      timerRef.current = setInterval(() => {
        elapsed += 1
        setSeconds(elapsed)
        // خارج از updater تا در StrictMode دوبار stop نشود
        if (elapsed >= MAX_SECONDS) stop()
      }, 1000)
    } catch {
      setDenied(true)
    }
  }

  const pending = transcribe.isPending
  const mm = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  const base =
    'inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2 text-xs disabled:opacity-40'

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        aria-label={fa.seller.panel.mic.label}
        disabled={disabled || pending}
        onClick={() => (recording ? stop() : void start())}
        className={`${base} ${
          recording
            ? 'animate-pulse bg-red-500/15 text-red-400'
            : 'bg-slate-800 text-slate-300 light:bg-slate-200 light:text-slate-700'
        } ${className}`}
      >
        {pending ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
            {fa.seller.panel.mic.transcribing}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
            {recording && <span>{toFaDigits(`${mm}:${ss}`)}</span>}
          </>
        )}
      </button>
      {(transcribe.isError || denied) && (
        <span className="text-[11px] text-red-400">
          {denied ? fa.seller.panel.mic.denied : fa.seller.panel.mic.error}
        </span>
      )}
    </span>
  )
}
