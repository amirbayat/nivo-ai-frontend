import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { StoreProductGrid } from '@/components/shop/StoreProductGrid'
import { CommentModal } from '@/components/shop/CommentModal'
import { CheckoutProgressBar } from '@/components/shop/CheckoutProgressBar'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { ShopViewSwitch, type ShopView } from '@/components/shop/ShopViewSwitch'
import { ShopMenuSheet } from '@/components/shop/ShopMenuSheet'
import { ChatThread } from '@/components/shop/ChatThread'
import { AskBar } from '@/components/shop/AskBar'
import { CartSheet } from '@/components/shop/CartSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { fa } from '@/locales/fa'
import type { PublicProduct, ShopHistoryEntry } from '@/types/api'

// HANDOFF_HUMAN/REJECTED عمداً اینجا نیستند — بعد از escalate یا رد سفارش، مشتری باید بتواند
// مستقیم با فروشنده چت کند (پنل فروشنده، تب «نیاز به توجه»؛ بک‌اند با isMutedForHuman پیام را
// از موتور مکالمه‌ی رباتی رد نمی‌کند)؛ فقط COMPLETED واقعاً پایانی است
const TERMINAL_STATES = ['COMPLETED']
// حالت‌هایی که دیگر ربات جواب نمی‌دهد و انسان (فروشنده) پاسخ‌گوست — برای بنر «منتقل شد»
const HUMAN_HANDLING_STATES = ['HANDOFF_HUMAN', 'REJECTED']

