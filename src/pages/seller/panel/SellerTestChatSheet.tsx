import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { fa } from '@/locales/fa'
import { newClientMessageId } from '@/lib/clientMessageId'

export function SellerTestChatSheet({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [session, setSession] = useState<{ conversationId: string; sessionToken: string } | null>(null)
  const [lines, setLines] = useState<{ role: 'seller' | 'bot'; text: string }[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .post<{ conversationId: string; sessionToken: string }>(`/v2/stores/${storeId}/test-chat`)
      .then((res) => {
        if (!cancelled) setSession({ conversationId: res.data.conversationId, sessionToken: res.data.sessionToken })
      })
      .catch(() => {
        if (!cancelled) setError(fa.common.error)
      })
    return () => {
      cancelled = true
    }
  }, [storeId])

  async function send() {
    const message = text.trim()
    if (!session || !message || busy) return
    setText('')
    setBusy(true)
    setError(null)
    setLines((prev) => [...prev, { role: 'seller', text: message }])
    try {
      const res = await api.post<{ reply?: string }>(
        `/v2/chat/${session.conversationId}/messages`,
        { message, clientMessageId: newClientMessageId() },
        { headers: { 'X-Session-Token': session.sessionToken } },
      )
      const reply = res.data.reply?.trim()
      if (reply) setLines((prev) => [...prev, { role: 'bot', text: reply }])
    } catch {
      setError(fa.common.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-slate-900 p-4 light:bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.home.testBotTitle}</h2>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">
            {fa.common.close}
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">{fa.seller.panel.home.testBotHint}</p>
        <div className="mb-3 flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto">
          {lines.map((line, index) => (
            <p
              key={index}
              dir="auto"
              className={
                line.role === 'seller'
                  ? 'self-start rounded-2xl bg-emerald-500/15 px-3 py-2 text-sm text-slate-100 light:text-slate-900'
                  : 'self-end rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-200 light:bg-slate-100 light:text-slate-800'
              }
            >
              {line.text}
            </p>
          ))}
          {!session && !error && <p className="text-xs text-slate-500">{fa.common.loading}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={fa.seller.panel.home.testBotPlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 light:border-slate-300 light:bg-white light:text-slate-900"
          />
          <button
            type="submit"
            disabled={!session || busy || !text.trim()}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {fa.seller.panel.home.testBotSend}
          </button>
        </form>
      </div>
    </div>
  )
}
