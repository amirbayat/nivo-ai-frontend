import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { IRAN_PROVINCES } from '@/lib/iranProvinces'
import type { StoreShippingRule } from '@/types/api'
import {
  useAddShippingRule,
  useDeleteShippingRule,
  useShippingRules,
  useUpdateShippingRule,
  type CreateShippingRuleInput,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۲ (فاز ۱.۵) — ۳ ستون، چک‌باکس‌های
// قابل‌تیک‌زدن (نه دراپ‌داون تک‌انتخابی)؛ هم فرم افزودن هم ویرایش یک گروه از همین استفاده می‌کنند
function ProvinceCheckboxGrid({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (province: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
      {IRAN_PROVINCES.map(p => (
        <label key={p} className="flex items-center gap-1.5 text-xs text-slate-300 light:text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(p)}
            onChange={() => onToggle(p)}
            className="size-3.5 rounded border-slate-600 light:border-slate-300"
          />
          {p}
        </label>
      ))}
    </div>
  )
}

function ShippingRuleRow({ rule, storeId }: { rule: StoreShippingRule; storeId: string }) {
  const update = useUpdateShippingRule(storeId)
  const del = useDeleteShippingRule(storeId)
  const [editing, setEditing] = useState(false)
  const [cost, setCost] = useState(String(rule.cost))
  const [provinces, setProvinces] = useState<string[]>(rule.provinces)

  function toggleEnabled() {
    update.mutate({ ruleId: rule.id, enabled: !rule.enabled })
  }

  function toggleProvince(p: string) {
    setProvinces(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }

  function save() {
    const numeric = Number(toEnglishDigits(cost))
    if (!Number.isFinite(numeric) || numeric < 0 || provinces.length === 0) return
    update.mutate(
      { ruleId: rule.id, cost: numeric, provinces },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <div
      className={clsx(
        'mb-3 rounded-2xl border px-4 py-4',
        rule.enabled
          ? 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white'
          : 'border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 opacity-60',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100 light:text-slate-900">
          {rule.provinces.join('، ')}
        </p>
        {!rule.enabled && (
          <span className="rounded-full bg-slate-700/40 light:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
            {fa.seller.panel.shippingRules.disabledBadge}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mb-3">
          <div className="mb-3">
            <ProvinceCheckboxGrid selected={provinces} onToggle={toggleProvince} />
            {provinces.length === 0 && (
              <p className="mt-1.5 text-xs text-red-400">{fa.seller.panel.shippingRules.provincesEmpty}</p>
            )}
          </div>
          <Input
            label={fa.seller.panel.shippingRules.costLabel}
            value={cost}
            onChange={e => setCost(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
          />
          {update.isError && <p className="mt-2 text-xs text-red-400">{fa.seller.panel.shippingRules.updateError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={update.isPending || provinces.length === 0}
              className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {fa.seller.panel.shippingRules.save}
            </button>
            <button
              onClick={() => {
                setProvinces(rule.provinces)
                setCost(String(rule.cost))
                setEditing(false)
              }}
              className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700"
            >
              {fa.seller.panel.shippingRules.cancel}
            </button>
          </div>
        </div>
      ) : (
        <p onClick={() => setEditing(true)} className="mb-2 cursor-pointer text-xs text-slate-400 light:text-slate-600">
          {rule.cost.toLocaleString('fa-IR')} تومان
        </p>
      )}

      {!editing && (
        <div className="flex gap-2">
          <button
            onClick={toggleEnabled}
            disabled={update.isPending}
            className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
          >
            {rule.enabled ? fa.seller.panel.discountCodes.deactivate : fa.seller.panel.discountCodes.activate}
          </button>
          <button
            onClick={() => del.mutate(rule.id)}
            disabled={del.isPending}
            className="rounded-xl border border-slate-700 light:border-slate-300 px-3 py-2 text-xs font-semibold text-red-400 hover:border-red-500/60 disabled:opacity-40"
          >
            {fa.seller.panel.shippingRules.delete}
          </button>
        </div>
      )}
    </div>
  )
}

function AddShippingRuleForm({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const add = useAddShippingRule(storeId)
  const [provinces, setProvinces] = useState<string[]>([])
  const [cost, setCost] = useState('')

  const numericCost = Number(toEnglishDigits(cost))
  const valid = provinces.length > 0 && Number.isFinite(numericCost) && numericCost >= 0

  function toggleProvince(p: string) {
    setProvinces(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }

  function submit() {
    const dto: CreateShippingRuleInput = { provinces, cost: numericCost }
    add.mutate(dto, { onSuccess: onDone })
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <div className="mb-3">
        <p className="mb-1.5 text-xs font-semibold text-slate-400 light:text-slate-600">
          {fa.seller.panel.shippingRules.provincesLabel}
        </p>
        <ProvinceCheckboxGrid selected={provinces} onToggle={toggleProvince} />
      </div>
      <div className="mb-3">
        <Input
          label={fa.seller.panel.shippingRules.costLabel}
          value={cost}
          onChange={e => setCost(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
        />
      </div>
      {add.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.shippingRules.addError}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || add.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {fa.seller.panel.shippingRules.save}
        </button>
        <button onClick={onDone} className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.shippingRules.cancel}
        </button>
      </div>
    </div>
  )
}

// docs/PRD-sales-agent-checkout-pricing-and-roadmap.md بخش ۲ (فاز ۱.۵) — بالای صفحه یک تیک
// «ارسال به کل ایران» برای ردیف پیش‌فرض (provinces=[])؛ اغلب فروشنده‌ها فقط همین + یک عدد
// لازم دارند، نه فهرست استان‌ها
function NationwideRuleCard({ storeId, rule }: { storeId: string; rule?: StoreShippingRule }) {
  const add = useAddShippingRule(storeId)
  const update = useUpdateShippingRule(storeId)
  const del = useDeleteShippingRule(storeId)
  const [cost, setCost] = useState(String(rule?.cost ?? 0))

  function toggleNationwide(checked: boolean) {
    if (checked) {
      add.mutate({ provinces: [], cost: Number(toEnglishDigits(cost)) || 0 })
    } else if (rule) {
      del.mutate(rule.id)
    }
  }

  function saveCost() {
    if (!rule) return
    const numeric = Number(toEnglishDigits(cost))
    if (!Number.isFinite(numeric) || numeric < 0) return
    update.mutate({ ruleId: rule.id, cost: numeric })
  }

  return (
    <div className="mb-5 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white px-4 py-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-100 light:text-slate-900">
        <input
          type="checkbox"
          checked={!!rule}
          onChange={e => toggleNationwide(e.target.checked)}
          disabled={add.isPending || del.isPending}
          className="size-4 rounded border-slate-600 light:border-slate-300"
        />
        {fa.seller.panel.shippingRules.nationwideLabel}
      </label>

      {rule && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={cost}
            onChange={e => setCost(e.target.value.replace(/\D/g, ''))}
            onBlur={saveCost}
            inputMode="numeric"
            className="flex-1"
          />
          <span className="text-xs text-slate-500">تومان</span>
        </div>
      )}
    </div>
  )
}

export function SellerShippingPage() {
  const { storeId } = useSellerStore()
  const rules = useShippingRules(storeId)
  const [adding, setAdding] = useState(false)

  const allRules = rules.data ?? []
  const defaultRule = allRules.find(r => r.provinces.length === 0)
  const groupRules = allRules.filter(r => r.provinces.length > 0)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.shippingRules.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.shippingRules.subtitle}</p>

      <NationwideRuleCard storeId={storeId} rule={defaultRule} />

      {groupRules.length === 0 && !adding && (
        <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.shippingRules.empty}</p>
      )}
      {groupRules.map(rule => (
        <ShippingRuleRow key={rule.id} rule={rule} storeId={storeId} />
      ))}

      {adding ? (
        <AddShippingRuleForm storeId={storeId} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.shippingRules.addRule}
        </button>
      )}
    </div>
  )
}
