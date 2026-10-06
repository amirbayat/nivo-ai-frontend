import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { en } from '@/locales/en'
import { Input } from '@/components/ui/Input'
import { ToggleRow } from '@/components/ui/ToggleRow'
import type { AutomationTriggerType, InstagramAutomationRule } from '@/types/api'
import {
  useIntlCreateInstagramRule,
  useIntlDeleteInstagramRule,
  useIntlInstagramRules,
  useIntlUpdateInstagramRule,
  type CreateIntlInstagramRuleInput,
} from '@/queries/intlInstagram.queries'
import { useIntlStore } from './IntlPanelLayout'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱/۴.۴ — معادل
// SellerInstagramAutomationPage.tsx برای REGION=INTL (بدون storeId در هوک‌ها)
const TEXTAREA_CLASS =
  'w-full rounded-xl border bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 light:bg-white light:text-slate-900 ' +
  'light:placeholder:text-slate-400 border-slate-700 hover:border-slate-600 light:border-slate-300 light:hover:border-slate-400'

function triggerLabel(t: AutomationTriggerType): string {
  switch (t) {
    case 'COMMENT_KEYWORD':
      return en.instagram.triggerCommentKeyword
    case 'STORY_REPLY':
      return en.instagram.triggerStoryReply
    case 'STORY_MENTION':
      return en.instagram.triggerStoryMention
    case 'DM_KEYWORD':
      return en.instagram.triggerDmKeyword
  }
}

function RuleRow({ rule }: { rule: InstagramAutomationRule }) {
  const update = useIntlUpdateInstagramRule()
  const del = useIntlDeleteInstagramRule()

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
            {en.instagram.deactivate}
          </span>
        )}
      </div>
      {rule.keyword && <p className="text-xs text-slate-500">{rule.keyword}</p>}
      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400 light:text-slate-600">{rule.staticDmText}</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => update.mutate({ ruleId: rule.id, isActive: !rule.isActive })}
          className="flex-1 rounded-lg border border-slate-700 light:border-slate-300 py-2 text-xs font-semibold text-slate-300 light:text-slate-700"
        >
          {rule.isActive ? en.instagram.deactivate : en.instagram.activate}
        </button>
        <button
          onClick={() => {
            if (confirm(en.instagram.deleteConfirm)) del.mutate(rule.id)
          }}
          className="flex-1 rounded-lg border border-red-500/30 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
        >
          {en.instagram.delete}
        </button>
      </div>
    </div>
  )
}

function AddRuleForm({ onDone }: { onDone: () => void }) {
  const add = useIntlCreateInstagramRule()
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('DM_KEYWORD')
  const [keyword, setKeyword] = useState('')
  const [targetMediaId, setTargetMediaId] = useState('')
  const [staticReplyText, setStaticReplyText] = useState('')
  const [staticDmText, setStaticDmText] = useState('')
  const [publicReplyEnabled, setPublicReplyEnabled] = useState(true)

  const valid = staticDmText.trim().length > 0

  function submit() {
    if (!valid) return
    const dto: CreateIntlInstagramRuleInput = {
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
        <label className="text-sm text-slate-400 light:text-slate-600">{en.instagram.triggerTypeLabel}</label>
        <select
          value={triggerType}
          onChange={e => setTriggerType(e.target.value as AutomationTriggerType)}
          className={TEXTAREA_CLASS}
        >
          <option value="DM_KEYWORD">{en.instagram.triggerDmKeyword}</option>
          <option value="COMMENT_KEYWORD">{en.instagram.triggerCommentKeyword}</option>
          <option value="STORY_REPLY">{en.instagram.triggerStoryReply}</option>
          <option value="STORY_MENTION">{en.instagram.triggerStoryMention}</option>
        </select>
      </div>

      <div className="mb-3">
        <Input
          label={en.instagram.keywordLabel}
          placeholder={en.instagram.keywordPlaceholder}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <Input
          label={en.instagram.targetMediaIdLabel}
          placeholder={en.instagram.targetMediaIdPlaceholder}
          value={targetMediaId}
          onChange={e => setTargetMediaId(e.target.value)}
        />
      </div>

      {triggerType === 'COMMENT_KEYWORD' && (
        <div className="mb-3 flex flex-col gap-1.5">
          <label className="text-sm text-slate-400 light:text-slate-600">{en.instagram.staticReplyTextLabel}</label>
          <textarea
            rows={2}
            placeholder={en.instagram.staticReplyTextPlaceholder}
            value={staticReplyText}
            onChange={e => setStaticReplyText(e.target.value)}
            className={TEXTAREA_CLASS}
          />
          <ToggleRow label={en.instagram.publicReplyEnabledLabel} checked={publicReplyEnabled} onChange={setPublicReplyEnabled} />
        </div>
      )}

      <div className="mb-3 flex flex-col gap-1.5">
        <label className="text-sm text-slate-400 light:text-slate-600">{en.instagram.staticDmTextLabel}</label>
        <textarea
          rows={3}
          placeholder={en.instagram.staticDmTextPlaceholder}
          value={staticDmText}
          onChange={e => setStaticDmText(e.target.value)}
          className={TEXTAREA_CLASS}
        />
      </div>

      {add.isError && <p className="mb-3 text-xs text-red-400">{en.instagram.addError}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || add.isPending}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {en.instagram.save}
        </button>
        <button
          onClick={onDone}
          className="flex-1 rounded-xl border border-slate-700 light:border-slate-300 py-2.5 text-sm font-semibold text-slate-300 light:text-slate-700"
        >
          {en.instagram.cancel}
        </button>
      </div>
    </div>
  )
}

export function IntlInstagramAutomationPage() {
  const { instagramBusinessId } = useIntlStore()
  const rules = useIntlInstagramRules()
  const [adding, setAdding] = useState(false)

  if (!instagramBusinessId) {
    return (
      <div className="px-5 py-6">
        <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{en.instagram.rulesTitle}</h1>
        <p className="mb-4 text-sm text-slate-500">{en.instagram.mustConnectFirst}</p>
        <Link to="/app/instagram" className="inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">
          {en.instagram.connectTitle}
        </Link>
      </div>
    )
  }

  const list = rules.data ?? []

  return (
    <div className="px-5 py-6">
      <h1 className="mb-1.5 text-xl font-bold text-slate-100 light:text-slate-900">{en.instagram.rulesTitle}</h1>
      <p className="mb-6 text-sm text-slate-500">{en.instagram.rulesSubtitle}</p>

      {list.length === 0 && !adding && <p className="mb-4 text-sm text-slate-500">{en.instagram.empty}</p>}
      {list.map(rule => (
        <RuleRow key={rule.id} rule={rule} />
      ))}

      {adding ? (
        <AddRuleForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-slate-700 light:border-slate-300 py-3.5 text-sm font-semibold text-slate-300 light:text-slate-700 hover:border-slate-600 light:hover:border-slate-400"
        >
          {en.instagram.addRule}
        </button>
      )}
    </div>
  )
}
