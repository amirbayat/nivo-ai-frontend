// آینه‌ی دستی nivo-ai-backend/src/modules/kie-video-models/input-fields.schema.ts — چون بین
// سه ریپو پکیج مشترکی نیست (دقیقاً همون الگویی که types/api.ts برای بقیه‌ی Prisma types انجام
// می‌دهد). هر تغییری در schema بک‌اند باید دستی اینجا هم اعمال شود.

export type FieldCondition =
  | { kind: 'fieldPresent'; fieldKey: string }
  | { kind: 'fieldAbsent'; fieldKey: string }
  | { kind: 'fieldEquals'; fieldKey: string; value: string | number | boolean }
  | { kind: 'and'; all: FieldCondition[] }
  | { kind: 'or'; any: FieldCondition[] }

interface BaseField {
  key: string
  kieField: string
  label: string
  helpText?: string
  required: boolean
  order: number
  uiGroup?: string
  visibleWhen?: FieldCondition
  requiredWhen?: FieldCondition
  allowedOnlyWhen?: FieldCondition
  omitWhenEmpty?: boolean
}

export interface TextField extends BaseField {
  type: 'text'
  multiline: boolean
  maxLength?: number
  placeholder?: string
  semantic?: 'mainPrompt' | 'shotPrompt' | 'characterDescription' | 'generic'
}

export interface BooleanField extends BaseField {
  type: 'boolean'
  default: boolean
  semantic?: 'audioOutputToggle' | 'generic'
}

export interface NumberField extends BaseField {
  type: 'number'
  min?: number
  max?: number
  step?: number
  wireValueType?: 'number' | 'string'
}

export interface EnumOption {
  value: string
  label: string
}

export interface EnumField extends BaseField {
  type: 'enum'
  options: EnumOption[]
  wireValueType?: 'string' | 'number'
  semantic?: 'aspectRatio' | 'resolution' | 'generic'
  optionsDependOn?: { fieldKeys: string[]; optionsByKey: Record<string, EnumOption[]> }
}

export interface DurationField extends BaseField {
  type: 'duration'
  mode: 'fixedList' | 'freeRange'
  fixedOptions?: number[]
  snapToNearestAllowed?: boolean
  range?: { min: number; max: number }
  wireValueType: 'number' | 'string'
  default: number
  autoSentinel?: { value: number; triggerWhen: FieldCondition }
  omitWhen?: FieldCondition
}

interface MediaBase extends BaseField {
  accept: string[]
  maxFileSizeBytes?: number
  role?: string
}

export interface ImageField extends MediaBase {
  type: 'image' | 'imageArray'
  maxCount?: number
  minCount?: number
}

export interface VideoField extends MediaBase {
  type: 'video' | 'videoArray'
  maxDurationSec?: number
  wireShape: 'scalarUrl' | 'arrayOfUrl' | 'objectWithWindow'
  objectWindowKeys?: { url: string; start: string; end: string }
  trim?: { enabled: boolean; maxWindowSec: number }
}

export interface AudioField extends MediaBase {
  type: 'audio' | 'audioArray'
  audioRole: 'reference' | 'drivingRequired' | 'drivingOptional'
  maxDurationSec?: number
  maxCount?: number
}

interface MemberMediaShape {
  accept?: string[]
  maxFileSizeBytes?: number
  maxDurationSec?: number
  minCount?: number
  maxCount?: number
  wireShape?: 'scalarUrl' | 'arrayOfUrl' | 'objectWithWindow'
  audioRole?: 'reference' | 'drivingRequired' | 'drivingOptional'
}

export interface ElementGroupField extends BaseField {
  type: 'elementGroup'
  minCount: number
  maxCount: number
  nameKieField: string
  memberShape: { imageField?: MemberMediaShape; videoField?: MemberMediaShape; audioField?: MemberMediaShape }
}

export interface ShotGroupField extends BaseField {
  type: 'shotGroup'
  minShots: number
  maxShots: number
  shotPromptField: { multiline?: boolean; maxLength?: number; required?: boolean }
  shotDurationField?: { min?: number; max?: number; wireValueType?: 'number' | 'string' }
  wireBehavior: { itemPromptKey: string; itemDurationKey?: string }
  linkedElementFieldKey?: string
}

export interface DerivedBooleanField extends BaseField {
  type: 'derivedBoolean'
  derivedFromFieldKey: string
  predicate: 'arrayLengthGreaterThan'
  threshold: number
}

export type KieField =
  | TextField
  | BooleanField
  | NumberField
  | EnumField
  | DurationField
  | ImageField
  | VideoField
  | AudioField
  | ElementGroupField
  | ShotGroupField
  | DerivedBooleanField

export interface ExclusivityGroup {
  id: string
  fieldKeys: string[]
  atLeastOneRequired: boolean
  atMostOne: boolean
}

export interface UiGroup {
  id: string
  label: string
  order: number
}

export interface InputFieldsSchema {
  version: 1
  fields: KieField[]
  exclusivityGroups?: ExclusivityGroup[]
  uiGroups?: UiGroup[]
}

// ============================== FieldValues (submission) ==============================
// شکل مقداری که VideoStudioForm به ازای هر field.key در valuesJson می‌فرستد — آینه‌ی دقیق
// کامنت FieldValues در nivo-ai-backend/generic-payload-builder.ts:
//   text/enum          → string
//   boolean            → boolean
//   number/duration    → number
//   image/audio        → string (کلید MinIO از آپلود)
//   imageArray/audioArray → string[]
//   video              → VideoFieldValue
//   videoArray         → string[]
//   elementGroup       → ElementMemberValue[]
//   shotGroup          → ShotValue[]

export interface VideoFieldValue {
  key: string
  windowStartSec?: number
  windowEndSec?: number
}

export interface ElementMemberValue {
  name: string
  imageKey?: string
  videoKey?: string
  audioKey?: string
}

export interface ShotValue {
  prompt: string
  durationSec?: number
}

export type FieldValues = Record<string, unknown>
