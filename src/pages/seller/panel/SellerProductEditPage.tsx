import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { env } from '@/env'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ToggleRow } from '@/components/ui/ToggleRow'
import { toEnglishDigits, formatThousands } from '@/lib/digits'
import { extractErrorMessage, productImageUrl, productVideoUrl } from '@/lib/sellerProduct'
import {
  useApproveEnrichmentDraft,
  useCompleteProductInfo,
  useCreateKbEntry,
  useCreateProduct,
  useDeleteProduct,
  useDeleteProductImage,
  usePendingEnrichmentDraft,
  useProducts,
  useProductTelegramLink,
  useRejectEnrichmentDraft,
  useRemoveProductVideo,
  useTranscribeAudio,
  useUpdateProduct,
  useUploadProductImages,
  useUploadProductVideo,
} from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'
import { useSellerStore } from './SellerPanelLayout'

function ProductImages({
  product,
  onProductUpdated,
}: {
  product: SellerProduct
  onProductUpdated: (product: SellerProduct) => void
}) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductImages(storeId)
  const remove = useDeleteProductImage(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  // پیش‌نمایش محلی حین آپلود — تا رفت‌وبرگشت شبکه/invalidate تمام شود، فروشنده چیزی نمی‌دید
  useEffect(() => () => pendingPreviews.forEach(url => URL.revokeObjectURL(url)), [pendingPreviews])

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">{fa.seller.panel.products.addImage}</label>
      <div className="flex flex-wrap gap-2">
        {product.images.map(key => (
          <div key={key} className="relative size-16 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200">
            <img
              src={productImageUrl(product.id, key)}
              alt=""
              onClick={() => setZoomSrc(productImageUrl(product.id, key))}
              className="size-full cursor-zoom-in object-cover"
            />
            <button
              onClick={() => remove.mutate({ productId: product.id, key })}
              className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        ))}
        {pendingPreviews.map(url => (
          <div key={url} className="relative size-16 overflow-hidden rounded-xl border border-slate-700 light:border-slate-200 opacity-60">
            <img src={url} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </div>
          </div>
        ))}
        {product.images.length < 4 && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="flex size-16 items-center justify-center rounded-xl border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
          >
            +
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.maxImages}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
          if (!files.length) return
          const previewUrls = files.map(f => URL.createObjectURL(f))
          setPendingPreviews(prev => [...prev, ...previewUrls])
          upload.mutate({ productId: product.id, files }, {
            // سرور SellerProduct به‌روز (با عکس‌های جدید) را برمی‌گرداند — مستقیم به صفحه‌ی
            // والد پاس داده می‌شود تا پیش‌نمایش فوری باشد، نه منتظر رفت‌وبرگشت invalidate
            onSuccess: updated => onProductUpdated(updated),
            onSettled: () => {
              previewUrls.forEach(url => URL.revokeObjectURL(url))
              setPendingPreviews(prev => prev.filter(url => !previewUrls.includes(url)))
            },
          })
          e.target.value = ''
        }}
      />
      {zoomSrc && <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} analyticsSource="seller_product_image" />}
    </div>
  )
}

// docs/PRD-product-video.md — عیناً الگوی StoreLogoUpload (SellerStoreSettingsPage.tsx)، تک‌فیلد نه آرایه
function ProductVideo({
  product,
  onProductUpdated,
}: {
  product: SellerProduct
  onProductUpdated: (product: SellerProduct) => void
}) {
  const { storeId } = useSellerStore()
  const upload = useUploadProductVideo(storeId)
  const remove = useRemoveProductVideo(storeId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
  }, [pendingPreview])

  const previewSrc = pendingPreview ?? (product.videoKey ? productVideoUrl(product.id, product.videoKey) : null)

  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
        {fa.seller.panel.products.videoLabel}
      </label>
      {previewSrc ? (
        <video controls src={previewSrc} className="mb-2 w-full max-w-xs rounded-lg" />
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex h-24 w-full max-w-xs items-center justify-center rounded-xl border border-dashed border-slate-600 light:border-slate-300 text-slate-500 hover:border-slate-500 disabled:opacity-40"
        >
          {upload.isPending ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            '+'
          )}
        </button>
      )}
      <div className="flex items-center gap-3">
        {previewSrc && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="text-xs text-slate-400 hover:text-slate-300 disabled:opacity-40"
          >
            {fa.seller.panel.products.changeVideo}
          </button>
        )}
        {product.videoKey && (
          <button
            onClick={() => remove.mutate(product.id, { onSuccess: updated => onProductUpdated(updated) })}
            disabled={remove.isPending}
            className="text-xs text-red-400 hover:text-red-300"
          >
            {fa.seller.panel.products.removeVideo}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.videoHint}</p>
      {upload.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(upload.error, fa.seller.panel.products.videoUploadError)}</p>
      )}
      {remove.isError && (
        <p className="mt-1 text-xs text-red-400">{extractErrorMessage(remove.error, fa.seller.panel.products.videoRemoveError)}</p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime"
        hidden
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const previewUrl = URL.createObjectURL(file)
          setPendingPreview(previewUrl)
          upload.mutate(
            { productId: product.id, file },
            {
              onSuccess: updated => onProductUpdated(updated),
              onSettled: () => setPendingPreview(null),
            },
          )
          e.target.value = ''
        }}
      />
    </div>
  )
}