// docs/PRD-buyer-chat-redesign.md §5 — این صفحه فقط ترکیب‌بندی است: هدر، کنترل نما، نما (محصولات/گفتگو)،
// نوار پرسش و شیت‌ها. منطق داده در useShopChat می‌ماند
export function ShopChatPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  // فیدبک اول پایلوت — لینک اختصاصی یک محصول («فروشنده در استوری گذاشته»): /shop/:slug?product=<id>
  const [searchParams, setSearchParams] = useSearchParams()
  const productId = searchParams.get('product') ?? undefined
  // فیدبک کاربر ۱۴۰۵/۰۷/۱۸ — لینک از صفحه‌ی «سفارش‌های من» (ShopOrdersPage): /shop/:slug?viewOrder=<conversationId>
  const viewOrderConversationId = searchParams.get('viewOrder') ?? undefined
  const {
    storeId,
    storeName,
    storeLogoKey,
    isDemo,
    notFound,
    suspended,
    conversationId,
    messages,
    olderMessages,
    hasMoreEvents,
    loadOlderMessages,
    state,
    loading,
    sending,
    showLanding,
    streamNote,
    error,
    history,
    viewingHistory,
    savedProductIds,
    savedProducts,
    toggleSaveProduct,
    sendMessage,
    sendAction,
    uploadReceipt,
    submitManualReceipt,
    submitRefundDestination,
    sendImageMessage,
    sendVideoMessage,
    sendVoiceMessage,
    awaitingReview,
    awaitingSatisfaction,
    retryMessage,
    markVoiceHeard,
    sendBuyerOtp,
    verifyBuyerOtp,
    subscribeStockAlert,
    submitComment,
    uploadCommentMedia,
    startNewChat,
    viewHistoryEntry,
    returnToCurrentChat,
  } = useShopChat(slug, productId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false)
  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
  const [reviewProduct, setReviewProduct] = useState<PublicProduct | null>(null)
  // docs/PRD-panels-and-buyer-ux-design.md بخش ۳.۵ — نمای «محصولات» (قبلاً «حالت فروشگاه») روی نمای گفتگو
  const [storeMode, setStoreMode] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [storeModeUnread, setStoreModeUnread] = useState(false)
  const prevMessageCountRef = useRef(messages.length)

  // فیدبک کاربر ۱۴۰۵/۰۷/۱۸ — وقتی از «سفارش‌های من» با ?viewOrder=<conversationId> می‌آید، همان
  // مکانیزم فقط‌خواندنی تاریخچه (viewHistoryEntry) را صدا می‌زنیم؛ باید صبر کنیم تا مکالمه‌ی
  // زنده واقعاً لود شده باشد (conversationId آماده) وگرنه viewHistoryEntry چیزی برای برگشتن
  // (liveSessionRef) ندارد
  useEffect(() => {
    if (!viewOrderConversationId || !conversationId) return
    if (viewOrderConversationId !== conversationId) {
      void viewHistoryEntry({ conversationId: viewOrderConversationId })
    }
    setSearchParams({}, { replace: true })
  }, [viewOrderConversationId, conversationId, viewHistoryEntry, setSearchParams])

  // 100vh/100dvh روی خیلی از مرورگرهای موبایل با بازشدن کیبورد صفحه شرینک نمی‌شه (مخصوصاً
  // سافاری قدیمی‌تر) — یعنی اینپوت پایین یک کادر که دیگه بزرگ‌تر از ویوپورت واقعی‌ست میره،
  // پشت کیبورد قایم می‌شه. visualViewport همیشه ارتفاع واقعی دیده‌شده (بعد از کیبورد) رو
  // می‌ده؛ کانتینر رو دقیقاً همون ارتفاع می‌ذاریم تا اینپوت همیشه لبه‌ی همون ارتفاع (یعنی
  // بالای کیبورد) بمونه، نه پشتش
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    function update() {
      setViewportHeight(vv!.height)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // وقتی روی نمای «محصولات» هستیم (نخ چت پشت آن است) و پیام تازه‌ای می‌رسد (مثلاً پاسخ به
  // ADD_TO_CART از گرید)، نقطه‌ی قرمز روی تب «گفتگو» نشان بده — همان الگوی ویجت‌های Intercom/Crisp
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && storeMode) setStoreModeUnread(true)
    prevMessageCountRef.current = messages.length
  }, [messages.length, storeMode])

  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱ — وقتی منتظر
  // نظریم، با این‌که state همچنان COMPLETED (ترمینال) است، ورودی باید باز بماند تا خریدار
  // بتواند متن/صوت/عکس/ویدیوی نظرش را همین‌جا بفرستد
  const inputLocked = viewingHistory || (TERMINAL_STATES.includes(state) && !awaitingReview && !awaitingSatisfaction)
  const composerDisabled = sending || inputLocked
  // عکس: هنگام نظردهی یا گفتگوی انسانی با فروشنده؛ ویدیو: فقط هنگام نظردهی (طبق PRD ردیابی سفارش بخش ۳.۱)
  const canAttachImage = HUMAN_HANDLING_STATES.includes(state) || awaitingReview
  const canAttachVideo = awaitingReview
  const actionDisabled = inputLocked
  // فرم کارت بازپرداخت: سفارش لغو/ردشده مکالمه را COMPLETED می‌کند و inputLocked می‌شود، ولی
  // خریدار باید همچنان بتواند کارتش را بدهد؛ فقط در مرور تاریخچه (مکالمه‌ی دیگر) قفل می‌ماند
  const refundFormDisabled = viewingHistory
  const sellerIsReplying = HUMAN_HANDLING_STATES.includes(state)
  const thread = [...olderMessages, ...messages]

  // فیدبک کاربر ۱۴۰۵/۰۷/۱۶ — کارت محصول در پیام‌های قدیمی‌تر همیشه قابل‌کلیک می‌ماند؛ کلیک
  // دوباره روی کارت تکراری همون محصول (مثلاً وقتی همون کارت یک‌بار دیگر ضمن توضیح تخفیف
  // دوباره پیوست می‌شود) بدون هشدار تعداد سبد را دوبرابر می‌کرد. آخرین CART_SUMMARY منبع
  // حقیقت فعلی سبد است؛ هر کارت محصولی که همین الان توی آن هست، دیگر دکمه‌ی فعال نشان نمی‌دهد
  const cartSummary = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const block = messages[i].uiBlock
      if (block?.type === 'CART_SUMMARY') return block
    }
    return null
  }, [messages])
  const cartCount = cartSummary?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0
  const cartEditable = state === 'GREETING' || state === 'BROWSING' || state === 'CART_REVIEW'

  useEffect(() => {
    if (!cartEditable) setCartOpen(false)
  }, [cartEditable])

  const cartProductIds = useMemo(() => new Set(cartSummary?.items.map((item) => item.productId) ?? []), [cartSummary])

  // «پرسیدن از فروشنده» از شیت محصول گرید — چت را باز می‌کند و با نام محصول (مثل اینکه خریدار
  // تایپ کرده) همان مکانیزم موجود لنگرشدن روی محصول (doBrowse narrowing تک‌نتیجه‌ای) را فعال
  // می‌کند؛ بدون نیاز به یک اکشن/endpoint تازه‌ی «set anchor»
  function handleAskSeller(product: PublicProduct) {
    setStoreMode(false)
    setStoreModeUnread(false)
    void sendMessage(product.name)
  }

  function handleViewChange(view: ShopView) {
    setStoreMode(view === 'products')
    if (view === 'chat') setStoreModeUnread(false)
  }

  function handleSelectHistory(entry: ShopHistoryEntry) {
    void viewHistoryEntry(entry)
  }

  function addToCartFromGrid(id: string, variantId?: string) {
    void sendAction({ type: 'ADD_TO_CART', productId: id, ...(variantId ? { variantId } : {}) })
  }

  const gridProps = {
    slug,
    disabled: actionDisabled,
    onAddToCart: addToCartFromGrid,
    onAskSeller: handleAskSeller,
    savedProductIds,
    savedItems: savedProducts,
    onToggleSave: toggleSaveProduct,
    onWriteReview: setReviewProduct,
    onNotifyStock: subscribeStockAlert,
    onSendBuyerOtp: sendBuyerOtp,
    onVerifyBuyerOtp: verifyBuyerOtp,
  }

  // یادداشت بالای نوار پرسش — منطق قبلی (بنر «منتقل شد»/«منتظر نظر»/«منتظر پاسخ رضایت») عیناً
  let notice: { text: string; tone: 'muted' | 'hint' } | null = null
  if ((TERMINAL_STATES.includes(state) && !awaitingReview && !awaitingSatisfaction) || sellerIsReplying) {
    notice = { text: fa.shop.conversationEnded, tone: 'muted' }
  } else if (TERMINAL_STATES.includes(state) && awaitingReview) {
    notice = { text: fa.shop.awaitingReviewHint, tone: 'hint' }
  } else if (TERMINAL_STATES.includes(state) && awaitingSatisfaction) {
    notice = { text: fa.shop.awaitingSatisfactionHint, tone: 'hint' }
  }

  if (suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--shop-bg)] p-4" dir="rtl">
        <div className="text-center">
          <h1 className="mb-1.5 text-xl font-bold text-[var(--shop-text)]">{fa.shop.suspendedHeading}</h1>
          <p className="text-sm text-[var(--shop-text-2)]">{fa.shop.suspendedBody}</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--shop-bg)] p-4" dir="rtl">
        <div className="text-center">
          <h1 className="mb-1.5 text-xl font-bold text-[var(--shop-text)]">{fa.shop.notFoundHeading}</h1>
          <p className="text-sm text-[var(--shop-text-2)]">{fa.shop.notFoundBody}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--shop-bg)] p-4" dir="rtl">
        <div className="mb-4 h-10 w-40 animate-pulse rounded-lg bg-[var(--shop-surface-2)]" />
        <div className="mb-3 h-16 animate-pulse rounded-xl bg-[var(--shop-surface-2)]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-square animate-pulse rounded-xl bg-[var(--shop-surface-2)]" />
          <div className="aspect-square animate-pulse rounded-xl bg-[var(--shop-surface-2)]" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-[var(--shop-bg)]"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
      dir="rtl"
    >
      <ShopHeader
        storeId={storeId}
        storeName={storeName}
        storeLogoKey={storeLogoKey}
        viewingHistory={viewingHistory}
        sellerIsReplying={sellerIsReplying}
        cartCount={cartEditable ? cartCount : 0}
        onOpenCart={() => setCartOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {!showLanding && (
        <ShopViewSwitch view={storeMode ? 'products' : 'chat'} onChange={handleViewChange} chatUnread={storeModeUnread} />
      )}

      {isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <span className="text-xs text-[var(--shop-warning)]">{fa.shop.demoBuyerBannerText}</span>
          <button
            type="button"
            onClick={() => {
              // همون الگوی goToSection در HubPage.tsx — اگر از قبل لاگین واقعی دارد (این
              // صفحه مشتری ناشناس است، نه پنل فروشنده، پس اینجا چکش نشده بود)، مستقیم به
              // ویزارد ساخت فروشگاه واقعی برود، نه به فلوی دمو؛ وگرنه اول لاگین، بعد همان‌جا
              const path = '/seller/onboarding'
              if (!localStorage.getItem('access_token')) {
                sessionStorage.setItem('nivo:pendingReturnPath', path)
                navigate('/login')
                return
              }
              navigate(path)
            }}
            className="min-h-11 shrink-0 rounded-lg border border-amber-500/40 px-2.5 text-xs font-bold text-[var(--shop-warning)] hover:bg-amber-500/10"
          >
            {fa.shop.demoBuyerBannerCta}
          </button>
        </div>
      )}

      {reviewProduct && (
        <CommentModal
          productId={reviewProduct.id}
          onClose={() => setReviewProduct(null)}
          onSubmit={submitComment}
          onUploadMedia={uploadCommentMedia}
        />
      )}

      {viewingHistory && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/10 px-4 py-2 text-xs text-[var(--shop-warning)]">
          <span>{fa.shop.viewingHistoryBanner}</span>
          <button type="button" onClick={() => void returnToCurrentChat()} className="min-h-11 shrink-0 font-semibold underline">
            {fa.shop.backToCurrentChat}
          </button>
        </div>
      )}

      {storeMode && <StoreProductGrid {...gridProps} />}

      {!storeMode && showLanding && (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="px-4 pt-4 text-sm leading-relaxed text-[var(--shop-text)]">{fa.shop.landingWelcome(storeName ?? '')}</p>
          <div className="flex gap-1.5 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[fa.shop.landingChipBest, fa.shop.landingChipNew, fa.shop.landingChipHelp, fa.shop.landingChipShipping].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => void sendMessage(label)}
                disabled={composerDisabled}
                className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-[var(--shop-border)] px-3 text-xs text-[var(--shop-text)] disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
          <StoreProductGrid {...gridProps} />
        </div>
      )}

      {!storeMode && !showLanding && (
        <>
          <CheckoutProgressBar state={state} />
          <ChatThread
            thread={thread}
            messages={messages}
            conversationId={conversationId}
            hasMoreEvents={hasMoreEvents}
            viewingHistory={viewingHistory}
            sending={sending}
            streamNote={streamNote}
            error={error}
            composerDisabled={composerDisabled}
            actionDisabled={actionDisabled}
            refundFormDisabled={refundFormDisabled}
            sellerIsReplying={sellerIsReplying}
            viewportHeight={viewportHeight}
            savedProductIds={savedProductIds}
            cartProductIds={cartProductIds}
            onToggleSave={toggleSaveProduct}
            onLoadOlder={() => void loadOlderMessages()}
            onRetry={(id) => void retryMessage(id)}
            onMarkVoiceHeard={markVoiceHeard}
            onSendText={(text) => void sendMessage(text)}
            onAddToCart={(id) => void sendAction({ type: 'ADD_TO_CART', productId: id })}
            onConfirmCart={() => void sendAction({ type: 'CONFIRM_CART' })}
            onUploadReceipt={(file) => void uploadReceipt(file)}
            onSubmitManualReceipt={(info) => void submitManualReceipt(info)}
            onSubmitRefundDestination={submitRefundDestination}
            onSendAction={(action) => void sendAction(action)}
          />
        </>
      )}

      {!storeMode && (
        <AskBar
          key={conversationId ?? 'none'}
          disabled={composerDisabled}
          canAttachImage={canAttachImage}
          canAttachVideo={canAttachVideo}
          notice={notice}
          onSendText={(text) => void sendMessage(text)}
          onSendImage={(file) => void sendImageMessage(file)}
          onSendVideo={(file) => void sendVideoMessage(file)}
          onSendVoice={(blob) => void sendVoiceMessage(blob)}
        />
      )}

      {cartOpen && cartEditable && cartSummary && (
        <CartSheet
          items={cartSummary.items}
          total={cartSummary.total}
          disabled={actionDisabled || sending}
          onClose={() => setCartOpen(false)}
          onSetQty={(item, qty) => void sendAction({ type: 'SET_CART_QTY', productId: item.productId, qty, variantId: item.variantId })}
          onRemove={(item) => void sendAction({ type: 'REMOVE_CART_ITEM', productId: item.productId, variantId: item.variantId })}
          onConfirm={() => {
            setCartOpen(false)
            void sendAction({ type: 'CONFIRM_CART' })
          }}
        />
      )}

      <ShopMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        history={history}
        hideTalkToSeller={sellerIsReplying || viewingHistory}
        talkToSellerDisabled={composerDisabled}
        // replace: entry شیت (closeOnBack) جایگزین صفحه‌ی سفارش‌ها می‌شود، پس «بازگشت» مستقیم به فروشگاه می‌رسد
        onOrders={() => navigate(`/shop/${slug}/orders`, { replace: true })}
        onTalkToSeller={() => {
          setStoreMode(false)
          setStoreModeUnread(false)
          void sendMessage(fa.shop.talkToSellerMessage)
        }}
        onSelectHistory={handleSelectHistory}
        onNewChat={() => setNewChatConfirmOpen(true)}
        onSendOtp={sendBuyerOtp}
        onVerifyOtp={verifyBuyerOtp}
      />

      <ConfirmDialog
        open={newChatConfirmOpen}
        message={fa.shop.v2.newChatConfirm}
        confirmLabel={fa.shop.v2.newChatConfirmYes}
        cancelLabel={fa.shop.v2.cancel}
        onCancel={() => setNewChatConfirmOpen(false)}
        onConfirm={() => {
          setNewChatConfirmOpen(false)
          void startNewChat()
        }}
      />
    </div>
  )
}
