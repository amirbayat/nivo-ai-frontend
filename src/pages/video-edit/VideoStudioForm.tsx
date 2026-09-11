import { useEffect, useState } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { PromptReviewModal } from './PromptReviewModal'
import { extractReferenceAssets } from './extractReferenceAssets'
import { extractErrorMessage } from './VideoStudioFieldWidgets'
import { evaluateCondition, isFieldRequired, isFieldVisible, isPresent } from './fieldConditions'
import { useCreateVideoEditJob } from '@/queries/videoEdit.queries'
import { fa } from '@/locales/fa'
import type { KieVideoModel, VideoEditJob, VideoEditMode } from '@/types/api'
import type { ElementMemberValue, FieldValues, InputFieldsSchema, KieField, ShotValue, VideoFieldValue } from '@/types/inputFields'

// فرم عمومی معماری data-driven — جایگزین VideoEditForm فقط وقتی model.inputFields غیر-null
// است (بخش ۳ پلن استودیوی ویدیو). خودِ VideoEditForm دست‌نخورده می‌ماند، چون بخشی از مدل‌ها
// هنوز روی معماری enum-dispatch قدیمی‌اند.

interface ValidationError {
  fieldKey: string
  message: string
}

// پورت دقیق validateInputValues بک‌اند (generic-payload-builder.ts) — همون ترتیب چک‌ها،
// همون کیس‌های تایپ‌محور (فقط imageArray/video/elementGroup/shotGroup چک اضافه دارند، دقیقاً
// مثل بک‌اند — audioArray/videoArray عمداً بدون چک اضافه‌اند)
function validateValues(schema: InputFieldsSchema, values: FieldValues): ValidationError | null {
  for (const field of schema.fields) {
    if (field.type === 'derivedBoolean') continue
    const raw = values[field.key]
    if (!isFieldVisible(field, values)) {
      if (isPresent(raw)) return { fieldKey: field.key, message: `فیلد «${field.label}» در این حالت مجاز نیست` }
      continue
    }

    if (field.allowedOnlyWhen && isPresent(raw) && !evaluateCondition(field.allowedOnlyWhen, values)) {
      return { fieldKey: field.key, message: `فیلد «${field.label}» در این حالت مجاز نیست` }
    }

    const required = isFieldRequired(field, values)
    if (required && !isPresent(raw)) {
      return { fieldKey: field.key, message: `فیلد «${field.label}» اجباری است` }
    }
    if (!isPresent(raw)) continue

    switch (field.type) {
      case 'number': {
        const n = raw as number
        if (typeof n !== 'number' || Number.isNaN(n)) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» باید عدد باشد` }
        }
        if (field.min != null && n < field.min) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» نباید کمتر از ${field.min} باشد` }
        }
        if (field.max != null && n > field.max) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» نباید بیشتر از ${field.max} باشد` }
        }
        break
      }
      case 'enum': {
        const allowed = field.options.map(o => o.value)
        if (!allowed.includes(String(raw))) {
          return { fieldKey: field.key, message: `مقدار فیلد «${field.label}» نامعتبر است` }
        }
        break
      }
      case 'imageArray': {
        const arr = raw as string[]
        if (field.minCount != null && arr.length < field.minCount) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» به حداقل ${field.minCount} مورد نیاز دارد` }
        }
        if (field.maxCount != null && arr.length > field.maxCount) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» حداکثر ${field.maxCount} مورد می‌پذیرد` }
        }
        break
      }
      case 'video': {
        const v = raw as VideoFieldValue
        if (!v.key) return { fieldKey: field.key, message: `فیلد «${field.label}» نامعتبر است` }
        if (field.trim?.enabled) {
          if (v.windowStartSec == null || v.windowEndSec == null) {
            return { fieldKey: field.key, message: `پنجره‌ی شروع/پایان فیلد «${field.label}» اجباری است` }
          }
          const width = v.windowEndSec - v.windowStartSec
          if (width <= 0) return { fieldKey: field.key, message: `پنجره‌ی فیلد «${field.label}» نامعتبر است` }
          if (width > field.trim.maxWindowSec) {
            return { fieldKey: field.key, message: `پنجره‌ی فیلد «${field.label}» نباید بیشتر از ${field.trim.maxWindowSec} ثانیه باشد` }
          }
        }
        break
      }
      case 'elementGroup': {
        const arr = raw as ElementMemberValue[]
        if (arr.length < field.minCount) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» به حداقل ${field.minCount} عنصر نیاز دارد` }
        }
        if (arr.length > field.maxCount) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» حداکثر ${field.maxCount} عنصر می‌پذیرد` }
        }
        for (const member of arr) {
          if (!member.name) return { fieldKey: field.key, message: `نام همه‌ی عناصر «${field.label}» اجباری است` }
          if (!member.description) return { fieldKey: field.key, message: `توضیح همه‌ی عناصر «${field.label}» اجباری است` }
          const hasImages = (member.imageKeys?.length ?? 0) > 0
          const hasVideo = !!member.videoKey
          if (hasImages === hasVideo) {
            return { fieldKey: field.key, message: `عنصر «${member.name}» باید دقیقاً یکی از تصویر یا ویدیو را داشته باشد` }
          }
          if (hasImages && field.memberShape.imageField) {
            const { minCount, maxCount } = field.memberShape.imageField
            const n = member.imageKeys!.length
            if (minCount != null && n < minCount) {
              return { fieldKey: field.key, message: `عنصر «${member.name}» به حداقل ${minCount} عکس نیاز دارد` }
            }
            if (maxCount != null && n > maxCount) {
              return { fieldKey: field.key, message: `عنصر «${member.name}» حداکثر ${maxCount} عکس می‌پذیرد` }
            }
          }
          if (hasVideo) {
            if (member.videoWindowStartSec == null || member.videoWindowEndSec == null) {
              return { fieldKey: field.key, message: `پنجره‌ی ویدیوی عنصر «${member.name}» اجباری است` }
            }
            const widthMs = Math.round((member.videoWindowEndSec - member.videoWindowStartSec) * 1000)
            if (widthMs < 3000 || widthMs > 8000) {
              return { fieldKey: field.key, message: `طول ویدیوی عنصر «${member.name}» باید بین ۳ تا ۸ ثانیه باشد` }
            }
          }
        }
        break
      }
      case 'shotGroup': {
        const arr = raw as ShotValue[]
        if (arr.length < field.minShots) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» به حداقل ${field.minShots} شات نیاز دارد` }
        }
        if (arr.length > field.maxShots) {
          return { fieldKey: field.key, message: `فیلد «${field.label}» حداکثر ${field.maxShots} شات می‌پذیرد` }
        }
        for (const shot of arr) {
          if (!shot.prompt) return { fieldKey: field.key, message: 'پرامپت همه‌ی شات‌ها اجباری است' }
        }
        break
      }
      default:
        break
    }
  }

  for (const group of schema.exclusivityGroups ?? []) {
    const presentCount = group.fieldKeys.filter(k => isPresent(values[k])).length
    if (group.atLeastOneRequired && presentCount === 0) {
      return { fieldKey: group.fieldKeys[0], message: 'حداقل یکی از فیلدهای این گروه باید پر شود' }
    }
    if (group.atMostOne && presentCount > 1) {
      return { fieldKey: group.fieldKeys[0], message: 'فقط یکی از فیلدهای این گروه می‌تواند پر شود' }
    }
  }

  return null
}

