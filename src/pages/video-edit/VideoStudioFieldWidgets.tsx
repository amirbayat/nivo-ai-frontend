import { useRef, useState } from 'react'
import axios from 'axios'
import { DropWell, FieldLabel, VideoWindowTrimmer } from './VideoEditForms'
import type { ElementMemberValue, ShotValue } from '@/types/inputFields'

// ویجت‌های عمومی تازه — فقط برای الگوهایی که در VideoEditForms.tsx معادل نداشتند (رجوع کن به
// اون فایل برای بقیه: DropWell/ResolutionPicker/VideoWindowTrimmer/FieldLabel/Caveat/...)

// کپی سبک extractErrorMessage/fmtDur از VideoEditForms.tsx (اونجا export نشده‌اند) — بین
// FieldRenderer.tsx و VideoStudioForm.tsx مشترکند، پس یک‌بار اینجا export می‌شوند
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function fmtDur(sec: number) {
  const s = Math.round(sec)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function NumberField({
  label,
  helpText,
  required,
  invalid,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  helpText?: string
  required?: boolean
  invalid?: boolean
  value: number | undefined
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {label}
        {required && <span style={{ color: '#fb7185' }}> *</span>}
      </FieldLabel>
      {helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{helpText}</span>}
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full rounded-2xl p-3 text-[13.5px] text-slate-100 focus:outline-none"
        style={{
          background: 'rgba(0,0,0,0.20)',
          border: `1px solid ${invalid ? 'rgba(248,113,113,0.6)' : 'rgba(148,163,184,0.20)'}`,
        }}
      />
    </div>
  )
}

function clampStepped(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value))
  const snapped = min + Math.round((clamped - min) / step) * step
  return Math.min(max, Math.max(min, snapped))
}

export function DurationRangeSlider({
  label,
  helpText,
  required,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  helpText?: string
  required?: boolean
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const current = clampStepped(value, lo, hi, step)
  const pct = hi === lo ? 100 : ((current - lo) / (hi - lo)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>
          {label}
          {required && <span style={{ color: '#fb7185' }}> *</span>}
        </FieldLabel>
        <span className="text-[12px] font-bold tabular-nums" style={{ color: '#6ee7b7' }}>
          {current} ثانیه
        </span>
      </div>
      {helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{helpText}</span>}
      <div dir="ltr">
        <input
          type="range"
          min={lo}
          max={hi}
          step={step}
          value={current}
          aria-label={label}
          aria-valuemin={lo}
          aria-valuemax={hi}
          aria-valuenow={current}
          aria-valuetext={`${current} ثانیه`}
          onChange={e => onChange(clampStepped(Number(e.target.value), lo, hi, step))}
          className="nivo-range-slider w-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #34d399 ${pct}%, rgba(148,163,184,0.22) ${pct}%, rgba(148,163,184,0.22) 100%)`,
          }}
        />
        <div className="mt-1 flex items-center justify-between text-[10.5px] font-bold tabular-nums" style={{ color: '#64748b' }}>
          <span>{lo}ث</span>
          <span>{hi}ث</span>
        </div>
      </div>
    </div>
  )
}