// دستیار تکمیل محصول با AI (docs/PRD-seller-knowledge-base.md بخش ۲) — نتیجه فقط پیشنهاد
// است، فروشنده تأیید/ویرایش می‌کند: توضیح را می‌تواند «استفاده» کند، هر سؤال را جدا با جواب
// خودش به باکس دانش اضافه می‌کند (ذخیره‌ی خودکار نیست)
function AiCompleteAssist({
  productId,
  storeId,
  onApplyDescription,
}: {
  productId: string
  storeId: string
  onApplyDescription: (text: string) => void
}) {
  const complete = useCompleteProductInfo(storeId)
  const createKb = useCreateKbEntry(storeId)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const [withWebSearch, setWithWebSearch] = useState(false)

  // docs/PRD-admin-product-enrichment-review.md — اگر ادمین قبلاً یک پیشنهاد تایید‌کرده برای
  // این محصول منتظر تصمیم فروشنده باشد، به‌جای دکمه‌ی «شروع تکمیل با AI» مستقیم همان را نشان
  // می‌دهیم؛ تایید/رد یک اکشن سرور است (description واقعاً آپدیت می‌شود)، نه فقط پرکردن فرم
  const pendingDraft = usePendingEnrichmentDraft(storeId, productId)
  const approveDraft = useApproveEnrichmentDraft(storeId, productId)
  const rejectDraft = useRejectEnrichmentDraft(storeId, productId)

  function saveAnswer(question: string, index: number) {
    const answer = answers[index]?.trim()
    if (!answer) return
    createKb.mutate(
      { kind: 'PRODUCT_INFO', question, answer, relatedProductId: productId },
      { onSuccess: () => setSavedIndexes(prev => new Set(prev).add(index)) },
    )
  }

  if (pendingDraft.data) {
    const draft = pendingDraft.data
    return (
      <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
        <p className="mb-2 text-xs font-bold text-emerald-300 light:text-emerald-700">
          ✨ {fa.seller.panel.products.enrichmentDraftBadge}
        </p>
        <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
        <p className="mb-3 text-sm text-slate-200 light:text-slate-800">{draft.suggestedDescription}</p>

        {!!draft.suggestedSpecs?.length && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
            <div className="flex flex-col gap-1">
              {draft.suggestedSpecs.map((s, i) => (
                <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                  <span className="font-semibold">{s.label}:</span> {s.value}
                </p>
              ))}
            </div>
          </div>
        )}
        {draft.sourceNote && <p className="mb-3 text-[11px] text-slate-500">{draft.sourceNote}</p>}

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() =>
              approveDraft.mutate(undefined, {
                onSuccess: () => onApplyDescription(draft.suggestedDescription),
              })
            }
            disabled={approveDraft.isPending}
            className="flex-1 rounded-xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
          >
            {fa.seller.panel.products.enrichmentApprove}
          </button>
          <button
            type="button"
            onClick={() => rejectDraft.mutate()}
            disabled={rejectDraft.isPending}
            className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-bold text-slate-300 light:text-slate-600 disabled:opacity-40"
          >
            {fa.seller.panel.products.enrichmentReject}
          </button>
        </div>

        <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedQuestions}</p>
        <div className="flex flex-col gap-2">
          {draft.suggestedQuestions.map((q, i) => (
            <div key={i} className="rounded-xl bg-slate-900/40 light:bg-white p-2.5">
              <p className="mb-1.5 text-sm text-slate-300 light:text-slate-700">{q}</p>
              {savedIndexes.has(i) ? (
                <p className="text-xs text-emerald-400">{fa.common.success}</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={answers[i] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    placeholder={fa.seller.panel.products.aiQuestionAnswerPlaceholder}
                    className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2.5 py-1.5 text-xs text-slate-200 light:text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => saveAnswer(q, i)}
                    disabled={!answers[i]?.trim() || createKb.isPending}
                    className="shrink-0 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                  >
                    {fa.common.save}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {!complete.data && (
        <>
          <label className="mb-2 flex items-center gap-2 text-xs text-slate-400 light:text-slate-600">
            <input type="checkbox" checked={withWebSearch} onChange={e => setWithWebSearch(e.target.checked)} />
            {fa.seller.panel.products.aiWebSearchToggle}
          </label>
          {withWebSearch && <p className="mb-2 text-[11px] text-slate-500">{fa.seller.panel.products.aiWebSearchHint}</p>}
          <button
            type="button"
            onClick={() => complete.mutate({ productId, withWebSearch })}
            disabled={complete.isPending}
            className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {complete.isPending ? fa.seller.panel.products.aiCompleteLoading : `✨ ${fa.seller.panel.products.aiComplete}`}
          </button>
        </>
      )}
      {complete.isError && (
        <p className="mt-2 text-xs text-red-400">
          {extractErrorMessage(complete.error, fa.seller.panel.products.aiCompleteError)}
        </p>
      )}

      {complete.data && (
        <div className="mt-3 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
          <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
          <p className="mb-2 text-sm text-slate-200 light:text-slate-800">{complete.data.suggestedDescription}</p>
          <button
            type="button"
            onClick={() => onApplyDescription(complete.data!.suggestedDescription)}
            className="mb-3 text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
          >
            {fa.seller.panel.products.aiApplyDescription}
          </button>

          {!!complete.data.suggestedSpecs?.length && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedSpecs}</p>
              <div className="flex flex-col gap-1">
                {complete.data.suggestedSpecs.map((s, i) => (
                  <p key={i} className="text-xs text-slate-300 light:text-slate-700">
                    <span className="font-semibold">{s.label}:</span> {s.value}
                  </p>
                ))}
              </div>
            </div>
          )}
          {complete.data.sourceNote && (
            <p className="mb-3 text-[11px] text-slate-500">{complete.data.sourceNote}</p>
          )}

          <p className="mb-2 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedQuestions}</p>
          <div className="flex flex-col gap-2">
            {complete.data.suggestedQuestions.map((q, i) => (
              <div key={i} className="rounded-xl bg-slate-900/40 light:bg-white p-2.5">
                <p className="mb-1.5 text-sm text-slate-300 light:text-slate-700">{q}</p>
                {savedIndexes.has(i) ? (
                  <p className="text-xs text-emerald-400">{fa.common.success}</p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={answers[i] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder={fa.seller.panel.products.aiQuestionAnswerPlaceholder}
                      className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 bg-transparent px-2.5 py-1.5 text-xs text-slate-200 light:text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => saveAnswer(q, i)}
                      disabled={!answers[i]?.trim() || createKb.isPending}
                      className="shrink-0 rounded-lg bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 light:text-emerald-700 disabled:opacity-40"
                    >
                      {fa.common.save}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// فروشنده هرچقدر می‌خواهد می‌تواند بنویسد (دیگر سقف سختگیرانه‌ای در فرانت نیست)؛ فقط DTO
// بک‌اند (create-product.dto.ts/update-product.dto.ts) سقف واقعی ۵۰۰۰/۲۰۰ را enforce می‌کند —
// این‌جا فقط برای فیدبک فوری به فروشنده قبل از Save تکرار شده
const NAME_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 5000

// فیدبک کاربر ۱۴۰۵/۰۷/۰۱: میکروفون برای ضبط توضیحات + پیش‌نمایش Markdown — توضیح خام هیچ‌وقت
// مستقیم به خریدار نشان داده نمی‌شود (caption() همیشه پاسخ تازه می‌سازد)، پس این پیش‌نمایش فقط
// برای خودِ فروشنده حین نوشتن معناست. همان الگوی ضبط ShopChatPage.tsx، بدون semantics مکالمه.
function DescriptionEditor({
  value,
  onChange,
  storeId,
  maxLength,
}: {
  value: string
  onChange: (text: string) => void
  storeId: string
  maxLength: number
}) {
  const transcribe = useTranscribeAudio(storeId)
  const [recording, setRecording] = useState(false)
  const [previewOn, setPreviewOn] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        transcribe.mutate(blob, {
          onSuccess: ({ text }) => {
            const trimmed = text.trim()
            if (trimmed) onChange(value ? `${value}\n${trimmed}` : trimmed)
          },
        })
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      // دسترسی میکروفون رد شد — دکمه به حالت اولیه برمی‌گردد، نیازی به alert مزاحم نیست
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={transcribe.isPending}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
            recording ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 light:bg-slate-100 text-slate-300 light:text-slate-700'
          } disabled:opacity-40`}
        >
          🎙️ {recording ? fa.seller.panel.products.descriptionDictating : fa.seller.panel.products.descriptionDictateStart}
        </button>
        <button
          type="button"
          onClick={() => setPreviewOn(p => !p)}
          className="text-xs font-semibold text-emerald-400 light:text-emerald-700 hover:underline"
        >
          {fa.seller.panel.products.descriptionPreviewToggle}
        </button>
      </div>
      {transcribe.isPending && <p className="mb-2 text-xs text-slate-500">{fa.seller.panel.products.descriptionTranscribing}</p>}
      {transcribe.isError && <p className="mb-2 text-xs text-red-400">{fa.seller.panel.products.descriptionDictateError}</p>}
      {previewOn ? (
        <div className="min-h-[72px] rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-900/40 light:bg-slate-50 px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 prose prose-sm prose-invert light:prose-neutral max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || fa.seller.panel.products.descriptionPlaceholder}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={fa.seller.panel.products.descriptionPlaceholder}
          rows={3}
          maxLength={maxLength}
          className="w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
        />
      )}
    </div>
  )
}

function BackChevron() {
  // قانون RTL پروژه: آیکون «بازگشت» باید به راست اشاره کند (CLAUDE.md)
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}

// فیدبک کاربر ۱۴۰۵/۰۷/۰۱ — قبلاً ویرایش محصول یک مودال/شیت پایین‌صفحه بود؛ به یک صفحه‌ی
// مستقل تبدیل شد (همون الگوی TicketDetailPage.tsx/InvoiceDetailPage.tsx: دکمه‌ی بازگشت بالا،
// بدون محدودیت ارتفاع مصنوعی). منطق فرم عیناً همان ProductSheet قبلی است.
export function SellerProductEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { storeId } = useSellerStore()
  const products = useProducts(storeId)
  const isNew = id === 'new'

  // نتیجه‌ی آپلود عکس/ایجاد را مستقیم override می‌کنیم تا منتظر invalidate+refetch نباشیم
  // (همون دلیل A1 قبلی) — با عوض‌شدن id (مثلاً از لیست یک محصول دیگر باز شد) ریست می‌شود
  const [override, setOverride] = useState<SellerProduct | null>(null)
  useEffect(() => setOverride(null), [id])

  const found = isNew ? 'new' : (override ?? products.data?.find(p => p.id === id) ?? null)

  const update = useUpdateProduct(storeId)
  const create = useCreateProduct(storeId)
  const remove = useDeleteProduct(storeId)
  const pending = update.isPending || create.isPending || remove.isPending

  // docs/PRD-product-display-focus-and-variations.md §۲.۴ — لینک اختصاصی تلگرام همین محصول؛
  // بدون یوزرنیم بات (هنوز ساخته نشده) دکمه کلاً نمایش داده نمی‌شود، همون الگوی SellerMorePage
  const telegramLink = useProductTelegramLink(storeId)
  const [telegramCopied, setTelegramCopied] = useState(false)
  async function copyTelegramLink(productId: string) {
    if (!env.VITE_TELEGRAM_BOT_USERNAME) return
    const { shortCode } = await telegramLink.mutateAsync(productId)
    await navigator.clipboard.writeText(`https://t.me/${env.VITE_TELEGRAM_BOT_USERNAME}?start=p_${shortCode}`)
    setTelegramCopied(true)
    setTimeout(() => setTelegramCopied(false), 2000)
  }

  const product = found
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [persuasionTechniquesEnabled, setPersuasionTechniquesEnabled] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // فرم فقط یک‌بار از دیتای واقعی پر می‌شود (نه هر رندر، وگرنه تایپ فروشنده با هر invalidate
  // پاک می‌شد)؛ با عوض‌شدن id دوباره مقداردهی می‌شود
  useEffect(() => {
    setInitialized(false)
  }, [id])
  useEffect(() => {
    if (initialized || !product) return
    if (product !== 'new') {
      setName(product.name)
      setPrice(String(product.basePrice))
      setStock(String(product.stock))
      setDescription(product.description ?? '')
      setCode(product.code ?? '')
      setPersuasionTechniquesEnabled(product.persuasionTechniquesEnabled)
    }
    setInitialized(true)
  }, [initialized, product])

  function goBack() {
    navigate('/seller/panel/products')
  }

  function save() {
    const dto = {
      name,
      basePrice: Number(toEnglishDigits(price)) || 0,
      stock: stock ? Number(toEnglishDigits(stock)) : undefined,
      description: description || undefined,
      code: code.trim() || undefined,
      persuasionTechniquesEnabled,
    }
    if (isNew) {
      create.mutate(dto, { onSuccess: goBack })
    } else if (product && product !== 'new') {
      update.mutate({ productId: product.id, dto }, { onSuccess: goBack })
    }
  }

  function remove_() {
    if (isNew || !product || product === 'new') return
    if (!window.confirm(fa.seller.panel.products.deleteConfirm)) return
    remove.mutate(product.id, { onSuccess: goBack })
  }

  if (!isNew && products.isLoading) {
    return (
      <div className="flex items-center justify-center px-5 py-12 text-sm text-slate-400 light:text-slate-500">
        {fa.common.loading}
      </div>
    )
  }
  if (!isNew && !product) {
    return (
      <div className="px-5 py-6">
        <button onClick={goBack} className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800">
          <BackChevron />
          {fa.seller.panel.products.backToList}
        </button>
        <p className="text-sm text-slate-500">{fa.seller.panel.products.notFound}</p>
      </div>
    )
  }

  const existingProduct = product !== 'new' ? product : null

  return (
    <div className="px-5 py-6">
      <button onClick={goBack} className="mb-5 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-800">
        <BackChevron />
        {fa.seller.panel.products.backToList}
      </button>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-100 light:text-slate-900">
          {isNew ? fa.seller.panel.products.addProduct : fa.seller.panel.products.editProduct}
        </h1>
        {existingProduct && env.VITE_TELEGRAM_BOT_USERNAME && (
          <button
            onClick={() => void copyTelegramLink(existingProduct.id)}
            disabled={telegramLink.isPending}
            className="shrink-0 rounded-lg border border-slate-700/60 light:border-slate-200 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 light:text-slate-600 light:hover:text-slate-900 disabled:opacity-50"
          >
            {telegramCopied ? fa.seller.panel.products.telegramLinkCopied : fa.seller.panel.products.copyTelegramLink}
          </button>
        )}
      </div>

      <div className="mb-5">
        <Input label={fa.seller.step3.nameLabel} value={name} onChange={e => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} />
      </div>
      <div className="mb-5">
        <Input
          label={fa.seller.panel.products.codeLabel}
          placeholder={fa.seller.panel.products.codePlaceholder}
          value={code}
          onChange={e => setCode(e.target.value)}
          dir="ltr"
        />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Input
          label={fa.seller.step3.priceLabel}
          value={formatThousands(price)}
          onChange={e => setPrice(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
          dir="ltr"
          inputMode="numeric"
          className="text-center"
        />
        <Input
          label={fa.seller.step3.stockLabel}
          value={stock}
          onChange={e => setStock(toEnglishDigits(e.target.value).replace(/\D/g, ''))}
          dir="ltr"
          inputMode="numeric"
          className="text-center"
        />
      </div>

      {!isNew && product && product !== 'new' && (
        <>
          <ProductImages product={product} onProductUpdated={setOverride} />
          <ProductVideo product={product} onProductUpdated={setOverride} />
        </>
      )}

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.products.descriptionLabel}
        </label>
        <DescriptionEditor
          value={description}
          onChange={setDescription}
          storeId={storeId}
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
      </div>

      {!isNew && product && product !== 'new' && (
        <AiCompleteAssist productId={product.id} storeId={storeId} onApplyDescription={setDescription} />
      )}

      <div className="mb-6">
        <div className="divide-y divide-slate-800 light:divide-slate-200">
          <ToggleRow
            label={fa.seller.panel.products.persuasionToggleLabel}
            checked={persuasionTechniquesEnabled}
            onChange={setPersuasionTechniquesEnabled}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-600 light:text-slate-400">{fa.seller.panel.products.persuasionToggleHint}</p>
      </div>

      {(create.isError || update.isError) && (
        <p className="mb-3 text-xs text-red-400">
          {extractErrorMessage(create.error ?? update.error, fa.common.error)}
        </p>
      )}

      <button
        onClick={save}
        disabled={!name || !price || pending}
        className="mb-3 w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
      >
        {fa.common.save}
      </button>
      {!isNew && (
        <button onClick={remove_} disabled={pending} className="w-full rounded-2xl bg-red-500/15 py-3 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-40">
          {fa.common.delete}
        </button>
      )}
    </div>
  )
}
