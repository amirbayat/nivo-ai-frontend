import { useEffect, useMemo, useState } from 'react'
import { DropWell, FieldLabel, RatioSegmented, ResolutionPicker, VideoWindowTrimmer } from './VideoEditForms'
import {
  AudioDropWell,
  AudioOutputToggleChip,
  ElementListEditor,
  NumberField,
  SegmentedPicker,
  ShotListEditor,
  extractErrorMessage,
  fmtDur,
  type ElementAudioSlot,
  type ElementImageSlot,
  type ElementVideoSlot,
} from './VideoStudioFieldWidgets'
import { evaluateCondition, isFieldRequired, isFieldVisible } from './fieldConditions'
import { useUploadVideoEditAudio, useUploadVideoEditImage, useUploadVideoEditVideo } from '@/queries/videoEdit.queries'
import type {
  AudioField,
  BooleanField,
  DurationField,
  ElementGroupField,
  ElementMemberValue,
  EnumField,
  FieldValues,
  ImageField,
  KieField,
  NumberField as NumberFieldDef,
  ShotGroupField,
  ShotValue,
  TextField,
  VideoField,
  VideoFieldValue,
} from '@/types/inputFields'

// دیسپچر مرکزی: هر ۱۱ نوع KieField را به ویجت درست وصل می‌کند و شرط visibleWhen را قبل از
// رندر هر فیلد چک می‌کند — همون evaluateCondition مشترک با بک‌اند (fieldConditions.ts)

function RequiredMark({ required }: { required: boolean }) {
  return required ? <span style={{ color: '#fb7185' }}> *</span> : null
}

// ============================== text ==============================

function TextFieldWidget({
  field,
  value,
  onChange,
  required,
  invalid,
}: {
  field: TextField
  value: string | undefined
  onChange: (v: string) => void
  required: boolean
  invalid: boolean
}) {
  const val = value ?? ''
  const borderColor = invalid ? 'rgba(248,113,113,0.6)' : 'rgba(148,163,184,0.20)'
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      {field.multiline ? (
        <textarea
          value={val}
          onChange={e => onChange(e.target.value)}
          maxLength={field.maxLength}
          rows={4}
          placeholder={field.placeholder}
          className="w-full resize-none rounded-2xl p-3.5 text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: `1px solid ${borderColor}` }}
        />
      ) : (
        <input
          value={val}
          onChange={e => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          className="w-full rounded-2xl p-3 text-[13.5px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.20)', border: `1px solid ${borderColor}` }}
        />
      )}
    </div>
  )
}

// ============================== boolean ==============================

function BooleanFieldWidget({ field, value, onChange }: { field: BooleanField; value: boolean | undefined; onChange: (v: boolean) => void }) {
  // اگه هیچ‌وقت کاربر دست نزنه، پیش‌فرض باید توی values ثبت بشه — وگرنه فیلد required بدون
  // دلیل «خالی» گزارش می‌شه، چون isPresent فقط undefined/null را غایب می‌داند نه false
  useEffect(() => {
    if (value === undefined) onChange(field.default)
  }, [value, field.default])

  const checked = value ?? field.default
  return <AudioOutputToggleChip label={field.label} checked={checked} onChange={onChange} />
}

// ============================== number ==============================

function NumberFieldWidget({
  field,
  value,
  onChange,
  required,
  invalid,
}: {
  field: NumberFieldDef
  value: number | undefined
  onChange: (v: number) => void
  required: boolean
  invalid: boolean
}) {
  return (
    <NumberField
      label={field.label}
      helpText={field.helpText}
      required={required}
      invalid={invalid}
      value={value}
      onChange={onChange}
      min={field.min}
      max={field.max}
      step={field.step}
    />
  )
}

// ============================== enum ==============================

function isBinaryAspectRatio(options: { value: string }[]): boolean {
  const vals = options.map(o => o.value).sort()
  return vals.length === 2 && vals[0] === '16:9' && vals[1] === '9:16'
}

