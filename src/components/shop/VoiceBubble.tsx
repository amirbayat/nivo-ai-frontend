import { useRef, useState, type MouseEvent } from 'react'
import { fa } from '@/locales/fa'
import type { ShopMessage } from '@/types/api'
import { voiceAudioUrl } from '@/components/shop/shopUtils'

function formatVoiceDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// فیدبک: پلیر بومی <audio controls> خیلی ساده/زشت بود — پلیر سفارشی با دکمه‌ی پخش، نوار
// پیشرفت قابل-seek، و زمان، هم‌شکل حباب‌های صدای اپ‌های پیام‌رسان آشنا. dir="ltr" عمدی است
// چون ترتیب زمانی (دکمه → نوار → عدد) جهانی و چپ‌به‌راست است، حتی داخل صفحه‌ی RTL.
function VoicePlayer({ src, onFirstPlay }: { src: string; onFirstPlay: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const firedRef = useRef(false)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      dir="ltr"
      className="mt-1.5 flex w-full max-w-[220px] items-center gap-2 rounded-full bg-slate-800/70 px-2 py-1.5 light:bg-slate-100"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- پیام صوتی خودِ ایجنت است، کنترل‌های سفارشی پایین جایگزین controls بومی‌اند */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => {
          setPlaying(true)
          // docs/PRD-sales-agent-voice.md بخش ۶.۵ — فقط یک‌بار (سرور هم idempotent است)
          if (!firedRef.current) {
            firedRef.current = true
            onFirstPlay()
          }
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={toggle}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"
      >
        {playing ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
            <rect x="5" y="4" width="3.5" height="12" rx="1" />
            <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
            <path d="M6 4.5v11l9-5.5-9-5.5z" />
          </svg>
        )}
      </button>
      <div
        onClick={seek}
        className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-slate-600/60 light:bg-slate-300"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-sky-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-slate-400">
        {formatVoiceDuration(currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  )
}

// docs/PRD-sales-agent-voice.md بخش ۱.۵ — پخش وویس پاسخ (وقتی آماده شد)؛ تا وقتی voiceKey
// نرسیده و voiceEventId هست، یک وضعیت «در حال آمادگی» کوچک نشان می‌دهد
export function VoiceIndicator({
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
    return <p className="mt-1 text-xs text-slate-500">{fa.shop.voicePreparing}</p>
  }
  return (
    <VoicePlayer
      src={voiceAudioUrl(conversationId, message.voiceKey)}
      onFirstPlay={() => onPlay(message.voiceKey!)}
    />
  )
}
