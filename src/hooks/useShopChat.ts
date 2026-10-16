import { useCallback, useEffect, useRef, useState } from 'react'
import { compressImage } from '@/lib/compressImage'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { newClientMessageId } from '@/lib/clientMessageId'
import { useToastStore } from '@/store/toast.store'
import type { CartOp } from '@/lib/optimisticCart'
import { getShopSession,
  clearShopSession, setShopSession, type ShopSession } from '@/lib/shopSession'
import type {
  ShopAction,
  ShopConversationEvent,
  ShopGetConversationResponse,
  ShopHistoryEntry,
  ShopMessage,
  ShopOrderSummary,
  ShopResponseStrategy,
  PublicProduct,
  ShopSavedProductsResponse,
  ShopSendMessageResponse,
  ShopStartChatResponse,
  ShopVoiceStatusResponse,
} from '@/types/api'

// این صفحه مشتری ناشناس یک فروشگاه است، نه یک User لاگین‌شده — عمداً از `api` (axios)
// مشترک استفاده نمی‌کند چون آن همیشه هدر Authorization را از localStorage تزریق می‌کند
// (src/lib/api.ts)؛ اینجا هویت فقط X-Session-Token است.

// کلید ذخیره‌سازی شامل پیشوند «conversationId/» است (storage.service.ts uploadImage) — باید
// encode شود وگرنه «/» داخلش روت :key را به چند سگمنت می‌شکند و 404 می‌گیرد (عیناً voiceAudioUrl
// در ShopChatPage.tsx)
// پیام خطای ثبت‌نام خریدار همیشه فارسی: متن فارسی بک‌اند عیناً نمایش داده می‌شود، ولی آرایه‌ی
// validation یا متن انگلیسی (مثل «phone must be...») هرگز خام به کاربر نشان داده نمی‌شود
function hasReplyAfterLatestCustomer(events: ShopConversationEvent[]): boolean {
  let customerAt = -1
  for (let i = 0; i < events.length; i++) {
    if (events[i].type === 'CUSTOMER_MESSAGE') customerAt = i
  }
  if (customerAt < 0) return false
  return events
    .slice(customerAt + 1)
    .some((event) => event.type === 'AGENT_REPLY' || event.type === 'SELLER_MESSAGE')
}

function buyerRegisterError(status: number, message: unknown, validationFallback: string): string {
  if (status === 429) return fa.shop.registerTooManyRequests
  if (typeof message === 'string' && /[\u0600-\u06FF]/.test(message)) return message
  if (status === 400 || status === 422 || Array.isArray(message)) return validationFallback
  return fa.common.error
}

function chatImageUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/image/${encodeURIComponent(key)}`
}

function eventsToMessages(events: ShopConversationEvent[], conversationId: string): ShopMessage[] {
  const messages: ShopMessage[] = []
  // چند پاسخ AGENT_REPLY در یک turn: اولی همان `stream-{turnId}` (حباب زنده‌ی استریم)، بعدی‌ها با پسوند اندیس
  const repliesPerTurn = new Map<string, number>()
  events.forEach((e) => {
    if (e.type === 'CUSTOMER_MESSAGE' && (e.payload.text || e.payload.imageKey || e.payload.videoKey)) {
      messages.push({
        id: e.payload.clientMessageId ? `c-${e.payload.clientMessageId}` : `c-${e.createdAt}`,
        role: 'customer',
        text: e.payload.text ?? '',
        clientMessageId: e.payload.clientMessageId,
        imageUrl: e.payload.imageKey ? chatImageUrl(conversationId, e.payload.imageKey) : undefined,
        videoUrl: e.payload.videoKey ? chatImageUrl(conversationId, e.payload.videoKey) : undefined,
        createdAt: e.createdAt,
      })
    } else if ((e.type === 'AGENT_REPLY' || e.type === 'SELLER_MESSAGE') && e.payload.text) {
      let id = `a-${e.createdAt}`
      if (e.payload.turnId) {
        const index = repliesPerTurn.get(e.payload.turnId) ?? 0
        repliesPerTurn.set(e.payload.turnId, index + 1)
        id = index === 0 ? `stream-${e.payload.turnId}` : `stream-${e.payload.turnId}-${index}`
      }
      messages.push({
        id,
        role: 'agent',
        text: e.payload.text,
        uiBlock: e.payload.uiBlock?.type !== 'NONE' ? e.payload.uiBlock : undefined,
        quickReplies: e.payload.quickReplies?.length ? e.payload.quickReplies : undefined,
        createdAt: e.createdAt,
        ...(e.type === 'SELLER_MESSAGE' ? { fromSeller: true } : {}),
      })
    }
  })
  return messages
}

function mergeShopMessages(server: ShopMessage[], local: ShopMessage[], serverState?: string): ShopMessage[] {
  const serverClientIds = new Set(
    server.map((message) => message.clientMessageId).filter((id): id is string => !!id),
  )
  const serverIds = new Set(server.map((message) => message.id))
  const merged = server.map((message) => {
    const localMatch = local.find((item) =>
      item.id === message.id ||
      (!!message.clientMessageId && item.clientMessageId === message.clientMessageId),
    )
    if (!localMatch?.voiceKey && !localMatch?.failed) return message
    return {
      ...message,
      ...(localMatch.voiceKey ? { voiceKey: localMatch.voiceKey } : {}),
      // پیام مشتری که turnش خطای سرور گرفت، بعد از poll هم «ناموفق + دوباره بفرست» می‌ماند
      ...(localMatch.failed ? { failed: true } : {}),
    }
  })
  for (const message of local) {
    // سرور جلو رفته (رسید ثبت شد/تایید/رد)؛ حباب خوش‌بینانه نباید ته لیست تکرار شود
    if (message.receiptOptimistic && serverState && serverState !== 'AWAITING_PAYMENT') continue
    const knownClient = !!message.clientMessageId && serverClientIds.has(message.clientMessageId)
    const knownStream = message.id.startsWith('stream-') && serverIds.has(message.id)
    if (knownClient || knownStream) continue
    const optimistic =
      message.id.startsWith('opt-') || message.id.startsWith('voice-')
    if (optimistic && message.text) {
      const echoed = server.some(
        (item) => item.role === message.role && item.text === message.text,
      )
      if (echoed) continue
    }
    const pending =
      message.failed ||
      message.id.startsWith('stream-') ||
      optimistic ||
      !!message.clientMessageId
    if (pending) merged.push(message)
  }
  return merged
}

export function useShopChat(slug: string, productId?: string) {
  const [storeName, setStoreName] = useState<string | null>(null)
  // docs/PRD-product-strategy-and-roadmap.md بخش ۵.۱۴ — برای ساخت URL عکس پروفایل (storeLogoUrl)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeLogoKey, setStoreLogoKey] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [notFound, setNotFound] = useState(false)
  // R1.2 — فروشگاه معلق (۴۰۳ از start)
  const [suspended, setSuspended] = useState(false)
  const [messages, setMessages] = useState<ShopMessage[]>([])
  const [olderMessages, setOlderMessages] = useState<ShopMessage[]>([])
  const [hasMoreEvents, setHasMoreEvents] = useState(false)
  const [serverVerified, setServerVerified] = useState(false)
  const oldestCreatedAtRef = useRef<string | null>(null)
  const [state, setState] = useState<string>('GREETING')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [streamNote, setStreamNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ShopHistoryEntry[]>([])
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۶ (فاز ۴.۸، مورد ۳) — «ذخیره برای بعد»
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set())
  const [savedProducts, setSavedProducts] = useState<PublicProduct[]>([])
  const [viewingHistory, setViewingHistoryState] = useState(false)
  // docs/PRD-sales-agent-response-strategy-ab.md بخش ۹ — سوییچ دستی خریدار برای تست زنده‌ی
  // Track A/B؛ فعلاً فقط برای تست، پیش‌فرض واقعی سرور RULE_BASED است
  const [responseStrategy, setResponseStrategyState] = useState<ShopResponseStrategy>('RULE_BASED')
  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱ — true یعنی الان
  // منتظر نظر است؛ تعیین می‌کند دکمه‌های پیوست عکس/ویدیو هم نشان داده شوند
  const [awaitingReview, setAwaitingReview] = useState(false)
  const [awaitingSatisfaction, setAwaitingSatisfaction] = useState(false)
  const sessionRef = useRef<ShopSession | null>(null)
  const messagesStateRef = useRef<ShopMessage[]>([])
  const streamEnabledRef = useRef(false)
  // مکالمه‌ی واقعاً «فعال» — وقتی viewHistoryEntry موقتاً sessionRef را روی یک مکالمه‌ی
  // قدیمی می‌گذارد، این ref همچنان مکالمه‌ی زنده را نگه می‌دارد تا returnToCurrentChat بتواند
  // برگردد (docs/PRD-conversation-history.md — تاریخچه حالا سمت سرور است، نه localStorage)
  const liveSessionRef = useRef<ShopSession | null>(null)
  // ref موازی با state بالا — چون sendMessage/sendAction/... باید همین لحظه (نه بعد از
  // ری‌رندر بعدی) بدانند در حالت تاریخچه هستند یا نه، وگرنه closure قدیمی گیر می‌کند
  const viewingHistoryRef = useRef(false)
  const finalPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // حباب‌هایی که turnشان خطای سرور گرفت؛ retry آن‌ها clientMessageId تازه می‌گیرد
  const freshRetryRef = useRef<Set<string>>(new Set())
  const sendingRef = useRef(false)
  sendingRef.current = sending
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
      setSavedProducts(data.items ?? [])
    } catch {
      // فقط آیکون بوکمارک را تحت‌تاثیر می‌گذارد، نباید کل چت را خراب کند
    }
  }, [])

  messagesStateRef.current = messages

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

  // 0.4 — سرور پیام را در صف گذاشت (مکالمه مشغول turn قبلی بود)؛ جواب به‌زودی به‌صورت رویداد
  // لاگ می‌شود. چند بار (۲،۴،۷،۱۲ ثانیه) رویدادها را می‌خوانیم تا جواب ظاهر شود.
  const refreshConversation = useCallback(async (known: string, token: string) => {
    const res = await fetch(`${env.VITE_API_URL}/v2/chat/${known}`, {
      headers: { 'X-Session-Token': token },
    })
    if (!res.ok) return null
    const data = (await res.json()) as ShopGetConversationResponse
    setState(data.state)
    setMessages((prev) => mergeShopMessages(eventsToMessages(data.events, known), prev, data.state))
    return data
  }, [])

  const pollQueuedReply = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    const known = session.conversationId
    for (const delayMs of [2000, 4000, 7000, 12000]) {
      setTimeout(async () => {
        const live = sessionRef.current
        if (!live || live.conversationId !== known) return
        try {
          await refreshConversation(known, live.sessionToken)
        } catch {
          // خطای موقت شبکه — تلاش بعدی
        }
      }, delayMs)
    }
  }, [refreshConversation])

  const pollForFinalReply = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    if (finalPollRef.current) window.clearInterval(finalPollRef.current)
    const known = session.conversationId
    const started = Date.now()
    let inFlight = false
    const stop = () => {
      if (finalPollRef.current) window.clearInterval(finalPollRef.current)
      finalPollRef.current = null
    }
    const tick = async () => {
      // tick هم‌پوشان نداشته باشیم: درخواست قبلی هنوز در جریان است ← این دور رد
      if (inFlight) return
      if (Date.now() - started > 90_000) {
        stop()
        return
      }
      const live = sessionRef.current
      if (!live || live.conversationId !== known) return
      inFlight = true
      try {
        const data = await refreshConversation(known, live.sessionToken)
        if (data && hasReplyAfterLatestCustomer(data.events)) stop()
      } catch {
        // keep polling until the deadline
      } finally {
        inFlight = false
      }
    }
    void tick()
    finalPollRef.current = window.setInterval(() => {
      void tick()
    }, 3000)
  }, [refreshConversation])

  // خروج از صفحه: poll نهایی نباید بعد از unmount ادامه دهد
  useEffect(
    () => () => {
      if (finalPollRef.current) window.clearInterval(finalPollRef.current)
      finalPollRef.current = null
    },
    [],
  )

  const applyReply = useCallback(
    (res: ShopSendMessageResponse) => {
      if (res.queued) {
        pollQueuedReply()
        return
      }
      // 0.13b — سرور مکالمه‌ی جدیدی برای این اکشن ساخته؛ از این به بعد پیام‌ها/پالینگ به همان می‌روند
      // (مکالمه‌ی قبلی برای پیگیری سفارش در تاریخچه می‌ماند)
      if (res.switchedConversationId && sessionRef.current) {
        const next: ShopSession = {
          conversationId: res.switchedConversationId,
          sessionToken: sessionRef.current.sessionToken,
        }
        setShopSession(slug, next)
        sessionRef.current = next
        liveSessionRef.current = next
      }
      setState(res.state)
      setAwaitingReview(!!res.awaitingReview)
      const uiBlock = res.uiBlocks.find((b) => b.type !== 'NONE')
      // 0.13p — در حالت فروشنده‌ی انسانی سرور reply خالی می‌دهد؛ حباب خاکستری خالی نساز
      if (!res.reply && !uiBlock) return
      const id = `agent-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: 'agent',
          text: res.reply,
          uiBlock,
          voiceEventId: res.voiceEventId,
          quickReplies: res.quickReplies?.length ? res.quickReplies : undefined,
        },
      ])
      if (res.voiceEventId) pollVoice(id, res.voiceEventId)
    },
    [pollVoice, pollQueuedReply, slug],
  )

  const readShopTurn = useCallback(async (session: ShopSession, turnId: string): Promise<'done' | 'poll' | 'error'> => {
    const bubbleId = `stream-${turnId}`
    setMessages((prev) => [...prev, { id: bubbleId, role: 'agent', text: '' }])
    const dropBubble = () => {
      setMessages((prev) => prev.filter((message) => message.id !== bubbleId))
    }
    const controller = new AbortController()
    let idle = window.setTimeout(() => controller.abort(), 20_000)
    const resetIdle = () => {
      window.clearTimeout(idle)
      idle = window.setTimeout(() => controller.abort(), 20_000)
    }
    let sawDone = false
    let queued = false
    try {
      const res = await fetch(
        `${env.VITE_API_URL}/v2/chat/${session.conversationId}/turns/${turnId}/events`,
        { headers: { 'X-Session-Token': session.sessionToken }, signal: controller.signal },
      )
      if (!res.ok || !res.body) {
        dropBubble()
        return 'poll'
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resetIdle()
        buf += decoder.decode(value, { stream: true })
        let nl = buf.indexOf('\n')
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          nl = buf.indexOf('\n')
          if (!line.startsWith('data:')) continue
          const event = JSON.parse(line.slice(5)) as {
            type: string
            text?: string
            reply?: string
            uiBlocks?: ShopSendMessageResponse['uiBlocks']
            state?: string
            quickReplies?: string[]
            voiceEventId?: string
            awaitingReview?: boolean
            queued?: boolean
          }
          if (event.type === 'status' && event.text) setStreamNote(event.text)
          if (event.type === 'delta' && event.text) {
            setStreamNote(null)
            const text = event.text
            setMessages((prev) => prev.map((m) => (m.id === bubbleId ? { ...m, text } : m)))
          }
          if (event.type === 'replace' && event.text) {
            // گارد قیمت متن نهایی را عوض کرد
            const text = event.text
            setMessages((prev) => prev.map((m) => (m.id === bubbleId ? { ...m, text } : m)))
          }
          if (event.type === 'done') {
            sawDone = true
            setStreamNote(null)
            if (event.queued) {
              queued = true
              dropBubble()
              break
            }
            setState(event.state ?? 'BROWSING')
            setAwaitingReview(!!event.awaitingReview)
            const uiBlock = event.uiBlocks?.find((b) => b.type !== 'NONE')
            if (!event.reply && !uiBlock) {
              dropBubble()
            } else {
              setMessages((prev) => prev.map((m) => (
                m.id === bubbleId
                  ? {
                      ...m,
                      text: event.reply ?? m.text,
                      uiBlock,
                      quickReplies: event.quickReplies?.length ? event.quickReplies : undefined,
                      voiceEventId: event.voiceEventId,
                    }
                  : m
              )))
              if (event.voiceEventId) pollVoice(bubbleId, event.voiceEventId)
            }
          }
          if (event.type === 'error') {
            // خطای واقعی سرور: poll فایده ندارد؛ حباب «ناموفق + دوباره بفرست»
            dropBubble()
            return 'error'
          }
        }
        if (queued) break
      }
    } catch {
      dropBubble()
      return 'poll'
    } finally {
      window.clearTimeout(idle)
    }
    if (queued || !sawDone) {
      if (!sawDone) dropBubble()
      return 'poll'
    }
    return 'done'
  }, [pollVoice])

  const deliverCustomerText = useCallback(
    async (bubbleId: string, text: string, clientMessageId: string) => {
      const session = sessionRef.current
      if (!session || viewingHistoryRef.current) return
      setMessages((prev) => prev.map((m) => (m.id === bubbleId ? { ...m, failed: false } : m)))
      setSending(true)
      setError(null)
      const slowNote = window.setTimeout(() => {
        setStreamNote((current) => current ?? fa.shop.stillChecking)
      }, 5000)
      const postController = new AbortController()
      const postKiller = window.setTimeout(() => postController.abort(), 25_000)
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Session-Token': session.sessionToken,
          'Idempotency-Key': clientMessageId,
        }
        if (streamEnabledRef.current) headers['Accept-Stream'] = '1'
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: text }),
          signal: postController.signal,
        })
        window.clearTimeout(postKiller)
        if (!res.ok) throw new Error('request failed')
        const body = (await res.json()) as ShopSendMessageResponse
        if (body.turnId) {
          const outcome = await readShopTurn(session, body.turnId)
          if (outcome === 'poll') pollForFinalReply()
          if (outcome === 'error') {
            // turn شکست خورده؛ دوباره‌فرستادن با کلید جدید (کلید قبلی ممکن است جواب شکست را cache کرده باشد)
            freshRetryRef.current.add(bubbleId)
            setMessages((prev) => prev.map((m) => (m.id === bubbleId ? { ...m, failed: true } : m)))
            setError(fa.common.error)
          }
        } else {
          applyReply(body)
        }
        setAwaitingSatisfaction(false)
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === bubbleId ? { ...m, failed: true } : m)))
        setError(fa.common.error)
      } finally {
        window.clearTimeout(slowNote)
        window.clearTimeout(postKiller)
        setStreamNote(null)
        setSending(false)
      }
    },
    [applyReply, readShopTurn, pollForFinalReply],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const bubbleId = `opt-${Date.now()}`
      const clientMessageId = newClientMessageId()
      setMessages((prev) => [...prev, { id: bubbleId, role: 'customer', text, clientMessageId }])
      await deliverCustomerText(bubbleId, text, clientMessageId)
    },
    [sending, deliverCustomerText],
  )

  const retryMessage = useCallback(
    async (bubbleId: string) => {
      if (sending) return
      const found = messagesStateRef.current.find((m) => m.id === bubbleId)
      if (!found?.text) return
      const fresh = freshRetryRef.current.delete(bubbleId)
      await deliverCustomerText(
        bubbleId,
        found.text,
        fresh ? newClientMessageId() : (found.clientMessageId ?? newClientMessageId()),
      )
    },
    [sending, deliverCustomerText],
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
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': session.sessionToken,
            'Idempotency-Key': newClientMessageId(),
          },
          body: JSON.stringify({ action }),
        })
        if (!res.ok) {
          let serverMessage = ''
          try {
            const body = (await res.json()) as { message?: unknown }
            if (typeof body.message === 'string') serverMessage = body.message
          } catch {
            serverMessage = ''
          }
          throw new Error(serverMessage || 'request failed')
        }
        const data = (await res.json()) as ShopSendMessageResponse
        if (action.type === 'SET_CART_QTY' || action.type === 'REMOVE_CART_ITEM') {
          setState(data.state)
          const block = data.uiBlocks.find((item) => item.type === 'CART_SUMMARY')
          setMessages((prev) => {
            // پاسخ بدون CART_SUMMARY (مثلاً «سبد قفل است») هم باید دیده شود
            if (!block) {
              return data.reply
                ? [...prev, { id: `agent-${Date.now()}`, role: 'agent', text: data.reply }]
                : prev
            }
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].uiBlock?.type === 'CART_SUMMARY') {
                next[i] = {
                  ...next[i],
                  text: data.reply || next[i].text,
                  uiBlock: block,
                }
                return next
              }
            }
            return [
              ...next,
              {
                id: `agent-${Date.now()}`,
                role: 'agent',
                text: data.reply,
                uiBlock: block,
              },
            ]
          })
          return
        }
        applyReply(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        setError(message && message !== 'request failed' ? message : fa.common.error)
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
      const session = liveSessionRef.current
      if (!session) return
      setSavedProductIds((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
      void (async () => {
        try {
          const res = await fetch(
            `${env.VITE_API_URL}/v2/chat/${session.conversationId}/saved-products`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': session.sessionToken,
              },
              body: JSON.stringify({ productId }),
            },
          )
          if (!res.ok) throw new Error('request failed')
          await fetchSavedProducts()
        } catch {
          setSavedProductIds((prev) => {
            const next = new Set(prev)
            if (next.has(productId)) next.delete(productId)
            else next.add(productId)
            return next
          })
          setError(fa.common.error)
        }
      })()
    },
    [fetchSavedProducts],
  )

  // بعد از HANDOFF_HUMAN، پیام‌های فروشنده باید بدون اینکه مشتری خودش چیزی بفرستد دیده شوند —
  // بدون SSE/WebSocket در پروژه، پالینگ ساده کافی است (فقط وقتی مکالمه دست انسان است)
  const fetchConversation = useCallback(async (mode: 'replace' | 'merge' = 'merge') => {
    const session = sessionRef.current
    if (!session) return
    const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}`, {
      headers: { 'X-Session-Token': session.sessionToken },
    })
    if (!res.ok) throw Object.assign(new Error('request failed'), { status: res.status })
    const data = (await res.json()) as ShopGetConversationResponse
    setState(data.state)
    setStoreId(data.storeId)
    setStoreName(data.storeName)
    setStoreLogoKey(data.storeLogoKey)
    setIsDemo(data.isDemo)
    streamEnabledRef.current = !!data.shopStreamEnabled
    setResponseStrategyState(data.responseStrategy)
    setAwaitingReview(data.awaitingReview)
    setAwaitingSatisfaction(!!data.awaitingSatisfactionCheck)
    if (data.buyerVerified) setServerVerified(true)
    const nextMessages = eventsToMessages(data.events, session.conversationId)
    setMessages((prev) => (mode === 'replace' ? nextMessages : mergeShopMessages(nextMessages, prev, data.state)))
    if (mode === 'replace' || !oldestCreatedAtRef.current) {
      oldestCreatedAtRef.current = data.events[0]?.createdAt ?? null
      setHasMoreEvents(!!data.hasMoreEvents)
    }
    if (mode === 'replace') setOlderMessages([])
  }, [])

  const loadOlderMessages = useCallback(async () => {
    const session = sessionRef.current
    const before = oldestCreatedAtRef.current
    if (!session || !before) return
    const res = await fetch(
      `${env.VITE_API_URL}/v2/chat/${session.conversationId}?before=${encodeURIComponent(before)}`,
      { headers: { 'X-Session-Token': session.sessionToken } },
    )
    if (!res.ok) return
    const data = (await res.json()) as ShopGetConversationResponse
    if (data.events[0]?.createdAt) oldestCreatedAtRef.current = data.events[0].createdAt
    setHasMoreEvents(!!data.hasMoreEvents)
    setOlderMessages((prev) => [...eventsToMessages(data.events, session.conversationId), ...prev])
  }, [])

  useEffect(() => {
    const human =
      state === 'HANDOFF_HUMAN' ||
      state === 'AWAITING_SELLER_APPROVAL' ||
      state === 'REJECTED'
    const satisfaction = state === 'COMPLETED' && awaitingSatisfaction
    if ((!human && !satisfaction) || viewingHistory) return

    let cancelled = false
    let timer = 0
    let delay = 4000
    const started = Date.now()
    const stopAfterMs = 10 * 60 * 1000

    const schedule = (ms: number) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void tick()
      }, ms)
    }

    const tick = async () => {
      if (cancelled) return
      if (satisfaction && Date.now() - started >= stopAfterMs) return
      if (document.visibilityState === 'hidden' || sendingRef.current) {
        schedule(delay)
        return
      }
      try {
        await fetchConversation()
      } catch {
        // temporary network error; the next tick retries
      }
      if (cancelled) return
      if (satisfaction) delay = Math.min(delay * 2, 30_000)
      if (satisfaction && Date.now() - started >= stopAfterMs) return
      schedule(delay)
    }

    const onVisibility = () => {
      if (cancelled || document.visibilityState === 'hidden') return
      if (satisfaction && Date.now() - started >= stopAfterMs) return
      schedule(0)
    }
    document.addEventListener('visibilitychange', onVisibility)
    schedule(4000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [state, awaitingSatisfaction, viewingHistory, fetchConversation])

  const uploadReceipt = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const bubbleId = `opt-${Date.now()}`
      setMessages((prev) => [...prev, { id: bubbleId, role: 'customer', text: fa.shop.receiptUploadedNote, receiptOptimistic: true }])
      setSending(true)
      setError(null)
      try {
        const form = new FormData()
        // 0.13n — فشرده‌سازی سمت کلاینت قبل از آپلود (سقف سرور ۵MB)
        form.append('file', await compressImage(file))
        // بدون ست‌کردن دستی Content-Type — مرورگر خودش boundary مالتی‌پارت را می‌سازد
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/receipt`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) {
          const tooLarge = res.status === 413
          throw Object.assign(new Error('request failed'), { tooLarge })
        }
        applyReply((await res.json()) as ShopSendMessageResponse)
      } catch (err) {
        // 0.13n — رسیدی که آپلود نشد نباید به‌عنوان «رسید رو فرستادم» در چت بماند
        setMessages((prev) => prev.filter((m) => m.id !== bubbleId))
        setError((err as { tooLarge?: boolean }).tooLarge ? fa.shop.receiptTooLarge : fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // docs/PRD-nivo-sales-unified.md 3.8 — «رسید ندارم/عکس نگرفتم»: اطلاعات واریز به‌جای عکس؛
  // سرور همان RECEIPT_SUBMITTED را با receiptType=MANUAL_INFO ثبت می‌کند
  const submitManualReceipt = useCallback(
    async (info: { cardLast4: string; approxTime: string; trackingCode?: string }) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const bubbleId = `opt-${Date.now()}`
      setMessages((prev) => [...prev, { id: bubbleId, role: 'customer', text: fa.shop.manualReceiptSentNote, receiptOptimistic: true }])
      setSending(true)
      setError(null)
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/receipt-manual`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken, 'Content-Type': 'application/json' },
          body: JSON.stringify(info),
        })
        if (!res.ok) throw new Error('request failed')
        applyReply((await res.json()) as ShopSendMessageResponse)
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== bubbleId))
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // عکسی که خریدار در حالت «صحبت با فروشنده» (isMutedForHuman) یا منتظر نظر (awaitingReview —
  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱) می‌فرستد. حالت
  // اول سرور reply خالی برمی‌گرداند (applyReply صدا نمی‌زنیم، وگرنه حباب «agent» خالی اضافه
  // می‌شد)؛ حالت دوم reply واقعی («ممنون از نظرت») دارد و باید applyReply صدا بزنیم
  const submitRefundDestination = useCallback(
    async (input: { refundId: string; destination: string; holderName: string }) => {
      const session = sessionRef.current
      if (!session) throw new Error('no session')
      const res = await fetch(
        `${env.VITE_API_URL}/v2/chat/${session.conversationId}/refunds/${input.refundId}/destination`,
        {
          method: 'POST',
          headers: {
            'X-Session-Token': session.sessionToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination: input.destination,
            holderName: input.holderName,
          }),
        },
      )
      if (!res.ok) throw new Error('request failed')
      const data = (await res.json()) as { destinationMasked?: string }
      setMessages(prev =>
        prev.map(message =>
          message.uiBlock?.type === 'REFUND_DESTINATION_FORM' &&
          message.uiBlock.refundId === input.refundId
            ? {
                ...message,
                uiBlock: {
                  ...message.uiBlock,
                  status: 'SAVED',
                  destinationMasked: data.destinationMasked,
                },
              }
            : message,
        ),
      )
    },
    [],
  )

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
        if (data.reply) applyReply(data)
        else setState(data.state)
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId))
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
  )

  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱ — هم‌الگوی
  // sendImageMessage بالا، برای ویدیو (فقط در حالت muted یا awaitingReview قابل‌ارسال است)
  const sendVideoMessage = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session || sending || viewingHistoryRef.current) return
      const pendingId = `video-${Date.now()}`
      const previewUrl = URL.createObjectURL(file)
      setMessages((prev) => [...prev, { id: pendingId, role: 'customer', text: '', videoUrl: previewUrl }])
      setSending(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/video`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as ShopSendMessageResponse
        if (data.reply) applyReply(data)
        else setState(data.state)
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId))
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, applyReply],
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

  // docs/PRD-buyer-chat-redesign.md B5/§10 — رویدادهای رابط؛ fire-and-forget و بدون هیچ اثری روی UI
  const logUiEvent = useCallback((name: string, props?: Record<string, unknown>) => {
    const session = sessionRef.current
    if (!session) return
    void fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/ui-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
      body: JSON.stringify({ name, ...(props ? { props } : {}) }),
      keepalive: true,
    }).catch(() => undefined)
  }, [])

  // مسیر امن پیگیری سفارش (/o/:code) — کد نمایشی سفارش خودش لینک معتبر نیست؛ null = لینک عمومی در دسترس نیست
  const getOrderTrackPath = useCallback(async (orderCode: string): Promise<string | null> => {
    const session = sessionRef.current
    if (!session) return null
    try {
      const res = await fetch(
        `${env.VITE_API_URL}/v2/chat/${session.conversationId}/order-link/${encodeURIComponent(orderCode)}`,
        { headers: { 'X-Session-Token': session.sessionToken } },
      )
      if (!res.ok) return null
      const data = (await res.json()) as { path?: string | null }
      return data.path ?? null
    } catch {
      return null
    }
  }, [])

  // ── سبد خوش‌بینانه (docs/PRD-buyer-chat-redesign.md §8) ─────────────────────────────────────────────
  // دکمه‌های افزودن/تعداد/حذف همان لحظه روی UI اثر می‌گذارند (pendingCartOps روی آخرین CART_SUMMARY سرور
  // اعمال می‌شود). درخواست‌ها پشت‌سرهم (یک صف) و بدون استریم/مدل می‌روند (B3: پاسخ قالبی). با جواب سرور
  // عملیات حذف و نمایش از CART_SUMMARY برگشتی می‌آید؛ با رد سرور (ناموجود/قفل) عملیات برمی‌گردد و متن سرور toast می‌شود
  const [pendingCartOps, setPendingCartOps] = useState<CartOp[]>([])
  const cartQueueRef = useRef<Promise<void>>(Promise.resolve())
  const cartListenerRef = useRef<((result: { action: ShopAction; op: CartOp; ok: boolean; latencyMs: number }) => void) | null>(null)

  const runCartAction = useCallback(
    (action: ShopAction, op: CartOp) => {
      setPendingCartOps((prev) => [...prev, op])
      cartQueueRef.current = cartQueueRef.current.then(async () => {
        // پیام تایپی در حال اجراست: صبر می‌کنیم تا نوبت‌ها با هم قاطی نشوند (ردیف ۵ از §۱۳)
        while (sendingRef.current) await new Promise((resolve) => setTimeout(resolve, 150))
        let ok = false
        try {
          const session = sessionRef.current
          if (!session || viewingHistoryRef.current) return
          const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': session.sessionToken,
              'Idempotency-Key': newClientMessageId(),
            },
            body: JSON.stringify({ action }),
          })
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { message?: unknown } | null
            throw new Error(typeof body?.message === 'string' ? body.message : fa.common.error)
          }
          const data = (await res.json()) as ShopSendMessageResponse
          const block = data.uiBlocks.find((item) => item.type === 'CART_SUMMARY')
          if (block) {
            ok = true
            setState(data.state)
            setMessages((prev) => {
              const next = [...prev]
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].uiBlock?.type === 'CART_SUMMARY') {
                  next[i] = { ...next[i], text: data.reply || next[i].text, uiBlock: block }
                  return next
                }
              }
              return [...next, { id: `agent-${Date.now()}`, role: 'agent', text: data.reply, uiBlock: block }]
            })
          } else if (data.uiBlocks.some((item) => item.type !== 'NONE')) {
            // مثلاً چیپ VARIANT_PROMPT: همان مسیر معمول نخ
            applyReply(data)
          } else if (data.reply) {
            useToastStore.getState().addToast(data.reply)
          }
        } catch (err) {
          useToastStore.getState().addToast(err instanceof Error && err.message ? err.message : fa.common.error)
        } finally {
          setPendingCartOps((prev) => prev.filter((item) => item.id !== op.id))
          cartListenerRef.current?.({ action, op, ok, latencyMs: Date.now() - op.startedAt })
        }
      })
    },
    [applyReply],
  )

  const cartAdd = useCallback(
    (info: { productId: string; variantId?: string; name: string; variantLabel?: string; unitPrice: number; source?: string }) => {
      runCartAction(
        { type: 'ADD_TO_CART', productId: info.productId, ...(info.variantId ? { variantId: info.variantId } : {}) },
        { id: newClientMessageId(), kind: 'add', startedAt: Date.now(), ...info },
      )
    },
    [runCartAction],
  )
  const cartSetQty = useCallback(
    (line: { productId: string; variantId?: string }, qty: number) => {
      runCartAction(
        { type: 'SET_CART_QTY', productId: line.productId, qty, ...(line.variantId ? { variantId: line.variantId } : {}) },
        { id: newClientMessageId(), kind: 'qty', productId: line.productId, variantId: line.variantId, qty, startedAt: Date.now() },
      )
    },
    [runCartAction],
  )
  const cartRemove = useCallback(
    (line: { productId: string; variantId?: string }) => {
      runCartAction(
        { type: 'REMOVE_CART_ITEM', productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}) },
        { id: newClientMessageId(), kind: 'remove', productId: line.productId, variantId: line.variantId, startedAt: Date.now() },
      )
    },
    [runCartAction],
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
      setIsDemo(data.isDemo)
      streamEnabledRef.current = !!data.shopStreamEnabled
      setResponseStrategyState(data.responseStrategy)
      setMessages([])
      setOlderMessages([])
      oldestCreatedAtRef.current = null
      setHasMoreEvents(false)
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
        // docs/PRD-buyer-chat-redesign.md §3 (ورود B) — بدون پیام ساختگی/کیک‌آف و بدون فراخوانی مدل؛
        // خریدار محصولات را می‌بیند و هر وقت خواست می‌پرسد
        setState('GREETING')
      }
      void fetchHistory()
      void fetchSavedProducts()
    },
    [slug, pollVoice, fetchHistory, fetchSavedProducts],
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
      if (res.status === 403) {
        if (!cancelledRef?.current) setSuspended(true)
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
          let sessionAlive = true
          try {
            await fetchConversation('replace')
          } catch (err) {
            const status = (err as { status?: number }).status
            // 0.11b — session کهنه/نامعتبر: پاک و مکالمه‌ی تازه (نه چت مرده برای همیشه)
            if (status === 401 || status === 403 || status === 404) {
              sessionAlive = false
              clearShopSession(slug)
              sessionRef.current = null
              liveSessionRef.current = null
              await createFreshConversation(cancelledRef)
            } else {
              throw err
            }
          }
          if (sessionAlive) {
            void fetchHistory()
            void fetchSavedProducts()
            // 0.11a — خریدار برگشتی با لینک محصول (?product=): کارت همان محصول، نه چت قبلی بی‌تغییر
            if (productId && !cancelledRef.current) {
              void sendAction({ type: 'FOCUS_PRODUCT', productId })
            }
          }
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
    async (entry: Pick<ShopHistoryEntry, 'conversationId'>) => {
      if (sending) return
      const live = liveSessionRef.current
      if (!live) return
      sessionRef.current = { conversationId: entry.conversationId, sessionToken: live.sessionToken }
      setViewingHistory(true)
      setLoading(true)
      setError(null)
      try {
        await fetchConversation('replace')
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
      await fetchConversation('replace')
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

  // docs/PRD-buyer-phone-otp-registration.md — جدا از sendMessage/sendAction چون چت را
  // دستکاری نمی‌کند (نه applyReply، نه optimistic bubble)؛ فقط موفقیت/پیام خطا را برای مودال
  // ثبت‌نام برمی‌گرداند
  const subscribeStockAlert = useCallback(
    async (
      productId: string,
      variantId?: string,
    ): Promise<{ status: 'subscribed' | 'needs_phone' | 'in_stock' | 'error' }> => {
      const session = sessionRef.current
      if (!session) return { status: 'error' }
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/stock-alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ productId, ...(variantId ? { variantId } : {}) }),
        })
        if (!res.ok) return { status: 'error' }
        const data = (await res.json().catch(() => null)) as { status?: string } | null
        if (data?.status === 'subscribed' || data?.status === 'needs_phone' || data?.status === 'in_stock') {
          return { status: data.status }
        }
        return { status: 'error' }
      } catch {
        return { status: 'error' }
      }
    },
    [],
  )

  const sendBuyerOtp = useCallback(async (phone: string): Promise<{ ok: boolean; message: string }> => {
    const session = sessionRef.current
    if (!session) return { ok: false, message: fa.common.error }
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/register/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json().catch(() => null)) as { message?: unknown } | null
      if (!res.ok) return { ok: false, message: buyerRegisterError(res.status, data?.message, fa.shop.registerInvalidPhone) }
      return { ok: true, message: typeof data?.message === 'string' ? data.message : '' }
    } catch {
      return { ok: false, message: fa.common.error }
    }
  }, [])

  const verifyBuyerOtp = useCallback(
    async (phone: string, code: string, fullName?: string): Promise<{ ok: boolean; message: string }> => {
      const session = sessionRef.current
      if (!session) return { ok: false, message: fa.common.error }
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/register/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ phone, code, fullName }),
        })
        const data = (await res.json().catch(() => null)) as { message?: unknown } | null
        if (!res.ok) return { ok: false, message: buyerRegisterError(res.status, data?.message, fa.shop.registerInvalidCode) }
        setServerVerified(true)
        return { ok: true, message: typeof data?.message === 'string' ? data.message : '' }
      } catch {
        return { ok: false, message: fa.common.error }
      }
    },
    [],
  )

  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۲ — صفحه‌ی مستقل «سفارش‌های من»،
  // خارج از AI/چت؛ مثل sendBuyerOtp، چت را دستکاری نمی‌کند، فقط JSON خام برمی‌گرداند
  const listMyOrders = useCallback(async (): Promise<ShopOrderSummary[]> => {
    const session = sessionRef.current
    if (!session) return []
    try {
      const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/orders`, {
        headers: { 'X-Session-Token': session.sessionToken },
      })
      if (!res.ok) return []
      return (await res.json()) as ShopOrderSummary[]
    } catch {
      return []
    }
  }, [])

  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم، مستقل از پیام
  // پیگیریِ چت؛ بک‌اند اگر خریدار آن محصول را نخریده بود پیام خطای مشخص برمی‌گرداند (message)
  const submitComment = useCallback(
    async (
      productId: string | undefined,
      text: string | undefined,
      rating?: number,
      media?: { imageKey?: string; videoKey?: string; audioKey?: string },
    ): Promise<{ ok: boolean; message: string }> => {
      const session = sessionRef.current
      if (!session) return { ok: false, message: fa.common.error }
      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Session-Token': session.sessionToken },
          body: JSON.stringify({ productId, text, rating, ...media }),
        })
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        if (!res.ok) return { ok: false, message: data?.message ?? fa.common.error }
        return { ok: true, message: fa.shop.reviewSuccess }
      } catch {
        return { ok: false, message: fa.common.error }
      }
    },
    [],
  )

  // docs/PRD-seller-demo-sandbox-hub-promo-and-release-prep.md بخش ۱۴.۲ — آپلود رسانه‌ی نظر،
  // قبل از submitComment بالا؛ عیناً الگوی FormData در sendImageMessage بالا
  const uploadCommentMedia = useCallback(
    async (file: File): Promise<{ key: string; kind: 'image' | 'video' | 'audio' } | null> => {
      const session = sessionRef.current
      if (!session) return null
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${env.VITE_API_URL}/v2/chat/${session.conversationId}/comment-media`, {
          method: 'POST',
          headers: { 'X-Session-Token': session.sessionToken },
          body: form,
        })
        if (!res.ok) return null
        return (await res.json()) as { key: string; kind: 'image' | 'video' | 'audio' }
      } catch {
        return null
      }
    },
    [],
  )

  return {
    storeId,
    storeName,
    storeLogoKey,
    isDemo,
    notFound,
    suspended,
    conversationId: sessionRef.current?.conversationId,
    messages,
    olderMessages,
    hasMoreEvents,
    serverVerified,
    loadOlderMessages,
    state,
    awaitingReview,
    awaitingSatisfaction,
    retryMessage,
    loading,
    sending,
    streamNote,
    error,
    history,
    viewingHistory,
    savedProductIds,
    savedProducts,
    toggleSaveProduct,
    responseStrategy,
    setResponseStrategy,
    sendMessage,
    sendAction,
    pendingCartOps,
    cartAdd,
    cartSetQty,
    cartRemove,
    cartListenerRef,
    logUiEvent,
    getOrderTrackPath,
    uploadReceipt,
    submitManualReceipt,
    submitRefundDestination,
    sendImageMessage,
    sendVideoMessage,
    sendVoiceMessage,
    markVoiceHeard,
    subscribeStockAlert,
    sendBuyerOtp,
    verifyBuyerOtp,
    listMyOrders,
    submitComment,
    uploadCommentMedia,
    startNewChat,
    viewHistoryEntry,
    returnToCurrentChat,
  }
}
