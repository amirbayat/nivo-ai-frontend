import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShopChat } from '@/hooks/useShopChat'
import { ShopProductsView } from '@/components/shop/ShopProductsView'
import { ProductSheet } from '@/components/shop/ProductSheet'
import { ReviewsModal } from '@/components/shop/ReviewsModal'
import { fetchPublicProductsByIds, useStoreProducts } from '@/hooks/useStoreProducts'
import { CommentModal } from '@/components/shop/CommentModal'
import { CheckoutProgressBar } from '@/components/shop/CheckoutProgressBar'
import { LeadHero } from '@/components/shop/LeadHero'
import { LeadSignupContext } from '@/components/shop/LeadSignupContext'
import { SignupCard } from '@/components/shop/SignupCard'
import { ShopHeader } from '@/components/shop/ShopHeader'
import { ShopViewSwitch, type ShopView } from '@/components/shop/ShopViewSwitch'
import { ShopMenuSheet } from '@/components/shop/ShopMenuSheet'
import { ChatThread } from '@/components/shop/ChatThread'
import { AskBar } from '@/components/shop/AskBar'
import { CartSheet } from '@/components/shop/CartSheet'
import { CartBar } from '@/components/shop/CartBar'
import { CheckoutSheet, CHECKOUT_STATES, DONE_STATES, checkoutStepFor } from '@/components/shop/CheckoutSheet'
import { OrderPinnedCard } from '@/components/shop/OrderPinnedCard'
import { applyCartOps, cartCountOf, isCartStale, optimisticTotal, type CartLineView } from '@/lib/optimisticCart'
import { computePinnedOrder } from '@/lib/orderPinned'
import { isBuyerVerified, markBuyerVerified } from '@/lib/buyerVerified'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AboutStoreSheet } from '@/components/shop/AboutStoreSheet'
import { ChatEndPanel, ReadOnlyBar, ShopLoadingSkeleton, ShopMessageScreen } from '@/components/shop/ShopEdgeScreens'
import { useStoreAbout } from '@/hooks/useStoreAbout'
import { useToastStore } from '@/store/toast.store'
import { fa } from '@/locales/fa'
import type { PublicProduct, ShopAction, ShopHistoryEntry } from '@/types/api'

