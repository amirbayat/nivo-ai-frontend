import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { KieVideoModel, VideoEditJob, VideoEditMode, VideoEditSession } from '@/types/api'
import type { FieldValues } from '@/types/inputFields'

// docs/PRD-video-edit-omni-kie.md — «ویرایش ویدیو» با Kie.ai، کاملاً جدا از videoStudio.queries.ts
// (OpenRouter). همه‌ی این هوک‌ها مستقیم روی /video-edit بک‌اند سوارند.

const ACTIVE_STATUSES = new Set(['PENDING', 'PROCESSING'])

export function useKieVideoModels() {
  return useQuery({
    queryKey: keys.videoEdit.models(),
    queryFn: () => api.get<KieVideoModel[]>('/video-edit/models').then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

// مقادیر عمومی VideoEditConfig (فقط مدت ثابت تولید) — برای نمایش عدد واقعی به‌جای برچسب مبهم
export function useVideoEditPublicConfig() {
  return useQuery({
    queryKey: keys.videoEdit.config(),
    queryFn: () =>
      api.get<{ isEnabled: boolean; generateFixedDurationSec: number }>('/video-edit/config').then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

// آپلود multipart — دقیقاً الگوی useCreateCaptionProject (captionStudio.queries.ts)، چون
// هم عکس هم ویدیو اینجا با magic-bytes سمت بک‌اند اعتبارسنجی می‌شوند، نه data-URL
export function useUploadVideoEditImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<{ key: string }>('/video-edit/upload-image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}

export function useUploadVideoEditVideo() {
  return useMutation({
    mutationFn: ({ file, onUploadProgress }: { file: File; onUploadProgress?: (percent: number) => void }) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<{ key: string; durationSec: number }>('/video-edit/upload-video', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: e => {
            if (onUploadProgress && e.total) onUploadProgress(Math.round((e.loaded / e.total) * 100))
          },
        })
        .then(r => r.data)
    },
  })
}

// معماری data-driven — فیلدهای audio (بخش ۳.۴ پلن: صدای مرجع/درایوینگ آواتار)
export function useUploadVideoEditAudio() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<{ key: string }>('/video-edit/upload-audio', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
  })
}

export interface CreateVideoEditJobDto {
  sessionId?: string // نیامدنش یعنی سرور خودش یک session تازه‌ی بی‌عنوان می‌سازد
  mode: VideoEditMode
  kieVideoModelId: string
  prompt: string
  referenceImageKeys?: string[]
  videoKey?: string
  videoWindowStartSec?: number
  videoWindowEndSec?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: string
  // معماری data-driven — فقط برای مدل‌هایی که kieVideoModel.inputFields غیر-null دارند
  // (VideoStudioForm)؛ فیلدهای بالا (referenceImageKeys/videoKey/...) برای این مدل‌ها نادیده
  // گرفته می‌شوند، فقط این استفاده می‌شود
  valuesJson?: FieldValues
}

export function useCreateVideoEditJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateVideoEditJobDto) =>
      api.post<VideoEditJob>('/video-edit/jobs', dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.videoEdit.sessions() }),
  })
}

// بازطراحی ۱۴۰۵/۰۶/۱۷ — «Session»: تاریخچه‌ی جلسه‌ها، هرکدام با jobs تودرتو (برای drawer
// تاریخچه هم گالری «کارهای این جلسه»، بدون نیاز به endpoint جدا برای هرکدام).
// پولینگ داخلی خودش را دارد: تا وقتی حداقل یک جاب PENDING/PROCESSING باشد هر ۵ ثانیه دوباره
// می‌خواند — دقیقاً همون الگوی useCaptionProject (وضعیت نهایی = توقف پولینگ)
export function useVideoEditSessions() {
  return useQuery({
    queryKey: keys.videoEdit.sessions(),
    queryFn: () => api.get<VideoEditSession[]>('/video-edit/sessions').then(r => r.data),
    refetchInterval: query => {
      const sessions = query.state.data ?? []
      const hasActive = sessions.some(s => s.jobs.some(j => ACTIVE_STATUSES.has(j.status)))
      return hasActive ? 5000 : false
    },
  })
}

export function useCreateVideoEditSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<VideoEditSession>('/video-edit/sessions', { title }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.videoEdit.sessions() }),
  })
}
