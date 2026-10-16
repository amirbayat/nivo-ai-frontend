import { isStockMissing, canSendTrackStock } from '@/lib/productStock'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { toEnglishDigits } from '@/lib/digits'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { Input } from '@/components/ui/Input'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { PriceInput } from '@/components/ui/PriceInput'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { MicButton } from '@/components/ui/MicButton'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useToastStore } from '@/store/toast.store'
import {
  useCreateProduct,
  useDeleteProduct,
  useReplaceProductVariants,
  useUpdateProduct,
  type CreateProductInput,
} from '@/queries/seller.queries'
import { useAiFill, useDuplicateProduct, useProduct } from '@/queries/sellerV2.queries'
import { mergeAiFill, type AiFillField } from '@/lib/mergeAiFill'
import {
  buildVariantsDto,
  emptyVariantDraft,
  loadedStockOf,
  reconcileRows,
  variantDraftFromAi,
  variantDraftFromProduct,
  type VariantDraft,
} from '@/lib/variantDraft'
import type { ProductSpecSuggestion, SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'
import { ProductDescriptionModal } from './ProductDescriptionModal'
// import { SellerTestChatSheet } from './SellerTestChatSheet'
import { PhotoGrid } from './product/PhotoGrid'
import { VariantsEditor } from './product/VariantsEditor'
import { ProductVideo } from './product/ProductVideo'
import { GoldPricingFields } from './product/GoldPricingFields'
import { FirstProductSheet, ProductShareButtons, PublishedSheet } from './product/PublishSheets'
import { BuyerPreviewSheet } from './product/BuyerPreviewSheet'

const t = fa.seller.v2.product
const GOLD_CATEGORY_NAMES = ['جواهرات و اکسسوری']
const AUTOSAVE_MS = 1500
const SLOW_AI_MS = 20_000

interface Form {
  name: string
  price: string
  stock: string
  always: boolean
  description: string
  specs: ProductSpecSuggestion[]
  code: string
  persuasion: boolean
  delay: boolean
  isWeightBased: boolean
  weightGrams: string
  purityKarat: string
  customWage: boolean
  wageType: 'PERCENT' | 'FIXED_PER_GRAM'
  wageValue: string
  profitPercent: string
}

type ErrorKey = 'name' | 'price' | 'stock' | 'weight'
type MarkKey = AiFillField | 'variants'

// QA-12 — برای اولین محصول (?first=1) «همیشه موجوده» پیش‌فرض است
const blankForm = (gold: boolean, always = false): Form => ({
  name: '',
  price: '',
  stock: '',
  always,
  description: '',
  specs: [],
  code: '',
  persuasion: true,
  delay: false,
  isWeightBased: gold,
  weightGrams: '',
  purityKarat: '18',
  customWage: false,
  wageType: 'PERCENT',
  wageValue: '',
  profitPercent: '',
})

function formFromProduct(p: SellerProduct): Form {
  return {
    name: p.name,
    price: p.basePrice ? String(p.basePrice) : '',
    // موجودی صریحاً ننوشته‌شده (پیش‌نویس) خالی نشان داده می‌شود، نه «۰»
    stock: p.stockSetAt || p.status !== 'DRAFT' ? String(p.stock) : '',
    always: !p.trackStock,
    description: p.description ?? '',
    specs: p.specs ?? [],
    code: p.code ?? '',
    persuasion: p.persuasionTechniquesEnabled,
    delay: p.hasFulfillmentDelay,
    isWeightBased: p.pricingModel === 'WEIGHT_BASED_FORMULA',
    weightGrams: p.weightGrams != null ? String(p.weightGrams) : '',
    purityKarat: p.purityKarat != null ? String(p.purityKarat) : '18',
    customWage: p.goldWageType != null,
    wageType: p.goldWageType ?? 'PERCENT',
    wageValue: p.goldWageValue != null ? String(p.goldWageValue) : '',
    profitPercent: p.goldProfitPercent != null ? String(p.goldProfitPercent) : '',
  }
}

function BackChevron() {
  // قانون RTL پروژه: «بازگشت» رو به راست (CLAUDE.md)
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

const Shimmer = ({ h = 'h-12' }: { h?: string }) => <div className={clsx(h, 'animate-pulse rounded-xl bg-slate-800 light:bg-slate-200')} />
const Mark = ({ on }: { on: boolean }) => (on ? <span className="text-[11px] font-bold text-emerald-400">✨</span> : null)

// docs/PRD-seller-panel-simplification.md §4.4 — یک صفحه: عکس، «درباره‌ش بگو» (AI)، اسم/قیمت/موجودی،
// مدل‌ها، توضیح، تنظیمات بیشتر؛ یک دکمه‌ی «انتشار». پیش‌نویس روی سرور ساخته و خودکار ذخیره می‌شود.
export function SellerProductPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const { storeId, storeSlug, category, businessType, goldWageType, goldWageValue, goldProfitPercent } = useSellerStore()
  const isGoldCategory = GOLD_CATEGORY_NAMES.includes(category ?? '')
  const first = searchParams.get('first') === '1'

  // ---- شناسه و داده‌ی سرور ----
  const [productId, setProductId] = useState<string | null>(id && id !== 'new' ? id : null)
  const productIdRef = useRef<string | null>(productId)
  const productQ = useProduct(storeId, productId)
  const [product, setProduct] = useState<SellerProduct | null>(null)

  // ---- فرم ----
  const [form, setForm] = useState<Form>(() => blankForm(isGoldCategory, first))
  const [vd, setVd] = useState<VariantDraft>(emptyVariantDraft)
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({})
  const [marks, setMarks] = useState<Set<MarkKey>>(new Set())
  const [sugg, setSugg] = useState<Partial<Record<AiFillField, string>>>({})
  const [describe, setDescribe] = useState('')
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [aiSlow, setAiSlow] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [varOpen, setVarOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [descModal, setDescModal] = useState(false)
  const [saveState, setSaveState] = useState<'' | 'saving' | 'saved'>('')
  const [sheet, setSheet] = useState<null | 'first' | 'published' | 'leave' | 'delete'>(null)
  // const [chat, setChat] = useState<null | { message: string }>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedProduct, setPublishedProduct] = useState<{ id: string; name: string; basePrice: number } | null>(null)

  const hydratedRef = useRef(false)
  const baselineRef = useRef('')
  const blankSnapshotRef = useRef(JSON.stringify([blankForm(isGoldCategory, first), emptyVariantDraft()]))
  const loadedStockRef = useRef<Record<string, number>>({})
  const savedVdRef = useRef(JSON.stringify(emptyVariantDraft()))
  const initialStockRef = useRef<string>('')
  const initialTrackRef = useRef<boolean>(true)
  const savingRef = useRef(false)
  // S4: آخرین snapshotی که روی سرور نشسته؛ ذخیره‌ی بی‌تغییر (PUT خالی) و flush اضافه را حذف می‌کند
  const lastSavedSnapRef = useRef('')
  const dirtyDuringSaveRef = useRef(false)
  const [autosaveTick, setAutosaveTick] = useState(0)
  const aiAbortRef = useRef(0)

  const createProduct = useCreateProduct(storeId)
  const updateProduct = useUpdateProduct(storeId)
  const replaceVariants = useReplaceProductVariants(storeId)
  const removeProduct = useDeleteProduct(storeId)
  const duplicate = useDuplicateProduct(storeId)
  const aiFill = useAiFill(storeId)

  const status = product?.status
  const mode: 'new' | 'draft' | 'edit' = !productId ? 'new' : status === 'DRAFT' || !status ? 'draft' : 'edit'
  const snapshot = useMemo(() => JSON.stringify([form, vd]), [form, vd])
  const dirty = mode === 'edit' && hydratedRef.current && snapshot !== baselineRef.current

  const latest = useRef({ form, vd, productId, mode, describe })
  latest.current = { form, vd, productId, mode, describe }

  // ---- ریست/هیدرات ----
  const reset = useCallback(() => {
    hydratedRef.current = false
    setProduct(null)
    setForm(blankForm(isGoldCategory, first))
    setVd(emptyVariantDraft())
    setErrors({})
    setMarks(new Set())
    setSugg({})
    setDescribe('')
    setAiState('idle')
    setVarOpen(false)
    setMoreOpen(false)
    setSaveState('')
    loadedStockRef.current = {}
    savedVdRef.current = JSON.stringify(emptyVariantDraft())
    blankSnapshotRef.current = JSON.stringify([blankForm(isGoldCategory, first), emptyVariantDraft()])
    baselineRef.current = ''
    initialStockRef.current = ''
  }, [isGoldCategory, first])

  useEffect(() => {
    // تغییر مسیر از بیرون (لیست ← محصول دیگر، «محصول بعدی»)؛ ساخت پیش‌نویس توسط خود همین صفحه
    // شناسه را قبل از navigate در productIdRef می‌گذارد، پس این‌جا ریستی رخ نمی‌دهد
    const target = id && id !== 'new' ? id : null
    if (target !== productIdRef.current) {
      reset()
      productIdRef.current = target
      setProductId(target)
    }
  }, [id, reset])

  // فرم و مدل‌ها را از روی محصول سرور پر می‌کند و مبنای «تغییر ذخیره‌نشده» را همان می‌گذارد
  const hydrate = useCallback((p: SellerProduct) => {
    const f = formFromProduct(p)
    const draft = variantDraftFromProduct(p)
    setProduct(p)
    setForm(f)
    setVd(draft)
    setVarOpen(draft.options.length > 0)
    loadedStockRef.current = loadedStockOf(p)
    savedVdRef.current = JSON.stringify(draft)
    initialStockRef.current = f.stock
    initialTrackRef.current = p.trackStock
    baselineRef.current = JSON.stringify([f, draft])
    lastSavedSnapRef.current = baselineRef.current
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    const p = productQ.data
    if (!p) return
    if (hydratedRef.current) {
      setProduct(prev => (prev && prev.id === p.id ? prev : p))
      return
    }
    hydrate(p)
  }, [productQ.data, hydrate])

  // محصول تازه: فرم خالی از همان اول «هیدرات‌شده» است
  useEffect(() => {
    if (!productId) hydratedRef.current = true
  }, [productId])

  // ---- ویرایش فیلد (پاک‌کردن علامت ✨ و خطا) ----
  function edit<K extends keyof Form>(key: K, value: Form[K], markKey?: MarkKey, errKey?: ErrorKey) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (markKey) {
      setMarks(prev => {
        if (!prev.has(markKey)) return prev
        const next = new Set(prev)
        next.delete(markKey)
        return next
      })
      setSugg(prev => {
        if (!(markKey in prev)) return prev
        const next = { ...prev }
        delete next[markKey as AiFillField]
        return next
      })
    }
    if (errKey) setErrors(prev => (prev[errKey] ? { ...prev, [errKey]: undefined } : prev))
  }

  function setAlways(on: boolean) {
    setForm(prev => ({ ...prev, always: on, stock: on ? '' : prev.stock }))
    setErrors(prev => ({ ...prev, stock: undefined }))
    // مدل‌ها: ردیف‌ها با وضعیت جدید هماهنگ می‌شوند (موجودی اصلی را به ترکیب‌های تازه می‌دهد)
    setVd(prev => reconcileRows(prev, '', on))
  }

  // ---- ساخت/ذخیره ----
  function buildDto(forPublish: boolean) {
    const f = latest.current.form
    const stockDigits = toEnglishDigits(f.stock).replace(/\D/g, '')
    // فقط گزینه‌ی کامل (نام + حداقل یک مقدار) مدل حساب می‌شود؛ گزینه‌ی خالیِ نیمه‌کاره موجودی را قایم نکند
    const hasVariants = latest.current.vd.options.some(o => o.name.trim() && o.values.length > 0)
    // موجودی: فقط وقتی عوض شده یا (پیش‌نویس/انتشار) صریحاً نوشته شده؛ محصول مدل‌دار موجودی سطح محصول ندارد
    const stockChanged = stockDigits !== '' && (forPublish || stockDigits !== initialStockRef.current || !f.always !== initialTrackRef.current)
    return {
      name: f.name,
      basePrice: f.isWeightBased ? 0 : Number(toEnglishDigits(f.price)) || 0,
      ...(!f.always && !hasVariants && stockChanged ? { stock: Number(stockDigits) } : {}),
      // QA-12 — خاموش→روشن‌شدنِ موجودی بدون عدد ۴۰۰ می‌گیرد؛ تا عدد نیامده فیلد نرود
      ...(canSendTrackStock({ always: f.always, hasVariants, stock: f.stock, wasTracked: initialTrackRef.current }) ? { trackStock: !f.always } : {}),
      // رشته‌ی خالی (نه undefined) تا پاک‌کردن توضیح واقعاً به سرور برسد
      description: f.description,
      specs: f.specs.length ? f.specs : null,
      code: f.code.trim() || undefined,
      persuasionTechniquesEnabled: f.persuasion,
      hasFulfillmentDelay: f.delay,
      pricingModel: (f.isWeightBased ? 'WEIGHT_BASED_FORMULA' : 'FIXED') as 'WEIGHT_BASED_FORMULA' | 'FIXED',
      weightGrams: f.isWeightBased ? Number(toEnglishDigits(f.weightGrams)) || undefined : undefined,
      purityKarat: f.isWeightBased ? Number(f.purityKarat) : undefined,
      goldWageType: f.customWage ? f.wageType : null,
      goldWageValue: f.customWage ? Number(toEnglishDigits(f.wageValue)) || undefined : null,
      goldProfitPercent: f.customWage ? Number(toEnglishDigits(f.profitPercent)) || undefined : null,
    }
  }

  // تک‌پرواز: چند فراخوان هم‌زمان (عکس + «پر کن» + ذخیره‌ی خودکار) یک پیش‌نویس می‌سازند
  const draftPromiseRef = useRef<Promise<string> | null>(null)
  const ensureDraft = useCallback((): Promise<string> => {
    if (productIdRef.current) return Promise.resolve(productIdRef.current)
    if (draftPromiseRef.current) return draftPromiseRef.current
    const promise = createDraft().finally(() => {
      draftPromiseRef.current = null
    })
    draftPromiseRef.current = promise
    return promise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createProduct, first, navigate])

  async function createDraft(): Promise<string> {
    const f = latest.current.form
    const dto: CreateProductInput = {
      status: 'DRAFT',
      name: f.name,
      basePrice: f.isWeightBased ? 0 : Number(toEnglishDigits(f.price)) || 0,
      trackStock: !f.always,
      pricingModel: f.isWeightBased ? 'WEIGHT_BASED_FORMULA' : 'FIXED',
      via: 'single',
    }
    const created = await createProduct.mutateAsync(dto)
    productIdRef.current = created.id
    setProductId(created.id)
    setProduct(created)
    hydratedRef.current = true
    navigate(`/seller/panel/products/${created.id}${first ? '?first=1' : ''}`, { replace: true })
    return created.id
  }

  // ذخیره‌ی کامل: مدل‌ها (اگر عوض شده) + فیلدها؛ publish=true وضعیت را ACTIVE می‌کند
  // همه‌ی ذخیره‌ها پشت‌سرهم (نه هم‌زمان) تا دو PUT مدل‌ها روی هم نیفتند
  const persistChainRef = useRef<Promise<unknown>>(Promise.resolve())
  function persist(publish: boolean): Promise<SellerProduct> {
    const run = persistChainRef.current.then(() => persistNow(publish), () => persistNow(publish))
    persistChainRef.current = run.catch(() => undefined)
    return run
  }

  async function persistNow(publish: boolean): Promise<SellerProduct> {
    const pid = await ensureDraft()
    const L = latest.current
    if (JSON.stringify(L.vd) !== savedVdRef.current) {
      const dto = buildVariantsDto(L.vd, loadedStockRef.current, L.form.always)
      const updatedVariants = await replaceVariants.mutateAsync({ productId: pid, dto })
      loadedStockRef.current = loadedStockOf(updatedVariants)
      savedVdRef.current = JSON.stringify(L.vd)
    }
    const dto = { ...buildDto(publish), ...(publish ? { status: 'ACTIVE' as const } : {}) }
    const updated = await updateProduct.mutateAsync({ productId: pid, dto })
    setProduct(prev => ({ ...(prev ?? updated), ...updated, optionTypes: prev?.optionTypes, variants: prev?.variants }) as SellerProduct)
    initialStockRef.current = L.form.stock
    initialTrackRef.current = !L.form.always
    lastSavedSnapRef.current = JSON.stringify([L.form, L.vd])
    return updated
  }

  // خودکار: پیش‌نویس (و ساخت اولین پیش‌نویس وقتی فروشنده چیزی تایپ کرده)
  useEffect(() => {
    if (!hydratedRef.current || mode === 'edit') return
    if (!productId && snapshot === blankSnapshotRef.current) return
    if (snapshot === lastSavedSnapRef.current) return
    const timer = setTimeout(() => {
      if (savingRef.current) {
        dirtyDuringSaveRef.current = true
        return
      }
      savingRef.current = true
      setSaveState('saving')
      persist(false)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState(''))
        .finally(() => {
          savingRef.current = false
          // ویرایشی که وسط ذخیره آمد دوباره ذخیره می‌شود (نه گم)
          if (dirtyDuringSaveRef.current) {
            dirtyDuringSaveRef.current = false
            setAutosaveTick(n => n + 1)
          }
        })
    }, AUTOSAVE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, mode, productId, autosaveTick])

  // S4: «برگشت» سیستم گوشی / بستن تب / رفتن به پس‌زمینه ذخیره‌ی خودکار منتظر را از دست نمی‌دهد (بدون دیالوگ مسدودکننده).
  // پیش‌نویس تازه‌ای که هیچ‌وقت ذخیره نشده هم به‌صورت پیش‌نویس ساخته می‌شود
  const flushDraftRef = useRef<() => void>(() => undefined)
  flushDraftRef.current = () => {
    const L = latest.current
    if (!hydratedRef.current || L.mode === 'edit' || savingRef.current) return
    const snap = JSON.stringify([L.form, L.vd])
    if (!L.productId && snap === blankSnapshotRef.current) return
    if (snap === lastSavedSnapRef.current) return
    void persist(false).catch(() => undefined)
  }
  useEffect(() => {
    const flush = () => flushDraftRef.current()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [])

  // S3: لینک «موجودی بده» محصول واریانت‌دار (?focus=stock) ویرایشگر را روی بخش موجودی باز می‌کند
  const focusStock = searchParams.get('focus') === 'stock'
  useEffect(() => {
    if (!focusStock || !product) return
    const timer = setTimeout(() => document.getElementById('f-stock')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150)
    return () => clearTimeout(timer)
  }, [focusStock, product?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- AI ----
  async function runAiFill() {
    const text = describe.trim()
    const imageCount = product?.images.length ?? 0
    if (!text && imageCount === 0) {
      addToast(t.needPhotoOrText)
      return
    }
    const ticket = ++aiAbortRef.current
    setAiState('loading')
    setAiSlow(false)
    setAiError(null)
    const slowTimer = setTimeout(() => setAiSlow(true), SLOW_AI_MS)
    try {
      const pid = await ensureDraft()
      const res = await aiFill.mutateAsync({ productId: pid, text })
      if (ticket !== aiAbortRef.current) return
      const L = latest.current
      const merged = mergeAiFill(
        { name: L.form.name, price: L.form.price, stock: L.form.stock, alwaysInStock: L.form.always, description: L.form.description },
        { name: res.name, basePrice: res.basePrice, stock: res.stock, trackStock: res.trackStock, description: res.description },
      )
      setForm(prev => ({
        ...prev,
        name: merged.next.name,
        price: merged.next.price,
        stock: merged.next.stock,
        always: merged.next.alwaysInStock,
        description: merged.next.description,
        specs: prev.specs.length === 0 && res.specs ? res.specs : prev.specs,
        ...(prev.isWeightBased && res.weightGrams && !prev.weightGrams ? { weightGrams: String(res.weightGrams) } : {}),
        ...(prev.isWeightBased && res.purityKarat ? { purityKarat: String(res.purityKarat) } : {}),
      }))
      const newMarks = new Set<MarkKey>(merged.filled)
      if (res.variantOptions && res.variantOptions.length > 0 && L.vd.options.length === 0) {
        setVd(variantDraftFromAi(res.variantOptions, merged.next.stock, merged.next.alwaysInStock))
        setVarOpen(true)
        newMarks.add('variants')
      }
      setMarks(newMarks)
      setSugg(merged.suggestions)
      if (res.missing.includes('price') && !merged.next.price && !L.form.isWeightBased) {
        setErrors(prev => ({ ...prev, price: t.missingPrice }))
      }
      setAiState('done')
    } catch (err) {
      if (ticket !== aiAbortRef.current) return
      setAiError(extractErrorMessage(err, fa.common.error))
      setAiState('idle')
    } finally {
      clearTimeout(slowTimer)
      setAiSlow(false)
    }
  }

  // ---- انتشار / ذخیره ----
  function validateLocal(): Partial<Record<ErrorKey, string>> {
    const f = latest.current.form
    const errs: Partial<Record<ErrorKey, string>> = {}
    if (f.name.trim().length < 2) errs.name = t.missingName
    if (!f.isWeightBased && !(Number(toEnglishDigits(f.price)) > 0)) errs.price = t.missingPrice
    if (f.isWeightBased && !(Number(toEnglishDigits(f.weightGrams)) > 0)) errs.weight = t.missingWeight
    const hasVariants = latest.current.vd.options.some(o => o.name.trim() && o.values.length > 0)
    if (isStockMissing({ always: f.always, hasVariants, stock: f.stock })) errs.stock = t.missingStock
    return errs
  }

  function showErrors(errs: Partial<Record<ErrorKey, string>>) {
    setErrors(errs)
    const firstKey = (['name', 'price', 'weight', 'stock'] as const).find(k => errs[k])
    if (firstKey) document.getElementById(`f-${firstKey}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  async function publish() {
    if (publishing) return
    const errs = validateLocal()
    if (Object.keys(errs).length > 0) {
      showErrors(errs)
      return
    }
    setPublishing(true)
    try {
      const updated = await persist(true)
      setPublishedProduct({ id: updated.id, name: updated.name, basePrice: updated.basePrice })
      baselineRef.current = JSON.stringify([latest.current.form, latest.current.vd])
      setSheet(updated.isFirstActiveProduct ? 'first' : 'published')
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; missing?: string[] } } }).response?.data
      if (data?.code === 'PRODUCT_NOT_READY' && data.missing) {
        const map: Record<string, ErrorKey> = { name: 'name', price: 'price', stock: 'stock' }
        const errs2: Partial<Record<ErrorKey, string>> = {}
        for (const m of data.missing) {
          if (m === 'name') errs2.name = t.missingName
          else if (m === 'price') errs2.price = t.missingPrice
          else if (m === 'stock') errs2.stock = t.missingStock
          void map
        }
        showErrors(errs2)
      } else {
        addToast(extractErrorMessage(err, t.saveFailed))
      }
    } finally {
      setPublishing(false)
    }
  }

  async function saveEdit() {
    const errs = validateLocal()
    if (Object.keys(errs).length > 0) {
      showErrors(errs)
      return
    }
    setPublishing(true)
    // S8: چیزی که فروشنده همین حین ذخیره تایپ می‌کند نباید با نسخه‌ی سرور بازنویسی شود
    const startedForm = latest.current.form
    const startedVd = latest.current.vd
    try {
      await persist(false)
      baselineRef.current = JSON.stringify([startedForm, startedVd])
      addToast(t.saved)
      // برای به‌روزشدن نمایش (مدل‌ها/موجودی) دوباره از سرور بخوان و هیدرات کن
      const fresh = await productQ.refetch()
      if (fresh.data) {
        const typedDuringSave = latest.current.form !== startedForm || latest.current.vd !== startedVd
        if (!typedDuringSave) hydrate(fresh.data)
        else {
          // فقط فیلدهای دست‌نخورده از سرور می‌آیند؛ مدل‌ها همان‌طور که فروشنده می‌بیند می‌مانند
          const server = formFromProduct(fresh.data)
          setProduct(fresh.data)
          setForm(cur => {
            const next = { ...cur }
            for (const key of Object.keys(server) as (keyof typeof server)[]) {
              if (cur[key] === startedForm[key]) (next as Record<string, unknown>)[key] = server[key]
            }
            return next
          })
        }
      }
    } catch (err) {
      addToast(extractErrorMessage(err, t.saveFailed))
    } finally {
      setPublishing(false)
    }
  }

  async function saveDraftAndExit() {
    if (latest.current.productId || snapshot !== blankSnapshotRef.current) {
      try {
        await persist(false)
        addToast(t.draftSaved)
      } catch (err) {
        addToast(extractErrorMessage(err, t.saveFailed))
        return
      }
    }
    navigate('/seller/panel/products?seg=DRAFT')
  }

  async function goBack() {
    if (dirty) {
      setSheet('leave')
      return
    }
    // پیش‌نویس: آخرین تغییرات (تا ۱٫۵ ثانیه‌ی آخر) قبل از خروج ذخیره شود
    if (mode !== 'edit' && (productIdRef.current || snapshot !== blankSnapshotRef.current)) {
      try {
        await persist(false)
      } catch {
        // خطا مانع خروج نیست؛ پیش‌نویس قبلی روی سرور می‌ماند
      }
    }
    navigate('/seller/panel/products')
  }

  // تغییر ذخیره‌نشده: بستن تب/رفرش هم هشدار بدهد
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  async function makeDuplicate() {
    if (!productId) return
    try {
      const copy = await duplicate.mutateAsync(productId)
      addToast(t.duplicated)
      navigate(`/seller/panel/products/${copy.id}`)
    } catch (err) {
      addToast(extractErrorMessage(err, t.saveFailed))
    }
  }

  function afterFirstSheetTry() {
    // S5: تست بات غیرفعال است و متن‌ها قولی درباره‌ی چت تست نمی‌دهند؛ این دکمه پیش‌نمایش خریدار را باز می‌کند
    // (برای فعال‌سازی دوباره‌ی تست، setChat و بلوک SellerTestChatSheet پایین را برگردان)
    setSheet(null)
    setPreviewOpen(true)
  }

  // ---- رندر ----
  if (productId && productQ.isError && !product) {
    return <div className="px-5 py-10 text-center text-sm text-slate-400">{t.notFound}</div>
  }
  if (productId && !hydratedRef.current && !product) {
    return <div className="px-5 py-10 text-center text-sm text-slate-400">{fa.common.loading}</div>
  }

  const loading = aiState === 'loading'
  const title = mode === 'edit' ? form.name || t.editTitle : mode === 'draft' ? t.draftTitle : t.newTitle
  const hasVariants = vd.options.some(o => o.name.trim() && o.values.length > 0)
  const canPreview = form.name.trim().length >= 2 && (form.isWeightBased || Number(toEnglishDigits(form.price)) > 0)
  const goldConfigured = !!goldWageType && goldWageValue != null && goldProfitPercent != null

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[640px] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-slate-800 bg-slate-950 px-2 py-2 light:border-slate-200 light:bg-white">
        <button type="button" onClick={() => void goBack()} aria-label={fa.common.back} className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 light:hover:bg-slate-100">
          <BackChevron />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-slate-100 light:text-slate-900">{title}</h1>
        {mode !== 'edit' && (
          <span className="px-2 text-[11px] text-slate-500">
            {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : ''}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {first && mode !== 'edit' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700">{t.firstBanner}</div>
        )}
        {status === 'HIDDEN' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 light:text-amber-700">{fa.seller.v2.products.hiddenBadge}</div>
        )}

        <PhotoGrid
          storeId={storeId}
          productId={productId}
          images={product?.images ?? []}
          ensureDraft={ensureDraft}
          onProductUpdated={p => setProduct(prev => (prev ? { ...prev, images: p.images } : p))}
        />

        {canPreview && (
          <button type="button" onClick={() => setPreviewOpen(true)} className="self-start text-sm font-bold text-emerald-400 light:text-emerald-700">
            {t.previewButton}
          </button>
        )}

        {mode !== 'edit' &&
          (aiState === 'done' ? (
            <button
              type="button"
              onClick={() => setAiState('idle')}
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm font-bold text-emerald-400 light:text-emerald-700"
            >
              {t.refill}
            </button>
          ) : (
            <div id="describe" className="flex flex-col gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 font-extrabold text-emerald-400 light:text-emerald-700">✨ {t.describeTitle}</div>
              <div className="relative">
                <textarea
                  value={describe}
                  onChange={e => setDescribe(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t.describePlaceholder}
                  className="min-h-[84px] w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pb-10 text-[15px] leading-7 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
                />
                <div className="absolute bottom-2 left-2">
                  <MicButton storeId={storeId} onText={text => setDescribe(prev => (prev ? `${prev} ${text}` : text))} disabled={loading} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void runAiFill()}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {t.reading}
                  </>
                ) : (
                  t.fill
                )}
              </button>
              {aiSlow && <p className="text-xs text-amber-300 light:text-amber-700">{t.slowFill}</p>}
              {aiError && <p className="text-xs text-red-400">{aiError}</p>}
            </div>
          ))}

        <div id="f-name" className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t.nameLabel} <Mark on={marks.has('name')} />
          </label>
          {loading ? (
            <Shimmer />
          ) : (
            <Input
              value={form.name}
              onChange={e => edit('name', e.target.value, 'name', 'name')}
              placeholder={t.namePlaceholder}
              maxLength={200}
              error={errors.name}
            />
          )}
          {sugg.name && (
            <button
              type="button"
              onClick={() => {
                edit('name', sugg.name!, 'name')
              }}
              className="self-start rounded-full border border-dashed border-emerald-500/40 px-3 py-1 text-xs text-emerald-400 light:text-emerald-700"
            >
              {t.aiSuggestion(sugg.name)}
            </button>
          )}
        </div>

        {form.isWeightBased ? (
          <div id="f-weight">
            <GoldPricingFields
              storeId={storeId}
              weightGrams={form.weightGrams}
              setWeightGrams={v => edit('weightGrams', v, undefined, 'weight')}
              purityKarat={form.purityKarat}
              setPurityKarat={v => edit('purityKarat', v)}
              goldPricingConfigured={goldConfigured}
              hasCustomGoldWage={form.customWage}
              setHasCustomGoldWage={v => edit('customWage', v)}
              productGoldWageType={form.wageType}
              setProductGoldWageType={v => edit('wageType', v)}
              productGoldWageValue={form.wageValue}
              setProductGoldWageValue={v => edit('wageValue', v)}
              productGoldProfitPercent={form.profitPercent}
              setProductGoldProfitPercent={v => edit('profitPercent', v)}
            />
            {errors.weight && <p className="text-xs text-red-400">{errors.weight}</p>}
          </div>
        ) : (
          <div id="f-price" className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">
              {t.priceLabel} <Mark on={marks.has('price')} />
            </label>
            {loading ? (
              <Shimmer />
            ) : (
              <PriceInput value={form.price} onChange={v => edit('price', v, 'price', 'price')} placeholder={t.pricePlaceholder} error={errors.price} />
            )}
            {sugg.price && (
              <button
                type="button"
                onClick={() => edit('price', sugg.price!, 'price')}
                className="self-start rounded-full border border-dashed border-emerald-500/40 px-3 py-1 text-xs text-emerald-400 light:text-emerald-700"
              >
                {t.aiSuggestion(Number(sugg.price).toLocaleString('fa-IR'))}
              </button>
            )}
          </div>
        )}

        <div id="f-stock" className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t.stockLabel} <Mark on={marks.has('stock')} />
          </label>
          {hasVariants && !form.always ? (
            <p className="text-sm text-slate-400">{t.stockPerVariant}</p>
          ) : (
            <DigitsInput
              kind="int"
              value={form.stock}
              onChange={v => {
                edit('stock', v, 'stock', 'stock')
                setVd(prev => reconcileRows(prev, v, false))
              }}
              disabled={form.always}
              placeholder={t.stockPlaceholder}
              styled
              error={errors.stock && !form.always ? errors.stock : undefined}
            />
          )}
          <button
            type="button"
            onClick={() => setAlways(!form.always)}
            className={clsx(
              'self-start rounded-full border px-3 py-1.5 text-xs',
              form.always
                ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700'
                : 'border-slate-700 text-slate-400 light:border-slate-300',
            )}
          >
            {t.alwaysInStock}
          </button>
          {errors.stock && hasVariants && <p className="text-xs text-red-400">{errors.stock}</p>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 light:border-slate-200 light:bg-slate-50">
          <button type="button" onClick={() => setVarOpen(v => !v)} className="flex w-full items-center justify-between text-start text-sm font-bold text-slate-200 light:text-slate-800">
            <span>
              {t.variantsTitle} <Mark on={marks.has('variants')} />
            </span>
            <span className={clsx('text-slate-500 transition-transform', varOpen && 'rotate-180')}>⌄</span>
          </button>
          {varOpen && (
            <div className="mt-3">
              {loading ? (
                <Shimmer h="h-24" />
              ) : (
                <VariantsEditor
                  draft={vd}
                  onChange={next => {
                    setVd(next)
                    setMarks(prev => {
                      if (!prev.has('variants')) return prev
                      const n = new Set(prev)
                      n.delete('variants')
                      return n
                    })
                  }}
                  mainStock={form.stock}
                  alwaysInStock={form.always}
                  aiFilled={marks.has('variants')}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">
            {t.descriptionLabel} <Mark on={marks.has('description')} />
          </label>
          {loading ? (
            <Shimmer h="h-24" />
          ) : (
            <textarea
              value={form.description}
              onChange={e => edit('description', e.target.value, 'description')}
              rows={3}
              maxLength={5000}
              placeholder={t.descriptionPlaceholder}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm leading-7 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
            />
          )}
          {sugg.description && (
            <button
              type="button"
              onClick={() => edit('description', sugg.description!, 'description')}
              className="self-start rounded-full border border-dashed border-emerald-500/40 px-3 py-1 text-xs text-emerald-400 light:text-emerald-700"
            >
              {t.aiSuggestion(sugg.description.slice(0, 40) + '…')}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 light:border-slate-200 light:bg-slate-50">
          <button type="button" onClick={() => setMoreOpen(v => !v)} className="flex w-full items-center justify-between text-start text-sm font-bold text-slate-200 light:text-slate-800">
            <span>{t.moreSettings}</span>
            <span className={clsx('text-slate-500 transition-transform', moreOpen && 'rotate-180')}>⌄</span>
          </button>
          {moreOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <Input label={t.codeLabel} placeholder={t.codePlaceholder} value={form.code} onChange={e => edit('code', e.target.value)} dir="ltr" />
              <ToggleRow label={t.persuasion} checked={form.persuasion} onChange={v => edit('persuasion', v)} />
              <ToggleRow label={t.fulfillmentDelay} checked={form.delay} onChange={v => edit('delay', v)} />
              <ToggleRow label={fa.seller.panel.products.weightBasedToggleLabel} checked={form.isWeightBased} onChange={v => edit('isWeightBased', v)} />
              {product && <ProductVideo product={product} onProductUpdated={p => setProduct(prev => (prev ? { ...prev, videos: p.videos } : p))} />}
              {productId && (
                <button type="button" onClick={() => setDescModal(true)} className="self-start text-sm font-bold text-emerald-400 light:text-emerald-700">
                  ✨ {t.longDescription}
                </button>
              )}
              {productId && mode === 'edit' && (
                <>
                  <button type="button" onClick={() => void makeDuplicate()} disabled={duplicate.isPending} className="self-start text-sm font-bold text-emerald-400 light:text-emerald-700">
                    {t.duplicate}
                  </button>
                  {status === 'ACTIVE' && product && (
                    <ProductShareButtons storeId={storeId} storeSlug={storeSlug} product={{ id: product.id, name: form.name, basePrice: product.basePrice }} />
                  )}
                </>
              )}
              {productId && (
                <button type="button" onClick={() => setSheet('delete')} className="self-start text-sm font-bold text-red-400">
                  {fa.common.delete}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 light:border-slate-200 light:bg-white">
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={!dirty || publishing}
            className="h-12 w-full rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {t.saveChanges}
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || loading}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:opacity-60"
            >
              {publishing ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t.publish}
            </button>
            <button type="button" onClick={() => void saveDraftAndExit()} className="h-9 text-sm text-slate-400">
              {t.saveDraft}
            </button>
          </div>
        )}
      </div>

      <ProductDescriptionModal
        open={descModal}
        onClose={() => setDescModal(false)}
        storeId={storeId}
        productId={productId ?? undefined}
        category={category}
        businessType={businessType}
        value={form.description}
        maxLength={5000}
        onApply={v => edit('description', v)}
        onApplySpecs={specs => edit('specs', specs)}
      />

      <BuyerPreviewSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        product={{
          name: form.name,
          basePrice: Number(toEnglishDigits(form.price)) || 0,
          description: form.description,
          images: product?.images ?? [],
          productId: productId ?? '',
          variants: vd,
          alwaysInStock: form.always,
          isWeightBased: form.isWeightBased,
        }}
      />

      <PublishedSheet
        open={sheet === 'published'}
        onNext={() => {
          setSheet(null)
          reset()
          productIdRef.current = null
          setProductId(null)
          navigate('/seller/panel/products/new', { replace: true })
        }}
        onList={() => {
          setSheet(null)
          navigate('/seller/panel/products')
        }}
        share={{ storeId, storeSlug, product: publishedProduct ?? { id: '', name: '', basePrice: 0 } }}
      />
      <FirstProductSheet
        open={sheet === 'first'}
        onTry={afterFirstSheetTry}
        onLater={() => {
          setSheet(null)
          navigate('/seller/panel/products')
        }}
        share={{ storeId, storeSlug, product: publishedProduct ?? { id: '', name: '', basePrice: 0 } }}
      />

      <BottomSheet
        open={sheet === 'leave'}
        onClose={() => setSheet(null)}
        title={t.leaveConfirm}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => setSheet(null)} className="h-12 flex-1 rounded-2xl bg-emerald-600 font-bold text-white">
              {t.leaveStay}
            </button>
            <button
              type="button"
              onClick={() => {
                setSheet(null)
                navigate('/seller/panel/products')
              }}
              className="h-12 flex-1 rounded-2xl bg-slate-800 font-bold text-slate-100 light:bg-slate-100 light:text-slate-900"
            >
              {t.leaveGo}
            </button>
          </div>
        }
      >
        <div />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={fa.seller.panel.products.deleteConfirm}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => setSheet(null)} className="h-12 flex-1 rounded-2xl bg-slate-800 font-bold text-slate-100 light:bg-slate-100 light:text-slate-900">
              {fa.common.cancel}
            </button>
            <button
              type="button"
              disabled={removeProduct.isPending}
              onClick={() => productId && removeProduct.mutate(productId, { onSuccess: () => navigate('/seller/panel/products', { replace: true }) })}
              className="h-12 flex-1 rounded-2xl bg-red-500/90 font-bold text-white disabled:opacity-50"
            >
              {fa.common.delete}
            </button>
          </div>
        }
      >
        <div />
      </BottomSheet>

      {/* تست بات موقتاً غیرفعال
      {chat && (
        <SellerTestChatSheet
          storeId={storeId}
          initialMessage={chat.message}
          fromFirstProduct
          onClose={() => {
            setChat(null)
            navigate('/seller/panel/today')
          }}
        />
      )} */}
    </div>
  )
}
