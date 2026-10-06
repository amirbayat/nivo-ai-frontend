import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'
import { Input } from '@/components/ui/Input'
import { ToggleRow } from '@/components/ui/ToggleRow'
import type { AutomationTriggerType, InstagramAutomationRule } from '@/types/api'
import {
  useCreateInstagramRule,
  useDeleteInstagramRule,
  useInstagramRules,
  useUpdateInstagramRule,
  type CreateInstagramRuleInput,
} from '@/queries/instagram.queries'
import { useSellerStore } from './SellerPanelLayout'

const TEXTAREA_CLASS =
  'w-full rounded-xl border bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 light:bg-white light:text-slate-900 ' +
  'light:placeholder:text-slate-400 border-slate-700 hover:border-slate-600 light:border-slate-300 light:hover:border-slate-400'

function triggerLabel(t: AutomationTriggerType): string {
  switch (t) {
    case 'COMMENT_KEYWORD':
      return fa.seller.panel.instagram.triggerCommentKeyword
    case 'STORY_REPLY':
      return fa.seller.panel.instagram.triggerStoryReply
    case 'STORY_MENTION':
      return fa.seller.panel.instagram.triggerStoryMention
    case 'DM_KEYWORD':
      return fa.seller.panel.instagram.triggerDmKeyword
  }
}

