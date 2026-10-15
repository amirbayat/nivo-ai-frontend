import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { toEnglishDigits } from '@/lib/digits'
import { DEMO_CATEGORY_LABELS } from '@/lib/demoCategories'
import { extractErrorMessage } from '@/lib/sellerProduct'
import { useCreateStore, useSlugSuggest } from '@/queries/seller.queries'

// docs/PRD-seller-panel-simplification.md §4.2 — ثبت‌نام یک صفحه‌ای: اسم → «بساز» → مستقیم به
// اولین محصول. ویزارد ۴ قدمی (توصیف کسب‌وکار، لینک‌ها، کارت، معرفی برند) حذف شد؛ همه‌ی آن‌ها
// بعد از ساخت فروشگاه در پنل قابل تنظیم‌اند.
const TOP_CATEGORIES = fa.seller.step1.categories.slice(0, 8)
const OTHER = 'سایر'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// فقط [a-z0-9-]؛ ارقام فارسی به انگلیسی
function cleanSlug(raw: string): string {
  return toEnglishDigits(raw).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M11.5 3.5a1.75 1.75 0 0 1 2.5 2.5L5.5 14.5l-3 .75.75-3Z" />
    </svg>
  )
}

export function SellerOnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createStore = useCreateStore()
  const t = fa.seller.signup

  const demoCategory = DEMO_CATEGORY_LABELS[searchParams.get('category') ?? '']
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(demoCategory ?? null)
  const [otherText, setOtherText] = useState('')
  const [editingLink, setEditingLink] = useState(false)
  const [typedSlug, setTypedSlug] = useState('')
  // لینکی که فروشنده با ✎ انتخاب کرده؛ null = سرور خودش از نام می‌سازد
  const [customSlug, setCustomSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const debouncedName = useDebounced(name, 400)
  const debouncedTyped = useDebounced(editingLink ? typedSlug : (customSlug ?? ''), 400)
  const suggest = useSlugSuggest(debouncedName, debouncedTyped)
  const shownSlug = customSlug ?? suggest.data?.slug ?? ''
  const typedTaken = editingLink && typedSlug.length >= 3 && suggest.data && !suggest.data.requestedAvailable

  const canSubmit = name.trim().length >= 2 && !createStore.isPending

  async function submit() {
    if (!canSubmit) return
    setError(null)
    const finalCategory = category === OTHER ? otherText.trim() || OTHER : (category ?? undefined)
    try {
      await createStore.mutateAsync({
        name: name.trim(),
        category: finalCategory,
        ...(customSlug ? { slug: customSlug } : {}),
      })
      navigate('/seller/panel/products/new?first=1', { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, t.networkError))
    }
  }

  return (
    <div className="flex min-h-[100dvh] justify-center bg-slate-950 light:bg-white" dir="rtl">
      <form
        className="flex w-full max-w-[640px] flex-col px-4 pt-10"
        onSubmit={e => {
          e.preventDefault()
          void submit()
        }}
      >
        <h1 className="text-[22px] font-extrabold text-slate-100 light:text-slate-900">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-400 light:text-slate-500">{t.subtitle}</p>

        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          placeholder={t.namePlaceholder}
          autoComplete="off"
          className="mt-6 h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
        />

        <div className="mt-2 min-h-8">
          {editingLink ? (
            <div className="flex items-center gap-2">
              <input
                dir="ltr"
                value={typedSlug}
                onChange={e => setTypedSlug(cleanSlug(e.target.value))}
                autoCapitalize="none"
                autoCorrect="off"
                className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-left text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  setCustomSlug(typedSlug.length >= 3 && !typedTaken ? typedSlug : null)
                  setEditingLink(false)
                }}
                className="px-2 text-sm font-bold text-emerald-400 light:text-emerald-700"
              >
                {t.linkDone}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span dir="ltr" className="truncate text-left font-mono text-xs text-slate-400 light:text-slate-500">
                nivoai.ir/shop/{name.trim().length >= 2 ? shownSlug || '…' : '…'}
              </span>
              <button
                type="button"
                aria-label={t.editLink}
                onClick={() => {
                  setTypedSlug(shownSlug)
                  setEditingLink(true)
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 light:hover:bg-slate-100"
              >
                <PencilIcon />
              </button>
            </div>
          )}
          {typedTaken && suggest.data && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-red-400">{t.slugTaken(suggest.data.slug)}</span>
              <button
                type="button"
                onClick={() => setTypedSlug(suggest.data!.slug)}
                className="rounded-full border border-dashed border-emerald-500/40 px-3 py-1 text-xs text-emerald-400 light:text-emerald-700"
              >
                {t.useSlug}
              </button>
            </div>
          )}
        </div>

        <p className="mt-5 text-xs font-medium text-slate-400 light:text-slate-500">{t.whatSell}</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[...TOP_CATEGORIES, OTHER].map(c => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              className={clsx(
                'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px]',
                category === c
                  ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700'
                  : 'border-slate-700 text-slate-300 light:border-slate-300 light:text-slate-600',
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {category === OTHER && (
          <input
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            maxLength={60}
            placeholder={t.otherPlaceholder}
            className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:bg-white light:text-slate-900"
          />
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="sticky bottom-0 mt-auto bg-slate-950 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 light:bg-white">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createStore.isPending ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : t.submit}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            {t.termsBefore}
            <Link to="/terms" target="_blank" className="underline">
              {t.termsLink}
            </Link>
            {t.termsAfter}
          </p>
        </div>
      </form>
    </div>
  )
}
