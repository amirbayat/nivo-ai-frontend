import type { ElementMemberValue, FieldValues, InputFieldsSchema, VideoFieldValue } from '@/types/inputFields'
import type { PromptReviewReferenceAsset } from '@/queries/videoEdit.queries'

// docs/PRD-video-prompt-coach.md بخش ۴.۴ — سقف عمدی برای جلوگیری از یک payload غول‌پیکر
// (مثلاً یک elementGroup با چند کاراکتر، هرکدام چند عکس)، نه یک محدودیت باز
const MAX_IMAGES = 6
const MAX_VIDEOS = 1
const MAX_AUDIO = 1

// جمع‌آوریِ همه‌ی رسانه‌های مرجعِ فعلیِ فرم (نه فقط اولین عکس/ویدیو) — روی هر نوع فیلدی که
// می‌تواند عکس/ویدیو/صدا نگه دارد، شامل اعضای elementGroup؛ shotGroup رد می‌شود چون ShotValue
// فقط prompt/durationSec دارد و رسانه‌ای در خودش نگه نمی‌دارد.
export function extractReferenceAssets(schema: InputFieldsSchema, values: FieldValues): PromptReviewReferenceAsset[] {
  const images: string[] = []
  const videos: string[] = []
  const audios: string[] = []

  const orderedFields = [...schema.fields].sort((a, b) => a.order - b.order)
  for (const field of orderedFields) {
    const raw = values[field.key]
    if (raw == null) continue

    switch (field.type) {
      case 'image':
        images.push(raw as string)
        break
      case 'imageArray':
        images.push(...(raw as string[]))
        break
      case 'video': {
        const v = raw as VideoFieldValue
        if (v?.key) videos.push(v.key)
        break
      }
      case 'videoArray':
        videos.push(...(raw as string[]))
        break
      case 'audio':
        audios.push(raw as string)
        break
      case 'audioArray':
        audios.push(...(raw as string[]))
        break
      case 'elementGroup': {
        for (const member of raw as ElementMemberValue[]) {
          if (member.imageKeys) images.push(...member.imageKeys)
          if (member.videoKey) videos.push(member.videoKey)
          if (member.audioKey) audios.push(member.audioKey)
        }
        break
      }
      // 'shotGroup', 'text', 'boolean', 'number', 'enum', 'duration', 'derivedBoolean': رسانه‌ای ندارند
    }
  }

  return [
    ...images.slice(0, MAX_IMAGES).map(key => ({ type: 'image' as const, key })),
    ...videos.slice(0, MAX_VIDEOS).map(key => ({ type: 'video' as const, key })),
    ...audios.slice(0, MAX_AUDIO).map(key => ({ type: 'audio' as const, key })),
  ]
}
