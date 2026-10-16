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
  // رکوردهای یک‌خطی پرداخت؛ لمس فقط وقتی مرحله‌ی هم‌خوان هنوز فعال است شیت را باز می‌کند (§6.4.4)
  onOpenCheckout: () => void
  checkoutState: string
  onHighlightOrder: () => void
  onOpenProduct: (productId: string) => void
  onSeeAllProducts: () => void
  onLoadOlder: () => void
  onRetry: (messageId: string) => void
  onMarkVoiceHeard: (key: string) => void
  onAddToCart: (productId: string) => void
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

type CheckoutRecordBlock = Extract<NonNullable<ShopMessage['uiBlock']>, { type: 'ADDRESS_PROMPT' | 'PAYMENT_METHOD_PROMPT' | 'PAYMENT_INSTRUCTIONS' | 'SNAPPPAY_PAYMENT_INSTRUCTIONS' | 'ORDER_STATUS' }>

// docs/PRD-buyer-chat-redesign.md §6.4.4 — بلاک‌های پرداخت در نخ فقط یک خط رکورد هستند؛ UI کامل در شیت پرداخت است
function CheckoutRecord({ block, tappable, onTap }: { block: CheckoutRecordBlock; tappable: boolean; onTap: () => void }) {
  let text: string
  switch (block.type) {
    case 'ADDRESS_PROMPT':
      text = block.mode === 'CONFIRM' && block.summary ? `${fa.shop.v2.recordAddress}\n${block.summary}` : fa.shop.v2.recordAddress
      break
    case 'PAYMENT_METHOD_PROMPT':
      text = fa.shop.v2.recordMethod
      break
    case 'PAYMENT_INSTRUCTIONS':
    case 'SNAPPPAY_PAYMENT_INSTRUCTIONS':
      text = fa.shop.v2.recordPayment(block.amount.toLocaleString('fa-IR'), block.orderCode ?? null)
      break
    default:
      text = fa.shop.v2.recordOrder(fa.shop.orderStatusLabels[block.status] ?? block.status, block.orderCode ?? null)
  }
  const cls = 'mt-1 block whitespace-pre-line rounded-xl border border-[var(--shop-border)] px-3 py-2 text-start text-sm text-[var(--shop-text)]'
  return tappable ? (
    <button type="button" onClick={onTap} className={`${cls} min-h-11 bg-[var(--shop-surface)] font-medium`}>
      {text}
    </button>
  ) : (
    <span className={`${cls} text-[var(--shop-text-2)]`}>{text}</span>
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

  // آخرین بلاک از هر نوع رکورد — فقط همان قابل‌لمس است؛ قدیمی‌ها فقط خط توضیحی‌اند
  const latestRecordId = new Map<string, string>()
  for (let i = thread.length - 1; i >= 0; i--) {
    const t = thread[i].uiBlock?.type
    if (!t) continue
    const key = t === 'SNAPPPAY_PAYMENT_INSTRUCTIONS' ? 'PAYMENT_INSTRUCTIONS' : t
    if (!latestRecordId.has(key)) latestRecordId.set(key, thread[i].id)
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
        // جای‌نگهدار خالیِ استریم (هنوز متنی نیامده) حباب/آواتار نمی‌گیرد؛ ThinkingIndicator پایین نخ جایش را دارد
        if (m.id.startsWith('stream-') && !m.text && !m.uiBlock && !m.imageUrl && !m.videoUrl) return null
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
          <div key={m.id} data-refund-form={block?.type === 'REFUND_DESTINATION_FORM' ? '' : undefined} className={sameSpeaker ? 'mt-1' : i === 0 ? '' : 'mt-3'}>
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
                {block && (block.type === 'ADDRESS_PROMPT' || block.type === 'PAYMENT_METHOD_PROMPT' || block.type === 'PAYMENT_INSTRUCTIONS' || block.type === 'SNAPPPAY_PAYMENT_INSTRUCTIONS' || block.type === 'ORDER_STATUS') && (
                  <CheckoutRecord
                    block={block}
                    tappable={
                      !props.viewingHistory &&
                      m.id === latestRecordId.get(block.type === 'SNAPPPAY_PAYMENT_INSTRUCTIONS' ? 'PAYMENT_INSTRUCTIONS' : block.type) &&
                      (block.type === 'ORDER_STATUS' ||
                        (block.type === 'ADDRESS_PROMPT' && props.checkoutState === 'ADDRESS_COLLECTION') ||
                        (block.type === 'PAYMENT_METHOD_PROMPT' && props.checkoutState === 'PAYMENT_METHOD_SELECTION') ||
                        ((block.type === 'PAYMENT_INSTRUCTIONS' || block.type === 'SNAPPPAY_PAYMENT_INSTRUCTIONS') && props.checkoutState === 'AWAITING_PAYMENT'))
                    }
                    onTap={block.type === 'ORDER_STATUS' ? props.onHighlightOrder : props.onOpenCheckout}
                  />
                )}
                {block && block.type !== 'PRODUCT_CARD' && block.type !== 'CART_SUMMARY' && block.type !== 'ADDRESS_PROMPT' && block.type !== 'PAYMENT_METHOD_PROMPT' && block.type !== 'PAYMENT_INSTRUCTIONS' && block.type !== 'SNAPPPAY_PAYMENT_INSTRUCTIONS' && block.type !== 'ORDER_STATUS' && (
                  <ShopUiBlockView
                    block={block}
                    disabled={block.type === 'REFUND_DESTINATION_FORM' ? props.refundFormDisabled : props.actionDisabled}
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