function resolveStudioDurationSec(schema: InputFieldsSchema, values: FieldValues): number {
  const durationField = schema.fields.find(f => f.type === 'duration')
  if (!durationField) return 4
  const raw = values[durationField.key]
  return typeof raw === 'number' ? raw : durationField.default
}

function videoCreditCost(perSecond: number | null | undefined, durationSec: number): number | null {
  if (perSecond == null || durationSec <= 0) return null
  return Math.max(1, Math.round(perSecond * durationSec))
}

function computePrompt(schema: InputFieldsSchema, values: FieldValues): string {
  const mainPromptField = schema.fields.find(f => f.type === 'text' && f.semantic === 'mainPrompt')
  if (mainPromptField) {
    const v = values[mainPromptField.key]
    if (typeof v === 'string' && v.trim()) return v
  }
  const shotGroupField = schema.fields.find(f => f.type === 'shotGroup')
  if (shotGroupField) {
    const shots = values[shotGroupField.key] as ShotValue[] | undefined
    if (shots?.[0]?.prompt) return shots[0].prompt
  }
  return ''
}

interface FieldGroup {
  id: string
  label: string | null
  fields: KieField[]
}

function groupFields(schema: InputFieldsSchema): FieldGroup[] {
  const renderable = schema.fields.filter(f => f.type !== 'derivedBoolean')
  if (!schema.uiGroups?.length) {
    return [{ id: '__all__', label: null, fields: [...renderable].sort((a, b) => a.order - b.order) }]
  }
  const groups = [...schema.uiGroups].sort((a, b) => a.order - b.order)
  const ungrouped = renderable.filter(f => !groups.some(g => g.id === f.uiGroup)).sort((a, b) => a.order - b.order)
  const grouped = groups.map(g => ({
    id: g.id,
    label: g.label,
    fields: renderable.filter(f => f.uiGroup === g.id).sort((a, b) => a.order - b.order),
  }))
  return ungrouped.length > 0 ? [{ id: '__ungrouped__', label: null, fields: ungrouped }, ...grouped] : grouped
}

