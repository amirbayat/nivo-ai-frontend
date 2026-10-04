import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { getShopSession, setShopSession, type ShopSession } from '@/lib/shopSession'
import type {
  ShopAction,
  ShopConversationEvent,
  ShopGetConversationResponse,
  ShopHistoryEntry,
  ShopMessage,
  ShopResponseStrategy,
  ShopSavedProductsResponse,
  ShopSendMessageResponse,
  ShopStartChatResponse,
  ShopVoiceStatusResponse,
} from '@/types/api'

// این صفحه مشتری ناشناس یک فروشگاه است، نه یک User لاگین‌شده — عمداً از `api` (axios)
// مشترک استفاده نمی‌کند چون آن همیشه هدر Authorization را از localStorage تزریق می‌کند
// (src/lib/api.ts)؛ اینجا هویت فقط X-Session-Token است.
const KICKOFF_MESSAGE = 'سلام، محصولاتتون رو نشون بدید'

// کلید ذخیره‌سازی شامل پیشوند «conversationId/» است (storage.service.ts uploadImage) — باید
// encode شود وگرنه «/» داخلش روت :key را به چند سگمنت می‌شکند و 404 می‌گیرد (عیناً voiceAudioUrl
// در ShopChatPage.tsx)
function chatImageUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/image/${encodeURIComponent(key)}`
}

function eventsToMessages(events: ShopConversationEvent[], conversationId: string): ShopMessage[] {
  const messages: ShopMessage[] = []
  events.forEach((e, i) => {
    if (e.type === 'CUSTOMER_MESSAGE' && (e.payload.text || e.payload.imageKey)) {
      messages.push({
        id: `c-${i}`,
        role: 'customer',
        text: e.payload.text ?? '',
        imageUrl: e.payload.imageKey ? chatImageUrl(conversationId, e.payload.imageKey) : undefined,
      })
    } else if ((e.type === 'AGENT_REPLY' || e.type === 'SELLER_MESSAGE') && e.payload.text) {
      // مشتری فرق ربات/فروشنده‌ی انسانی را از نظر بصری نمی‌بیند — هر دو حباب «agent» هستند
      messages.push({
        id: `a-${i}`,
        role: 'agent',
        text: e.payload.text,
        uiBlock: e.payload.uiBlock?.type !== 'NONE' ? e.payload.uiBlock : undefined,
      })
    }
  })
  return messages
}

export function useShopChat(slug: string, productId?: string) {
  const [storeName, setStoreName] = useState<string | null>(null)
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — برای ساخت URL عکس پروفایل (storeLogoUrl)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeLogoKey, setStoreLogoKey] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [messages, setMessages] = useState<ShopMessage[]>([])
  const [state, setState] = useState<string>('GREETING')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ShopHistoryEntry[]>([])
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set())
  const [viewingHistory, setViewingHistoryState] = useState(false)
  // docs/PRD-sales-agent-response-strategy-ab.md بخش ۹ — سوییچ دستی خریدار برای تست زنده‌ی
  // Track A/B؛ فعلاً فقط برای تست، پیش‌فرض واقعی سرور RULE_BASED است
  const [responseStrategy, setResponseStrategyState] = useState<ShopResponseStrategy>('RULE_BASED')
  const sessionRef = useRef<ShopSession | null>(null)
  // مکالمه‌ی واقعاً «فعال» — وقتی viewHistoryEntry موقتاً sessionRef را روی یک مکالمه‌ی
  // قدیمی می‌گذارد، این ref همچنان مکالمه‌ی زنده را نگه می‌دارد تا returnToCurrentChat بتواند
  // برگردد (docs/PRD-conversation-history.md — تاریخچه حالا سمت سرور است، نه localStorage)
  const liveSessionRef = useRef<ShopSession | null>(null)
  // ref موازی با state بالا — چون sendMessage/sendAction/... باید همین لحظه (نه بعد از
  // ری‌رندر بعدی) بدانند در حالت تاریخچه هستند یا نه، وگرنه closure قدیمی گیر می‌کند
  const viewingHistoryRef = useRef(false)
  const setViewingHistory = useCallback((v: boolean) => {
    viewingHistoryRef.current = v
    setViewingHistoryState(v)
  }, [])

  const fetchHistory = useCallback(async () => {
    const session = liveSessionRef.current
    if (!session) return
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/customer-history`, {
        headers: { 'X-Session-Token': session.sessionToken },
      })
      if (!res.ok) return
      setHistory((await res.json()) as ShopHistoryEntry[])
    } catch {
      // تاریخچه صرفاً یک پنل جانبی است — شکست آن نباید کل چت را خراب کند
    }
  }, [slug])

  const fetchSavedProducts = useCallback(async () => {
    const session = liveSessionRef.current
    if (!session) return
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/saved-products`, {
        headers: { 'X-Session-Token': session.sessionToken },
      })
      if (!res.ok) return
      const data = (await res.json()) as ShopSavedProductsResponse
      setSavedProductIds(new Set(data.productIds))
    } catch {
      // فقط آیکون بوکمارک را تحت‌تاثیر می‌گذارد، نباید کل چت را خراب کند
    }
  }, [])

  const appendCustomerMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: `opt-${Date.now()}`, role: 'customer', text }])
  }, [])

  // پول کوتاه وضعیت وویس یک پاسخ خاص (حداکثر ۱۵ ثانیه، هر ۲ ثانیه) — docs/PRD-sales-agent-voice.md
  // بخش ۱.۲؛ فقط همان حباب پیام را با voiceKey آپدیت می‌کند، نه کل مکالمه را دوباره نمی‌کشد
  const pollVoice = useCallback((messageId: string, eventId: string) => {
    const session = sessionRef.current
    if (!session) return
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(
          `${env.VITE_API_URL}/v2/chat/${session.conversationId}/voice-status/${eventId}`,
          { headers: { 'X-Session-Token': session.sessionToken } },
        )
        if (res.ok) {
          const data = (await res.json()) as ShopVoiceStatusResponse
          if (data.voiceKey) {
            setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, voiceKey: data.voiceKey! } : m)))
            clearInterval(interval)
            return
          }
          if (!data.pending) {
            clearInterval(interval) // شکست خورد، دیگه voicePending نیست ولی voiceKey هم نداره
            return
          }
        }
      } catch {
        // خطای موقت شبکه — تلاش بعدی همچنان انجام می‌شود تا سقف attempts
      }
      if (attempts >= 7) clearInterval(interval) // ~۱۵ ثانیه سقف
    }, 2000)
  }, [])

  const applyReply = useCallback(
    (res: ShopSendMessageResponse) => {
      setState(res.state)
      const uiBlock = res.uiBlocks.find((b) => b.type !== 'NONE')
      const id = `agent-${Date.now()}`
      setMessages((prev) => [...prev, { id, role: 'agent', text: res.reply, uiBlock, voiceEventId: res.voiceEventId }])
      if (res.voiceEventId) pollVoice(id, res.voiceEventId)
    },
    [pollVoice],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      appendCustomerMessage(text)
      setSending(true)
      setError(null)
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ message: text }),
        })
        if (!res.ok) throw new Error('request failed')
        applyReply((await res.json()) as ShopSendMessageResponse)
      } catch {
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, appendCustomerMessage, applyReply],
  )

  // مسیر قطعی دکمه‌های UiBlock (افزودن به سبد/تایید سبد) — دیگر جمله‌ی فارسی نمی‌سازد تا از
  // NLU رد شود، productId مستقیم می‌رود (فیدبک اول پایلوت: کلیک روی دکمه گاهی «نامفهوم»
  // تشخیص داده می‌شد). بدون optimistic bubble ساختگی — متن واقعی از رویداد لاگ‌شده در سرور می‌آید
  const sendAction = useCallback(
    async (action: ShopAction) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      setSending(true)
      setError(null)
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ action }),
        })
        if (!res.ok) throw new Error('request failed')
        applyReply((await res.json()) as ShopSendMessageResponse)
      } catch {
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — toggle خوش‌بینانه
  // (فوری روی آیکون)، بعد sendAction واقعی را می‌فرستد؛ عدم موفقیت فقط همان خطای عمومی sendAction
  // را نشان می‌دهد، بوکمارک محلی برنمی‌گردد (فاز ۱، ریسک کم)
  const toggleSaveProduct = useCallback(
    (productId: string) => {
      setSavedProductIds((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
      void sendAction({ type: 'TOGGLE_SAVE_PRODUCT', productId })
    },
    [sendAction],
  )

  // بعد از HANDOFF_HUMAN، پیام‌های فروشنده باید بدون اینکه مشتری خودش چیزی بفرستد دیده شوند —
  // بدون SSE/WebSocket در پروژه، پالینگ ساده کافی است (فقط وقتی مکالمه دست انسان است)
  const fetchConversation = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}`, {
      headers: { 'X-Session-Token': session.sessionToken },
    })
    if (!res.ok) throw new Error('request failed')
    const data = (await res.json()) as ShopGetConversationResponse
    setState(data.state)
    setStoreId(data.storeId)
    setStoreName(data.storeName)
    setStoreLogoKey(data.storeLogoKey)
    setResponseStrategyState(data.responseStrategy)
    setMessages(eventsToMessages(data.events, session.conversationId))
  }, [])

  useEffect(() => {
    // docs/PRD-customer-comments-and-discounts.md بخش الف/۳ — تایید سفارش (AWAITING_SELLER_APPROVAL
    // → COMPLETED) هم مثل HANDOFF_HUMAN یک پیام async از سمت فروشنده/سیستم است که بدون پیام
    // تازه‌ی مشتری تولید می‌شود (اینجا: پیام پیگیریِ نظرخواهی) — بدون پالینگ، مشتری در وب
    // اصلاً نمی‌دید سفارشش تایید شده مگر صفحه را رفرش کند. REJECTED هم همینه — بعد از رد سفارش
    // فروشنده ممکنه از پنل/تلگرام دستی جواب بده (isMutedForHuman)، باید بدون رفرش دیده شود
    if (
      (state !== 'HANDOFF_HUMAN' &&
        state !== 'AWAITING_SELLER_APPROVAL' &&
        state !== 'REJECTED') ||
      viewingHistory
    ) {
      return
    }
    const interval = setInterval(() => {
      void fetchConversation()
    }, 4000)
    return () => clearInterval(interval)
  }, [state, viewingHistory, fetchConversation])

  const uploadReceipt = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      setMessages((prev) => [...prev, { id: `opt-${Date.now()}`, role: 'customer', text: fa.shop.receiptUploadedNote }])
      setSending(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        // بدون ست‌کردن دستی Content-Type — مرورگر خودش boundary مالتی‌پارت را می‌سازد
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/receipt`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) throw new Error('request failed')
        applyReply((await res.json()) as ShopSendMessageResponse)
      } catch {
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // عکسی که خریدار در حالت «صحبت با فروشنده» (isMutedForHuman) می‌فرستد — بدون applyReply،
  // چون سرور همیشه reply خالی برمی‌گرداند (مثل پیام متنیِ muted در sendMessage بک‌اند)؛ اگر
  // applyReply صدا می‌زدیم یک حباب «agent» خالی اضافه می‌شد. فقط state را به‌روز می‌کنیم
  const sendImageMessage = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const pendingId = `img-${Date.now()}`
      const previewUrl = URL.createObjectURL(file)
      setMessages((prev) => [...prev, { id: pendingId, role: 'customer', text: '', imageUrl: previewUrl }])
      setSending(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/image`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as ShopSendMessageResponse
        setState(data.state)
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId))
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending],
  )

  // ضبط صدا از وب (بخش ۲.۲) — blob از MediaRecorder، فرمت هرچی مرورگر بدهد (معمولاً webm)،
  // بک‌اند خودش با extractAudio نرمال‌سازی می‌کند
  const sendVoiceMessage = useCallback(
    async (blob: Blob) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      // فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — قبلاً تا رسیدن transcript (رفت‌وبرگشت بلاکینگ + ASR سمت
      // سرور) خریدار هیچ نشونه‌ای نمی‌دید که وویسش اصلاً فرستاده شده. حالا فوری یک حباب
      // pending (با isVoice) اضافه می‌شود، همون id بعداً با متن واقعی جایگزین می‌شود
      const pendingId = `voice-${Date.now()}`
      setMessages((prev) => [...prev, { id: pendingId, role: 'customer', text: '', isVoice: true }])
      setSending(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', blob, 'voice.webm')
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/voice-message`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as ShopSendMessageResponse
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, text: data.transcript ?? '' } : m)),
        )
        applyReply(data)
      } catch {
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // مشترک بین اولین بوت (chat/start) و «گفتگوی جدید» (chat/:id/restart) — هر دو همین شکل
  // پاسخ را برمی‌گردانند (docs/PRD-conversation-history.md: restart همان sessionToken را
  // echo می‌کند چون Customer عوض نمی‌شود، فقط SalesConversation تازه است)
  const applyStartResponse = useCallback(
    (data: ShopStartChatResponse) => {
      const session: ShopSession = { conversationId: data.conversationId, sessionToken: data.sessionToken }
      setShopSession(slug, session)
      sessionRef.current = session
      liveSessionRef.current = session
      setStoreId(data.storeId)
      setStoreName(data.storeName)
      setStoreLogoKey(data.storeLogoKey)
      setResponseStrategyState(data.responseStrategy)
      setMessages([])
      // لینک اختصاصی یک محصول (?product=) — پاسخ اول همراه خودِ start برگشته، بدون کیک‌آف عمومی جدا
      if (data.initialReply) {
        setState(data.initialState ?? 'BROWSING')
        const uiBlock = data.initialUiBlocks?.find((b) => b.type !== 'NONE')
        const id = `agent-${Date.now()}`
        setMessages((prev) => [
          ...prev,
          { id, role: 'agent', text: data.initialReply!, uiBlock, voiceEventId: data.initialVoiceEventId },
        ])
        if (data.initialVoiceEventId) pollVoice(id, data.initialVoiceEventId)
      } else {
        setState('GREETING')
        // باگ واقعی زنده (۱۴۰۵/۰۷/۱۹، docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴) —
        // silent:true حباب مشتری را مخفی می‌کرد در حالی‌که این پیام واقعاً روی سرور به‌عنوان
        // یک CUSTOMER_MESSAGE واقعی ثبت می‌شود (با رفرش هم از لاگ سرور درست نمایش داده
        // می‌شد) — یعنی ناسازگاری بین اولین‌بار دیدن و رفرش، نه رفتار عمدی
        void sendMessage(KICKOFF_MESSAGE)
      }
      void fetchHistory()
      void fetchSavedProducts()
    },
    [slug, pollVoice, sendMessage, fetchHistory, fetchSavedProducts],
  )

  // فقط اولین بار (هیچ سشنی در این مرورگر نبوده) — Customer تازه می‌سازد
  const createFreshConversation = useCallback(
    async (cancelledRef?: { current: boolean }): Promise<void> => {
      const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productId ? { productId } : {}),
      })
      if (res.status === 404) {
        if (!cancelledRef?.current) setNotFound(true)
        return
      }
      if (!res.ok) throw new Error('request failed')
      const data = (await res.json()) as ShopStartChatResponse
      if (cancelledRef?.current) return
      applyStartResponse(data)
    },
    [slug, productId, applyStartResponse],
  )

  useEffect(() => {
    const cancelledRef = { current: false }

    async function boot() {
      setLoading(true)
      const existing = getShopSession(slug)
      try {
        if (existing) {
          sessionRef.current = existing
          liveSessionRef.current = existing
          await fetchConversation()
          void fetchHistory()
          void fetchSavedProducts()
        } else {
          await createFreshConversation(cancelledRef)
        }
      } catch {
        if (!cancelledRef.current) setError(fa.common.error)
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    void boot()
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // فیدبک: «کاربر چت جدید نمی‌تواند باز کند» — docs/PRD-conversation-history.md: دیگر
  // Customer تازه نمی‌سازد، فقط مکالمه‌ی فعلی همین خریدار را آرشیو و یکی تازه شروع می‌کند
  // (خودِ سرور در تاریخچه‌ی همین خریدار نگهش می‌دارد)
  const startNewChat = useCallback(async () => {
    if (sending) return
    const current = liveSessionRef.current
    if (!current) return
    setViewingHistory(false)
    setMessages([])
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/chat/${current.conversationId}/restart`, {
        method: 'POST',
        headers: { 'X-Session-Token': current.sessionToken },
      })
      if (!res.ok) throw new Error('request failed')
      applyStartResponse((await res.json()) as ShopStartChatResponse)
    } catch {
      setError(fa.common.error)
    } finally {
      setLoading(false)
    }
  }, [sending, applyStartResponse, setViewingHistory])

  // نمایش فقط‌خواندنی یک گفتگوی قدیمی از تاریخچه — ارسال پیام غیرفعال می‌ماند تا برگردد؛
  // همان sessionToken مکالمه‌ی زنده کار می‌کند چون هر دو مال یک Customer‌اند
  const viewHistoryEntry = useCallback(
    async (entry: ShopHistoryEntry) => {
      if (sending) return
      const live = liveSessionRef.current
      if (!live) return
      sessionRef.current = { conversationId: entry.conversationId, sessionToken: live.sessionToken }
      setViewingHistory(true)
      setLoading(true)
      setError(null)
      try {
        await fetchConversation()
      } catch {
        setError(fa.common.error)
      } finally {
        setLoading(false)
      }
    },
    [sending, fetchConversation, setViewingHistory],
  )

  const returnToCurrentChat = useCallback(async () => {
    const current = liveSessionRef.current
    if (!current) return
    sessionRef.current = current
    setViewingHistory(false)
    setLoading(true)
    setError(null)
    try {
      await fetchConversation()
    } catch {
      setError(fa.common.error)
    } finally {
      setLoading(false)
    }
  }, [fetchConversation, setViewingHistory])

  // docs/PRD-sales-agent-response-strategy-ab.md بخش ۹ — سوییچ دستی خریدار بین Track A
  // (RULE_BASED) و Track B (SIMPLE_AGENT) روی همین مکالمه، فقط برای تست؛ optimistic update،
  // در صورت شکست fetchConversation مقدار واقعی سرور را برمی‌گرداند
  const setResponseStrategy = useCallback(
    async (strategy: ShopResponseStrategy) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const previous = responseStrategy
      if (previous === strategy) return
      setResponseStrategyState(strategy)
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/response-strategy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ responseStrategy: strategy }),
        })
        if (!res.ok) throw new Error('request failed')
      } catch {
        await fetchConversation().catch(() => setResponseStrategyState(previous))
      }
    },
    [sending, responseStrategy, fetchConversation],
  )

  // docs/PRD-sales-agent-voice.md بخش ۶.۵ — سیگنال واقعی «شنیده شد» روی وب؛ onPlay تگ audio
  // یک‌بار این را صدا می‌زند. fire-and-forget — شکست این پینگ نباید پخش صدا را مختل کند
  const markVoiceHeard = useCallback((key: string) => {
    const session = sessionRef.current
    if (!session) return
    // کلید ذخیره‌سازی شامل پیشوند «conversationId/» است (storage.service.ts uploadImage) —
    // باید encode شود وگرنه «/» داخلش روت :key را به چند سگمنت می‌شکند و 404 می‌گیرد
    void fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/voice/${encodeURIComponent(key)}/heard`, {
      method: 'POST',
      headers: { 'X-Session-Token': session.sessionToken },
    }).catch(() => {})
  }, [])

  return {
    storeId,
    storeName,
    storeLogoKey,
    notFound,
    conversationId: sessionRef.current?.conversationId,
    messages,
    state,
    loading,
    sending,
    error,
    history,
    viewingHistory,
    savedProductIds,
    toggleSaveProduct,
    responseStrategy,
    setResponseStrategy,
    sendMessage,
    sendAction,
    uploadReceipt,
    sendImageMessage,
    sendVoiceMessage,
    markVoiceHeard,
    startNewChat,
    viewHistoryEntry,
    returnToCurrentChat,
  }
}
