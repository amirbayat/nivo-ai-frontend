import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MicButton } from '@/components/ui/MicButton'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { RejectOrderSheet } from '@/components/seller/RejectOrderSheet'
import { ShipOrderSheet } from '@/components/seller/ShipOrderSheet'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { shareOrCopy } from '@/lib/shareLink'
import { useToastStore } from '@/store/toast.store'
import {
  useApproveOrder,
  useAttentionSuggestions,
  useCreateKbEntry,
  useMyStores,
  useSellerDashboard,
  useShippingRules,
  useStoreCompleteness,
  useStoreCredit,
  useStoreToday,
  useUpdateProduct,
  useUpdateStore,
} from '@/queries/seller.queries'
import { useDismissAttentionTopic, useMarkLaunchShared } from '@/queries/sellerV2.queries'
import type { AttentionSuggestionTopic, SellerOrder } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'
import { PaymentsSetup } from './PaymentsSetup'
// import { SellerTestChatSheet } from './SellerTestChatSheet'

const t = fa.seller.v2.today
const toFa = (n: number | string) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
const money = (n: number) => toFa(n.toLocaleString('en-US').replace(/,/g, '٬'))
const UNDO_MS = 5000

function relative(from: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(from).getTime()) / 60000))
  if (mins < 60) return t.minutes(toFa(mins))
  const hours = Math.round(mins / 60)
  if (hours < 24) return t.hours(toFa(hours))
  return t.days(toFa(Math.round(hours / 24)))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-slate-100 light:text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function Row({ children, tone }: { children: React.ReactNode; tone?: 'amber' | 'red' }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-2xl border px-3 py-3',
        tone === 'amber'
          ? 'border-amber-500/30 bg-amber-500/10'
          : tone === 'red'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-slate-800 bg-slate-900/40 light:border-slate-200 light:bg-white',
      )}
    >
      {children}
    </div>
  )
}

function ReceiptThumb({ storeId, orderId }: { storeId: string; orderId: string }) {
  const [open, setOpen] = useState(false)
  const src = `/v2/stores/${storeId}/orders/${orderId}/receipt-image`
  const url = useAuthedImageUrl(src)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 light:border-slate-300 light:bg-slate-100">
        {url && <img src={url} alt="" className="size-full object-cover" />}
      </button>
      {open && <ImageLightbox src={src} onClose={() => setOpen(false)} analyticsSource="seller-today-receipt" />}
    </>
  )
}

