import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopUiBlockView } from '@/components/shop/ShopUiBlocks'
import { fa } from '@/locales/fa'

// HANDOFF_HUMAN عمداً اینجا نیست — بعد از escalate، مشتری باید بتواند مستقیم با فروشنده
// چت کند (پنل فروشنده، تب «نیاز به توجه»)؛ فقط COMPLETED/REJECTED واقعاً پایانی‌اند
const TERMINAL_STATES = ['COMPLETED', 'REJECTED']

export function ShopChatPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { storeName, notFound, messages, state, loading, sending, error, sendMessage, uploadReceipt } =
    useShopChat(slug)
  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4" dir="rtl">
        <div className="text-center">
          <h1 className="mb-1.5 text-xl font-bold text-slate-100">{fa.shop.notFoundHeading}</h1>
          <p className="text-sm text-slate-500">{fa.shop.notFoundBody}</p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-slate-950" />

  return (
    <div className="flex min-h-screen flex-col bg-slate-950" dir="rtl">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-semibold text-slate-200">{storeName}</p>
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
                    ? 'rounded-tr-sm bg-slate-700/70 text-slate-200'
                    : 'rounded-tl-sm border border-emerald-500/20 bg-emerald-500/20 text-emerald-100'
                }`}
              >
                {m.text}
              </div>
              {m.uiBlock && (
                <ShopUiBlockView
                  block={m.uiBlock}
                  disabled={disabled}
                  onAddToCart={(name) => void sendMessage(`${name} رو به سبد اضافه کن`)}
                  onConfirmCart={() => void sendMessage('تایید')}
                  onUploadReceipt={(file) => void uploadReceipt(file)}
                />
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm bg-slate-700/70 px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </div>

      {(TERMINAL_STATES.includes(state) || state === 'HANDOFF_HUMAN') && (
        <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-2 text-center text-xs text-slate-500">
          {fa.shop.conversationEnded}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-slate-800 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={fa.shop.inputPlaceholder}
          dir="auto"
          className="flex-1 resize-none rounded-xl border border-slate-600/60 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 disabled:opacity-50"
        />
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
