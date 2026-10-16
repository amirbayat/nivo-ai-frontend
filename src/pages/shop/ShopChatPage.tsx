import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopProductsView } from '@/components/shop/ShopProductsView'
import { ProductSheet } from '@/components/shop/ProductSheet'
import { ReviewsModal } from '@/components/shop/ReviewsModal'
import { fetchPublicProductsByIds, useStoreProducts } from '@/hooks/useStoreProducts'
import { CommentModal } from '@/components/shop/CommentModal'
import { CheckoutProgressBar } from '@/components/shop/CheckoutProgressBar'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { ShopViewSwitch, type ShopView } from '@/components/shop/ShopViewSwitch'
import { ShopMenuSheet } from '@/components/shop/ShopMenuSheet'
import { ChatThread } from '@/components/shop/ChatThread'
import { AskBar } from '@/components/shop/AskBar'
import { CartSheet } from '@/components/shop/CartSheet'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AboutStoreSheet } from '@/components/shop/AboutStoreSheet'
import { ChatEndPanel, ReadOnlyBar, ShopLoadingSkeleton, ShopMessageScreen } from '@/components/shop/ShopEdgeScreens'
import { useStoreAbout } from '@/hooks/useStoreAbout'
import { useToastStore } from '@/store/toast.store'
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
  const [aboutOpen, setAboutOpen] = useState(false)
  const { about, failed: aboutFailed, reload: reloadAbout } = useStoreAbout(slug)
  const addToast = useToastStore((s) => s.addToast)
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false)
  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
  const [reviewProduct, setReviewProduct] = useState<PublicProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(false)
  const prevMessageCountRef = useRef(messages.length)
  const catalog = useStoreProducts(slug, true)

  // docs/PRD-buyer-chat-redesign.md §3 — لینک محصول (?product=): شیت همان محصول روی نمای محصولات باز
  // می‌شود؛ پارامتر بعد از مصرف از URL برداشته می‌شود (ورود A)
  const [linkProductId] = useState(() => searchParams.get('product'))
  const [sheet, setSheet] = useState<{ productId: string; product: PublicProduct | null; status: 'loading' | 'ready' | 'unavailable' } | null>(null)
  const [reviewsProduct, setReviewsProduct] = useState<PublicProduct | null>(null)
  // «سوال دارم»: محصولِ متمرکز تا خریدار از گفتگو برگردد؛ placeholder و فوکوس نوار پرسش از آن می‌آید
  const [focusedProduct, setFocusedProduct] = useState<PublicProduct | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [pendingFocus, setPendingFocus] = useState(false)

  // نما از URL می‌آید (?view=chat)؛ خریدار برگشتی با گفتگوی موجود، یک بار و بدون پرش بصری به گفتگو می‌رود
  // (ورود C/D)، مگر با لینک محصول بیاید
  const [bootDecided, setBootDecided] = useState(false)
  const urlWantsChat = searchParams.get('view') === 'chat'
  const bootChat = !loading && !bootDecided && messages.length > 0 && !linkProductId
  useLayoutEffect(() => {
    if (loading || bootDecided) return
    setBootDecided(true)
    if (bootChat && !urlWantsChat) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('view', 'chat')
          return next
        },
        { replace: true },
      )
    }
  }, [loading, bootDecided, bootChat, urlWantsChat, setSearchParams])
  // ورود F — فروشگاه بدون محصول فعال: فقط گفتگو
  const noProducts = catalog.loaded && catalog.catalogTotal === 0
  const view: ShopView = viewingHistory || noProducts || urlWantsChat || bootChat ? 'chat' : 'products'

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

  // قطع اینترنت: toast بالا؛ حباب ارسال‌نشده خودش «دوباره» دارد (§6.14)
  useEffect(() => {
    const onOffline = () => addToast(fa.shop.v2.offline, 5000)
    window.addEventListener('offline', onOffline)
    return () => window.removeEventListener('offline', onOffline)
  }, [addToast])

  // وقتی روی نمای «محصولات» هستیم (نخ چت پشت آن است) و پیام تازه‌ای می‌رسد (مثلاً پاسخ به
  // ADD_TO_CART از شیت)، نقطه‌ی قرمز روی تب «گفتگو» نشان بده — همان الگوی ویجت‌های Intercom/Crisp
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && view === 'products') setChatUnread(true)
    prevMessageCountRef.current = messages.length
  }, [messages.length, view])

  // فوکوس نوار پرسش بعد از «سوال دارم» — وقتی نوبت سرور (FOCUS_PRODUCT) تمام شد و فیلد دوباره فعال است
  useEffect(() => {
    if (pendingFocus && !sending) {
      setFocusToken((t) => t + 1)
      setPendingFocus(false)
    }
  }, [pendingFocus, sending])

  // لینک محصول: بعد از بوت، شیت را باز کن (از کاتالوگ لودشده یا با یک ids=) و ?product= را بردار
  const linkConsumedRef = useRef(false)
  useEffect(() => {
    if (!linkProductId || loading || linkConsumedRef.current) return
    linkConsumedRef.current = true
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('product')
        return next
      },
      { replace: true },
    )
    openProductById(linkProductId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkProductId, loading, slug, setSearchParams])

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

  function goToView(next: ShopView) {
    if (next === view) return
    if (next === 'chat') {
      // push: دکمه‌ی برگشت گوشی به نمای محصولات برمی‌گردد (§Edge 8)
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev)
        n.set('view', 'chat')
        return n
      })
      setChatUnread(false)
    } else {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.delete('view')
          return n
        },
        { replace: true },
      )
      setFocusedProduct(null)
    }
  }

  function openProduct(product: PublicProduct) {
    setSheet({ productId: product.id, product, status: 'ready' })
  }

  // از کارت چت یا لینک: اول کاتالوگ لودشده، وگرنه یک ids= (اسکلت تا رسیدن؛ ناپیدا = «در دسترس نیست»)
  function openProductById(productId: string) {
    const known = catalog.items.find((p) => p.id === productId)
    if (known) {
      openProduct(known)
      return
    }
    setSheet({ productId, product: null, status: 'loading' })
    void fetchPublicProductsByIds(slug, [productId]).then((found) => {
      const product = found?.[0] ?? null
      setSheet((current) =>
        current?.productId === productId ? (product ? { productId, product, status: 'ready' } : { productId, product: null, status: 'unavailable' }) : current,
      )
    })
  }

  // «سوال دارم»: شیت بسته، رفتن به گفتگو، FOCUS_PRODUCT قطعی (بدون مدل) و فوکوس نوار پرسش
  function askAboutProduct(product: PublicProduct) {
    setSheet(null)
    setFocusedProduct(product)
    goToView('chat')
    void sendAction({ type: 'FOCUS_PRODUCT', productId: product.id })
    setPendingFocus(true)
  }

  function sendFromAskBar(text: string) {
    if (view === 'products') goToView('chat')
    void sendMessage(text)
  }

  function handleSelectHistory(entry: ShopHistoryEntry) {
    void viewHistoryEntry(entry)
  }

  // یادداشت بالای نوار پرسش: فقط وقتی منتظر نظر/پاسخ رضایت هستیم. پیام «منتقل شد» حذف شد؛ جایش خط
  // «چه کسی جواب می‌دهد» در هدر و خط سیستمی داخل نخ است (§6.8، §6.10)
  const completed = TERMINAL_STATES.includes(state)
  let notice: { text: string; tone: 'muted' | 'hint' } | null = null
  if (completed && awaitingReview) notice = { text: fa.shop.v2.reviewChip, tone: 'hint' }
  else if (completed && awaitingSatisfaction) notice = { text: fa.shop.v2.satisfactionChip, tone: 'hint' }
  const showEndPanel = completed && !awaitingReview && !awaitingSatisfaction && !viewingHistory
  const lastMessage = messages[messages.length - 1]
  const quickReplies = view === 'chat' && !sending && lastMessage?.role === 'agent' ? (lastMessage.quickReplies ?? []) : []
  const handoffLine =
    sellerIsReplying && !viewingHistory
      ? about?.approvalEtaLabel
        ? fa.shop.v2.handoffLine(storeName ?? '', about.approvalEtaLabel)
        : fa.shop.v2.handoffLineNoEta(storeName ?? '')
      : null
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  if (suspended) {
    return <ShopMessageScreen heading={fa.shop.suspendedHeading} body={fa.shop.suspendedBody} storeId={storeId} storeName={storeName} storeLogoKey={storeLogoKey} onBack={goBack} />
  }

  if (notFound) {
    return <ShopMessageScreen heading={fa.shop.notFoundHeading} body={fa.shop.notFoundBody} onBack={goBack} />
  }

  if (loading) return <ShopLoadingSkeleton />

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
        cartCount={cartEditable && !viewingHistory ? cartCount : 0}
        onOpenCart={() => setCartOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {!noProducts && !viewingHistory && (
        <ShopViewSwitch view={view} onChange={goToView} chatUnread={chatUnread} />
      )}

      {isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <span className="text-xs text-[var(--shop-warning)]">{fa.shop.v2.demoStrip}</span>
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
            {fa.shop.v2.demoCta}
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

      {view === 'products' && (
        <ShopProductsView
          catalog={catalog}
          about={about}
          savedProductIds={savedProductIds}
          savedItems={savedProducts}
          onToggleSave={toggleSaveProduct}
          onOpenProduct={openProduct}
          onAskSeller={(q) => {
            goToView('chat')
            void sendMessage(q)
          }}
        />
      )}

      {view === 'chat' && (
        <>
          <CheckoutProgressBar state={state} />
          {thread.length === 0 && !sending ? (
            <p className="flex-1 px-4 pt-6 text-center text-sm text-[var(--shop-text-2)]">
              {noProducts ? fa.shop.v2.catalogEmptyChat : fa.shop.v2.chatEmptyHint}
            </p>
          ) : (
            <ChatThread
              thread={thread}
              messages={messages}
              conversationId={conversationId}
              storeId={storeId}
              storeName={storeName}
              storeLogoKey={storeLogoKey}
              hasMoreEvents={hasMoreEvents}
              viewingHistory={viewingHistory}
              sending={sending}
              streamNote={streamNote}
              error={error}
              composerDisabled={composerDisabled}
              actionDisabled={actionDisabled}
              refundFormDisabled={refundFormDisabled}
              sellerIsReplying={sellerIsReplying}
              handoffLine={handoffLine}
              viewportHeight={viewportHeight}
              cartProductIds={cartProductIds}
              cartTappable={cartEditable && !viewingHistory}
              onOpenCart={() => setCartOpen(true)}
              onOpenProduct={openProductById}
              onSeeAllProducts={() => goToView('products')}
              onLoadOlder={() => void loadOlderMessages()}
              onRetry={(id) => void retryMessage(id)}
              onMarkVoiceHeard={markVoiceHeard}
              onAddToCart={(id) => void sendAction({ type: 'ADD_TO_CART', productId: id })}
              onUploadReceipt={(file) => void uploadReceipt(file)}
              onSubmitManualReceipt={(info) => void submitManualReceipt(info)}
              onSubmitRefundDestination={submitRefundDestination}
              onSendAction={(action) => void sendAction(action)}
            />
          )}
        </>
      )}

      {viewingHistory ? (
        <ReadOnlyBar onReturn={() => void returnToCurrentChat()} />
      ) : showEndPanel ? (
        <ChatEndPanel onNewOrder={() => setNewChatConfirmOpen(true)} onMyOrders={() => navigate(`/shop/${slug}/orders`)} />
      ) : (
        <AskBar
          key={conversationId ?? 'none'}
          disabled={composerDisabled}
          canAttachImage={canAttachImage}
          canAttachVideo={canAttachVideo}
          notice={view === 'chat' ? notice : null}
          placeholder={
            view === 'products'
              ? fa.shop.v2.askPlaceholderProducts
              : focusedProduct
                ? fa.shop.v2.askPlaceholderProduct(focusedProduct.name)
                : fa.shop.v2.askPlaceholderChat
          }
          quickReplies={quickReplies}
          onPickQuickReply={sendFromAskBar}
          focusToken={focusToken}
          onSendText={sendFromAskBar}
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

      <ProductSheet
        open={sheet != null}
        onClose={() => setSheet(null)}
        product={sheet?.product ?? null}
        unavailable={sheet?.status === 'unavailable'}
        slug={slug}
        shippingEstimate={catalog.shippingEstimate ?? null}
        shippingDaysText={catalog.shippingDaysText}
        disabled={actionDisabled || sending}
        inCart={sheet ? cartProductIds.has(sheet.productId) : false}
        saved={sheet ? savedProductIds.has(sheet.productId) : false}
        onAddToCart={(id, variantId) => void sendAction({ type: 'ADD_TO_CART', productId: id, ...(variantId ? { variantId } : {}) })}
        onAskAbout={askAboutProduct}
        onSeeOthers={() => setSheet(null)}
        onToggleSave={() => sheet && toggleSaveProduct(sheet.productId)}
        onWriteReview={() => sheet?.product && setReviewProduct(sheet.product)}
        onViewReviews={() => sheet?.product && setReviewsProduct(sheet.product)}
        onNotifyStock={subscribeStockAlert}
        onSendBuyerOtp={sendBuyerOtp}
        onVerifyBuyerOtp={verifyBuyerOtp}
      />

      {reviewsProduct && <ReviewsModal slug={slug} product={reviewsProduct} onClose={() => setReviewsProduct(null)} />}

      <AboutStoreSheet
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        storeId={storeId}
        storeName={storeName}
        storeLogoKey={storeLogoKey}
        about={about}
        failed={aboutFailed}
        onReload={() => void reloadAbout()}
      />

      <ShopMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        history={history}
        hideTalkToSeller={sellerIsReplying || viewingHistory}
        talkToSellerDisabled={composerDisabled}
        // replace: entry شیت (closeOnBack) جایگزین صفحه‌ی سفارش‌ها می‌شود، پس «بازگشت» مستقیم به فروشگاه می‌رسد
        onOrders={() => navigate(`/shop/${slug}/orders`, { replace: true })}
        onTalkToSeller={() => {
          goToView('chat')
          void sendMessage(fa.shop.talkToSellerMessage)
        }}
        onSelectHistory={handleSelectHistory}
        onNewChat={() => setNewChatConfirmOpen(true)}
        storeName={storeName}
        onAbout={() => setAboutOpen(true)}
        onSendOtp={sendBuyerOtp}
        onVerifyOtp={verifyBuyerOtp}
      />

      <ConfirmDialog
        open={newChatConfirmOpen}
        // 0.13o — با سفارش پرداخت‌نشده/منتظر تایید، «گفتگوی جدید» خریدار را از سفارشش جدا می‌کند؛ هشدار قوی‌تر
        message={state === 'AWAITING_PAYMENT' || state === 'AWAITING_SELLER_APPROVAL' ? fa.shop.newChatWithOpenOrderWarning : fa.shop.v2.newChatConfirm}
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
