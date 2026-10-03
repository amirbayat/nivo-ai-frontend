import { useState } from 'react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fa } from '@/locales/fa'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useGenerateProductDescriptionFromNotes } from '@/queries/seller.queries'

// فیدبک کاربر ۱۴۰۵/۰۷/۱۱ — قبلاً توضیحات محصول روی موبایل داخل یک textarea سه‌خطی نوشته
// می‌شد (بدون مدال)، که نوشتن توضیح کامل را ناخوشایند می‌کرد. این مدال تمام‌ارتفاع (عیناً
// الگوی AiCompleteAssist.tsx) هم فضای نوشتن راحت می‌دهد هم یک دکمه‌ی «پردازش با هوش مصنوعی»
// که یادداشت خام فروشنده را به یک توضیح Markdown تمیز تبدیل می‌کند.
function DescribeFromNotesModal({
  open,
  onClose,
  storeId,
  productId,
  onApply,
}: {
  open: boolean
  onClose: () => void
  storeId: string
  productId: string
  onApply: (description: string) => void
}) {
  const generate = useGenerateProductDescriptionFromNotes(storeId)
  const [notes, setNotes] = useState('')

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-300 ease-out sm:items-center sm:justify-center sm:p-6',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={fa.seller.panel.products.aiDescribeFromNotesModalTitle}
    >
      <div className="absolute inset-0 bg-black/70 sm:backdrop-blur-sm" onClick={onClose} />

      <div
        className={clsx(
          'relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg)] transition-all duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
          'sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:translate-y-0 sm:rounded-3xl sm:border sm:shadow-2xl',
          open ? 'sm:scale-100 sm:opacity-100' : 'sm:scale-95 sm:opacity-0',
        )}
        style={{ borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center gap-3 border-b border-slate-700/50 light:border-slate-200 px-5 pb-4"
          style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}
        >
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-white light:text-slate-900">
            {fa.seller.panel.products.aiDescribeFromNotesModalTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-300 light:text-slate-600"
            style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)' }}
            aria-label="بستن"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <p className="mb-3 text-xs text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiDescribeFromNotesHint}</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={fa.seller.panel.products.aiDescribeFromNotesPlaceholder}
            rows={10}
            className="mb-3 w-full resize-none rounded-2xl border border-slate-700 light:border-slate-300 bg-transparent px-3.5 py-2.5 text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => generate.mutate({ productId, rawText: notes })}
            disabled={generate.isPending || !notes.trim()}
            className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-300 light:text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {generate.isPending ? fa.seller.panel.products.aiDescribeFromNotesLoading : `✨ ${fa.seller.panel.products.aiDescribeFromNotesSubmit}`}
          </button>
          {generate.isError && (
            <p className="mt-2 text-xs text-red-400">
              {extractErrorMessage(generate.error, fa.seller.panel.products.aiDescribeFromNotesError)}
            </p>
          )}

          {generate.data && (
            <div className="mt-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-slate-50 p-3.5">
              <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">{fa.seller.panel.products.aiSuggestedDescription}</p>
              <div className="prose prose-sm prose-invert light:prose-neutral mb-3 max-w-none text-sm text-slate-200 light:text-slate-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{generate.data.suggestedDescription}</ReactMarkdown>
              </div>
              <button
                type="button"
                onClick={() => {
                  onApply(generate.data!.suggestedDescription)
                  onClose()
                }}
                className="w-full rounded-2xl bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 light:text-emerald-700"
              >
                {fa.seller.panel.products.aiDescribeFromNotesApply}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DescriptionNotesAssist({
  storeId,
  productId,
  onApply,
}: {
  storeId: string
  productId: string
  onApply: (description: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-slate-800 light:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300 light:text-slate-700"
      >
        ✨ {fa.seller.panel.products.aiDescribeFromNotes}
      </button>
      <DescribeFromNotesModal
        open={open}
        onClose={() => setOpen(false)}
        storeId={storeId}
        productId={productId}
        onApply={onApply}
      />
    </>
  )
}
