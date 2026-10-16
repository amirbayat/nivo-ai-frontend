import { useEffect, useRef, useState } from 'react'
import { ShopUiBlockView, MediaLightbox, type MediaItem } from '@/components/shop/ShopUiBlocks'
import { ChatProductCards } from '@/components/shop/ChatProductCards'
import { ThinkingIndicator } from '@/components/shop/ThinkingIndicator'
import { VoiceIndicator } from '@/components/shop/VoiceBubble'
import { avatarInitials, storeLogoUrl } from '@/components/shop/shopUtils'
import { fa } from '@/locales/fa'
import type { ShopMessage } from '@/types/api'

type BlockProps = Parameters<typeof ShopUiBlockView>[0]

interface ChatThreadProps {
  // olderMessages + messages
  thread: ShopMessage[]
  // فقط پیام‌های زنده (برای «آخرین پیام» و ThinkingIndicator)
  messages: ShopMessage[]
  conversationId: string | null | undefined
  storeId: string | null | undefined
  storeName: string | null | undefined
  storeLogoKey: string | null | undefined
  hasMoreEvents: boolean
  viewingHistory: boolean
  sending: boolean
  streamNote: string | null | undefined
  error: string | null | undefined
  composerDisabled: boolean
  actionDisabled: boolean
  refundFormDisabled: boolean
  sellerIsReplying: boolean
  // خط سیستمی «پیامت به … رسید» وقتی گفتگو دست فروشنده است (§6.8)
  handoffLine: string | null
  // ارتفاع ویوپورت — با تغییرش (کیبورد) دوباره به آخر اسکرول می‌کنیم
  viewportHeight: number | null
  cartProductIds: Set<string>
  // رکورد سبد فقط وقتی سبد قابل‌ویرایش است و گفتگوی زنده است کلیک‌پذیر می‌شود
  cartTappable: boolean
  onOpenCart: () => void
  onOpenProduct: (productId: string) => void
  onSeeAllProducts: () => void
  onLoadOlder: () => void
  onRetry: (messageId: string) => void
  onMarkVoiceHeard: (key: string) => void
  onAddToCart: (productId: string) => void
  onUploadReceipt: (file: File) => void
  onSubmitManualReceipt: BlockProps['onSubmitManualReceipt']
  onSubmitRefundDestination: BlockProps['onSubmitRefundDestination']
  onSendAction: BlockProps['onSendAction']
}

const GAP_MS = 30 * 60 * 1000

function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  const sameDay = new Date().toDateString() === d.toDateString()
  return sameDay ? time : `${d.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' })} ${time}`
}

function StoreAvatar({ storeId, storeName, storeLogoKey }: Pick<ChatThreadProps, 'storeId' | 'storeName' | 'storeLogoKey'>) {
  return storeId && storeLogoKey ? (
    <img src={storeLogoUrl(storeId, storeLogoKey)} alt="" className="size-6 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--shop-surface-2)] text-[10px] text-[var(--shop-text-2)]" aria-hidden>
      {avatarInitials(storeName)}
    </div>
  )
}