// معادل عمومی ResolutionPicker — همون زبان بصری، برای هر enum دلخواه (نه فقط رزولوشن)
export function SegmentedPicker({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-full p-[3px]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.20)' }}
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="rounded-full px-2.5 py-1.5 text-[11.5px] font-bold"
          style={{ background: value === o.value ? '#10b981' : 'transparent', color: value === o.value ? '#02170f' : '#94a3b8' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AudioIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  )
}

// معادل DropWell برای صدا — چون صدا پیش‌نمایش تصویری معناداری ندارد، بعد از آپلود فقط یه چیپ
// با نام فایل نشون داده می‌شه، نه thumbnail
export function AudioDropWell({
  label,
  hint,
  fileName,
  uploading,
  invalid,
  onPick,
  onClear,
  accept,
}: {
  label: string
  hint: string
  fileName: string | null
  uploading?: boolean
  invalid?: boolean
  onPick: (file: File) => void
  onClear: () => void
  accept: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (fileName) {
    return (
      <div
        className="flex items-center justify-between rounded-2xl px-3 py-2.5"
        style={{ background: 'rgba(0,0,0,0.20)', border: '1.5px solid rgba(16,185,129,0.30)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#34d399' }}><AudioIcon /></span>
          <span className="text-[11.5px] font-bold" style={{ color: '#cbd5e1' }}>{fileName}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="حذف"
          className="flex size-6 items-center justify-center rounded-full text-[13px] text-white"
          style={{ background: 'rgba(2,4,10,0.75)' }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center"
      style={{ minHeight: 88, border: `1.5px dashed ${invalid ? 'rgba(248,113,113,0.5)' : 'rgba(148,163,184,0.20)'}`, background: 'rgba(0,0,0,0.20)' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={uploading}
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      <div className="flex size-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
        <AudioIcon />
      </div>
      <span className="text-[11.5px] font-bold" style={{ color: '#cbd5e1' }}>{uploading ? 'در حال آپلود...' : label}</span>
      <span className="text-[10.5px]" style={{ color: '#64748b' }}>{hint}</span>
    </div>
  )
}

// چیپ toggle عمومی برای فیلدهای boolean — audioOutputToggle یکی از کاربردهاش است، اما همون
// شکل بصری برای هر boolean دیگه هم به‌کار می‌ره
export function AudioOutputToggleChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-full px-3 py-2"
      style={{ background: checked ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.20)'}` }}
    >
      <span className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors" style={{ background: checked ? '#10b981' : 'rgba(148,163,184,0.30)' }}>
        <span className="inline-block size-3 rounded-full bg-white transition-transform" style={{ transform: checked ? 'translateX(14px)' : 'translateX(2px)' }} />
      </span>
      <span className="text-[11.5px] font-bold" style={{ color: checked ? '#6ee7b7' : '#94a3b8' }}>{label}</span>
    </button>
  )
}

// ============================== shotGroup ==============================

function ShotCard({
  index,
  shot,
  onChange,
  onRemove,
  multiline,
  maxLength,
  durationField,
  elementNames,
}: {
  index: number
  shot: ShotValue
  onChange: (next: ShotValue) => void
  onRemove: () => void
  multiline?: boolean
  maxLength?: number
  durationField?: { min?: number; max?: number }
  elementNames: string[]
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteQuery, setAutocompleteQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handlePromptChange(text: string) {
    onChange({ ...shot, prompt: text })
    const caret = textareaRef.current?.selectionStart ?? text.length
    const upToCaret = text.slice(0, caret)
    const match = /@([\p{L}\p{N}_-]*)$/u.exec(upToCaret)
    if (match && elementNames.length > 0) {
      setAutocompleteQuery(match[1])
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }

  function insertName(name: string) {
    const text = shot.prompt
    const caret = textareaRef.current?.selectionStart ?? text.length
    const upToCaret = text.slice(0, caret)
    const replaced = upToCaret.replace(/@([\p{L}\p{N}_-]*)$/u, `@${name} `)
    onChange({ ...shot, prompt: replaced + text.slice(caret) })
    setShowAutocomplete(false)
  }

  const filteredNames = elementNames.filter(n => n.toLowerCase().includes(autocompleteQuery.toLowerCase()))

  return (
    <div className="flex flex-col gap-2 rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(148,163,184,0.16)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold" style={{ color: '#94a3b8' }}>شات {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-[11px] font-bold" style={{ color: '#fb7185' }}>حذف</button>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={shot.prompt}
          onChange={e => handlePromptChange(e.target.value)}
          maxLength={maxLength}
          rows={multiline === false ? 1 : 2}
          placeholder="مثلاً: @سارا کنار پنجره می‌ایسته و به بیرون نگاه می‌کنه"
          className="w-full resize-none rounded-xl p-2.5 text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
        />
        {showAutocomplete && filteredNames.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl" style={{ background: '#0b1220', border: '1px solid rgba(148,163,184,0.25)' }}>
            {filteredNames.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => insertName(name)}
                className="block w-full px-3 py-2 text-right text-[12px]"
                style={{ color: '#cbd5e1' }}
              >
                @{name}
              </button>
            ))}
          </div>
        )}
      </div>
      {durationField && durationField.min != null && durationField.max != null ? (
        <DurationRangeSlider
          label="مدت این شات"
          value={shot.durationSec ?? durationField.min}
          onChange={v => onChange({ ...shot, durationSec: v })}
          min={durationField.min}
          max={durationField.max}
        />
      ) : durationField ? (
        <NumberField
          label="مدت این شات (ثانیه)"
          value={shot.durationSec}
          onChange={v => onChange({ ...shot, durationSec: v })}
          min={durationField.min}
          max={durationField.max}
        />
      ) : null}
    </div>
  )
}

export function ShotListEditor({
  label,
  helpText,
  shots,
  onChange,
  minShots,
  maxShots,
  multiline,
  maxLength,
  durationField,
  elementNames,
}: {
  label: string
  helpText?: string
  shots: ShotValue[]
  onChange: (next: ShotValue[]) => void
  minShots: number
  maxShots: number
  multiline?: boolean
  maxLength?: number
  durationField?: { min?: number; max?: number }
  elementNames: string[]
}) {
  function addShot() {
    if (shots.length >= maxShots) return
    onChange([
      ...shots,
      {
        prompt: '',
        ...(durationField?.min != null ? { durationSec: durationField.min } : {}),
      },
    ])
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <button
          type="button"
          onClick={addShot}
          disabled={shots.length >= maxShots}
          className="text-[11px] font-bold disabled:opacity-40"
          style={{ color: '#34d399' }}
        >
          + افزودن شات
        </button>
      </div>
      {helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{helpText}</span>}
      <span className="text-[10.5px]" style={{ color: '#64748b' }}>
        بین {minShots} تا {maxShots} شات
      </span>
      <div className="flex flex-col gap-2.5">
        {shots.map((shot, i) => (
          <ShotCard
            key={i}
            index={i}
            shot={shot}
            onChange={next => onChange(shots.map((s, idx) => (idx === i ? next : s)))}
            onRemove={() => onChange(shots.filter((_, idx) => idx !== i))}
            multiline={multiline}
            maxLength={maxLength}
            durationField={durationField}
            elementNames={elementNames}
          />
        ))}
      </div>
    </div>
  )
}

// ============================== elementGroup ==============================
// element_input_urls واقعی Kie یا ۲-۴ عکس است یا ۱ ویدیو (هرگز هردو) — پس UI این دو را متقابلاً
// منحصر نشون می‌ده؛ element_input_audio_urls مستقل و اختیاری کنار هرکدام است.

export interface ElementImageSlot {
  accept: string
  uploading: boolean
  previews: string[]
  minCount?: number
  maxCount?: number
  onPick: (file: File) => void
  onRemoveAt: (imgIndex: number) => void
}

export interface ElementVideoSlot {
  accept: string
  uploading: boolean
  preview: { src: string; durationSec: number } | null
  windowStartSec?: number
  windowEndSec?: number
  maxWindowSec: number
  onPick: (file: File) => void
  onClear: () => void
  onWindowChange: (startSec: number, endSec: number) => void
}

export interface ElementAudioSlot {
  accept: string
  uploading: boolean
  fileName: string | null
  onPick: (file: File) => void
  onClear: () => void
}

function ElementCard({
  index,
  member,
  onChange,
  onRemove,
  image,
  video,
  audio,
}: {
  index: number
  member: ElementMemberValue
  onChange: (next: Partial<ElementMemberValue>) => void
  onRemove: () => void
  image?: ElementImageSlot
  video?: ElementVideoSlot
  audio?: ElementAudioSlot
}) {
  const hasImages = (member.imageKeys?.length ?? 0) > 0
  const hasVideo = !!member.videoKey
  const showImage = !!image && !hasVideo
  const showVideo = !!video && !hasImages

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(148,163,184,0.16)' }}>
      <div className="flex items-center justify-between gap-2">
        <input
          value={member.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder={`نام عنصر ${index + 1} (مثلاً سارا)`}
          className="flex-1 rounded-xl p-2 text-[12.5px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
        />
        <button type="button" onClick={onRemove} className="text-[11px] font-bold" style={{ color: '#fb7185' }}>حذف</button>
      </div>
      <input
        value={member.description ?? ''}
        onChange={e => onChange({ description: e.target.value })}
        placeholder="توضیح کوتاه این عنصر (مثلاً «دختر جوان با لباس قرمز»)"
        className="rounded-xl p-2 text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
        style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(148,163,184,0.20)' }}
      />
      {!hasImages && !hasVideo && (
        <span className="text-[10.5px]" style={{ color: '#64748b' }}>
          یا چند عکس مرجع ({image?.minCount ?? 2}-{image?.maxCount ?? 4} تا) یا یک ویدیوی مرجع انتخاب کن — هر دو با هم مجاز نیست
        </span>
      )}
      <div className="grid grid-cols-2 gap-2">
        {showImage && (
          <div className="col-span-2 grid grid-cols-3 gap-2">
            {(member.imageKeys ?? []).map((_, i) => (
              <DropWell
                key={i}
                accent="emerald"
                accept={image!.accept}
                label=""
                hint=""
                preview={{ kind: 'image', src: image!.previews[i] ?? '', sizeLabel: '✓ آپلود شد' }}
                onPick={() => {}}
                onClear={() => image!.onRemoveAt(i)}
              />
            ))}
            {(image!.maxCount == null || (member.imageKeys?.length ?? 0) < image!.maxCount) && (
              <DropWell
                accent="emerald"
                accept={image!.accept}
                label={image!.uploading ? 'در حال آپلود...' : 'افزودن عکس'}
                hint={`${image!.minCount ?? 0}-${image!.maxCount ?? ''} عکس`}
                preview={null}
                onPick={image!.onPick}
                onClear={() => {}}
              />
            )}
          </div>
        )}
        {showVideo && (
          <div className="col-span-2 flex flex-col gap-2">
            <DropWell
              accent="emerald"
              accept={video!.accept}
              label={video!.uploading ? 'در حال آپلود...' : 'ویدیوی مرجع'}
              hint="۳ تا ۸ ثانیه"
              preview={video!.preview ? { kind: 'video', src: video!.preview.src, sizeLabel: fmtDur(video!.preview.durationSec) } : null}
              onPick={video!.onPick}
              onClear={video!.onClear}
            />
            {video!.preview && (
              <VideoWindowTrimmer
                durationSec={video!.preview.durationSec}
                maxWidth={video!.maxWindowSec}
                value={[video!.windowStartSec ?? 0, video!.windowEndSec ?? Math.min(video!.preview.durationSec, video!.maxWindowSec)]}
                onChange={([s, e]) => video!.onWindowChange(s, e)}
              />
            )}
          </div>
        )}
        {audio && (
          <div className="col-span-2">
            <AudioDropWell
              label={audio.uploading ? 'در حال آپلود...' : 'صدا (اختیاری)'}
              hint="صدای این عنصر"
              fileName={audio.fileName}
              uploading={audio.uploading}
              onPick={audio.onPick}
              onClear={audio.onClear}
              accept={audio.accept}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function ElementListEditor({
  label,
  helpText,
  members,
  onChange,
  minCount,
  maxCount,
  mediaSlots,
}: {
  label: string
  helpText?: string
  members: ElementMemberValue[]
  onChange: (next: ElementMemberValue[]) => void
  minCount: number
  maxCount: number
  mediaSlots: (index: number) => { image?: ElementImageSlot; video?: ElementVideoSlot; audio?: ElementAudioSlot }
}) {
  function addMember() {
    if (members.length >= maxCount) return
    onChange([...members, { name: '', description: '' }])
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <FieldLabel>
          {label}
          {minCount > 0 && <span style={{ color: '#fb7185' }}> *</span>}
        </FieldLabel>
        <button
          type="button"
          onClick={addMember}
          disabled={members.length >= maxCount}
          className="text-[11px] font-bold disabled:opacity-40"
          style={{ color: '#34d399' }}
        >
          + افزودن عنصر
        </button>
      </div>
      {helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{helpText}</span>}
      <span className="text-[10.5px]" style={{ color: '#64748b' }}>
        بین {minCount} تا {maxCount} عنصر
      </span>
      <div className="flex flex-col gap-2.5">
        {members.map((member, i) => {
          const slots = mediaSlots(i)
          return (
            <ElementCard
              key={i}
              index={i}
              member={member}
              onChange={patch => onChange(members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))}
              onRemove={() => onChange(members.filter((_, idx) => idx !== i))}
              image={slots.image}
              video={slots.video}
              audio={slots.audio}
            />
          )
        })}
      </div>
    </div>
  )
}
