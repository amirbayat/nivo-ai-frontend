import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { FirstVisitTooltip } from '@/components/seller/FirstVisitTooltip'
import {
  useNeededAttention,
  useProducts,
  useSellerConversation,
  useSendSellerMessage,
  useUnmuteConversation,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-growth-tools-and-marketplace-trust.md بخش ۲.۱ — بدون آستانه‌ی قابل‌تنظیم،
// همان قاعده‌ی ثابت هرجا که بج موجودی لازم است
const LOW_STOCK_THRESHOLD = 3

function BackChevron() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// کلید شامل پیشوند «conversationId/» است — باید encode شود (عیناً chatImageUrl در useShopChat.ts)
function chatImageUrl(conversationId: string, key: string): string {
  return `${env.VITE_API_URL}/v2/chat/${conversationId}/image/${encodeURIComponent(key)}`
}

function ConversationChat({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { storeId } = useSellerStore()
  const navigate = useNavigate()
  const { data } = useSellerConversation(storeId, conversationId)
  const sendMessage = useSendSellerMessage(storeId, conversationId)
  const unmute = useUnmuteConversation(storeId)
  const [input, setInput] = useState('')

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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
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
        <button
          onClick={() => unmute.mutate(conversationId, { onSuccess: onBack })}
          disabled={unmute.isPending}
          className="rounded-lg bg-slate-800 light:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-200 light:text-slate-800 hover:bg-slate-700 light:hover:bg-slate-200 disabled:opacity-40"
        >
          {fa.seller.panel.attention.backToBot}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {data?.events
          .filter(e => e.type === 'CUSTOMER_MESSAGE' || e.type === 'AGENT_REPLY' || e.type === 'SELLER_MESSAGE')
          .map((e, i) => (
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
          ))}
      </div>

      <div className="flex items-end gap-2 border-t border-slate-800 light:border-slate-200 p-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={fa.seller.panel.attention.inputPlaceholder}
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

export function SellerAttentionPage() {
  const navigate = useNavigate()
  const { storeId } = useSellerStore()
  const attention = useNeededAttention(storeId)
  const products = useProducts(storeId)
  const [openId, setOpenId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // docs/PRD-seller-panel-order-chat-linking.md بخش ۲.۱ — لینک از SellerOrdersPage به اینجا
  useEffect(() => {
    const conversationId = searchParams.get('conversationId')
    if (conversationId) {
      setOpenId(conversationId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (openId) return <ConversationChat conversationId={openId} onBack={() => setOpenId(null)} />

  const lowStockProducts = (products.data ?? [])
    .filter(p => p.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.nav.attention}</h1>

      <FirstVisitTooltip id="attention" text={fa.seller.panel.helpCenter.tooltips.attention} />

      {!!lowStockProducts.length && (
        <div className="mb-5">
          <p className="mb-2.5 text-xs font-semibold text-slate-500">{fa.seller.panel.attention.lowStockSectionTitle}</p>
          <div className="flex flex-col gap-2.5">
            {lowStockProducts.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/seller/panel/products/${p.id}`)}
                className="flex items-center justify-between rounded-2xl border border-amber-500/30 light:border-amber-300 bg-amber-500/10 light:bg-amber-50 px-4 py-3.5 text-start hover:border-amber-500/50 light:hover:border-amber-400"
              >
                <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{p.name}</span>
                <span className={`text-xs font-bold ${p.stock === 0 ? 'text-red-400 light:text-red-600' : 'text-amber-400 light:text-amber-700'}`}>
                  {p.stock === 0 ? fa.seller.panel.products.outOfStockBadge : fa.seller.panel.products.lowStockBadge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {attention.data?.length === 0 && !lowStockProducts.length && (
        <p className="py-10 text-center text-sm text-slate-500">{fa.seller.panel.attention.empty}</p>
      )}

      <div className="flex flex-col gap-2.5">
        {attention.data?.map(c => (
          <button
            key={c.id}
            onClick={() => setOpenId(c.id)}
            className="flex items-center justify-between rounded-2xl border border-amber-500/30 light:border-amber-300 bg-amber-500/10 light:bg-amber-50 px-4 py-3.5 text-start hover:border-amber-500/50 light:hover:border-amber-400"
          >
            <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{c.customerLabel}</span>
            <span className="text-xs text-amber-400 light:text-amber-700">{new Date(c.updatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
