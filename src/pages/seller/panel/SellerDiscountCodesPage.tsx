import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits } from '@/lib/digits'
import type { DiscountKind, StoreDiscountCode } from '@/types/api'
import {
  useAddDiscountCode,
  useDiscountCodes,
  useUpdateDiscountCode,
  type CreateDiscountCodeInput,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

function valueLabel(code: StoreDiscountCode): string {
  return code.kind === 'PERCENT'
    ? `${code.value.toLocaleString('fa-IR')}٪`
    : `${code.value.toLocaleString('fa-IR')} تومان`
}

function DiscountCodeRow({ code, storeId }: { code: StoreDiscountCode; storeId: string }) {
  const update = useUpdateDiscountCode(storeId)
  const expired = !!code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()

  function toggleActive() {
    update.mutate({ codeId: code.id, isActive: !code.isActive })
  }

  return (
    <div
      className={clsx(
        'mb-3 rounded-2xl border px-4 py-4',
        code.isActive && !expired
          ? 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white'
          : 'border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 opacity-60',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p dir="ltr" className="text-sm font-mono font-bold text-slate-100 light:text-slate-900">
            {code.code}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{valueLabel(code)}</p>
        </div>
        {(!code.isActive || expired) && (
          <span className="rounded-full bg-slate-700/40 light:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
            {expired ? fa.seller.panel.discountCodes.expired : fa.seller.panel.discountCodes.inactive}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {code.maxRedemptions == null
          ? fa.seller.panel.discountCodes.redemptions(code.redemptionCount)
          : fa.seller.panel.discountCodes.redemptionsWithMax(code.redemptionCount, code.maxRedemptions)}
      </p>
      {code.minQuantity != null && (
        <p className="mt-0.5 text-xs text-slate-500">
          {fa.seller.panel.discountCodes.minQuantityHint(code.minQuantity)}
        </p>
      )}

      <button
        onClick={toggleActive}
        disabled={update.isPending || expired}
        className="mt-3 w-full rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
      >
        {code.isActive ? fa.seller.panel.discountCodes.deactivate : fa.seller.panel.discountCodes.activate}
      </button>
      {update.isError && <p className="mt-2 text-xs text-red-400">{fa.seller.panel.discountCodes.updateError}</p>}
    </div>
  )
}

function AddDiscountCodeForm({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const add = useAddDiscountCode(storeId)
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<DiscountKind>('PERCENT')
  const [value, setValue] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [minQuantity, setMinQuantity] = useState('')

  const numericValue = Number(toEnglishDigits(value))
  const valid =
    /^[A-Za-z0-9]{3,20}$/.test(code) &&
    numericValue > 0 &&
    (kind !== 'PERCENT' || numericValue <= 100)

  function submit() {
    const dto: CreateDiscountCodeInput = {
      code: code.toUpperCase(),
      kind,
      value: numericValue,
      ...(maxRedemptions ? { maxRedemptions: Number(toEnglishDigits(maxRedemptions)) } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      ...(minQuantity ? { minQuantity: Number(toEnglishDigits(minQuantity)) } : {}),
    }
    add.mutate(dto, { onSuccess: onDone })
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <div className="mb-3">
        <Input
          label={fa.seller.panel.discountCodes.codeLabel}
          placeholder="TAKHFIF20"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
          dir="ltr"
          className="text-center tracking-widest"
        />
      </div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setKind('PERCENT')}
          className={clsx(
            'flex-1 rounded-xl border py-2 text-xs font-semibold',
            kind === 'PERCENT' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700/60 light:border-slate-300',
          )}
        >
          {fa.seller.panel.discountCodes.kindPercent}
        </button>
        <button
          onClick={() => setKind('FIXED_AMOUNT')}
          className={clsx(
            'flex-1 rounded-xl border py-2 text-xs font-semibold',
            kind === 'FIXED_AMOUNT' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700/60 light:border-slate-300',
          )}
        >
          {fa.seller.panel.discountCodes.kindFixedAmount}
        </button>
      </div>
      <div className="mb-3">
        <Input
          label={kind === 'PERCENT' ? fa.seller.panel.discountCodes.valueLabelPercent : fa.seller.panel.discountCodes.valueLabelFixedAmount}
          value={value}
          onChange={e => setValue(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
        />
      </div>
      <div className="mb-3">
        <Input
          label={fa.seller.panel.discountCodes.maxRedemptionsLabel}
          placeholder={fa.seller.panel.discountCodes.maxRedemptionsPlaceholder}
          value={maxRedemptions}
          onChange={e => setMaxRedemptions(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
        />
      </div>
      <div className="mb-3">
        <Input
          type="date"
          label={fa.seller.panel.discountCodes.expiresAtLabel}
          value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <Input
          label={fa.seller.panel.discountCodes.minQuantityLabel}
          placeholder={fa.seller.panel.discountCodes.minQuantityPlaceholder}
          value={minQuantity}
          onChange={e => setMinQuantity(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
        />
      </div>
      {add.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.discountCodes.addError}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || add.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {fa.seller.panel.discountCodes.save}
        </button>
        <button onClick={onDone} className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.discountCodes.cancel}
        </button>
      </div>
    </div>
  )
}

export function SellerDiscountCodesPage() {
  const { storeId } = useSellerStore()
  const discountCodes = useDiscountCodes(storeId)
  const [adding, setAdding] = useState(false)

  const codes = discountCodes.data ?? []

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.discountCodes.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.discountCodes.subtitle}</p>

      {codes.length === 0 && !adding && (
        <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.discountCodes.empty}</p>
      )}
      {codes.map(code => (
        <DiscountCodeRow key={code.id} code={code} storeId={storeId} />
      ))}

      {adding ? (
        <AddDiscountCodeForm storeId={storeId} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.discountCodes.addCode}
        </button>
      )}
    </div>
  )
}
