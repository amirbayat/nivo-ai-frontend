// مسیر نسبی با پسوند: تست‌های node --test بدون alias اجرا می‌شوند
import { toEnglishDigits } from './digits.ts'
import type { ReplaceProductVariantsInput } from '@/queries/seller.queries'
import type { SellerProduct } from '@/types/api'

// docs/PRD-seller-panel-simplification.md §4.4 — مدل (رنگ/سایز) به‌صورت یک draft کنترل‌شده که
// صفحه‌ی محصول و صفحه‌ی batch هر دو از آن استفاده می‌کنند؛ ذخیره‌ی آن همراه ذخیره‌ی خود محصول است.
export const MAX_OPTION_TYPES = 2

export interface VariantRow {
  stock: string
  priceOverride: string
  sku: string
  weightGrams: string
  purityKarat: string
}

export interface VariantDraft {
  options: { name: string; values: string[] }[]
  rows: Record<string, VariantRow>
  // ترکیب‌هایی که فروشنده با × حذف کرده
  removed: string[]
}

export const emptyVariantDraft = (): VariantDraft => ({ options: [], rows: {}, removed: [] })

export function comboKey(optionValues: Record<string, string>): string {
  return Object.keys(optionValues)
    .sort()
    .map(k => `${k}=${optionValues[k]}`)
    .join('|')
}

// ترکیب دکارتی؛ فقط وقتی همه‌ی گزینه‌ها نام و حداقل یک مقدار دارند (وگرنه حین تایپ ترکیب ناقص نشان داده می‌شود)
export function cartesianCombos(options: VariantDraft['options']): Record<string, string>[] {
  const valid = options.filter(o => o.name.trim() && o.values.length > 0)
  if (valid.length === 0 || valid.length !== options.length) return []
  return valid.reduce<Record<string, string>[]>((acc, opt) => {
    if (acc.length === 0) return opt.values.map(v => ({ [opt.name.trim()]: v }))
    return acc.flatMap(combo => opt.values.map(v => ({ ...combo, [opt.name.trim()]: v })))
  }, [])
}

export function visibleCombos(draft: VariantDraft): Record<string, string>[] {
  return cartesianCombos(draft.options).filter(c => !draft.removed.includes(comboKey(c)))
}

const blankRow = (stock: string): VariantRow => ({ stock, priceOverride: '', sku: '', weightGrams: '', purityKarat: '' })

// بعد از هر تغییر گزینه/مقدار: ردیف ترکیب‌های تازه با موجودی اصلی محصول پر می‌شود (فروشنده فقط
// استثناها را عوض می‌کند)؛ ردیف ترکیب‌های ناپدیدشده حذف می‌شود
export function reconcileRows(draft: VariantDraft, mainStock: string, alwaysInStock: boolean): VariantDraft {
  const combos = cartesianCombos(draft.options)
  const keys = new Set(combos.map(comboKey))
  const rows: Record<string, VariantRow> = {}
  for (const key of keys) {
    rows[key] = draft.rows[key] ?? blankRow(alwaysInStock ? '' : mainStock)
  }
  return { ...draft, rows, removed: draft.removed.filter(k => keys.has(k)) }
}

export function variantDraftFromProduct(product: Pick<SellerProduct, 'optionTypes' | 'variants'>): VariantDraft {
  const options = (product.optionTypes ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(o => ({ name: o.name, values: o.values.slice().sort((a, b) => a.position - b.position).map(v => v.value) }))
  const rows: Record<string, VariantRow> = {}
  for (const v of product.variants ?? []) {
    rows[comboKey(v.optionValues)] = {
      stock: String(v.stock),
      priceOverride: v.priceOverride != null ? String(v.priceOverride) : '',
      sku: v.sku ?? '',
      weightGrams: v.weightGrams != null ? String(v.weightGrams) : '',
      purityKarat: v.purityKarat != null ? String(v.purityKarat) : '',
    }
  }
  return { options, rows, removed: [] }
}

// loadedStock: موجودی ذخیره‌شده‌ی هر ترکیب؛ فقط اگر عوض شده یا ترکیب تازه است stock فرستاده می‌شود
// (وگرنه بی‌دلیل موجودی قدیمی overwrite و هشدار «موجود شد» بی‌مورد می‌شد)
export function buildVariantsDto(
  draft: VariantDraft,
  loadedStock: Record<string, number>,
  alwaysInStock: boolean,
): ReplaceProductVariantsInput {
  const options = draft.options.filter(o => o.name.trim() && o.values.length > 0)
  if (options.length === 0) return { optionTypes: [], variants: [] }
  return {
    optionTypes: options.map(o => ({ name: o.name.trim(), values: o.values })),
    variants: visibleCombos(draft).map(optionValues => {
      const key = comboKey(optionValues)
      const row = draft.rows[key] ?? blankRow('')
      const stock = alwaysInStock ? undefined : Number(toEnglishDigits(row.stock)) || 0
      const loaded = loadedStock[key]
      return {
        optionValues,
        ...(stock !== undefined && (loaded === undefined || stock !== loaded) ? { stock } : {}),
        priceOverride: row.priceOverride ? Number(toEnglishDigits(row.priceOverride)) || 0 : null,
        sku: row.sku.trim() || undefined,
        weightGrams: row.weightGrams ? Number(toEnglishDigits(row.weightGrams)) || undefined : undefined,
        purityKarat: row.purityKarat ? Number(row.purityKarat) || undefined : undefined,
      }
    }),
  }
}

export function loadedStockOf(product: Pick<SellerProduct, 'variants'>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of product.variants ?? []) out[comboKey(v.optionValues)] = v.stock
  return out
}

// نتیجه‌ی ai-fill ← draft (مستقیم، بدون pendingVariantOptions)؛ موجودی هر مقدار فقط وقتی
// دقیقاً یک نوع گزینه است قابل نگاشت به ترکیب است
export function variantDraftFromAi(
  options: { name: string; values: { value: string; stock?: number }[] }[],
  mainStock: string,
  alwaysInStock: boolean,
): VariantDraft {
  const base: VariantDraft = {
    options: options.slice(0, MAX_OPTION_TYPES).map(o => ({ name: o.name, values: o.values.map(v => v.value) })),
    rows: {},
    removed: [],
  }
  const draft = reconcileRows(base, mainStock, alwaysInStock)
  if (options.length === 1) {
    for (const v of options[0].values) {
      if (v.stock == null) continue
      const key = comboKey({ [options[0].name.trim()]: v.value })
      if (draft.rows[key]) draft.rows[key] = { ...draft.rows[key], stock: String(v.stock) }
    }
  }
  return draft
}