export function VideoStudioForm({
  model,
  sessionId,
  onSubmitStart,
  onSubmitEnd,
  onCreated,
}: {
  model: KieVideoModel
  sessionId?: string
  onSubmitStart?: (info: { prompt: string; mode: VideoEditMode }) => void
  onSubmitEnd?: () => void
  onCreated: (job: VideoEditJob) => void
}) {
  const schema = model.inputFields!
  const [values, setValues] = useState<FieldValues>({})
  const [busyFields, setBusyFields] = useState<Record<string, boolean>>({})
  const [invalidFieldKey, setInvalidFieldKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const createJob = useCreateVideoEditJob()
  const anyFieldBusy = Object.values(busyFields).some(Boolean)
  const busy = anyFieldBusy || createJob.isPending

  // سوییچ مدل → values هیچ ربطی به مدل قبلی نداره
  useEffect(() => {
    setValues({})
    setInvalidFieldKey(null)
    setError(null)
  }, [model.id])

  // فیلدی که visibleWhen‌اش الان false شده نباید مقدار قدیمی رو با خودش نگه داره — وگرنه هم
  // submit رو رد می‌کنه (فیلد «مجاز نیست» طبق منطق بک‌اند) هم توی valuesJson ارسال می‌شه
  useEffect(() => {
    setValues(prev => {
      let changed = false
      const next = { ...prev }
      for (const field of schema.fields) {
        if (field.type === 'derivedBoolean') continue
        if (!isFieldVisible(field, prev) && field.key in next) {
          delete next[field.key]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [values, schema])

  function setValue(key: string, value: unknown) {
    setValues(prev => {
      if (value === undefined) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  function setFieldBusy(key: string, isBusy: boolean) {
    setBusyFields(prev => {
      if (!!prev[key] === isBusy) return prev
      return { ...prev, [key]: isBusy }
    })
  }

  async function submit() {
    if (busy) return
    const invalid = validateValues(schema, values)
    if (invalid) {
      setInvalidFieldKey(invalid.fieldKey)
      setError(invalid.message)
      return
    }
    setInvalidFieldKey(null)
    setError(null)

    const prompt = computePrompt(schema, values)
    onSubmitStart?.({ prompt, mode: 'GENERATE' })
    try {
      const job = await createJob.mutateAsync({
        sessionId,
        mode: 'GENERATE',
        kieVideoModelId: model.id,
        prompt,
        valuesJson: values,
      })
      setValues({})
      onCreated(job)
    } catch (err) {
      setError(extractErrorMessage(err, 'ساخت ویدیو ناموفق بود، دوباره امتحان کن'))
    } finally {
      onSubmitEnd?.()
    }
  }

  const groups = groupFields(schema)
  const durationSec = resolveStudioDurationSec(schema, values)
  const creditCost = videoCreditCost(model.estimatedCreditCostPerSecond, durationSec)

  return (
    <div
      className="flex flex-col gap-3.5 rounded-[24px] p-[18px]"
      style={{
        background: 'linear-gradient(165deg, rgba(16,185,129,0.10) 0%, rgba(147,51,234,0.05) 55%, rgba(255,255,255,0.02) 100%)',
        border: '1.5px solid rgba(16,185,129,0.30)',
      }}
    >
      {groups.map(group => (
        <div key={group.id} className="flex flex-col gap-3">
          {group.label && (
            <span className="text-[11px] font-bold" style={{ color: '#6ee7b7' }}>{group.label}</span>
          )}
          {group.fields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              values={values}
              setValue={setValue}
              setFieldBusy={setFieldBusy}
              invalidFieldKey={invalidFieldKey}
              schemaFields={schema.fields}
              onReviewPrompt={() => setReviewOpen(true)}
            />
          ))}
        </div>
      ))}

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="w-full rounded-full py-3.5 text-[14.5px] font-bold transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#10b981,#34d399)', color: '#02170f' }}
      >
        {busy
          ? 'در حال ساخت...'
          : creditCost != null
            ? `بساز ویدیو · حدود ${fa.discover.creditCost(creditCost)}`
            : 'بساز ویدیو'}
      </button>

      <PromptReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        initialPrompt={computePrompt(schema, values)}
        initialReferenceAssets={extractReferenceAssets(schema, values)}
        onApplyPrompt={p => {
          const mainPromptField = schema.fields.find(f => f.type === 'text' && f.semantic === 'mainPrompt')
          if (mainPromptField) setValue(mainPromptField.key, p)
        }}
      />
    </div>
  )
}
