import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { OrderListBlock } from '@/components/shop/ShopUiBlocks'
import { CommentModal } from '@/components/shop/CommentModal'
import { fa } from '@/locales/fa'
import type { ShopOrderSummary } from '@/types/api'

// docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۲ — صفحه‌ی مستقل «سفارش‌های من»، بدون
// AI/چت؛ از همون session/Customer که ویجت چت فروشگاه (ShopChatPage) با useShopChat ساخته
// استفاده می‌کند (localStorage، getShopSession)، پس همیشه مکالمه‌ی درست را پیدا می‌کند
export function ShopOrdersPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { loading, conversationId, sending, listMyOrders, submitComment, uploadCommentMedia, sendAction } =
    useShopChat(slug)
  const [orders, setOrders] = useState<ShopOrderSummary[] | null>(null)
  const [reviewOrder, setReviewOrder] = useState<{ orderId: string; productId: string | null } | null>(null)

  useEffect(() => {
    if (loading || !conversationId) return
    void listMyOrders().then(setOrders)
  }, [loading, conversationId, listMyOrders])

  // «سفارش مجدد» همون اکشن موجود REORDER را می‌زند (آیتم‌ها به سبد فعلی مکالمه اضافه می‌شوند،
  // state به CART_REVIEW می‌رود) و بعد به خودِ چت برمی‌گردد تا خریدار خلاصه‌ی سبد را آن‌جا ببیند
  async function handleReorder(orderId: string) {
    await sendAction({ type: 'REORDER', orderId })
    navigate(`/shop/${slug}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 light:bg-white" dir="rtl">
      <div className="flex items-center gap-2 border-b border-slate-800 light:border-slate-200 px-4 py-3">
        <button
          onClick={() => navigate(`/shop/${slug}`)}
          title={fa.shop.myOrdersBack}
          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 light:hover:bg-slate-100"
        >
          {/* فلش «بازگشت» در RTL باید به راست اشاره کند — همون chevron-right استاندارد پروژه */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.myOrdersPageTitle}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders === null ? (
          <p className="py-10 text-center text-xs text-slate-500">{fa.common.loading}</p>
        ) : (
          <OrderListBlock
            orders={orders}
            disabled={sending}
            onReorder={(orderId) => void handleReorder(orderId)}
            onWriteReview={(orderId, distinctProductId) =>
              setReviewOrder({ orderId, productId: distinctProductId })
            }
          />
        )}
      </div>

      {reviewOrder && (
        <CommentModal
          productId={reviewOrder.productId ?? undefined}
          onClose={() => setReviewOrder(null)}
          onSubmit={submitComment}
          onUploadMedia={uploadCommentMedia}
        />
      )}
    </div>
  )
}