function EnumFieldWidget({
  field,
  values,
  value,
  onChange,
}: {
  field: EnumField
  values: FieldValues
  value: string | undefined
  onChange: (v: string) => void
}) {
  // optionsDependOn (مثلاً Kling: رزولوشن به mode+aspect_ratio وابسته) — کلید ترکیبی از مقادیر
  // فعلی فیلدهای وابسته؛ قرارداد join با ':' چون سندی برای فرمت دقیق کلید در schema نیست
  let options = field.options
  if (field.optionsDependOn) {
    const depKey = field.optionsDependOn.fieldKeys.map(k => String(values[k] ?? '')).join(':')
    options = field.optionsDependOn.optionsByKey[depKey] ?? field.options
  }

  useEffect(() => {
    if (value === undefined && options.length > 0) onChange(options[0].value)
  }, [value, options])

  const current = value ?? options[0]?.value ?? ''

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{field.label}</FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      {field.semantic === 'aspectRatio' && isBinaryAspectRatio(options) ? (
        <RatioSegmented value={current as '16:9' | '9:16'} onChange={onChange} />
      ) : field.semantic === 'resolution' ? (
        <ResolutionPicker options={options.map(o => o.value)} value={current} onChange={onChange} />
      ) : (
        <SegmentedPicker options={options} value={current} onChange={onChange} />
      )}
    </div>
  )
}

// ============================== duration ==============================

function DurationFieldWidget({
  field,
  values,
  onChange,
}: {
  field: DurationField
  values: FieldValues
  onChange: (v: number | undefined) => void
}) {
  const raw = values[field.key]
  const sentinelHit = !!field.autoSentinel && evaluateCondition(field.autoSentinel.triggerWhen, values)
  const omitHit = !!field.omitWhen && evaluateCondition(field.omitWhen, values)
  const hidden = sentinelHit || omitHit

  // وقتی مخفی می‌شه چیزی برای انتخاب کاربر نیست — بک‌اند خودش سنتینل/امیت را اعمال می‌کند، پس
  // نباید یه عدد ساختگی توی values بمونه
  useEffect(() => {
    if (hidden) {
      if (raw !== undefined) onChange(undefined)
    } else if (typeof raw !== 'number') {
      onChange(field.default)
    }
  }, [hidden, raw, field.default])

  if (hidden) return null
  const value = typeof raw === 'number' ? raw : field.default

  if (field.mode === 'fixedList' && field.fixedOptions?.length) {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel>{field.label}</FieldLabel>
        {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
        <SegmentedPicker
          options={field.fixedOptions.map(d => ({ value: String(d), label: `${d} ثانیه` }))}
          value={String(value)}
          onChange={v => onChange(Number(v))}
        />
      </div>
    )
  }

  return (
    <NumberField
      label={field.label}
      helpText={field.helpText}
      value={value}
      onChange={onChange}
      min={field.range?.min}
      max={field.range?.max}
    />
  )
}

// ============================== image / imageArray ==============================

