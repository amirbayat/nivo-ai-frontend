import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import { IRAN_CITIES } from '@/lib/iranCities'
import type { StoreShippingRule } from '@/types/api'
import {
  useAddShippingRule,
  useDeleteShippingRule,
  useShippingRules,
  useUpdateShippingRule,
  type CreateShippingRuleInput,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

function ShippingRuleRow({ rule, storeId }: { rule: StoreShippingRule; storeId: string }) {
  const update = useUpdateShippingRule(storeId)
  const del = useDeleteShippingRule(storeId)
  const [editing, setEditing] = useState(false)
  const [cost, setCost] = useState(String(rule.cost))

  function toggleEnabled() {
    update.mutate({ ruleId: rule.id, enabled: !rule.enabled })
  }

  function saveCost() {
    const numeric = Number(toEnglishDigits(cost))
    if (!Number.isFinite(numeric) || numeric < 0) return
    update.mutate({ ruleId: rule.id, cost: numeric }, { onSuccess: () => setEditing(false) })
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
          {rule.city ?? fa.seller.panel.shippingRules.defaultRuleLabel}
        </p>
        {!rule.enabled && (
          <span className="rounded-full bg-slate-700/40 light:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
            {fa.seller.panel.shippingRules.disabledBadge}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mb-2 flex items-center gap-2">
          <Input
            value={cost}
            onChange={e => setCost(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className="flex-1"
          />
          <button
            onClick={saveCost}
            disabled={update.isPending}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {fa.seller.panel.shippingRules.save}
          </button>
        </div>
      ) : (
        <p onClick={() => setEditing(true)} className="mb-2 cursor-pointer text-xs text-slate-400 light:text-slate-600">
          {rule.cost.toLocaleString('fa-IR')} تومان
        </p>
      )}
      {update.isError && <p className="mb-2 text-xs text-red-400">{fa.seller.panel.shippingRules.updateError}</p>}

      <div className="flex gap-2">
        <button
          onClick={toggleEnabled}
          disabled={update.isPending}
          className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
        >
          {rule.enabled ? fa.seller.panel.discountCodes.deactivate : fa.seller.panel.discountCodes.activate}
        </button>
        {rule.city !== null && (
          <button
            onClick={() => del.mutate(rule.id)}
            disabled={del.isPending}
            className="rounded-xl border border-slate-700 light:border-slate-300 px-3 py-2 text-xs font-semibold text-red-400 hover:border-red-500/60 disabled:opacity-40"
          >
            {fa.seller.panel.shippingRules.delete}
          </button>
        )}
      </div>
    </div>
  )
}

function AddShippingRuleForm({
  storeId,
  usedCities,
  onDone,
}: {
  storeId: string
  usedCities: string[]
  onDone: () => void
}) {
  const add = useAddShippingRule(storeId)
  const availableCities = IRAN_CITIES.filter(c => !usedCities.includes(c))
  const [city, setCity] = useState(availableCities[0] ?? '')
  const [cost, setCost] = useState('')

  const numericCost = Number(toEnglishDigits(cost))
  const valid = !!city && Number.isFinite(numericCost) && numericCost >= 0

  function submit() {
    const dto: CreateShippingRuleInput = { city, cost: numericCost }
    add.mutate(dto, { onSuccess: onDone })
  }

  if (availableCities.length === 0) return null

  return (
    <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 light:text-slate-600">
          {fa.seller.panel.shippingRules.cityLabel}
        </label>
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="w-full rounded-xl border border-slate-700 light:border-slate-300 bg-slate-900 light:bg-white px-3 py-2.5 text-sm text-slate-200 light:text-slate-900"
        >
          {availableCities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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

export function SellerShippingPage() {
  const { storeId } = useSellerStore()
  const rules = useShippingRules(storeId)
  const addDefault = useAddShippingRule(storeId)
  const [adding, setAdding] = useState(false)

  const allRules = rules.data ?? []
  const defaultRule = allRules.find(r => r.city === null)
  const cityRules = allRules.filter(r => r.city !== null)
  const usedCities = cityRules.map(r => r.city as string)

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.shippingRules.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.shippingRules.subtitle}</p>

      {!defaultRule ? (
        <button
          onClick={() => addDefault.mutate({ cost: 0 })}
          disabled={addDefault.isPending}
          className="mb-3 w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 disabled:opacity-40"
        >
          {fa.seller.panel.shippingRules.editDefaultRule}
        </button>
      ) : (
        <ShippingRuleRow rule={defaultRule} storeId={storeId} />
      )}

      {cityRules.length === 0 && !adding && (
        <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.shippingRules.empty}</p>
      )}
      {cityRules.map(rule => (
        <ShippingRuleRow key={rule.id} rule={rule} storeId={storeId} />
      ))}

      {adding ? (
        <AddShippingRuleForm storeId={storeId} usedCities={usedCities} onDone={() => setAdding(false)} />
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
