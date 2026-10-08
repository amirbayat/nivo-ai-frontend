import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopUiBlockView } from '@/components/shop/ShopUiBlocks'
import { StoreProductGrid } from '@/components/shop/StoreProductGrid'
import { CommentModal } from '@/components/shop/CommentModal'
import { CheckoutProgressBar } from '@/components/shop/CheckoutProgressBar'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import type { PublicProduct, ShopHistoryEntry, ShopMessage } from '@/types/api'

// HANDOFF_HUMAN/REJECTED عمداً اینجا نیستند — بعد از escalate یا رد سفارش، مشتری باید بتواند
// مستقیم با فروشنده چت کند (پنل فروشنده، تب «نیاز به توجه»؛ بک‌اند با isMutedForHuman پیام را
// از موتور مکالمه‌ی رباتی رد نمی‌کند)؛ فقط COMPLETED واقعاً پایانی است
const TERMINAL_STATES = ['COMPLETED']
// حالت‌هایی که دیگر ربات جواب نمی‌دهد و انسان (فروشنده) پاسخ‌گوست — برای بنر «منتقل شد»
const HUMAN_HANDLING_STATES = ['HANDOFF_HUMAN', 'REJECTED']

// عمومی، بدون auth — عیناً همون الگوی productImageUrl در ShopUiBlocks.tsx
function storeLogoUrl(storeId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/stores/${storeId}/logo/${key}`
}

// عیناً همون الگوی avatarInitials در Sidebar.tsx — تا فروشگاهی عکس نگذاشته، به‌جای خالی‌ماندن
// یک دایره‌ی حروف‌اول نشان داده شود (بخش ۵.۱۴ داک — بند ۶)
function avatarInitials(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0)
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
}

function voiceAudioUrl(conversationId: string, key: string): string {
  // کلید ذخیره‌سازی شامل پیشوند «conversationId/» است (storage.service.ts uploadImage) —
  // باید encode شود وگرنه «/» داخلش روت :key را به چند سگمنت می‌شکند و 404 می‌گیرد (صدا هرگز
  // بارگذاری نمی‌شد، مستقل از مشکل WAV/MP3)
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/voice/${encodeURIComponent(key)}`
}

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
      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
        {formatVoiceDuration(currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  )
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
    <VoicePlayer
      src={voiceAudioUrl(conversationId, message.voiceKey)}
      onFirstPlay={() => onPlay(message.voiceKey!)}
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

// docs/PRD-buyer-phone-otp-registration.md — ثبت‌نام اختیاری با شماره+OTP؛ مودال ساده‌ی
// سه‌مرحله‌ای (شماره → کد+اسم → موفقیت)، عیناً الگوی bottom-sheet موجود (HistoryDrawer/
// SellerOrdersPage's OrderDetailSheet را در پنل فروشنده ببین)
function RegisterModal({
  onClose,
  onSendOtp,
  onVerifyOtp,
}: {
  onClose: () => void
  onSendOtp: (phone: string) => Promise<{ ok: boolean; message: string }>
  onVerifyOtp: (phone: string, code: string, fullName?: string) => Promise<{ ok: boolean; message: string }>
}) {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitPhone() {
    if (!phone.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await onSendOtp(phone.trim())
    setBusy(false)
    if (res.ok) setStep('code')
    else setError(res.message)
  }

  async function submitCode() {
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await onVerifyOtp(phone.trim(), code.trim(), fullName.trim() || undefined)
    setBusy(false)
    if (res.ok) setStep('done')
    else setError(res.message)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.registerTitle}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
            {fa.shop.registerClose}
          </button>
        </div>

        {step === 'done' ? (
          <p className="py-6 text-center text-sm font-semibold text-emerald-400">{fa.shop.registerSuccess}</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-slate-400 light:text-slate-600">{fa.shop.registerIntro}</p>

            {step === 'phone' && (
              <div className="flex flex-col gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  placeholder={fa.shop.registerPhonePlaceholder}
                  className="rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  onClick={() => void submitPhone()}
                  disabled={busy || !phone.trim()}
                  className="rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  {fa.shop.registerSendCodeButton}
                </button>
              </div>
            )}

            {step === 'code' && (
              <div className="flex flex-col gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  dir="ltr"
                  placeholder={fa.shop.registerCodePlaceholder}
                  className="rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={fa.shop.registerNamePlaceholder}
                  className="rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  onClick={() => void submitCode()}
                  disabled={busy || !code.trim()}
                  className="rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
                >
                  {fa.shop.registerConfirmButton}
                </button>
                <button
                  onClick={() => {
                    setStep('phone')
                    setError(null)
                  }}
                  className="text-xs text-slate-400 hover:underline"
                >
                  {fa.shop.registerChangePhone}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function ShopChatPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  // فیدبک اول پایلوت — لینک اختصاصی یک محصول («فروشنده در استوری گذاشته»): /shop/:slug?product=<id>
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('product') ?? undefined
  const {
    storeId,
    storeName,
    storeLogoKey,
    notFound,
    conversationId,
    messages,
    state,
    loading,
    sending,
    error,
    history,
    viewingHistory,
    savedProductIds,
    toggleSaveProduct,
    sendMessage,
    sendAction,
    uploadReceipt,
    sendImageMessage,
    sendVoiceMessage,
    markVoiceHeard,
    sendBuyerOtp,
    verifyBuyerOtp,
    submitComment,
    uploadCommentMedia,
    startNewChat,
    viewHistoryEntry,
    returnToCurrentChat,
  } = useShopChat(slug, productId)
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
  const [reviewProduct, setReviewProduct] = useState<PublicProduct | null>(null)
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — حالت «فروشگاه»: نخ چت مینیمم به حباب شناور
  const [storeMode, setStoreMode] = useState(false)
  const [storeModeUnread, setStoreModeUnread] = useState(false)
  const prevMessageCountRef = useRef(messages.length)
  const messagesRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  // وقتی در حالت فروشگاهیم (نخ چت پشت حباب شناور مخفی است) و پیام تازه‌ای می‌رسد (مثلاً پاسخ
  // به ADD_TO_CART از گرید)، نقطه‌ی قرمز روی حباب نشان بده — همان الگوی ویجت‌های Intercom/Crisp
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && storeMode) setStoreModeUnread(true)
    prevMessageCountRef.current = messages.length
  }, [messages.length, storeMode])

  const disabled = sending || viewingHistory || TERMINAL_STATES.includes(state)

  // فیدبک کاربر ۱۴۰۵/۰۷/۱۶ — کارت محصول در پیام‌های قدیمی‌تر همیشه قابل‌کلیک می‌ماند؛ کلیک
  // دوباره روی کارت تکراری همون محصول (مثلاً وقتی همون کارت یک‌بار دیگر ضمن توضیح تخفیف
  // دوباره پیوست می‌شود) بدون هشدار تعداد سبد را دوبرابر می‌کرد. آخرین CART_SUMMARY منبع
  // حقیقت فعلی سبد است؛ هر کارت محصولی که همین الان توی آن هست، دیگر دکمه‌ی فعال نشان نمی‌دهد
  const cartProductIds = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const block = messages[i].uiBlock
      if (block?.type === 'CART_SUMMARY') {
        return new Set(block.items.map(item => item.productId))
      }
    }
    return new Set<string>()
  }, [messages])

  // «پرسیدن از فروشنده» از شیت محصول گرید — چت را باز می‌کند و با نام محصول (مثل اینکه خریدار
  // تایپ کرده) همان مکانیزم موجود لنگرشدن روی محصول (doBrowse narrowing تک‌نتیجه‌ای) را فعال
  // می‌کند؛ بدون نیاز به یک اکشن/endpoint تازه‌ی «set anchor»
  function handleAskSeller(product: PublicProduct) {
    setStoreMode(false)
    setStoreModeUnread(false)
    void sendMessage(product.name)
  }

  function send() {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    void sendMessage(text)
  }

  // فقط در حالت «صحبت با فروشنده» معنا دارد — بک‌اند هم دقیقاً همین شرط (isMutedForHuman) را
  // چک می‌کند، این فقط جلوی یک درخواست بی‌فایده را می‌گیرد
  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    void sendImageMessage(file)
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
        {/* فیدبک کاربر — اسم/عنوان کنار آواتار در سمت راست (start در RTL)، نه وسط‌چین */}
        <div className="flex min-w-0 items-center gap-2">
          {storeId && storeLogoKey ? (
            <img
              src={storeLogoUrl(storeId, storeLogoKey)}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300 light:bg-slate-200 light:text-slate-700">
              {avatarInitials(storeName)}
            </div>
          )}
          <div className="min-w-0 text-start">
            <p className="truncate text-sm font-semibold text-slate-200 light:text-slate-900">{storeName}</p>
            <p className="text-xs text-slate-500">دستیار فروش</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStoreMode((v) => !v)}
            title={storeMode ? fa.shop.storeModeBackToChat : fa.shop.storeModeOpen}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
          >
            {storeMode ? (
              <svg viewBox="0 0 20 20" fill="none" className="size-4.5">
                <path
                  d="M4 10.5l6-5.5 6 5.5M6 9v6a1 1 0 001 1h2.5v-4h1V16H13a1 1 0 001-1V9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4.5">
                <rect x="3" y="3" width="6" height="6" rx="1.3" />
                <rect x="11" y="3" width="6" height="6" rx="1.3" />
                <rect x="3" y="11" width="6" height="6" rx="1.3" />
                <rect x="11" y="11" width="6" height="6" rx="1.3" />
              </svg>
            )}
          </button>
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
          <button
            onClick={() => setRegisterOpen(true)}
            title={fa.shop.registerButton}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="size-4.5">
              <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {registerOpen && (
        <RegisterModal onClose={() => setRegisterOpen(false)} onSendOtp={sendBuyerOtp} onVerifyOtp={verifyBuyerOtp} />
      )}

      {reviewProduct && (
        <CommentModal
          productId={reviewProduct.id}
          onClose={() => setReviewProduct(null)}
          onSubmit={submitComment}
          onUploadMedia={uploadCommentMedia}
        />
      )}

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

      {storeMode && (
        <StoreProductGrid
          slug={slug}
          disabled={disabled}
          onAddToCart={(productId) => void sendAction({ type: 'ADD_TO_CART', productId })}
          onAskSeller={handleAskSeller}
          savedProductIds={savedProductIds}
          onToggleSave={toggleSaveProduct}
          onWriteReview={setReviewProduct}
        />
      )}

      {!storeMode && (
      <>
      <CheckoutProgressBar state={state} />
      <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[85%]">
              {m.imageUrl && (
                <a href={m.imageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={m.imageUrl}
                    alt={fa.shop.customerImageAlt}
                    className="mb-1 max-h-72 rounded-2xl rounded-tl-sm border border-emerald-500/20 object-cover"
                  />
                </a>
              )}
              {(m.text || !m.imageUrl) && (
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
              )}
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
                  onSendAction={(action) => void sendAction(action)}
                  savedProductIds={savedProductIds}
                  onToggleSave={toggleSaveProduct}
                  cartProductIds={cartProductIds}
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

      {(TERMINAL_STATES.includes(state) || HUMAN_HANDLING_STATES.includes(state)) && (
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

      {/* docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۶) — منوی چیپ سریع:
          دسترسی زودتر به همان قابلیت‌های موجود (حالت فروشگاه بخش ۳.۵، درخواست انسان بخش ۴)،
          بدون نیاز به اکشن/endpoint تازه برای «صحبت با فروشنده» */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-800 light:border-slate-200 px-3 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => navigate(`/shop/${slug}/orders`)}
          className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 light:border-slate-300 px-3 py-1.5 text-xs text-slate-300 light:text-slate-700"
        >
          {fa.shop.quickChipOrders}
        </button>
        <button
          onClick={() => setStoreMode(true)}
          className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 light:border-slate-300 px-3 py-1.5 text-xs text-slate-300 light:text-slate-700"
        >
          {fa.shop.quickChipProducts}
        </button>
        <button
          onClick={() => void sendMessage(fa.shop.talkToSellerMessage)}
          disabled={disabled}
          className="shrink-0 whitespace-nowrap rounded-full border border-slate-700 light:border-slate-300 px-3 py-1.5 text-xs text-slate-300 light:text-slate-700 disabled:opacity-40"
        >
          {fa.shop.quickChipTalkToSeller}
        </button>
      </div>

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
        {HUMAN_HANDLING_STATES.includes(state) && (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled}
              title={fa.shop.attachImage}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-600/60 light:border-slate-300 text-slate-300 light:text-slate-700 hover:border-slate-500 disabled:opacity-30"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        )}
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
      </>
      )}

      {storeMode && (
        <button
          onClick={() => {
            setStoreMode(false)
            setStoreModeUnread(false)
          }}
          title={fa.shop.storeModeBackToChat}
          className="fixed bottom-5 left-5 z-40 flex size-14 items-center justify-center rounded-full bg-slate-800 shadow-lg light:bg-white light:shadow-xl"
        >
          {storeId && storeLogoKey ? (
            <img src={storeLogoUrl(storeId, storeLogoKey)} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300 light:bg-slate-200 light:text-slate-700">
              {avatarInitials(storeName)}
            </div>
          )}
          {storeModeUnread && (
            <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-slate-950 bg-red-500 light:border-white" />
          )}
        </button>
      )}
    </div>
  )
}