function ImageFieldWidget({
  field,
  value,
  onChange,
  setBusy,
  invalid,
}: {
  field: ImageField
  value: string | undefined
  onChange: (v: string | undefined) => void
  setBusy: (b: boolean) => void
  invalid: boolean
}) {
  const uploadImage = useUploadVideoEditImage()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadImage.isPending) }, [uploadImage.isPending, setBusy])
  // اگه value از بیرون (مثلاً pruning فیلدهای مخفی‌شده در VideoStudioForm) پاک بشه، پیش‌نمایش
  // محلی هم باید هماهنگ بشه — وگرنه یه thumbnail قدیمی برای یه فیلد بدون مقدار می‌مونه
  useEffect(() => { if (value === undefined) setPreview(null) }, [value])

  async function pick(file: File) {
    setError(null)
    try {
      const { key } = await uploadImage.mutateAsync(file)
      onChange(key)
      setPreview(URL.createObjectURL(file))
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود عکس ناموفق بود'))
    }
  }

  function clear() {
    onChange(undefined)
    setPreview(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      <DropWell
        accent={invalid ? 'rose' : 'emerald'}
        accept={field.accept.join(',')}
        label={uploadImage.isPending ? 'در حال آپلود...' : 'افزودن عکس'}
        hint={field.role ?? 'انتخاب فایل'}
        preview={preview ? { kind: 'image', src: preview, sizeLabel: '✓ آپلود شد' } : null}
        onPick={file => void pick(file)}
        onClear={clear}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function ImageArrayFieldWidget({
  field,
  value,
  onChange,
  setBusy,
}: {
  field: ImageField
  value: string[]
  onChange: (v: string[]) => void
  setBusy: (b: boolean) => void
}) {
  const uploadImage = useUploadVideoEditImage()
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadImage.isPending) }, [uploadImage.isPending, setBusy])

  const atMax = field.maxCount != null && value.length >= field.maxCount

  async function pick(file: File) {
    if (atMax) return
    setError(null)
    try {
      const { key } = await uploadImage.mutateAsync(file)
      const idx = value.length
      onChange([...value, key])
      setPreviews(prev => ({ ...prev, [idx]: URL.createObjectURL(file) }))
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود عکس ناموفق بود'))
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
    setPreviews(prev => {
      const next: Record<number, string> = {}
      value.forEach((_, idx) => {
        if (idx === i) return
        next[idx > i ? idx - 1 : idx] = prev[idx]
      })
      return next
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      <div className="grid grid-cols-2 gap-2">
        {value.map((_, i) => (
          <DropWell
            key={i}
            accent="emerald"
            accept={field.accept.join(',')}
            label=""
            hint=""
            preview={{ kind: 'image', src: previews[i] ?? '', sizeLabel: '✓ آپلود شد' }}
            onPick={() => {}}
            onClear={() => removeAt(i)}
          />
        ))}
        {!atMax && (
          <DropWell
            accent="emerald"
            accept={field.accept.join(',')}
            label={uploadImage.isPending ? 'در حال آپلود...' : 'افزودن عکس'}
            hint={field.role ?? 'انتخاب فایل'}
            preview={null}
            onPick={file => void pick(file)}
            onClear={() => {}}
          />
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// ============================== video / videoArray ==============================

function VideoFieldWidget({
  field,
  value,
  onChange,
  setBusy,
  invalid,
}: {
  field: VideoField
  value: VideoFieldValue | undefined
  onChange: (v: VideoFieldValue | undefined) => void
  setBusy: (b: boolean) => void
  invalid: boolean
}) {
  const uploadVideo = useUploadVideoEditVideo()
  const [preview, setPreview] = useState<{ src: string; durationSec: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadVideo.isPending) }, [uploadVideo.isPending, setBusy])

  async function pick(file: File) {
    setError(null)
    try {
      const { key, durationSec } = await uploadVideo.mutateAsync({ file })
      setPreview({ src: URL.createObjectURL(file), durationSec })
      if (field.trim?.enabled) {
        const end = Math.min(durationSec, field.trim.maxWindowSec)
        onChange({ key, windowStartSec: 0, windowEndSec: end })
      } else {
        onChange({ key })
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود ویدیو ناموفق بود'))
    }
  }

  function clear() {
    onChange(undefined)
    setPreview(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      <DropWell
        accent={invalid ? 'rose' : 'emerald'}
        accept={field.accept.join(',')}
        label={uploadVideo.isPending ? 'در حال آپلود...' : 'افزودن ویدیو'}
        hint={field.role ?? 'انتخاب فایل'}
        preview={preview ? { kind: 'video', src: preview.src, sizeLabel: fmtDur(preview.durationSec) } : null}
        onPick={file => void pick(file)}
        onClear={clear}
      />
      {field.trim?.enabled && value && preview && (
        <VideoWindowTrimmer
          durationSec={preview.durationSec}
          maxWidth={field.trim.maxWindowSec}
          value={[value.windowStartSec ?? 0, value.windowEndSec ?? Math.min(preview.durationSec, field.trim.maxWindowSec)]}
          onChange={([s, e]) => onChange({ key: value.key, windowStartSec: s, windowEndSec: e })}
        />
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function VideoArrayFieldWidget({
  field,
  value,
  onChange,
  setBusy,
}: {
  field: VideoField
  value: string[]
  onChange: (v: string[]) => void
  setBusy: (b: boolean) => void
}) {
  const uploadVideo = useUploadVideoEditVideo()
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadVideo.isPending) }, [uploadVideo.isPending, setBusy])

  async function pick(file: File) {
    setError(null)
    try {
      const { key } = await uploadVideo.mutateAsync({ file })
      const idx = value.length
      onChange([...value, key])
      setPreviews(prev => ({ ...prev, [idx]: URL.createObjectURL(file) }))
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود ویدیو ناموفق بود'))
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      <div className="grid grid-cols-2 gap-2">
        {value.map((_, i) => (
          <DropWell
            key={i}
            accent="emerald"
            accept={field.accept.join(',')}
            label=""
            hint=""
            preview={{ kind: 'video', src: previews[i] ?? '', sizeLabel: '✓ آپلود شد' }}
            onPick={() => {}}
            onClear={() => removeAt(i)}
          />
        ))}
        <DropWell
          accent="emerald"
          accept={field.accept.join(',')}
          label={uploadVideo.isPending ? 'در حال آپلود...' : 'افزودن ویدیو'}
          hint={field.role ?? 'انتخاب فایل'}
          preview={null}
          onPick={file => void pick(file)}
          onClear={() => {}}
        />
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// ============================== audio / audioArray ==============================

function AudioFieldWidget({
  field,
  value,
  onChange,
  setBusy,
  invalid,
}: {
  field: AudioField
  value: string | undefined
  onChange: (v: string | undefined) => void
  setBusy: (b: boolean) => void
  invalid: boolean
}) {
  const uploadAudio = useUploadVideoEditAudio()
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadAudio.isPending) }, [uploadAudio.isPending, setBusy])
  useEffect(() => { if (value === undefined) setFileName(null) }, [value])

  async function pick(file: File) {
    setError(null)
    try {
      const { key } = await uploadAudio.mutateAsync(file)
      onChange(key)
      setFileName(file.name)
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود صدا ناموفق بود'))
    }
  }

  function clear() {
    onChange(undefined)
    setFileName(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      <AudioDropWell
        label="افزودن صدا"
        hint={field.role ?? 'انتخاب فایل'}
        fileName={fileName}
        uploading={uploadAudio.isPending}
        invalid={invalid}
        onPick={file => void pick(file)}
        onClear={clear}
        accept={field.accept.join(',')}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function AudioArrayFieldWidget({
  field,
  value,
  onChange,
  setBusy,
}: {
  field: AudioField
  value: string[]
  onChange: (v: string[]) => void
  setBusy: (b: boolean) => void
}) {
  const uploadAudio = useUploadVideoEditAudio()
  const [fileNames, setFileNames] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setBusy(uploadAudio.isPending) }, [uploadAudio.isPending, setBusy])

  const atMax = field.maxCount != null && value.length >= field.maxCount

  async function pick(file: File) {
    if (atMax) return
    setError(null)
    try {
      const { key } = await uploadAudio.mutateAsync(file)
      const idx = value.length
      onChange([...value, key])
      setFileNames(prev => ({ ...prev, [idx]: file.name }))
    } catch (err) {
      setError(extractErrorMessage(err, 'آپلود صدا ناموفق بود'))
    }
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>
        {field.label}
        <RequiredMark required={field.required} />
      </FieldLabel>
      {field.helpText && <span className="text-[10.5px]" style={{ color: '#64748b' }}>{field.helpText}</span>}
      {value.map((_, i) => (
        <AudioDropWell
          key={i}
          label=""
          hint=""
          fileName={fileNames[i] ?? 'فایل صدا'}
          uploading={false}
          onPick={() => {}}
          onClear={() => removeAt(i)}
          accept={field.accept.join(',')}
        />
      ))}
      {!atMax && (
        <AudioDropWell
          label="افزودن صدا"
          hint={field.role ?? 'انتخاب فایل'}
          fileName={null}
          uploading={uploadAudio.isPending}
          onPick={file => void pick(file)}
          onClear={() => {}}
          accept={field.accept.join(',')}
        />
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// ============================== elementGroup ==============================

function ElementGroupFieldWidget({
  field,
  value,
  onChange,
  setBusy,
}: {
  field: ElementGroupField
  value: ElementMemberValue[]
  onChange: (v: ElementMemberValue[]) => void
  setBusy: (busy: boolean) => void
}) {
  const uploadImage = useUploadVideoEditImage()
  const uploadVideo = useUploadVideoEditVideo()
  const uploadAudio = useUploadVideoEditAudio()
  const [imagePreviews, setImagePreviews] = useState<Record<number, string[]>>({})
  const [videoPreviews, setVideoPreviews] = useState<Record<number, { src: string; durationSec: number }>>({})
  const [audioNames, setAudioNames] = useState<Record<number, string>>({})

  useEffect(() => {
    setBusy(uploadImage.isPending || uploadVideo.isPending || uploadAudio.isPending)
  }, [uploadImage.isPending, uploadVideo.isPending, uploadAudio.isPending, setBusy])

  function updateMember(i: number, patch: Partial<ElementMemberValue>) {
    onChange(value.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }

  async function pickImage(i: number, file: File) {
    const { key } = await uploadImage.mutateAsync(file)
    updateMember(i, { imageKeys: [...(value[i].imageKeys ?? []), key] })
    setImagePreviews(prev => ({ ...prev, [i]: [...(prev[i] ?? []), URL.createObjectURL(file)] }))
  }
  function removeImageAt(i: number, imgIndex: number) {
    const nextKeys = (value[i].imageKeys ?? []).filter((_, idx) => idx !== imgIndex)
    updateMember(i, { imageKeys: nextKeys.length ? nextKeys : undefined })
    setImagePreviews(prev => ({ ...prev, [i]: (prev[i] ?? []).filter((_, idx) => idx !== imgIndex) }))
  }
  async function pickVideo(i: number, file: File) {
    const { key, durationSec } = await uploadVideo.mutateAsync({ file })
    const maxWindow = field.memberShape.videoField?.maxDurationSec ?? 8
    const end = Math.min(durationSec, maxWindow)
    updateMember(i, { videoKey: key, videoWindowStartSec: 0, videoWindowEndSec: end })
    setVideoPreviews(prev => ({ ...prev, [i]: { src: URL.createObjectURL(file), durationSec } }))
  }
  function clearVideo(i: number) {
    updateMember(i, { videoKey: undefined, videoWindowStartSec: undefined, videoWindowEndSec: undefined })
    setVideoPreviews(prev => {
      const next = { ...prev }
      delete next[i]
      return next
    })
  }
  async function pickAudio(i: number, file: File) {
    const { key } = await uploadAudio.mutateAsync(file)
    updateMember(i, { audioKey: key })
    setAudioNames(prev => ({ ...prev, [i]: file.name }))
  }

  function mediaSlots(i: number): { image?: ElementImageSlot; video?: ElementVideoSlot; audio?: ElementAudioSlot } {
    return {
      image: field.memberShape.imageField
        ? {
            accept: (field.memberShape.imageField.accept ?? ['image/*']).join(','),
            uploading: uploadImage.isPending,
            previews: imagePreviews[i] ?? [],
            minCount: field.memberShape.imageField.minCount,
            maxCount: field.memberShape.imageField.maxCount,
            onPick: file => void pickImage(i, file),
            onRemoveAt: imgIndex => removeImageAt(i, imgIndex),
          }
        : undefined,
      video: field.memberShape.videoField
        ? {
            accept: (field.memberShape.videoField.accept ?? ['video/*']).join(','),
            uploading: uploadVideo.isPending,
            preview: videoPreviews[i] ?? null,
            windowStartSec: value[i].videoWindowStartSec,
            windowEndSec: value[i].videoWindowEndSec,
            maxWindowSec: field.memberShape.videoField.maxDurationSec ?? 8,
            onPick: file => void pickVideo(i, file),
            onClear: () => clearVideo(i),
            onWindowChange: (s, e) => updateMember(i, { videoWindowStartSec: s, videoWindowEndSec: e }),
          }
        : undefined,
      audio: field.memberShape.audioField
        ? {
            accept: (field.memberShape.audioField.accept ?? ['audio/*']).join(','),
            uploading: uploadAudio.isPending,
            fileName: audioNames[i] ?? null,
            onPick: file => void pickAudio(i, file),
            onClear: () => updateMember(i, { audioKey: undefined }),
          }
        : undefined,
    }
  }

  return (
    <ElementListEditor
      label={field.label}
      helpText={field.helpText}
      members={value}
      onChange={onChange}
      minCount={field.minCount}
      maxCount={field.maxCount}
      mediaSlots={mediaSlots}
    />
  )
}

// ============================== shotGroup ==============================

function ShotGroupFieldWidget({
  field,
  value,
  onChange,
  values,
}: {
  field: ShotGroupField
  value: ShotValue[]
  onChange: (v: ShotValue[]) => void
  values: FieldValues
}) {
  const elementNames = useMemo(() => {
    if (!field.linkedElementFieldKey) return []
    const members = values[field.linkedElementFieldKey] as ElementMemberValue[] | undefined
    return (members ?? []).map(m => m.name).filter(Boolean)
  }, [field.linkedElementFieldKey, values])

  return (
    <ShotListEditor
      label={field.label}
      helpText={field.helpText}
      shots={value}
      onChange={onChange}
      minShots={field.minShots}
      maxShots={field.maxShots}
      multiline={field.shotPromptField.multiline}
      maxLength={field.shotPromptField.maxLength}
      durationField={field.shotDurationField ? { min: field.shotDurationField.min, max: field.shotDurationField.max } : undefined}
      elementNames={elementNames}
    />
  )
}

// ============================== dispatcher ==============================

export function FieldRenderer({
  field,
  values,
  setValue,
  setFieldBusy,
  invalidFieldKey,
}: {
  field: KieField
  values: FieldValues
  setValue: (key: string, value: unknown) => void
  setFieldBusy: (key: string, busy: boolean) => void
  invalidFieldKey: string | null
}) {
  if (!isFieldVisible(field, values)) return null
  const invalid = invalidFieldKey === field.key
  const required = isFieldRequired(field, values)

  switch (field.type) {
    case 'text':
      return <TextFieldWidget field={field} value={values[field.key] as string | undefined} onChange={v => setValue(field.key, v)} required={required} invalid={invalid} />
    case 'boolean':
      return <BooleanFieldWidget field={field} value={values[field.key] as boolean | undefined} onChange={v => setValue(field.key, v)} />
    case 'number':
      return <NumberFieldWidget field={field} value={values[field.key] as number | undefined} onChange={v => setValue(field.key, v)} required={required} invalid={invalid} />
    case 'enum':
      return <EnumFieldWidget field={field} values={values} value={values[field.key] as string | undefined} onChange={v => setValue(field.key, v)} />
    case 'duration':
      return <DurationFieldWidget field={field} values={values} onChange={v => setValue(field.key, v)} />
    case 'image':
      return <ImageFieldWidget field={field} value={values[field.key] as string | undefined} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} invalid={invalid} />
    case 'imageArray':
      return <ImageArrayFieldWidget field={field} value={(values[field.key] as string[] | undefined) ?? []} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} />
    case 'video':
      return <VideoFieldWidget field={field} value={values[field.key] as VideoFieldValue | undefined} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} invalid={invalid} />
    case 'videoArray':
      return <VideoArrayFieldWidget field={field} value={(values[field.key] as string[] | undefined) ?? []} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} />
    case 'audio':
      return <AudioFieldWidget field={field} value={values[field.key] as string | undefined} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} invalid={invalid} />
    case 'audioArray':
      return <AudioArrayFieldWidget field={field} value={(values[field.key] as string[] | undefined) ?? []} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} />
    case 'elementGroup':
      return <ElementGroupFieldWidget field={field} value={(values[field.key] as ElementMemberValue[] | undefined) ?? []} onChange={v => setValue(field.key, v)} setBusy={b => setFieldBusy(field.key, b)} />
    case 'shotGroup':
      return <ShotGroupFieldWidget field={field} value={(values[field.key] as ShotValue[] | undefined) ?? []} onChange={v => setValue(field.key, v)} values={values} />
    case 'derivedBoolean':
      return null
    default:
      return null
  }
}
