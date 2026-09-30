import { useState } from 'react'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { toEnglishDigits, formatCardNumberGroups } from '@/lib/digits'
import type { CardDisplayPolicy, StoreBankCard } from '@/types/api'
import {
  useAddBankCard,
  useBankCards,
  useUpdateBankCard,
  useUpdateCardPolicy,
  type CreateBankCardInput,
} from '@/queries/seller.queries'
import { useSellerStore } from './SellerPanelLayout'

const POLICIES: { value: CardDisplayPolicy; label: string; hint: string }[] = [
  { value: 'EQUAL', label: fa.seller.panel.bankCards.policyEqual, hint: fa.seller.panel.bankCards.policyEqualHint },
  { value: 'THRESHOLD', label: fa.seller.panel.bankCards.policyThreshold, hint: fa.seller.panel.bankCards.policyThresholdHint },
  { value: 'PERCENTAGE', label: fa.seller.panel.bankCards.policyPercentage, hint: fa.seller.panel.bankCards.policyPercentageHint },
]

function BankCardRow({
  card,
  policy,
  storeId,
  canDeactivate,
}: {
  card: StoreBankCard
  policy: CardDisplayPolicy
  storeId: string
  canDeactivate: boolean
}) {
  const update = useUpdateBankCard(storeId)
  const [threshold, setThreshold] = useState(card.thresholdToman?.toString() ?? '')
  const [weight, setWeight] = useState(card.percentWeight?.toString() ?? '')
  const [sortOrder, setSortOrder] = useState(card.sortOrder.toString())

  function commitThreshold() {
    const n = threshold ? Number(toEnglishDigits(threshold)) : undefined
    update.mutate({ cardId: card.id, dto: { thresholdToman: n } })
  }
  function commitWeight() {
    const n = weight ? Number(toEnglishDigits(weight)) : undefined
    update.mutate({ cardId: card.id, dto: { percentWeight: n } })
  }
  function commitSortOrder() {
    update.mutate({ cardId: card.id, dto: { sortOrder: Number(toEnglishDigits(sortOrder)) || 0 } })
  }
  function toggleActive() {
    update.mutate({ cardId: card.id, dto: { isActive: !card.isActive } })
  }

  return (
    <div
      className={clsx(
        'mb-3 rounded-2xl border px-4 py-4',
        card.isActive
          ? 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white'
          : 'border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 opacity-60',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p dir="ltr" className="text-sm font-mono text-slate-100 light:text-slate-900">
            {formatCardNumberGroups(card.cardNumber)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{card.ownerName}</p>
        </div>
        {!card.isActive && (
          <span className="rounded-full bg-slate-700/40 light:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
            {fa.seller.panel.bankCards.inactive}
          </span>
        )}
      </div>

      {policy === 'THRESHOLD' && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Input
              label={fa.seller.panel.bankCards.thresholdLabel}
              placeholder={fa.seller.panel.bankCards.thresholdPlaceholder}
              value={threshold}
              onChange={e => setThreshold(e.target.value.replace(/\D/g, ''))}
              onBlur={commitThreshold}
              inputMode="numeric"
            />
          </div>
          <div className="w-20">
            <Input
              label={fa.seller.panel.bankCards.sortOrderLabel}
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value.replace(/\D/g, ''))}
              onBlur={commitSortOrder}
              inputMode="numeric"
            />
          </div>
        </div>
      )}
      {policy === 'THRESHOLD' && (
        <p className="mt-2 text-xs text-slate-500">
          {card.thresholdToman != null
            ? fa.seller.panel.bankCards.confirmedSoFar(card.totalConfirmedToman, card.thresholdToman)
            : fa.seller.panel.bankCards.confirmedNoThreshold(card.totalConfirmedToman)}
        </p>
      )}

      {policy === 'PERCENTAGE' && (
        <div className="mt-3 w-28">
          <Input
            label={fa.seller.panel.bankCards.percentWeightLabel}
            value={weight}
            onChange={e => setWeight(e.target.value.replace(/\D/g, ''))}
            onBlur={commitWeight}
            inputMode="numeric"
          />
        </div>
      )}

      <button
        onClick={toggleActive}
        disabled={update.isPending || (card.isActive && !canDeactivate)}
        className="mt-3 w-full rounded-xl border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400 disabled:opacity-40"
      >
        {card.isActive ? fa.seller.panel.bankCards.deactivate : fa.seller.panel.bankCards.activate}
      </button>
      {update.isError && <p className="mt-2 text-xs text-red-400">{fa.seller.panel.bankCards.updateError}</p>}
    </div>
  )
}

function AddCardForm({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const add = useAddBankCard(storeId)
  const [cardNumber, setCardNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const valid = /^[0-9]{16}$/.test(toEnglishDigits(cardNumber)) && ownerName.trim().length > 0

  function submit() {
    const dto: CreateBankCardInput = { cardNumber: toEnglishDigits(cardNumber), ownerName }
    add.mutate(dto, { onSuccess: onDone })
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white p-4">
      <div className="mb-3">
        <Input
          label={fa.seller.panel.bankCards.cardNumberLabel}
          placeholder="6037 XXXX XXXX XXXX"
          value={formatCardNumberGroups(cardNumber)}
          onChange={e => setCardNumber(toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 16))}
          dir="ltr"
          inputMode="numeric"
          className="text-center tracking-widest"
        />
      </div>
      <div className="mb-3">
        <Input label={fa.seller.panel.bankCards.ownerNameLabel} value={ownerName} onChange={e => setOwnerName(e.target.value)} />
      </div>
      {add.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.bankCards.addError}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || add.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {fa.seller.panel.bankCards.save}
        </button>
        <button onClick={onDone} className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700">
          {fa.seller.panel.bankCards.cancel}
        </button>
      </div>
    </div>
  )
}

export function SellerBankCardsPage() {
  const { storeId } = useSellerStore()
  const bankCards = useBankCards(storeId)
  const updatePolicy = useUpdateCardPolicy(storeId)
  const [adding, setAdding] = useState(false)

  const cards = bankCards.data?.cards ?? []
  const policy = bankCards.data?.policy ?? 'EQUAL'
  const activeCount = cards.filter(c => c.isActive).length

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.bankCards.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.bankCards.subtitle}</p>

      <h2 className="mb-2 text-sm font-bold text-slate-200 light:text-slate-900">{fa.seller.panel.bankCards.policyTitle}</h2>
      {activeCount <= 1 && <p className="mb-3 text-xs text-slate-500">{fa.seller.panel.bankCards.singleCardHint}</p>}
      <div className="mb-6 flex flex-col gap-2">
        {POLICIES.map(p => (
          <button
            key={p.value}
            onClick={() => updatePolicy.mutate(p.value)}
            disabled={activeCount <= 1 || updatePolicy.isPending}
            className={clsx(
              'flex items-center justify-between rounded-xl border px-4 py-3 text-right disabled:opacity-50',
              policy === p.value
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white',
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-200 light:text-slate-900">{p.label}</span>
              <span className="block text-xs text-slate-500">{p.hint}</span>
            </span>
            {policy === p.value && <span className="size-2.5 rounded-full bg-emerald-500" />}
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold text-slate-200 light:text-slate-900">{fa.seller.panel.bankCards.title}</h2>
      {cards.map(card => (
        <BankCardRow key={card.id} card={card} policy={policy} storeId={storeId} canDeactivate={activeCount > 1} />
      ))}

      {adding ? (
        <AddCardForm storeId={storeId} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.bankCards.addCard}
        </button>
      )}
    </div>
  )
}
