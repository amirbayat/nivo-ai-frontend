import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { getShopSession, setShopSession, type ShopSession } from '@/lib/shopSession'
import type {
  ShopAction,
  ShopConversationEvent,
  ShopGetConversationResponse,
  ShopMessage,
  ShopSendMessageResponse,
  ShopStartChatResponse,
  ShopVoiceStatusResponse,
} from '@/types/api'

// این صفحه مشتری ناشناس یک فروشگاه است، نه یک User لاگین‌شده — عمداً از `api` (axios)
// مشترک استفاده نمی‌کند چون آن همیشه هدر Authorization را از localStorage تزریق می‌کند
// (src/lib/api.ts)؛ اینجا هویت فقط X-Session-Token است.
const KICKOFF_MESSAGE = 'سلام، محصولاتتون رو نشون بدید'

function eventsToMessages(events: ShopConversationEvent[]): ShopMessage[] {
  const messages: ShopMessage[] = []
  events.forEach((e, i) => {
    if (e.type === 'CUSTOMER_MESSAGE' && e.payload.text) {
      messages.push({ id: `c-${i}`, role: 'customer', text: e.payload.text })
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
  const [notFound, setNotFound] = useState(false)
  const [messages, setMessages] = useState<ShopMessage[]>([])
  const [state, setState] = useState<string>('GREETING')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<ShopSession | null>(null)

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
    async (text: string, options?: { silent?: boolean }) => {
      const session = sessionRef.current
      if (!session || sending) return
      if (!options?.silent) appendCustomerMessage(text)
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
      if (!session || sending) return
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
    setStoreName(data.storeName)
    setMessages(eventsToMessages(data.events))
  }, [])

  useEffect(() => {
    if (state !== 'HANDOFF_HUMAN') return
    const interval = setInterval(() => {
      void fetchConversation()
    }, 4000)
    return () => clearInterval(interval)
  }, [state, fetchConversation])

  const uploadReceipt = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session || sending) return
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

  // ضبط صدا از وب (بخش ۲.۲) — blob از MediaRecorder، فرمت هرچی مرورگر بدهد (معمولاً webm)،
  // بک‌اند خودش با extractAudio نرمال‌سازی می‌کند
  const sendVoiceMessage = useCallback(
    async (blob: Blob) => {
      const session = sessionRef.current
      if (!session || sending) return
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
        if (data.transcript) appendCustomerMessage(data.transcript)
        applyReply(data)
      } catch {
        setError(fa.common.error)
      } finally {
        setSending(false)
      }
    },
    [sending, appendCustomerMessage, applyReply],
  )

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setLoading(true)
      const existing = getShopSession(slug)
      try {
        if (existing) {
          sessionRef.current = existing
          await fetchConversation()
          if (cancelled) return
          setLoading(false)
          return
        }

        const res = await fetch(`${env.VITE_API_URL}/v2/stores/${slug}/chat/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productId ? { productId } : {}),
        })
        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true)
            setLoading(false)
          }
          return
        }
        if (!res.ok) throw new Error('request failed')
        const data = (await res.json()) as ShopStartChatResponse
        if (cancelled) return
        const session: ShopSession = { conversationId: data.conversationId, sessionToken: data.sessionToken }
        setShopSession(slug, session)
        sessionRef.current = session
        setStoreName(data.storeName)
        setLoading(false)
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
          void sendMessage(KICKOFF_MESSAGE, { silent: true })
        }
      } catch {
        if (!cancelled) {
          setError(fa.common.error)
          setLoading(false)
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  return {
    storeName,
    notFound,
    conversationId: sessionRef.current?.conversationId,
    messages,
    state,
    loading,
    sending,
    error,
    sendMessage,
    sendAction,
    uploadReceipt,
    sendVoiceMessage,
  }
}