// docs/PRD-seller-panel-simplification.md §4.7 — «۳ قدم تا اولین فروش»؛ هر قدم همان‌جا قابل انجام است
function LaunchCard({
  launch,
  storeId,
  storeSlug,
}: {
  launch: { hasActiveProduct: boolean; hasPaymentMethod: boolean; shared: boolean }
  storeId: string
  storeSlug: string
}) {
  const navigate = useNavigate()
  const markShared = useMarkLaunchShared(storeId)
  const addToast = useToastStore(s => s.addToast)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const steps = [launch.hasActiveProduct, launch.hasPaymentMethod, launch.shared]
  const done = steps.filter(Boolean).length
  const link = `${window.location.origin}/shop/${storeSlug}`

  function openShare() {
    setShareOpen(true)
    // باز شدن شیت = «لینک را فرستادم»؛ idempotent
    markShared.mutate()
  }

  const rows: { label: string; done: boolean; onClick: () => void }[] = [
    { label: t.step1, done: launch.hasActiveProduct, onClick: () => navigate('/seller/panel/products/new') },
    { label: t.step2, done: launch.hasPaymentMethod, onClick: () => setPaymentOpen(true) },
    { label: t.step3, done: launch.shared, onClick: openShare },
  ]

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-100 light:text-slate-900">{t.launchTitle}</h2>
        <span className="text-xs text-slate-400">{t.progress(toFa(done))}</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-800 light:bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / 3) * 100}%` }} />
      </div>
      {rows.map((r, i) => (
        <button key={r.label} type="button" onClick={r.onClick} className="flex w-full items-center gap-3 py-2.5 text-start">
          <span
            className={clsx(
              'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
              r.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-600 text-slate-400',
            )}
          >
            {r.done ? '✓' : toFa(i + 1)}
          </span>
          <span className={clsx('flex-1 text-sm', r.done ? 'text-slate-500 line-through' : 'font-bold text-slate-100 light:text-slate-900')}>{r.label}</span>
          {/* «ادامه/برو به» در RTL: شورون رو به چپ (CLAUDE.md) */}
          {!r.done && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5 shrink-0 text-slate-500" aria-hidden>
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          )}
        </button>
      ))}

      <BottomSheet open={paymentOpen} onClose={() => setPaymentOpen(false)} full>
        <PaymentsSetup />
      </BottomSheet>

      <BottomSheet open={shareOpen} onClose={() => setShareOpen(false)} title={t.shareTitle}>
        <p className="mb-3 text-xs text-slate-400">{t.shareHint}</p>
        <p dir="ltr" className="mb-3 break-all rounded-xl bg-slate-800/60 p-3 text-left font-mono text-xs text-emerald-300 light:bg-slate-100 light:text-emerald-700">
          {link}
        </p>
        <p className="mb-3 rounded-xl bg-slate-800/40 p-3 text-sm text-slate-300 light:bg-slate-50 light:text-slate-700">{t.shareBio(link)}</p>
        {!launch.hasPaymentMethod && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300 light:text-amber-700">
            <p>{t.noPaymentWarn}</p>
            <button
              type="button"
              onClick={() => {
                setShareOpen(false)
                setPaymentOpen(true)
              }}
              className="mt-2 font-bold underline"
            >
              {t.fixPayment}
            </button>
          </div>
        )}
        <div className="flex gap-2 pb-2">
          <button
            type="button"
            onClick={() => void shareOrCopy({ url: link, text: t.shareBio(link) }).then(r => r === 'copy' && addToast(t.copied))}
            className="h-12 flex-1 rounded-2xl bg-emerald-600 text-sm font-bold text-white"
          >
            {t.shareNative}
          </button>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(link).then(() => addToast(t.copied))}
            className="h-12 flex-1 rounded-2xl bg-slate-800 text-sm font-bold text-slate-100 light:bg-slate-100 light:text-slate-900"
          >
            {t.copyLink}
          </button>
        </div>
      </BottomSheet>
    </section>
  )
}

// «جواب بده» برای سوالی که بات بلد نبود: متن در همان فیلد مربوط ذخیره می‌شود و topic از کش پاک می‌شود
function TopicAnswerSheet({
  topic,
  storeId,
  onClose,
}: {
  topic: AttentionSuggestionTopic | null
  storeId: string
  onClose: () => void
}) {
  const stores = useMyStores()
  const store = stores.data?.find(s => s.id === storeId)
  const updateStore = useUpdateStore(storeId)
  const createKb = useCreateKbEntry(storeId)
  const dismiss = useDismissAttentionTopic(storeId)
  const [text, setText] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busy = updateStore.isPending || createKb.isPending || dismiss.isPending

  useEffect(() => {
    setText('')
    setError(null)
    setStart(store?.workingHoursStart ?? '')
    setEnd(store?.workingHoursEnd ?? '')
  }, [topic?.topic, store?.workingHoursStart, store?.workingHoursEnd])

  if (!topic) return <BottomSheet open={false} onClose={onClose}>{null}</BottomSheet>

  function finish() {
    dismiss.mutate(topic!.topic, { onSuccess: onClose })
  }

  function save() {
    setError(null)
    const field = topic!.field
    const onFail = (err: unknown) => setError(extractErrorMessage(err, t.answerTooLong))
    if (field === 'workingHours') {
      if (!start || !end) return
      updateStore.mutate({ workingHoursStart: start, workingHoursEnd: end }, { onSuccess: finish, onError: onFail })
      return
    }
    const answer = text.trim()
    if (!answer) return
    if (field === 'brandIntro' || field === 'returnPolicy' || field === 'shippingInfo') {
      const current = store?.[field] ?? ''
      updateStore.mutate({ [field]: current ? `${current}\n${answer}` : answer }, { onSuccess: finish, onError: onFail })
      return
    }
    createKb.mutate({ kind: 'FAQ', question: topic!.summary, answer }, { onSuccess: finish, onError: onFail })
  }

  const isHours = topic.field === 'workingHours'
  return (
    <BottomSheet
      open
      onClose={onClose}
      title={topic.topic}
      footer={
        <button type="button" onClick={save} disabled={busy || (isHours ? !start || !end : !text.trim())} className="h-12 w-full rounded-2xl bg-emerald-600 font-bold text-white disabled:opacity-40">
          {t.answerSave}
        </button>
      }
    >
      <p className="mb-3 text-xs text-slate-400">{topic.summary}</p>
      {isHours ? (
        <div className="grid grid-cols-2 gap-3 pb-2">
          <label className="text-xs text-slate-400">
            {t.workingHoursFrom}
            <input type="time" dir="ltr" value={start} onChange={e => setStart(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-700 bg-transparent px-3 text-slate-100 light:border-slate-300 light:text-slate-900" />
          </label>
          <label className="text-xs text-slate-400">
            {t.workingHoursTo}
            <input type="time" dir="ltr" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-700 bg-transparent px-3 text-slate-100 light:border-slate-300 light:text-slate-900" />
          </label>
        </div>
      ) : (
        <div className="relative pb-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder={t.answerPlaceholder}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pb-10 text-sm leading-7 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
          />
          <div className="absolute bottom-4 left-2">
            <MicButton storeId={storeId} onText={v => setText(prev => (prev ? `${prev} ${v}` : v))} />
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </BottomSheet>
  )
}

function RestockSheet({ product, storeId, onClose }: { product: { id: string; name: string } | null; storeId: string; onClose: () => void }) {
  const update = useUpdateProduct(storeId)
  const [value, setValue] = useState('')
  useEffect(() => setValue(''), [product?.id])
  return (
    <BottomSheet
      open={!!product}
      onClose={onClose}
      title={`${fa.seller.v2.products.restockTitle} — ${product?.name ?? ''}`}
      footer={
        <button
          type="button"
          disabled={value === '' || update.isPending}
          onClick={() => product && update.mutate({ productId: product.id, dto: { stock: Number(value) } }, { onSuccess: onClose })}
          className="h-12 w-full rounded-2xl bg-emerald-600 font-bold text-white disabled:opacity-40"
        >
          {fa.seller.v2.products.restockSave}
        </button>
      }
    >
      <DigitsInput styled kind="int" value={value} onChange={setValue} placeholder={fa.seller.v2.products.restockPlaceholder} autoFocus />
    </BottomSheet>
  )
}

// docs/PRD-seller-panel-simplification.md §4.9 — «امروز»: فقط چیزهایی که الان به فروشنده نیاز دارند
export function SellerTodayPage() {
  const { storeId, storeSlug } = useSellerStore()
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const today = useStoreToday(storeId)
  const completeness = useStoreCompleteness(storeId)
  const suggestions = useAttentionSuggestions(storeId)
  const credit = useStoreCredit(storeId)
  const dashboard = useSellerDashboard(storeId)
  const approve = useApproveOrder(storeId)
  const stores = useMyStores()
  const shippingRules = useShippingRules(storeId)

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [undo, setUndo] = useState<{ id: string; who: string } | null>(null)
  const pendingRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [rejectFor, setRejectFor] = useState<{ id: string; totalAmount: number } | null>(null)
  const [shipFor, setShipFor] = useState<string | null>(null)
  const [restockFor, setRestockFor] = useState<{ id: string; name: string } | null>(null)
  const [topic, setTopic] = useState<AttentionSuggestionTopic | null>(null)
  // const [testOpen, setTestOpen] = useState(false)

  function commit(id: string) {
    approve.mutate(id, {
      onError: err => {
        // S12: پیام خودِ سرور نشان داده می‌شود؛ «قبلاً تایید شده» فقط وقتی سرور همین را بگوید (۴۰۹ = دو تب باز)
        const status = (err as { response?: { status?: number } })?.response?.status
        addToast(extractErrorMessage(err, status === 409 ? t.alreadyApproved : fa.common.error))
        setHidden(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        void today.refetch()
      },
    })
  }

  function startApprove(receipt: { id: string; customerLabel: string }) {
    // تایید قبلی که هنوز منتظر ۵ ثانیه است همین‌الان قطعی می‌شود
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      commit(pendingRef.current.id)
    }
    setHidden(prev => new Set(prev).add(receipt.id))
    setUndo({ id: receipt.id, who: receipt.customerLabel })
    pendingRef.current = {
      id: receipt.id,
      timer: setTimeout(() => {
        commit(receipt.id)
        pendingRef.current = null
        setUndo(null)
      }, UNDO_MS),
    }
  }

  function undoApprove() {
    const p = pendingRef.current
    if (!p) return
    clearTimeout(p.timer)
    pendingRef.current = null
    setHidden(prev => {
      const next = new Set(prev)
      next.delete(p.id)
      return next
    })
    setUndo(null)
  }

  // خروج از صفحه وسط ۵ ثانیه: تایید همان‌جا قطعی می‌شود (گم نمی‌شود)
  useEffect(
    () => () => {
      const p = pendingRef.current
      if (p) {
        clearTimeout(p.timer)
        approve.mutate(p.id)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const data = today.data
  const receipts = (data?.receipts ?? []).filter(r => !hidden.has(r.id))
  const conversations = data?.conversations ?? []
  const topics = suggestions.data?.topics ?? []
  const toShip = data?.toShip ?? []
  const issues = data?.issues ?? []
  const refunds = data?.refunds ?? []
  const lowStock = data?.lowStock ?? []
  const launch = completeness.data?.launch
  const launchDone = !!launch && launch.hasActiveProduct && launch.hasPaymentMethod && launch.shared
  // QA-9 — تا چک‌لیست راه‌اندازی کامل نشده، «کاری نمونده» نمایش داده نمی‌شود
  const launchPending = completeness.isLoading || (!!launch && !launchDone)
  // QA-11 — ارسال فیزیکی روشن ولی هیچ قانون هزینه‌ای تعریف نشده: بی‌خبر رایگان حساب می‌شود
  const currentStore = stores.data?.find(s => s.id === storeId)
  const shippingUnset = !!currentStore?.requiresShipping && shippingRules.isSuccess && shippingRules.data.length === 0
  const empty = !launchPending && !shippingUnset && !!data && receipts.length + conversations.length + topics.length + toShip.length + issues.length + refunds.length + lowStock.length === 0
  const estimate = credit.data?.conversationsLeftEstimate
  const creditLow = estimate != null && estimate < 50

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-5">
      <h1 className="text-xl font-extrabold text-slate-100 light:text-slate-900">{t.title}</h1>

      {launch && !launchDone && <LaunchCard launch={launch} storeId={storeId} storeSlug={storeSlug} />}

      {shippingUnset && (
        <Row tone="amber">
          <Link to="/seller/panel/store/shipping" className="flex flex-1 items-center gap-2">
            <span className="flex-1 text-sm font-bold text-amber-300 light:text-amber-700">{t.shippingCostHint}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-amber-300 light:text-amber-700" aria-hidden>
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
        </Row>
      )}

      {receipts.length > 0 && (
        <Section title={t.receiptsTitle(toFa(receipts.length))}>
          {receipts.map(r => (
            <Row key={r.id} tone="amber">
              {r.hasReceiptImage && <ReceiptThumb storeId={storeId} orderId={r.id} />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-100 light:text-slate-900">{r.customerLabel}</p>
                <p className="text-xs text-slate-300 light:text-slate-600">
                  {money(r.amountToman)} {fa.common.toman}
                </p>
                <p className="text-[11px] text-slate-500">
                  <span dir="ltr">{r.orderCode}</span> · {relative(r.submittedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button type="button" onClick={() => startApprove(r)} className="h-9 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
                  {t.approve}
                </button>
                <button type="button" onClick={() => setRejectFor({ id: r.id, totalAmount: r.amountToman })} className="h-8 rounded-xl text-xs font-bold text-red-400">
                  {t.reject}
                </button>
              </div>
            </Row>
          ))}
        </Section>
      )}

      {conversations.length > 0 && (
        <Section title={t.convsTitle(toFa(conversations.length))}>
          {conversations.map(c => (
            <button key={c.id} type="button" onClick={() => navigate(`/seller/panel/chats/${c.id}`)} className="text-start">
              <Row tone="amber">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-100 light:text-slate-900">{c.customerLabel}</p>
                  {c.lastCustomerMessage && <p className="truncate text-xs text-slate-300 light:text-slate-600">{c.lastCustomerMessage}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-amber-400 light:text-amber-700">{t.since(relative(c.waitingSince))}</span>
              </Row>
            </button>
          ))}
        </Section>
      )}

      {topics.length > 0 && (
        <Section title={t.topicsTitle}>
          {topics.map(tp => (
            <Row key={tp.topic}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100 light:text-slate-900">{tp.topic}</p>
                <p className="text-xs text-slate-400">{t.askedBy(toFa(tp.occurrences))}</p>
              </div>
              <button type="button" onClick={() => setTopic(tp)} className="h-9 shrink-0 rounded-xl bg-sky-500/20 px-3 text-xs font-bold text-sky-300 light:text-sky-700">
                {t.answerButton}
              </button>
            </Row>
          ))}
        </Section>
      )}

      {(issues.length > 0 || refunds.length > 0) && (
        <Section title={refunds.length > 0 ? t.refundsOverdueTitle : t.issuesTitle}>
          {refunds.map(r => (
            <Link key={r.id} to="/seller/panel/orders?view=refunds">
              <Row tone="red">
                <span dir="ltr" className="font-mono text-sm font-bold text-slate-100 light:text-slate-900">{r.orderCode}</span>
                <span className="flex-1 text-xs text-slate-300 light:text-slate-600">
                  {t.refundsOverdueTitle} · {money(r.amountToman)} {fa.common.toman}
                </span>
              </Row>
            </Link>
          ))}
          {issues.map(i => (
            <Link key={i.id} to={`/seller/panel/orders?orderId=${i.orderId}`}>
              <Row tone="red">
                <span dir="ltr" className="font-mono text-sm font-bold text-slate-100 light:text-slate-900">{i.orderCode}</span>
                <span className="flex-1 truncate text-xs text-slate-300 light:text-slate-600">{i.reason}</span>
              </Row>
            </Link>
          ))}
        </Section>
      )}

      {toShip.length > 0 && (
        <Section title={t.toShipTitle}>
          {toShip.map(o => (
            <Row key={o.id}>
              <Link to={`/seller/panel/orders?orderId=${o.id}`} className="flex-1">
                <span dir="ltr" className="font-mono text-sm font-bold text-slate-100 light:text-slate-900">{o.orderCode}</span>
              </Link>
              <button type="button" onClick={() => setShipFor(o.id)} className="h-9 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
                {t.shipButton}
              </button>
            </Row>
          ))}
        </Section>
      )}

      {lowStock.length > 0 && (
        <Section title={t.lowStockTitle}>
          {lowStock.map(p => {
            const waiting = data?.awaitingRestock.find(a => a.id === p.id)?.openAlerts ?? 0
            return (
              <Row key={p.id}>
                <Link to={`/seller/panel/products/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-100 light:text-slate-900">{p.name}</p>
                  <p className={clsx('text-xs', p.stock === 0 ? 'text-red-400' : 'text-amber-400')}>
                    {p.stock === 0 ? fa.seller.v2.products.soldOut : fa.seller.v2.products.count(toFa(p.stock))}
                    {waiting > 0 ? ` · ${t.waitingForStock(toFa(waiting))}` : ''}
                  </p>
                </Link>
                <button type="button" onClick={() => (p.hasVariants ? navigate(`/seller/panel/products/${p.id}?focus=stock`) : setRestockFor({ id: p.id, name: p.name }))} className="h-9 shrink-0 rounded-xl border border-slate-700 px-3 text-xs font-bold text-slate-200 light:border-slate-300 light:text-slate-800">
                  {t.restockButton}
                </button>
              </Row>
            )
          })}
        </Section>
      )}

      {empty && (
        <section className="rounded-2xl border border-slate-800 p-6 text-center light:border-slate-200">
          <p className="text-lg font-extrabold text-slate-100 light:text-slate-900">{t.allDone}</p>
          {dashboard.data && dashboard.data.revenueWeekToman > 0 && (
            <p className="mt-2 text-sm text-slate-400">{t.weekRevenue(money(dashboard.data.revenueWeekToman))}</p>
          )}
          <button
            type="button"
            onClick={() => void shareOrCopy({ url: `${window.location.origin}/shop/${storeSlug}`, text: t.shareBio(`${window.location.origin}/shop/${storeSlug}`) })}
            className="mt-3 text-sm font-bold text-emerald-400 light:text-emerald-700"
          >
            {t.shareTitle}
          </button>
        </section>
      )}

      {creditLow && (
        <Row tone="amber">
          <span className="flex-1 text-sm text-amber-300 light:text-amber-700">{estimate === 0 ? t.creditZero : t.creditLow(toFa(estimate ?? 0))}</span>
          <Link to="/seller/panel/store/credit" className="text-xs font-bold text-amber-300 underline light:text-amber-700">
            {t.creditCta}
          </Link>
        </Row>
      )}

      {/* تست بات موقتاً غیرفعال
      <button type="button" onClick={() => setTestOpen(true)} className="self-center py-2 text-sm font-bold text-emerald-400 light:text-emerald-700">
        {t.testBot}
      </button> */}

      {undo && (
        <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[620px] items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 shadow-lg">
          <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" style={{ animationDuration: '5s' }} />
          <span className="flex-1">{t.approvedToast(undo.who)}</span>
          <button type="button" onClick={undoApprove} className="font-extrabold underline">
            {t.undo}
          </button>
        </div>
      )}

      {rejectFor && (
        <RejectOrderSheet
          order={{ id: rejectFor.id, status: 'RECEIPT_SUBMITTED', totalAmount: rejectFor.totalAmount, receiptImageKey: null } as Pick<SellerOrder, 'id' | 'status' | 'totalAmount' | 'receiptImageKey'>}
          storeId={storeId}
          open
          onClose={() => setRejectFor(null)}
        />
      )}
      {shipFor && <ShipOrderSheet orderId={shipFor} storeId={storeId} open onClose={() => setShipFor(null)} />}
      <RestockSheet product={restockFor} storeId={storeId} onClose={() => setRestockFor(null)} />
      <TopicAnswerSheet topic={topic} storeId={storeId} onClose={() => setTopic(null)} />
      {/* {testOpen && <SellerTestChatSheet storeId={storeId} onClose={() => setTestOpen(false)} />} */}
    </div>
  )
}