// docs/PRD-buyer-chat-redesign.md §6.4 — نخ گفتگو: حباب‌ها با دُم سمت گوینده، آواتار فروشگاه یک‌بار برای هر
// دسته پیام پشت‌سرهم، جداکننده‌ی زمانی بعد از ۳۰ دقیقه، رکورد یک‌خطی سبد، کارت‌های محصول و پیام سیستمی انتقال
export function ChatThread(props: ChatThreadProps) {
  const { thread, messages, sending, viewportHeight } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<{ items: MediaItem[]; index: number } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, viewportHeight, props.handoffLine])

  const lastMessage = messages[messages.length - 1]
  // آخرین CART_SUMMARY کل نخ؛ قدیمی‌ترها فقط «سبد به‌روز شد» (بی‌کلیک)
  let latestCartId: string | null = null
  for (let i = thread.length - 1; i >= 0; i--) {
    if (thread[i].uiBlock?.type === 'CART_SUMMARY') {
      latestCartId = thread[i].id
      break
    }
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
      {props.hasMoreEvents && !props.viewingHistory && (
        <button
          type="button"
          onClick={props.onLoadOlder}
          className="mx-auto mb-3 block min-h-11 rounded-full border border-[var(--shop-border)] px-3 text-xs text-[var(--shop-text-2)]"
        >
          {fa.shop.olderMessages}
        </button>
      )}
      {thread.map((m, i) => {
        const prev = thread[i - 1]
        const gap = !!m.createdAt && !!prev?.createdAt && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > GAP_MS
        const sameSpeaker = !!prev && prev.role === m.role && !!prev.fromSeller === !!m.fromSeller && !gap
        const isAgent = m.role === 'agent'
        const block = m.uiBlock
        const text =
          m.isVoice && !m.text ? fa.shop.v2.voicePending : m.isVoice ? `🎙️ ${m.text}` : m.text
        const hasBubble = !!(m.text || (!m.imageUrl && !m.videoUrl && !m.id.startsWith('stream-'))) && !(block?.type === 'CART_SUMMARY' && !m.text)
        const media: MediaItem[] = [
          ...(m.imageUrl ? [{ type: 'image' as const, src: m.imageUrl }] : []),
          ...(m.videoUrl ? [{ type: 'video' as const, src: m.videoUrl }] : []),
        ]
        const failedRing = m.role === 'customer' && m.failed ? 'outline outline-1 outline-[var(--shop-danger)]' : ''
        return (
          <div key={m.id} className={sameSpeaker ? 'mt-1' : i === 0 ? '' : 'mt-3'}>
            {gap && m.createdAt && <p className="mb-2 mt-3 text-center text-xs text-[var(--shop-text-2)]">{timeLabel(m.createdAt)}</p>}
            <div className={`flex items-start gap-2 ${isAgent ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex min-w-0 max-w-[85%] flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
                {m.fromSeller && !sameSpeaker && (
                  <span className="mb-0.5 text-xs text-[var(--shop-text-2)]">{fa.shop.v2.sellerTag(props.storeName ?? '')}</span>
                )}
                {media.map((item, idx) =>
                  item.type === 'image' ? (
                    <img
                      key={idx}
                      src={item.src}
                      alt={fa.shop.customerImageAlt}
                      onClick={() => setZoom({ items: media, index: idx })}
                      className="mb-1 max-h-60 cursor-zoom-in rounded-2xl object-cover"
                    />
                  ) : (
                    <video key={idx} src={item.src} controls preload="metadata" className="mb-1 max-h-60 rounded-2xl" />
                  ),
                )}
                {hasBubble && (
                  <div
                    dir="auto"
                    className={`whitespace-pre-wrap rounded-[18px] px-4 py-2.5 text-[15px] leading-7 text-start ${
                      isAgent
                        ? `bg-[var(--shop-surface-2)] text-[var(--shop-text)] ${sameSpeaker ? '' : 'rounded-tl-[4px]'}`
                        : `bg-[var(--shop-accent-fill)] text-[var(--shop-accent-text)] ${sameSpeaker ? '' : 'rounded-tr-[4px]'}`
                    } ${m.isVoice && !m.text ? 'italic opacity-80' : ''} ${failedRing}`}
                  >
                    {text}
                  </div>
                )}
                {m.role === 'customer' && m.failed && (
                  <button type="button" onClick={() => props.onRetry(m.id)} className="min-h-11 text-xs font-semibold text-[var(--shop-danger)] underline">
                    {fa.shop.v2.sendFailed}
                  </button>
                )}
                {props.conversationId && isAgent && (
                  <VoiceIndicator message={m} conversationId={props.conversationId} onPlay={props.onMarkVoiceHeard} />
                )}
                {block?.type === 'PRODUCT_CARD' && (
                  <ChatProductCards
                    products={block.products}
                    disabled={props.actionDisabled}
                    handoff={props.sellerIsReplying}
                    cartProductIds={props.cartProductIds}
                    onOpenProduct={props.onOpenProduct}
                    onAddToCart={props.onAddToCart}
                    onSeeAllProducts={props.onSeeAllProducts}
                  />
                )}
                {block?.type === 'CART_SUMMARY' &&
                  (m.id === latestCartId && props.cartTappable ? (
                    <button
                      type="button"
                      onClick={props.onOpenCart}
                      className="mt-1 min-h-11 rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] px-3 text-sm font-medium text-[var(--shop-text)]"
                    >
                      {fa.shop.v2.cartRecord(
                        block.items.reduce((sum, item) => sum + item.qty, 0),
                        block.total.toLocaleString('fa-IR'),
                      )}
                    </button>
                  ) : m.id === latestCartId ? (
                    <span className="mt-1 block rounded-xl border border-[var(--shop-border)] px-3 py-2 text-sm text-[var(--shop-text)]">
                      {fa.shop.v2.cartRecord(
                        block.items.reduce((sum, item) => sum + item.qty, 0),
                        block.total.toLocaleString('fa-IR'),
                      )}
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs text-[var(--shop-text-2)]">{fa.shop.v2.cartUpdated}</span>
                  ))}
                {block && block.type !== 'PRODUCT_CARD' && block.type !== 'CART_SUMMARY' && (
                  <ShopUiBlockView
                    block={block}
                    disabled={block.type === 'REFUND_DESTINATION_FORM' ? props.refundFormDisabled : props.actionDisabled}
                    onUploadReceipt={props.onUploadReceipt}
                    onSubmitManualReceipt={props.onSubmitManualReceipt}
                    onSubmitRefundDestination={props.onSubmitRefundDestination}
                    onSendAction={props.onSendAction}
                    onOpenProduct={props.onOpenProduct}
                  />
                )}
              </div>
              {isAgent && (!sameSpeaker ? <StoreAvatar storeId={props.storeId} storeName={props.storeName} storeLogoKey={props.storeLogoKey} /> : <span className="size-6 shrink-0" aria-hidden />)}
            </div>
          </div>
        )
      })}

      {sending && !(lastMessage?.id.startsWith('stream-') && lastMessage.text) && (
        <div className="mt-3 flex items-start justify-end gap-2">
          <ThinkingIndicator hint={props.streamNote ?? null} lastCustomerText={[...messages].reverse().find((m) => m.role === 'customer')?.text} />
          <StoreAvatar storeId={props.storeId} storeName={props.storeName} storeLogoKey={props.storeLogoKey} />
        </div>
      )}

      {props.handoffLine && <p className="mt-4 text-center text-xs leading-5 text-[var(--shop-text-2)]">{props.handoffLine}</p>}

      {props.error && <p className="mt-3 text-center text-xs text-[var(--shop-danger)]">{props.error}</p>}
      {zoom && <MediaLightbox items={zoom.items} startIndex={zoom.index} onClose={() => setZoom(null)} />}
    </div>
  )
}