// HANDOFF_HUMAN/REJECTED عمداً اینجا نیستند — بعد از escalate یا رد سفارش، مشتری باید بتواند
// مستقیم با فروشنده چت کند (پنل فروشنده، تب «نیاز به توجه»؛ بک‌اند با isMutedForHuman پیام را
// از موتور مکالمه‌ی رباتی رد نمی‌کند)؛ فقط COMPLETED واقعاً پایانی است
const TERMINAL_STATES = ['COMPLETED']
// حالت‌هایی که دیگر ربات جواب نمی‌دهد و انسان (فروشنده) پاسخ‌گوست — برای بنر «منتقل شد»
const CHECKOUT_BLOCK_TYPES = ['ADDRESS_PROMPT', 'PAYMENT_METHOD_PROMPT', 'PAYMENT_INSTRUCTIONS', 'SNAPPPAY_PAYMENT_INSTRUCTIONS', 'ORDER_STATUS']
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
    mode,
    submitLeadPhone,
    markLeadVerified,
    notFound,
    suspended,
    conversationId,
    getOrderTrackPath,
    serverVerified,
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
    pendingCartOps,
    cartAdd,
    cartSetQty,
    cartRemove,
    cartListenerRef,
    logUiEvent,
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
  // docs/PRD-nivo-lead-shop-seller-signup.md §4.4 — فروشگاه لید (صفحه‌ی ثبت‌نام نیوو): هیچ UI سفارش‌محوری نمایش داده نمی‌شود
  const isLead = mode === 'LEAD'
  const [menuOpen, setMenuOpen] = useState(false)
  // کارت ثبت‌نام باز شده توسط خود کاربر (چیپ/هدر/منو) — بالای نوار پرسش، نه مودال (کیبورد مرورگر اینستاگرام)
  const [signupOpen, setSignupOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { about, failed: aboutFailed, reload: reloadAbout } = useStoreAbout(slug)
  const addToast = useToastStore((s) => s.addToast)
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false)
  // docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
  const [reviewProduct, setReviewProduct] = useState<PublicProduct | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  // docs/PRD-fixes-after-buyer-redesign.md F3 — «ادامه» وسط پاسخ تایپی: شیت باز می‌ماند و CONFIRM_CART بعد از پایان نوبت می‌رود
  const [continuing, setContinuing] = useState(false)
  // شیت پرداخت (§6.7): فقط بعد از اکشن خودِ خریدار خودکار باز می‌شود؛ با رفرش/ورود برگشتی هرگز
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [doneStep, setDoneStep] = useState(false)
  const [orderHighlight, setOrderHighlight] = useState(false)
  const [localVerified, setVerified] = useState(() => isBuyerVerified(slug))
  const verified = localVerified || serverVerified
  const autoOpenArmedRef = useRef(false)
  const doneArmedRef = useRef(false)
  const wasSendingRef = useRef(false)
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
  // ورود F — فروشگاه بدون محصول فعال: فقط گفتگو؛ در حالت لید همیشه گفتگو (حتی اگر بعداً محصولی اضافه شد)
  const noProducts = catalog.loaded && catalog.catalogTotal === 0
  const view: ShopView = isLead || viewingHistory || noProducts || urlWantsChat || bootChat ? 'chat' : 'products'

  // UTM لینک اینستاگرام (§5.6): یک‌بار در sessionStorage نگه داشته می‌شود تا با رفرش یا حذف از URL از دست نرود
  useEffect(() => {
    try {
      const found: Record<string, string> = {}
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
        const v = searchParams.get(key)?.trim().slice(0, 100)
        if (v) found[key] = v
      }
      if (Object.keys(found).length > 0) sessionStorage.setItem('nivo:leadUtm', JSON.stringify(found))
    } catch {
      /* بدون sessionStorage UTM ثبت نمی‌شود */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // عنوان تب در حالت لید؛ EventsPageViewTracker فقط روی تغییر مسیر عنوان را می‌نویسد، پس این effect بعد از لود mode می‌ماند
  useEffect(() => {
    if (isLead) document.title = fa.shop.lead.tabTitle
  }, [isLead])


  // فیدبک کاربر ۱۴۰۵/۰۷/۱۸ — وقتی از «سفارش‌های من» با ?viewOrder=<conversationId> می‌آید، همان
  // مکانیزم فقط‌خواندنی تاریخچه (viewHistoryEntry) را صدا می‌زنیم؛ باید صبر کنیم تا مکالمه‌ی
  // زنده واقعاً لود شده باشد (conversationId آماده) وگرنه viewHistoryEntry چیزی برای برگشتن
  // (liveSessionRef) ندارد
  useEffect(() => {
    if (!viewOrderConversationId || !conversationId) return
    if (viewOrderConversationId !== conversationId) {
      void viewHistoryEntry({ conversationId: viewOrderConversationId })
    }
    // F16: فقط viewOrder برداشته می‌شود؛ بقیه‌ی پارامترها (مثل view=chat) می‌مانند
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        n.delete('viewOrder')
        return n
      },
      { replace: true },
    )
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
    openProductById(linkProductId, 'link')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkProductId, loading, slug, setSearchParams])

  // docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۱ — وقتی منتظر
  // نظریم، با این‌که state همچنان COMPLETED (ترمینال) است، ورودی باید باز بماند تا خریدار
  // بتواند متن/صوت/عکس/ویدیوی نظرش را همین‌جا بفرستد
  // D4: در حالت لید ورودی هیچ‌وقت به‌خاطر پایان گفتگو قفل نمی‌شود
  const inputLocked = viewingHistory || (!isLead && TERMINAL_STATES.includes(state) && !awaitingReview && !awaitingSatisfaction)
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

  // F16: بلاک آخرین مرحله ممکن است خارج از ۵۰ رویداد آخر باشد؛ یک‌بار پیام‌های قدیمی‌تر را می‌گیریم
  // و اگر باز هم نبود، شیت «دوباره امتحان کن» نشان می‌دهد (نه بارگذاری بی‌پایان)
  const [checkoutGaveUp, setCheckoutGaveUp] = useState(false)
  const olderTriedRef = useRef(false)
  const hasCheckoutBlock = thread.some((m) => m.uiBlock && CHECKOUT_BLOCK_TYPES.includes(m.uiBlock.type))
  useEffect(() => {
    if (!checkoutOpen || hasCheckoutBlock) {
      setCheckoutGaveUp(false)
      return
    }
    if (hasMoreEvents && !olderTriedRef.current) {
      olderTriedRef.current = true
      void loadOlderMessages().finally(() => setCheckoutGaveUp(true))
    } else if (!hasMoreEvents) {
      setCheckoutGaveUp(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, hasCheckoutBlock, hasMoreEvents])
  function retryCheckoutLoad() {
    setCheckoutGaveUp(false)
    olderTriedRef.current = false
    void loadOlderMessages().finally(() => setCheckoutGaveUp(true))
  }

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
  // سبد خوش‌بینانه: آخرین CART_SUMMARY سرور + عملیات در انتظار (§8)
  const serverLines = useMemo<CartLineView[]>(() => cartSummary?.items ?? [], [cartSummary])
  const cartLines = useMemo(() => applyCartOps(serverLines, pendingCartOps), [serverLines, pendingCartOps])
  const cartCount = cartCountOf(cartLines)
  const cartTotal = optimisticTotal(serverLines, cartSummary?.total ?? 0, pendingCartOps)
  // ساعت تیک‌خور فقط وقتی عملیاتی در انتظار است تا «بیش از ۵ ثانیه» تشخیص داده شود
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    if (pendingCartOps.length === 0) return
    const timer = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pendingCartOps.length])
  const cartStale = isCartStale(pendingCartOps, nowTick)
  const cartEditable = !isLead && (state === 'GREETING' || state === 'BROWSING' || state === 'CART_REVIEW')

  useEffect(() => {
    if (!cartEditable) setCartOpen(false)
  }, [cartEditable])

  const cartProductIds = useMemo(() => new Set(cartLines.map((line) => line.productId)), [cartLines])

  // اطلاعات شناخته‌شده‌ی محصول برای شیت سبد: تصویر و سقف موجودی (کاتالوگ لودشده + کارت‌های چت)
  const imageKeys = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of catalog.items) if (p.images[0]) map.set(p.id, p.images[0])
    for (const m of messages) {
      if (m.uiBlock?.type === 'PRODUCT_CARD') for (const p of m.uiBlock.products) if (p.images[0] && !map.has(p.id)) map.set(p.id, p.images[0])
    }
    return map
  }, [catalog.items, messages])
  function stockLimit(line: CartLineView): number {
    const p = catalog.items.find((item) => item.id === line.productId)
    if (!p) return Infinity
    const variant = line.variantId ? p.variants?.find((v) => v.id === line.variantId) : null
    const stock = variant ? variant.stock : p.stock
    return stock >= 100000 ? Infinity : stock
  }
  const keyboardOpen = viewportHeight != null && window.innerHeight - viewportHeight > 120

  // افزودن از شیت محصول/کارت چت: همان لحظه روی UI اثر می‌کند، بعد با سرور هماهنگ می‌شود
  function addToCart(productId: string, variantId: string | undefined, product: PublicProduct | null | undefined, source: 'sheet' | 'chat_card') {
    const known = product ?? catalog.items.find((p) => p.id === productId) ?? null
    let name = known?.name
    let unitPrice = known?.basePrice
    let variantLabel: string | undefined
    if (known && variantId) {
      const variant = known.variants?.find((v) => v.id === variantId)
      if (variant) {
        unitPrice = variant.price ?? known.basePrice
        variantLabel = Object.values(variant.options).join('، ')
      }
    }
    if (!name || unitPrice == null) {
      for (const m of messages) {
        if (m.uiBlock?.type !== 'PRODUCT_CARD') continue
        const card = m.uiBlock.products.find((p) => p.id === productId)
        if (card) {
          name = card.name
          unitPrice = card.basePrice
        }
      }
    }
    cartAdd({ productId, variantId, name: name ?? '', unitPrice: unitPrice ?? 0, variantLabel, source })
  }

  // اکشن‌هایی که بعد از آن‌ها، اگر سرور وارد مرحله‌ی پرداخت شد، شیت خودکار باز می‌شود (§6.7)
  const AUTO_OPEN_ACTIONS = ['CONFIRM_CART', 'SUBMIT_ADDRESS', 'SELECT_ADDRESS', 'CONFIRM_ADDRESS', 'SELECT_PAYMENT_METHOD']
  function sendCheckoutAction(action: ShopAction) {
    if (AUTO_OPEN_ACTIONS.includes(action.type)) autoOpenArmedRef.current = true
    void sendAction(action)
  }
  useEffect(() => {
    if (!continuing || sending) return
    setContinuing(false)
    if (!cartOpen || !cartEditable) return
    setCartOpen(false)
    sendCheckoutAction({ type: 'CONFIRM_CART' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuing, sending])
  useEffect(() => {
    const finished = wasSendingRef.current && !sending
    wasSendingRef.current = sending
    if (!finished) return
    if (autoOpenArmedRef.current) {
      autoOpenArmedRef.current = false
      if (CHECKOUT_STATES.includes(state)) openCheckout(true)
    }
    if (doneArmedRef.current) {
      doneArmedRef.current = false
      if (DONE_STATES.includes(state)) {
        setDoneStep(true)
        openCheckout(true)
      }
    }
  }, [sending, state])
  async function uploadReceiptTracked(file: File) {
    doneArmedRef.current = true
    await uploadReceipt(file)
  }
  async function manualReceiptTracked(info: { cardLast4: string; approxTime: string; trackingCode?: string }) {
    doneArmedRef.current = true
    await submitManualReceipt(info)
  }
  // وقتی سفارش از مراحل پرداخت بیرون رفت (رد/تایید/گفتگوی تازه)، پرچم «رسید ثبت شد» پاک می‌شود
  useEffect(() => {
    if (!DONE_STATES.includes(state)) setDoneStep(false)
  }, [state])

  const pinned = !isLead && view === 'chat' && !viewingHistory ? computePinnedOrder(thread, state) : null
  async function trackOrder() {
    const path = pinned?.orderCode ? await getOrderTrackPath(pinned.orderCode) : null
    navigate(path ?? `/shop/${slug}/orders`)
  }
  function highlightOrder() {
    setOrderHighlight(true)
    document.getElementById('pinned-order')?.scrollIntoView({ block: 'nearest' })
    setTimeout(() => setOrderHighlight(false), 1500)
  }

  // B5: cart_add وقتی سرور جواب داد (latencyMs از لمس تا CART_SUMMARY)
  useEffect(() => {
    cartListenerRef.current = ({ op, ok, latencyMs }) => {
      if (op.kind === 'add') logUiEvent('cart_add', { productId: op.productId, source: op.source ?? 'sheet', latencyMs, ok })
    }
    return () => {
      cartListenerRef.current = null
    }
  }, [cartListenerRef, logUiEvent])

  // B5: shop_view یک‌بار بعد از بوت — ورود از لینک محصول، لینک فروشگاه، برگشتی یا تاریخچه (§3)
  const shopViewLoggedRef = useRef(false)
  useEffect(() => {
    if (loading || !bootDecided || !conversationId || shopViewLoggedRef.current) return
    shopViewLoggedRef.current = true
    if (isLead) logUiEvent('lead_view', { entry: messages.length > 0 ? 'returning' : 'first' })
    const entry = viewOrderConversationId ? 'history' : linkProductId ? 'product_link' : messages.length > 0 ? 'returning' : 'shop_link'
    logUiEvent('shop_view', { entry, view })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bootDecided, conversationId])

  // B5: checkout_sheet_opened {step, auto}
  function openCheckout(auto: boolean) {
    const step = checkoutStepFor(state, doneStep) ?? (DONE_STATES.includes(state) ? 'done' : 'payment')
    logUiEvent('checkout_sheet_opened', { step: step === 'method' ? 'method' : step, auto })
    setCheckoutOpen(true)
  }
  // دکمه‌ی «ثبت‌نام رایگان» (هدر/منو/چیپ): کارت ثبت‌نام داخل همین صفحه باز می‌شود، نه صفحه‌ی جدا (PRD §4.3)
  function goToSignup() {
    logUiEvent('lead_signup_open')
    setSignupOpen(true)
  }
  function openAbout() {
    logUiEvent('about_opened')
    setAboutOpen(true)
  }

  function goToView(next: ShopView) {
    if (next === view) return
    if (next === 'chat') {
      // push: دکمه‌ی برگشت گوشی به نمای محصولات برمی‌گردد (§Edge 8)
      // F6: اگر الان روی entry یک شیت (closeOnBack) هستیم، همان را با صفحه‌ی گفتگو جایگزین می‌کنیم؛
      // وگرنه entry شیت در تاریخچه می‌ماند و یک «برگشت» اضافه بی‌اثر می‌شود
      const onSheetEntry = !!window.history.state?.nivoSheet
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.set('view', 'chat')
          return n
        },
        onSheetEntry ? { replace: true } : undefined,
      )
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

  function openProduct(product: PublicProduct, source: 'grid' | 'chat_card' | 'link' = 'grid') {
    logUiEvent('product_sheet_opened', { productId: product.id, source })
    setSheet({ productId: product.id, product, status: 'ready' })
  }

  // از کارت چت یا لینک: اول کاتالوگ لودشده، وگرنه یک ids= (اسکلت تا رسیدن؛ ناپیدا = «در دسترس نیست»)
  function openProductById(productId: string, source: 'chat_card' | 'link' = 'chat_card') {
    const known = catalog.items.find((p) => p.id === productId)
    if (known) {
      openProduct(known, source)
      return
    }
    logUiEvent('product_sheet_opened', { productId, source })
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

  function pickLeadChip(label: string) {
    const t = fa.shop.lead
    if (label === t.chipSignup) {
      logUiEvent('lead_chip_signup')
      goToSignup()
      return
    }
    const key = label === t.chipHow ? 'how' : label === t.chipPrice ? 'price' : 'demo'
    logUiEvent(`lead_chip_${key}`)
    // دمو: همان تب (مرورگر اینستاگرام تب جدید را بد باز می‌کند — PRD §5.4)؛ بدون فراخوان مدل
    if (key === 'demo') {
      navigate('/demo/seller')
      return
    }
    void sendMessage(label)
  }

  function sendFromAskBar(text: string) {
    if (view === 'products') {
      logUiEvent('ask_from_products')
      goToView('chat')
    }
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
  const showEndPanel = !isLead && completed && !awaitingReview && !awaitingSatisfaction && !viewingHistory
  const lastMessage = messages[messages.length - 1]
  // حالت لید: قبل از اولین پیام، چیپ‌های ثابت صفحه‌ی اول (§4.1)؛ بعدش پاسخ‌های سریع سرور
  const leadChips = [fa.shop.lead.chipHow, fa.shop.lead.chipPrice, fa.shop.lead.chipDemo, fa.shop.lead.chipSignup]
  const showLeadChips = isLead && view === 'chat' && !sending && thread.length === 0 && !viewingHistory
  const quickReplies = showLeadChips ? leadChips : view === 'chat' && !sending && lastMessage?.role === 'agent' ? (lastMessage.quickReplies ?? []) : []
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

  const leadApi = {
    conversationId: conversationId ?? null,
    submitPhone: submitLeadPhone,
    markVerified: markLeadVerified,
    logEvent: (name: string) => logUiEvent(name),
  }

  return (
    <LeadSignupContext.Provider value={leadApi}>
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
        onOpenAbout={openAbout}
        onOpenMenu={() => setMenuOpen(true)}
        brandLogo={isLead}
        leadCta={isLead && !verified ? { label: fa.shop.lead.headerCta, onClick: goToSignup } : undefined}
      />

      {!isLead && !noProducts && !viewingHistory && (
        <ShopViewSwitch view={view} onChange={goToView} chatUnread={chatUnread} />
      )}

      {pinned && (
        <OrderPinnedCard
          order={pinned}
          highlight={orderHighlight}
          onContinue={() => openCheckout(false)}
          onTrack={trackOrder}
          onScrollToRefund={() => {
            const forms = document.querySelectorAll('[data-refund-form]')
            const last = forms[forms.length - 1]
            if (last) last.scrollIntoView({ block: 'center', behavior: 'smooth' })
            else useToastStore.getState().addToast(fa.shop.v2.refundFormNotFound)
          }}
        />
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
          onOpenProduct={(p) => openProduct(p, 'grid')}
          onAskSeller={(q) => {
            logUiEvent('ask_from_products')
            goToView('chat')
            void sendMessage(q)
          }}
        />
      )}

      {view === 'chat' && (
        <>
          {/* QA-19 — وقتی شیت پرداخت باز است نوار بالا مخفی می‌شود تا دو مرحله‌نما هم‌زمان دیده نشوند */}
          {!isLead && !checkoutOpen && <CheckoutProgressBar state={state} />}
          {thread.length === 0 && !sending && isLead ? (
            <LeadHero />
          ) : thread.length === 0 && !sending ? (
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
              onOpenCheckout={() => openCheckout(false)}
              checkoutState={state}
              onHighlightOrder={highlightOrder}
              onOpenProduct={openProductById}
              onSeeAllProducts={() => goToView('products')}
              onLoadOlder={() => void loadOlderMessages()}
              onRetry={(id) => void retryMessage(id)}
              onMarkVoiceHeard={markVoiceHeard}
              onAddToCart={(id) => addToCart(id, undefined, null, 'chat_card')}
              onSubmitRefundDestination={submitRefundDestination}
              onSendAction={(action) => sendCheckoutAction(action)}
            />
          )}
        </>
      )}

      {cartEditable && cartCount > 0 && !viewingHistory && !keyboardOpen && (
        <CartBar count={cartCount} total={cartTotal} stale={cartStale} onOpen={() => setCartOpen(true)} />
      )}

      {isLead && signupOpen && !viewingHistory && (
        <div className="max-h-[60%] shrink-0 overflow-y-auto px-3 pb-2">
          <SignupCard autoFocus onClose={() => setSignupOpen(false)} />
        </div>
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
                : isLead
                  ? fa.shop.lead.askPlaceholder
                  : fa.shop.v2.askPlaceholderChat
          }
          quickReplies={quickReplies}
          onPickQuickReply={showLeadChips ? pickLeadChip : sendFromAskBar}
          focusToken={focusToken}
          onSendText={sendFromAskBar}
          onSendImage={(file) => void sendImageMessage(file)}
          onSendVideo={(file) => void sendVideoMessage(file)}
          onSendVoice={(blob) => void sendVoiceMessage(blob)}
        />
      )}

      <CartSheet
        open={cartOpen && cartEditable}
        onClose={() => setCartOpen(false)}
        lines={cartLines}
        total={cartTotal}
        stale={cartStale}
        pending={pendingCartOps.length > 0}
        continuing={continuing}
        requiresShipping={catalog.requiresShipping}
        freeShipping={catalog.shippingEstimate?.maxCostToman === 0}
        imageKeys={imageKeys}
        stockLimit={stockLimit}
        disabled={actionDisabled}
        onSetQty={(line, qty) => cartSetQty(line, qty)}
        onRemove={(line) => cartRemove(line)}
        onContinue={() => {
          if (sending) {
            setContinuing(true)
            return
          }
          setCartOpen(false)
          sendCheckoutAction({ type: 'CONFIRM_CART' })
        }}
        onSeeProducts={() => {
          setCartOpen(false)
          goToView('products')
        }}
      />

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        state={state}
        doneStep={doneStep}
        messages={thread}
        loadGaveUp={checkoutGaveUp}
        onRetryLoad={retryCheckoutLoad}
        requiresShipping={catalog.requiresShipping}
        storeName={storeName}
        about={about}
        disabled={sending || actionDisabled}
        error={error}
        verified={verified}
        onVerified={() => {
          markBuyerVerified(slug)
          setVerified(true)
        }}
        onSendAction={sendCheckoutAction}
        onUploadReceipt={(file) => void uploadReceiptTracked(file)}
        onSubmitManualReceipt={(info) => void manualReceiptTracked(info)}
        onSendOtp={sendBuyerOtp}
        onVerifyOtp={verifyBuyerOtp}
        onAsk={() => {
          setCheckoutOpen(false)
          goToView('chat')
          setPendingFocus(true)
        }}
        onBackToChat={() => {
          setCheckoutOpen(false)
          setDoneStep(false)
          goToView('chat')
        }}
      />

      <ProductSheet
        open={sheet != null}
        onClose={() => setSheet(null)}
        product={sheet?.product ?? null}
        unavailable={sheet?.status === 'unavailable'}
        slug={slug}
        shippingEstimate={catalog.shippingEstimate ?? null}
        shippingDaysText={catalog.shippingDaysText}
        disabled={actionDisabled}
        sellerReplying={sellerIsReplying && !viewingHistory}
        inCart={sheet ? cartProductIds.has(sheet.productId) : false}
        saved={sheet ? savedProductIds.has(sheet.productId) : false}
        onAddToCart={(id, variantId) => addToCart(id, variantId, sheet?.product, 'sheet')}
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
        leadMode={isLead}
      />

      <ShopMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        history={history}
        hideTalkToSeller={sellerIsReplying || viewingHistory}
        talkToSellerDisabled={composerDisabled}
        // replace: entry شیت (closeOnBack) جایگزین صفحه‌ی سفارش‌ها می‌شود، پس «بازگشت» مستقیم به فروشگاه می‌رسد
        onOrders={() => navigate(`/shop/${slug}/orders`, { replace: true })}
        leadMode={isLead}
        onSignup={goToSignup}
        onTalkToSeller={() => {
          goToView('chat')
          void sendMessage(fa.shop.talkToSellerMessage)
        }}
        onSelectHistory={handleSelectHistory}
        onNewChat={() => setNewChatConfirmOpen(true)}
        storeName={storeName}
        onAbout={openAbout}
        onItem={(item) => logUiEvent('menu_item', { item })}
        verified={verified}
        onVerified={() => {
          markBuyerVerified(slug)
          setVerified(true)
        }}
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
    </LeadSignupContext.Provider>
  )
}
