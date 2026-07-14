import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/env'
import { useChatStore } from '@/store/chat.store'
import { keys } from '@/queries/keys'
import type { ConversationDetail, ConversationsPage, Message } from '@/types/api'

export function useChat(conversationId: string) {
  const qc = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)
  const {
    appendStreamingContent, setIsStreaming, setIsReasoning, appendReasoningText,
    resetStreaming, setChatError, setMessageStage, selectedModel,
  } = useChatStore()

  const sendMessage = useCallback(
    async (content: string, images?: string[], model?: string) => {
      const effectiveModel = model ?? selectedModel ?? undefined
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      resetStreaming()
      setChatError(null)
      setIsStreaming(true)

      // Optimistic: add user message to cache immediately so it shows before the stream starts
      qc.setQueryData<ConversationDetail>(keys.conv.detail(conversationId), old => {
        if (!old) return old
        const optimistic: Message = {
          id: `opt-${Date.now()}`,
          conversationId,
          role: 'USER',
          content,
          images: images ?? null,
          tokensInput: 0,
          tokensOutput: 0,
          createdAt: new Date().toISOString(),
        }
        return { ...old, messages: [...old.messages, optimistic] }
      })

      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(
          `${env.VITE_API_URL}/chat/${conversationId}/stream`,
          {
            method: 'POST',
            signal: ctrl.signal,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              content,
              ...(effectiveModel ? { model: effectiveModel } : {}),
              ...(images?.length ? { images } : {}),
            }),
          },
        )

        if (!res.ok) {
          let msg = `خطا (${res.status})`
          let stage: string | undefined
          try {
            const body = await res.json() as { message?: string; stage?: string }
            if (body.message) msg = body.message
            stage = body.stage
          } catch { /* ignore */ }
          // خطاهای «محدودیت» (سقف روزانه/پنجره‌ی لغزان/بودجه‌ی توکن/سهمیه‌ی توکن) توسط بنر پایدار
          // بالای اینپوت نمایش داده می‌شوند — اینجا دوباره نشونشون ندیم که یک پیام تکراری وسط چت
          // ظاهر نشه. بنر معمولاً هر ۳۰ ثانیه پول می‌شود؛ همین‌جا هم فوری invalidate می‌کنیم که
          // بلافاصله (نه با تا ۳۰ ثانیه تاخیر) نمایش داده شود.
          const isLimitStage =
            stage === 'blocked' ||
            stage === 'rolling_window_blocked' ||
            stage === 'budget_exceeded' ||
            stage === 'budget_session_limit' ||
            stage === 'quota_exceeded'
          if (isLimitStage) {
            void qc.invalidateQueries({ queryKey: keys.usage.messageQuota() })
          } else {
            setChatError(msg)
          }
          setIsStreaming(false)
          return
        }
        if (!res.body) throw new Error('no body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          for (const line of text.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') break
            try {
              const parsed = JSON.parse(raw) as {
                chunk?: string
                error?: string
                code?: string
                info?: string
                stage?: 'normal' | 'throttled'
                remainingNormal?: number
                remainingThrottled?: number
                title?: string
                reasoning?: boolean
                reasoningChunk?: string
              }
              if (parsed.chunk) appendStreamingContent(parsed.chunk)
              if (parsed.error) setChatError(parsed.error, parsed.code ?? null)
              if (parsed.info === 'stage' && parsed.stage) {
                setMessageStage(
                  parsed.stage,
                  parsed.remainingNormal ?? null,
                  parsed.remainingThrottled ?? null,
                )
              }
              // مدل‌های reasoning (خانواده‌ی gpt-5) قبل از متن نهایی یک فاز فکرکردن نامرئی دارند —
              // این نشانگر همون فاز رو نشون می‌ده تا کاربر روی صفحه‌ی خالی گیج نماند
              if (parsed.info === 'reasoning' && typeof parsed.reasoning === 'boolean') {
                setIsReasoning(parsed.reasoning)
              }
              // متن واقعی استدلال (اگر مدل/Liara آن را برگرداند) — کم‌رنگ بالای پاسخ نشان داده می‌شود
              if (parsed.info === 'reasoning-chunk' && parsed.reasoningChunk) {
                appendReasoningText(parsed.reasoningChunk)
              }
              // عنوان تازه‌ی مکالمه (فقط اولین پیام) — مستقیم توی کش می‌نشونیم تا همون لحظه توی
              // سایدبار و هدر دیده شود، بدون نیاز به refetch/reload
              if (parsed.info === 'title' && parsed.title) {
                const newTitle = parsed.title
                qc.setQueryData<ConversationDetail>(keys.conv.detail(conversationId), old =>
                  old ? { ...old, title: newTitle } : old,
                )
                qc.setQueryData<{ pages: ConversationsPage[]; pageParams: unknown[] }>(
                  keys.conv.list(),
                  old =>
                    old
                      ? {
                          ...old,
                          pages: old.pages.map(page => ({
                            ...page,
                            items: page.items.map(c =>
                              c.id === conversationId ? { ...c, title: newTitle } : c,
                            ),
                          })),
                        }
                      : old,
                )
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[useChat]', err)
          setChatError('خطا در ارتباط با سرور. دوباره تلاش کنید.')
        }
      } finally {
        setIsStreaming(false)
        void qc.invalidateQueries({ queryKey: keys.conv.detail(conversationId) })
        void qc.invalidateQueries({ queryKey: keys.conv.list() })
        void qc.invalidateQueries({ queryKey: keys.usage.today() })
        // بنر پایدار محدودیت (بالای اینپوت) بلافاصله بعد از هر تلاش ارسال — موفق یا ناموفق —
        // با آخرین وضعیت واقعی به‌روز شود، نه اینکه تا poll بعدی (تا ۳۰ ثانیه) منتظر بماند.
        void qc.invalidateQueries({ queryKey: keys.usage.messageQuota() })
        // کارت هدیه هم همین‌جا invalidate می‌شود — trial ممکنه دقیقاً همین پیام به پایان رسیده
        // باشه و باید بدون reload صفحه، فوراً از حالت trial به grace عوض شه (staleTime قبلاً ۵ دقیقه بود)
        void qc.invalidateQueries({ queryKey: keys.growth.giftStatus() })
      }
    },
    [conversationId, qc, selectedModel, appendStreamingContent, setIsStreaming, resetStreaming],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
    resetStreaming()
  }, [resetStreaming])

  return { sendMessage, abort }
}
