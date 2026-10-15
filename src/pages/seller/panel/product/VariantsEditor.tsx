import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { DigitsInput } from '@/components/ui/DigitsInput'
import { PriceInput } from '@/components/ui/PriceInput'
import { splitVariantValues } from '@/lib/splitVariantValues'
import {
  MAX_OPTION_TYPES,
  cartesianCombos,
  comboKey,
  reconcileRows,
  type VariantDraft,
} from '@/lib/variantDraft'

const t = fa.seller.v2.product
const NAME_CHIPS: string[] = [t.optionColor, t.optionSize, t.optionModel]
const SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL', '۳۶', '۳۸', '۴۰', '۴۲', '۴۴', '۴۶']
const toFa = (s: string) => s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

interface Props {
  draft: VariantDraft
  onChange: (next: VariantDraft) => void
  mainStock: string
  alwaysInStock: boolean
  // ✨: گزینه‌ها را AI پر کرده
  aiFilled?: boolean
}

// docs/PRD-seller-panel-simplification.md §4.4 + §4.11.4 — ویرایشگر سبک مدل‌ها:
// چیپ نام گزینه، مقدار با ویرگول/Enter ⇒ چیپ فوری (بدون دکمه‌ی «افزودن»)، پیش‌تنظیم سایز،
// جدول ترکیب‌ها با موجودی پیش‌پر از موجودی اصلی و «همه رو یکی کن».
export function VariantsEditor({ draft, onChange, mainStock, alwaysInStock, aiFilled }: Props) {
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkValue, setBulkValue] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const emit = (options: VariantDraft['options']) =>
    onChange(reconcileRows({ ...draft, options }, mainStock, alwaysInStock))

  function addValues(index: number, text: string) {
    const existing = draft.options[index]?.values ?? []
    const fresh = splitVariantValues(text, existing)
    if (fresh.length === 0) return
    emit(draft.options.map((o, i) => (i === index ? { ...o, values: [...o.values, ...fresh] } : o)))
  }

  function onInput(index: number, text: string) {
    if (/[،,\n]/.test(text)) {
      addValues(index, text)
      setInputs(prev => ({ ...prev, [index]: '' }))
    } else {
      setInputs(prev => ({ ...prev, [index]: text }))
    }
  }

  function commit(index: number) {
    const text = inputs[index] ?? ''
    if (text.trim()) addValues(index, text)
    setInputs(prev => ({ ...prev, [index]: '' }))
  }

  const combos = cartesianCombos(draft.options).filter(c => !draft.removed.includes(comboKey(c)))

  function setRow(key: string, patch: Partial<VariantDraft['rows'][string]>) {
    const row = draft.rows[key] ?? { stock: '', priceOverride: '', sku: '', weightGrams: '', purityKarat: '' }
    onChange({ ...draft, rows: { ...draft.rows, [key]: { ...row, ...patch } } })
  }

  function applyAll() {
    const rows = { ...draft.rows }
    for (const c of combos) {
      const key = comboKey(c)
      rows[key] = { ...(rows[key] ?? { stock: '', priceOverride: '', sku: '', weightGrams: '', purityKarat: '' }), stock: bulkValue }
    }
    onChange({ ...draft, rows })
    setBulkOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {draft.options.map((option, oi) => {
        const isPreset = NAME_CHIPS.includes(option.name)
        return (
          <div key={oi} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 light:border-slate-200 light:bg-white">
            <div className="flex flex-wrap items-center gap-2">
              {NAME_CHIPS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => emit(draft.options.map((o, i) => (i === oi ? { ...o, name: n } : o)))}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs',
                    option.name === n
                      ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700'
                      : 'border-slate-700 text-slate-400 light:border-slate-300 light:text-slate-600',
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => isPreset && emit(draft.options.map((o, i) => (i === oi ? { ...o, name: '' } : o)))}
                className={clsx(
                  'rounded-full border px-3 py-1 text-xs',
                  !isPreset
                    ? 'border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-400 light:text-emerald-700'
                    : 'border-slate-700 text-slate-400 light:border-slate-300 light:text-slate-600',
                )}
              >
                {t.optionOther}
              </button>
              <button
                type="button"
                aria-label={fa.common.delete}
                onClick={() => emit(draft.options.filter((_, i) => i !== oi))}
                className="ms-auto text-lg text-slate-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
            {!isPreset && (
              <input
                value={option.name}
                onChange={e => emit(draft.options.map((o, i) => (i === oi ? { ...o, name: e.target.value } : o)))}
                placeholder={t.optionOther}
                autoFocus
                className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-transparent px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {option.values.map(v => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 light:text-emerald-700">
                  {v}
                  <button
                    type="button"
                    aria-label={fa.common.delete}
                    onClick={() => emit(draft.options.map((o, i) => (i === oi ? { ...o, values: o.values.filter(x => x !== v) } : o)))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {option.name === t.optionSize && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                {SIZE_PRESETS.filter(p => !option.values.includes(p)).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addValues(oi, p)}
                    className="shrink-0 rounded-full border border-dashed border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-400 light:text-emerald-700"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            )}
            <input
              value={inputs[oi] ?? ''}
              onChange={e => onInput(oi, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit(oi)
                }
              }}
              onBlur={() => commit(oi)}
              placeholder={t.valuesPlaceholder}
              className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none light:border-slate-300 light:text-slate-900"
            />
          </div>
        )
      })}

      {draft.options.length < MAX_OPTION_TYPES && (
        <button
          type="button"
          onClick={() => emit([...draft.options, { name: draft.options.length === 0 ? t.optionColor : t.optionSize, values: [] }])}
          className="self-start text-sm font-bold text-emerald-400 light:text-emerald-700"
        >
          + {draft.options.length === 0 ? t.addVariants : t.addOtherOption}
        </button>
      )}

      {combos.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {t.combos(toFa(String(combos.length)))} {aiFilled ? '✨' : ''}
            </span>
            {!alwaysInStock && (
              <button type="button" onClick={() => setBulkOpen(v => !v)} className="text-xs font-bold text-emerald-400 light:text-emerald-700">
                {t.sameForAll}
              </button>
            )}
          </div>
          {bulkOpen && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-800/50 p-2 light:bg-slate-100">
              <span className="text-xs text-slate-300 light:text-slate-600">{t.sameForAllPrompt}</span>
              <DigitsInput kind="int" value={bulkValue} onChange={setBulkValue} className="!w-20 text-center" />
              <button type="button" onClick={applyAll} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                {fa.common.confirm}
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-slate-800 light:border-slate-200">
            {combos.map(combo => {
              const key = comboKey(combo)
              const row = draft.rows[key]
              const label = Object.values(combo).join(' / ')
              return (
                <div key={key} className="border-b border-slate-800 last:border-0 light:border-slate-200">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button type="button" onClick={() => setExpanded(expanded === key ? null : key)} className="min-w-0 flex-1 truncate text-start text-sm text-slate-200 light:text-slate-800">
                      {label}
                    </button>
                    {alwaysInStock ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300 light:text-emerald-700">{t.alwaysInStock}</span>
                    ) : (
                      <DigitsInput
                        kind="int"
                        value={row?.stock ?? ''}
                        onChange={v => setRow(key, { stock: v })}
                        placeholder={t.comboStock}
                        className="!w-20 text-center"
                        style={{ minHeight: 36 }}
                      />
                    )}
                    <button
                      type="button"
                      aria-label={t.removeCombo}
                      onClick={() => onChange({ ...draft, removed: [...draft.removed, key] })}
                      className="text-lg text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                  {expanded === key && (
                    <div className="px-3 pb-3">
                      <PriceInput
                        label={t.variantPriceOverride}
                        value={row?.priceOverride ?? ''}
                        onChange={v => setRow(key, { priceOverride: v })}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
