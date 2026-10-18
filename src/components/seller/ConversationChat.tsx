import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import {
  useMarkConversationRead,
  useMuteConversation,
  useSellerConversation,
  useSendSellerMessage,
  useUnmuteConversation,
} from '@/queries/seller.queries'
import type { SellerConversationDetail, ShopConversationEvent } from '@/types/api'
import { useSellerStore } from '@/pages/seller/panel/SellerPanelLayout'

// SP-6 — از SellerAttentionPage بیرون کشیده شد؛ حالا مسیر جدا (/seller/panel/chats/:conversationId)
function BackChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// docs/PRD-seller-conversations-inbox.md §۳.۳ — خط سیستمی وسط‌چین؛ null = نمایش داده نمی‌شود
function systemLineText(e: ShopConversationEvent): string | null {
  const c = fa.seller.panel.chats
  if (e.type === 'SYSTEM') {
    switch (e.payload.kind) {
      case 'SELLER_TAKEOVER': return c.systemTakeover
      case 'BACK_TO_BOT': return c.systemBackToBot
      case 'AUTO_BACK_TO_BOT': return c.systemAutoBackToBot
      case 'AI_REPLY_DROPPED_TAKEOVER': return c.systemDropped
      default: return null
    }
  }
  if (e.type === 'STATE_TRANSITION' && e.payload.toState === 'HANDOFF_HUMAN') return c.systemHandoff
  return null
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

// کلید شامل پیشوند «conversationId/» است — باید encode شود (عیناً chatImageUrl در useShopChat.ts)
function chatImageUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/image/${encodeURIComponent(key)}`
}

export function ConversationChat({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { storeId } = useSellerStore()
  const navigate = useNavigate()
  const { data } = useSellerConversation(storeId, conversationId)
  const sendMessage = useSendSellerMessage(storeId, conversationId)
  const unmute = useUnmuteConversation(storeId)
  const mute = useMuteConversation(storeId)
  const markRead = useMarkConversationRead(storeId)
  const chats = fa.seller.panel.chats
  const [input, setInput] = useState('')
  const [older, setOlder] = useState<ShopConversationEvent[]>([])
  const [olderHasMore, setOlderHasMore] = useState(false)
  const [loadedOlder, setLoadedOlder] = useState(false)

  // §۴.۳ — با باز شدن صفحه (و آمدن پیام تازه‌ی مشتری وقتی صفحه بازه) گفتگو «خوانده‌شده» می‌شود
  const lastEventAt = data?.events[data.events.length - 1]?.createdAt
  useEffect(() => {
    if (data) markRead.mutate(conversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, !!data, lastEventAt])

  useEffect(() => {
    setOlder([])
    setLoadedOlder(false)
  }, [conversationId])

  async function loadOlder() {
    const first = older[0] ?? data?.events[0]
    if (!first) return
    const res = await api.get<SellerConversationDetail>(
      `/v2/stores/${storeId}/conversations/${conversationId}`,
      { params: { before: first.createdAt } },
    )
    setOlder((prev) => [...res.data.events, ...prev])
    setOlderHasMore(!!res.data.hasMoreEvents)
    setLoadedOlder(true)
  }

  function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    sendMessage.mutate(text)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[640px] flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 light:border-slate-200 px-4 py-3">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 light:hover:text-slate-800"><BackChevron /></button>
        <p className="flex-1 text-sm font-semibold text-slate-200 light:text-slate-900">{data?.customerLabel}</p>
        {data?.orderId && (
          <button
            onClick={() => navigate(`/seller/panel/orders?orderId=${data.orderId}`)}
            className="rounded-lg bg-slate-800 light:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-200 light:text-slate-800 hover:bg-slate-700 light:hover:bg-slate-200"
          >
            {fa.seller.panel.attention.viewOrder}
          </button>
        )}
      </div>

      {data && (
        <div className="flex items-center gap-3 border-b border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 px-4 py-2">
          {data.control === 'BOT' || (!data.control && !data.isMutedForHuman) ? (
            <>
              <p className="flex-1 text-xs text-slate-300 light:text-slate-700">{chats.botInControl}</p>
              <button
                onClick={() => mute.mutate(conversationId)}
                disabled={mute.isPending}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
              >
                {chats.takeOver}
              </button>
            </>
          ) : (
            <>
              <p className="flex-1 text-xs text-slate-300 light:text-slate-700">
                {data.control === 'BOT_HANDOFF' ? chats.controlHandoff : chats.sellerInControl}
              </p>
              {data.control === 'BOT_HANDOFF' && (
                <button
                  onClick={() => mute.mutate(conversationId)}
                  disabled={mute.isPending}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
                >
                  {chats.takeOver}
                </button>
              )}
              <button
                onClick={() => unmute.mutate(conversationId)}
                disabled={unmute.isPending}
                className="rounded-lg bg-slate-800 light:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-200 light:text-slate-800 hover:bg-slate-700 light:hover:bg-slate-200 disabled:opacity-40"
              >
                {fa.seller.panel.attention.backToBot}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {(loadedOlder ? olderHasMore : data?.hasMoreEvents) && (
          <button
            type="button"
            onClick={() => void loadOlder()}
            className="mx-auto block rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            {fa.shop.olderMessages}
          </button>
        )}
        {[...older, ...(data?.events ?? [])]
          .filter(
            e =>
              e.type === 'CUSTOMER_MESSAGE' ||
              e.type === 'AGENT_REPLY' ||
              e.type === 'SELLER_MESSAGE' ||
              systemLineText(e) !== null,
          )
          .map((e, i) => {
            const system = systemLineText(e)
            if (system) {
              return (
                <p key={i} className="text-center text-[11px] text-slate-500">
                  — {system} · {formatClock(e.createdAt)} —
                </p>
              )
            }
            return (
            <div key={i} className={`flex ${e.type === 'CUSTOMER_MESSAGE' ? 'justify-start' : 'justify-end'}`}>
              <div className="flex max-w-[85%] flex-col gap-1">
                {e.payload.imageKey && e.payload.reattachedToOrder && (
                  <p className="text-xs font-semibold text-amber-400 light:text-amber-700">
                    {fa.seller.panel.attention.newReceiptNotice}
                  </p>
                )}
                {e.payload.imageKey && (
                  <a href={chatImageUrl(conversationId, e.payload.imageKey)} target="_blank" rel="noreferrer">
                    <img
                      src={chatImageUrl(conversationId, e.payload.imageKey)}
                      alt={fa.shop.customerImageAlt}
                      className="max-h-72 rounded-2xl rounded-tl-sm border border-emerald-500/20 object-cover"
                    />
                  </a>
                )}
                {e.type !== 'CUSTOMER_MESSAGE' && (e.payload.text || e.payload.uiBlock) && (
                  <span className="text-[10px] font-semibold text-slate-500 text-end">
                    {e.type === 'SELLER_MESSAGE' ? chats.sellerLabel : chats.botLabel}
                  </span>
                )}
                {e.payload.text && (
                  <div
                    dir="auto"
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-start ${
                      e.type === 'CUSTOMER_MESSAGE'
                        ? 'rounded-tl-sm border border-emerald-500/20 bg-emerald-500/20 text-emerald-100 light:text-emerald-900'
                        : e.type === 'SELLER_MESSAGE'
                          ? 'rounded-tr-sm bg-sky-600/70 light:bg-sky-100 text-sky-50 light:text-sky-900'
                          : 'rounded-tr-sm bg-slate-700/70 light:bg-slate-100 text-slate-200 light:text-slate-800'
                    }`}
                  >
                    {e.payload.text}
                  </div>
                )}
              </div>
            </div>
            )
          })}
      </div>

      <div className="flex items-end gap-2 border-t border-slate-800 light:border-slate-200 p-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={data?.control === 'BOT' ? chats.takeOverPlaceholder : fa.seller.panel.attention.inputPlaceholder}
          dir="auto"
          className="flex-1 resize-none rounded-xl border border-slate-600/60 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 outline-none placeholder:text-slate-500"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sendMessage.isPending}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-30"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 -scale-x-100"><path d="M3 10l14-7-4 7 4 7-14-7z" /></svg>
        </button>
      </div>
    </div>
  )
}

