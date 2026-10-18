import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { useSellerConversations } from '@/queries/seller.queries'
import type { SellerConversationListItem } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-seller-conversations-inbox.md §۳.۲ — صندوق گفتگوها
const t = fa.seller.panel.chats
type Filter = 'attention' | 'all' | 'ordered'

const toFa = (n: number | string) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

export function relativeFa(from: string): string {
  const mins = Math.round((Date.now() - new Date(from).getTime()) / 60000)
  if (mins < 1) return t.justNow
  if (mins < 60) return t.minutesAgo(toFa(mins))
  const hours = Math.round(mins / 60)
  if (hours < 24) return t.hoursAgo(toFa(hours))
  return t.daysAgo(toFa(Math.round(hours / 24)))
}

function stateLabel(state: string): string {
  switch (state) {
    case 'CART_REVIEW':
    case 'ADDRESS_COLLECTION':
    case 'PAYMENT_METHOD_SELECTION':
      return t.stateCart
    case 'AWAITING_PAYMENT':
      return t.stateAwaitingPayment
    case 'RECEIPT_SUBMITTED':
    case 'AWAITING_SELLER_APPROVAL':
      return t.stateReceipt
    case 'COMPLETED':
      return t.stateDone
    default:
      return t.stateBrowsing
  }
}

const CHANNEL_LABEL = { WEB: t.channelWeb, TELEGRAM: t.channelTelegram, INSTAGRAM: t.channelInstagram } as const

function Chip({ tone, children }: { tone: 'slate' | 'sky' | 'amber'; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'slate' && 'bg-slate-700/60 text-slate-300 light:bg-slate-100 light:text-slate-600',
        tone === 'sky' && 'bg-sky-500/20 text-sky-300 light:bg-sky-100 light:text-sky-700',
        tone === 'amber' && 'bg-amber-500/20 text-amber-300 light:bg-amber-100 light:text-amber-700',
      )}
    >
      {children}
    </span>
  )
}

function ConversationRow({ c, onOpen }: { c: SellerConversationListItem; onOpen: () => void }) {
  const unread = c.unreadCount > 0
  const prefix =
    c.lastMessagePreview?.from === 'BOT'
      ? `${t.previewBot}: `
      : c.lastMessagePreview?.from === 'SELLER'
        ? `${t.previewSeller}: `
        : ''
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-white px-4 py-3 text-start hover:bg-slate-800/60 light:hover:bg-slate-50"
    >
      <span className={clsx('mt-1.5 size-2.5 shrink-0 rounded-full', unread ? 'bg-emerald-400' : 'bg-transparent')} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className={clsx('truncate text-sm text-slate-100 light:text-slate-900', unread ? 'font-bold' : 'font-medium')} dir="auto">
            {c.customerLabel}
          </p>
          <span className="ms-auto shrink-0 text-[11px] text-slate-500">{relativeFa(c.lastMessageAt)}</span>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
              {toFa(c.unreadCount > 9 ? '9+' : c.unreadCount)}
            </span>
          )}
        </div>
        {c.lastMessagePreview && (
          <p className="truncate text-xs text-slate-400 light:text-slate-600" dir="auto">
            {prefix}
            {c.lastMessagePreview.text}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {c.control === 'SELLER' ? (
            <Chip tone="sky">{t.controlSeller}</Chip>
          ) : c.control === 'BOT_HANDOFF' ? (
            <Chip tone="amber">{t.controlHandoff}</Chip>
          ) : (
            <Chip tone="slate">{t.controlBot}</Chip>
          )}
          <Chip tone="slate">{CHANNEL_LABEL[c.channel]}</Chip>
          <Chip tone="slate">{stateLabel(c.currentState)}</Chip>
        </div>
      </div>
    </button>
  )
}

export function SellerChatsPage() {
  const { storeId } = useSellerStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('attention')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(id)
  }, [input])
  const query = useSellerConversations(storeId, filter, q)
  const items = query.data?.items ?? []

  const filters: { key: Filter; label: string }[] = [
    { key: 'attention', label: t.filterAttention },
    { key: 'all', label: t.filterAll },
    { key: 'ordered', label: t.filterOrdered },
  ]

  return (
    <div className="space-y-4 px-4 py-5">
      <h1 className="text-lg font-bold text-slate-100 light:text-slate-900">{t.title}</h1>
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold',
              filter === f.key
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 light:bg-slate-100 light:text-slate-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t.searchPlaceholder}
        dir="auto"
        inputMode="search"
        className="w-full rounded-xl border border-slate-600/60 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 outline-none placeholder:text-slate-500"
      />
      <div className="space-y-2">
        {items.map(c => (
          <ConversationRow key={c.id} c={c} onOpen={() => navigate(`/seller/panel/chats/${c.id}`)} />
        ))}
        {!query.isLoading && items.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">{t.empty}</p>
        )}
        {query.hasNextPage && (
          <button
            type="button"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="mx-auto block rounded-full border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-secondary)] disabled:opacity-40"
          >
            {t.loadMore}
          </button>
        )}
      </div>
    </div>
  )
}
