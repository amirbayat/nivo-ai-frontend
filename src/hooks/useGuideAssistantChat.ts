import { useCallback, useRef, useState } from 'react'
import { env } from '@/env'
import { fa } from '@/locales/fa'

export type GuideChatMessage = { role: 'user' | 'assistant'; content: string }

const MAX_USER_MESSAGES = 12

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// docs/PRD-seller-guide-assistant-modal.md بخش ۳.۳ — چت بدون پرسیست (۲.۳)؛ هر درخواست کل
// تاریخچه + systemPrompt را حمل می‌کند، دقیقاً مثل الگوی SSE موجود useChat.ts (chat/:id/stream)
// فقط روی یک endpoint جدا و بدون هیچ ذخیره‌سازی سمت سرور
export function useGuideAssistantChat(storeId: string) {
  const [messages, setMessages] = useState<GuideChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modelVariantRef = useRef<string | undefined>(undefined)

  const userMessageCount = messages.filter(m => m.role === 'user').length
  const atCap = userMessageCount >= MAX_USER_MESSAGES

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
    setSending(false)
    modelVariantRef.current = undefined
  }, [])

  const sendMessage = useCallback(
    async (systemPrompt: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending || atCap) return
      setError(null)
      setSending(true)
      const nextMessages: GuideChatMessage[] = [...messages, { role: 'user', content: trimmed }]
      setMessages([...nextMessages, { role: 'assistant', content: '' }])

      try {
        const res = await fetch(`${env.VITE_API_URL}/v2/stores/${storeId}/guide-assistant/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            systemPrompt,
            messages: nextMessages,
            modelVariant: modelVariantRef.current,
          }),
        })

        if (!res.ok) {
          let message: string = fa.seller.panel.guideAssistant.sendError
          try {
            const data = (await res.json()) as { message?: string }
            if (typeof data?.message === 'string') message = data.message
          } catch {
            // بدنه‌ی خطا JSON نبود — پیام پیش‌فرض باقی می‌ماند
          }
          throw new Error(message)
        }
        if (!res.body) throw new Error(fa.seller.panel.guideAssistant.sendError)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ''
        let streamError: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue
            try {
              const parsed = JSON.parse(raw) as {
                chunk?: string
                error?: string
                info?: string
                variant?: string
              }
              if (parsed.info === 'model' && parsed.variant) {
                modelVariantRef.current = parsed.variant
              }
              if (parsed.chunk) {
                assistantText += parsed.chunk
                const snapshot = assistantText
                setMessages(prev => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { role: 'assistant', content: snapshot }
                  return copy
                })
              }
              if (parsed.error) streamError = parsed.error
            } catch {
              // یک خط ناقص SSE — نادیده گرفته می‌شود
            }
          }
        }

        if (streamError) {
          setError(streamError)
          if (!assistantText) setMessages(prev => prev.slice(0, -1))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : fa.seller.panel.guideAssistant.sendError)
        // فقط حباب خالی پاسخ دستیار حذف می‌شود — پیام کاربر می‌ماند (هم برای رصد مکالمه، هم
        // چون هنوز در «پایان و تحلیل» نهایی لازم است حتی اگر این دور خاص با خطا مواجه شد)
        setMessages(prev => prev.slice(0, -1))
      } finally {
        setSending(false)
      }
    },
    [messages, sending, atCap, storeId],
  )

  return { messages, sending, error, userMessageCount, atCap, sendMessage, reset }
}

// docs/PRD-seller-guide-assistant-modal.md بخش ۳.۳/۳.۴ — پخش با کلیک دستی روی یک حباب پاسخ،
// نتیجه در خودِ کامپوننت cache می‌شود تا کلیک دوباره دوباره تولید نکند
export async function synthesizeGuideVoice(storeId: string, text: string): Promise<Blob> {
  const res = await fetch(`${env.VITE_API_URL}/v2/stores/${storeId}/guide-assistant/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(fa.seller.panel.guideAssistant.voiceError)
  return res.blob()
}
