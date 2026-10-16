import { useEffect, useRef } from 'react'
import { ShopUiBlockView } from '@/components/shop/ShopUiBlocks'
import { QuickRepliesBar } from '@/components/shop/QuickRepliesBar'
import { ThinkingIndicator } from '@/components/shop/ThinkingIndicator'
import { VoiceIndicator } from '@/components/shop/VoiceBubble'
import { fa } from '@/locales/fa'
import type { ShopMessage } from '@/types/api'

type BlockProps = Parameters<typeof ShopUiBlockView>[0]

interface ChatThreadProps {
  // olderMessages + messages
  thread: ShopMessage[]
  // فقط پیام‌های زنده (برای «آخرین پیام» و چیپ‌های پاسخ سریع)
  messages: ShopMessage[]
  conversationId: string | null | undefined
  hasMoreEvents: boolean
  viewingHistory: boolean
  sending: boolean
  streamNote: string | null | undefined
  error: string | null | undefined
  composerDisabled: boolean
  actionDisabled: boolean
  refundFormDisabled: boolean
  sellerIsReplying: boolean
  // ارتفاع ویوپورت — با تغییرش (کیبورد) دوباره به آخر اسکرول می‌کنیم
  viewportHeight: number | null
  savedProductIds: BlockProps['savedProductIds']
  cartProductIds: BlockProps['cartProductIds']
  onToggleSave: BlockProps['onToggleSave']
  onLoadOlder: () => void
  onRetry: (messageId: string) => void
  onMarkVoiceHeard: (key: string) => void
  onSendText: (text: string) => void
  onAddToCart: (productId: string) => void
  onConfirmCart: () => void
  onUploadReceipt: (file: File) => void
  onSubmitManualReceipt: BlockProps['onSubmitManualReceipt']
  onSubmitRefundDestination: BlockProps['onSubmitRefundDestination']
  onSendAction: BlockProps['onSendAction']
}

// docs/PRD-buyer-chat-redesign.md §5 — نخ گفتگو (حباب‌ها، بلاک‌ها، پیام‌های قدیمی‌تر، در حال فکر، خطا)؛
// عیناً منطق قبلی ShopChatPage بدون تغییر رفتار. ظاهر حباب‌ها در BC-3 بازطراحی می‌شود
export function ChatThread(props: ChatThreadProps) {
  const { thread, messages, sending, viewportHeight } = props
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, viewportHeight])

  const lastMessage = messages[messages.length - 1]

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {props.hasMoreEvents && !props.viewingHistory && (
        <button
          type="button"
          onClick={props.onLoadOlder}
          className="mx-auto block min-h-11 rounded-full border border-[var(--shop-border)] px-3 text-xs text-[var(--shop-text-2)]"
        >
          {fa.shop.olderMessages}
        </button>
      )}
      {thread.map((m) => (
        <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
          <div className="max-w-[85%]">
            {m.imageUrl && (
              <a href={m.imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={m.imageUrl}
                  alt={fa.shop.customerImageAlt}
                  className="mb-1 max-h-72 rounded-2xl rounded-tl-sm border border-emerald-500/20 object-cover"
                />
              </a>
            )}
            {m.videoUrl && (
              <video src={m.videoUrl} controls className="mb-1 max-h-72 rounded-2xl rounded-tl-sm border border-emerald-500/20" />
            )}
            {(m.text || (!m.imageUrl && !m.videoUrl && !m.id.startsWith('stream-'))) && (
              <div
                dir="auto"
                className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-start ${
                  m.role === 'agent'
                    ? 'rounded-tr-sm bg-slate-700/70 text-slate-200 light:bg-slate-100 light:text-slate-800'
                    : 'rounded-tl-sm border border-emerald-500/20 bg-emerald-500/20 text-emerald-100 light:text-emerald-900'
                } ${m.isVoice && !m.text ? 'italic text-emerald-200/70 light:text-emerald-900/60' : ''}`}
              >
                {/* فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — تا transcript برسد (isVoice && !text)، یک وضعیت
                    pending نشان می‌دهیم؛ بعد از آن میکروفون کنار متن واقعی می‌ماند تا خریدار
                    بفهمد این پیام از وویس آمده، نه تایپ */}
                {m.isVoice && !m.text ? fa.shop.customerVoiceTranscribing : m.isVoice ? `🎙️ ${m.text}` : m.text}
                {m.role === 'customer' && m.failed && (
                  <button
                    type="button"
                    onClick={() => props.onRetry(m.id)}
                    className="mt-2 block text-xs font-semibold text-amber-200 underline"
                  >
                    {fa.shop.retrySend}
                  </button>
                )}
              </div>
            )}
            {props.conversationId && m.role === 'agent' && (
              <VoiceIndicator message={m} conversationId={props.conversationId} onPlay={props.onMarkVoiceHeard} />
            )}
            {m.uiBlock && (
              <ShopUiBlockView
                block={m.uiBlock}
                disabled={m.uiBlock.type === 'REFUND_DESTINATION_FORM' ? props.refundFormDisabled : props.actionDisabled}
                handoff={props.sellerIsReplying}
                onAddToCart={props.onAddToCart}
                onConfirmCart={props.onConfirmCart}
                onUploadReceipt={props.onUploadReceipt}
                onSubmitManualReceipt={props.onSubmitManualReceipt}
                onSubmitRefundDestination={props.onSubmitRefundDestination}
                onSendAction={props.onSendAction}
                savedProductIds={props.savedProductIds}
                onToggleSave={props.onToggleSave}
                cartProductIds={props.cartProductIds}
              />
            )}
            {/* docs/PRD-sales-agent-sales-state-machine.md §۱۲.۲ — فقط برای آخرین پیام کل چت؛
                با ارسال هر پیام دیگری (که آخرین پیام را عوض می‌کند) یا در حال ارسال، پنهان می‌شود */}
            {m.role === 'agent' && !!m.quickReplies?.length && m.id === lastMessage?.id && !sending && (
              <QuickRepliesBar replies={m.quickReplies} disabled={props.composerDisabled} onPick={props.onSendText} />
            )}
          </div>
        </div>
      ))}

      {sending && !(lastMessage?.id.startsWith('stream-') && lastMessage.text) && (
        <ThinkingIndicator
          hint={props.streamNote ?? null}
          lastCustomerText={[...messages].reverse().find((m) => m.role === 'customer')?.text}
        />
      )}

      {props.error && <p className="text-center text-xs text-[var(--shop-danger)]">{props.error}</p>}
    </div>
  )
}