function RuleRow({ rule, storeId }: { rule: InstagramAutomationRule; storeId: string }) {
  const update = useUpdateInstagramRule(storeId)
  const del = useDeleteInstagramRule(storeId)

  return (
    <div
      className={clsx(
        'mb-3 rounded-2xl border px-4 py-4',
        rule.isActive
          ? 'border-slate-700/60 light:border-slate-200 bg-slate-800/40 light:bg-white'
          : 'border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 opacity-60',
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{triggerLabel(rule.triggerType)}</span>
        {!rule.isActive && (
          <span className="rounded-full bg-slate-700/40 light:bg-slate-200 px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600">
            {fa.seller.panel.instagram.deactivate}
          </span>
        )}
      </div>
      {rule.keyword && (
        <p className="text-xs text-slate-500" dir="ltr">
          {rule.keyword}
        </p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400 light:text-slate-600">{rule.staticDmText}</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => update.mutate({ ruleId: rule.id, isActive: !rule.isActive })}
          className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700"
        >
          {rule.isActive ? fa.seller.panel.instagram.deactivate : fa.seller.panel.instagram.activate}
        </button>
        <button
          onClick={() => {
            if (confirm(fa.seller.panel.instagram.deleteConfirm)) del.mutate(rule.id)
          }}
          className="flex-1 rounded-lg border border-red-500/30 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
        >
          {fa.seller.panel.instagram.delete}
        </button>
      </div>
    </div>
  )
}

function AddRuleForm({ storeId, onDone }: { storeId: string; onDone: () => void }) {
  const add = useCreateInstagramRule(storeId)
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('DM_KEYWORD')
  const [keyword, setKeyword] = useState('')
  const [targetMediaId, setTargetMediaId] = useState('')
  const [staticReplyText, setStaticReplyText] = useState('')
  const [staticDmText, setStaticDmText] = useState('')
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true)

  const valid = staticDmText.trim().length > 0

  function submit() {
    if (!valid) return
    const dto: CreateInstagramRuleInput = {
      triggerType,
      staticDmText: staticDmText.trim(),
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      ...(targetMediaId.trim() ? { targetMediaId: targetMediaId.trim() } : {}),
      ...(triggerType === 'COMMENT_KEYWORD' && staticReplyText.trim()
        ? { staticReplyText: staticReplyText.trim(), publicReplyEnabled }
        : {}),
    }
    add.mutate(dto, { onSuccess: onDone })
  }

  return (
    <div className="rounded-2xl border border-slate-700 light:border-slate-300 bg-slate-900/60 light:bg-slate-50 px-4 py-4">
      <div className="mb-3 flex flex-col gap-1.5">
        <label className="text-sm text-slate-400 light:text-slate-600">{fa.seller.panel.instagram.triggerTypeLabel}</label>
        <select
          value={triggerType}
          onChange={e => setTriggerType(e.target.value as AutomationTriggerType)}
          className={TEXTAREA_CLASS}
        >
          <option value="DM_KEYWORD">{fa.seller.panel.instagram.triggerDmKeyword}</option>
          <option value="COMMENT_KEYWORD">{fa.seller.panel.instagram.triggerCommentKeyword}</option>
          <option value="STORY_REPLY">{fa.seller.panel.instagram.triggerStoryReply}</option>
          <option value="STORY_MENTION">{fa.seller.panel.instagram.triggerStoryMention}</option>
        </select>
      </div>

      <div className="mb-3">
        <Input
          label={fa.seller.panel.instagram.keywordLabel}
          placeholder={fa.seller.panel.instagram.keywordPlaceholder}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          dir="ltr"
        />
      </div>

      <div className="mb-3">
        <Input
          label={fa.seller.panel.instagram.targetMediaIdLabel}
          placeholder={fa.seller.panel.instagram.targetMediaIdPlaceholder}
          value={targetMediaId}
          onChange={e => setTargetMediaId(e.target.value)}
          dir="ltr"
        />
      </div>

      {triggerType === 'COMMENT_KEYWORD' && (
        <div className="mb-3 flex flex-col gap-1.5">
          <label className="text-sm text-slate-400 light:text-slate-600">{fa.seller.panel.instagram.staticReplyTextLabel}</label>
          <textarea
            rows={2}
            placeholder={fa.seller.panel.instagram.staticReplyTextPlaceholder}
            value={staticReplyText}
            onChange={e => setStaticReplyText(e.target.value)}
            className={TEXTAREA_CLASS}
          />
          <ToggleRow
            label={fa.seller.panel.instagram.publicReplyEnabledLabel}
            checked={publicReplyEnabled}
            onChange={setPublicReplyEnabled}
          />
        </div>
      )}

      <div className="mb-3 flex flex-col gap-1.5">
        <label className="text-sm text-slate-400 light:text-slate-600">{fa.seller.panel.instagram.staticDmTextLabel}</label>
        <textarea
          rows={3}
          placeholder={fa.seller.panel.instagram.staticDmTextPlaceholder}
          value={staticDmText}
          onChange={e => setStaticDmText(e.target.value)}
          className={TEXTAREA_CLASS}
        />
      </div>

      {add.isError && <p className="mb-3 text-xs text-red-400">{fa.seller.panel.instagram.addError}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || add.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {fa.seller.panel.instagram.save}
        </button>
        <button
          onClick={onDone}
          className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700"
        >
          {fa.seller.panel.instagram.cancel}
        </button>
      </div>
    </div>
  )
}

export function SellerInstagramAutomationPage() {
  const { storeId, instagramBusinessId } = useSellerStore()
  const rules = useInstagramRules(storeId)
  const [adding, setAdding] = useState(false)

  if (!instagramBusinessId) {
    return (
      <div className="px-5 py-6">
        <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.instagram.rulesTitle}</h1>
        <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.instagram.mustConnectFirst}</p>
        <Link
          to="/seller/panel/instagram"
          className="inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
        >
          {fa.seller.panel.instagram.connectTitle}
        </Link>
      </div>
    )
  }

  const list = rules.data ?? []

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{fa.seller.panel.instagram.rulesTitle}</h1>
      <p className="mb-6 text-sm text-slate-500">{fa.seller.panel.instagram.rulesSubtitle}</p>

      {list.length === 0 && !adding && (
        <p className="mb-4 text-sm text-slate-500">{fa.seller.panel.instagram.empty}</p>
      )}
      {list.map(rule => (
        <RuleRow key={rule.id} rule={rule} storeId={storeId} />
      ))}

      {adding ? (
        <AddRuleForm storeId={storeId} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {fa.seller.panel.instagram.addRule}
        </button>
      )}
    </div>
  )
}
