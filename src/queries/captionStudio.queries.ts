import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { CaptionProject, CaptionSegment, CaptionStyleOverrides } from '@/types/api'

// docs/PRD-video-auto-captions.md — استودیوی زیرنویس خودکار. همه‌ی این هوک‌ها مستقیم روی
// /caption-studio بک‌اند سوارند (nivo-ai-backend/src/modules/caption-studio).

const TERMINAL_STATUSES = new Set(['READY_FOR_EDIT', 'DONE', 'FAILED'])

export function useCaptionProject(id?: string) {
  return useQuery({
    queryKey: keys.captionStudio.detail(id ?? ''),
    queryFn: () => api.get<CaptionProject>(`/caption-studio/projects/${id}`).then(r => r.data),
    enabled: !!id,
    // طبق الگوی useShotVideoStatus موجود پروژه: تا وضعیت نهایی نشده هر ۳ ثانیه دوباره چک کن
    // (TRANSCRIBING/RENDERING بین‌راهند)؛ بعد از رسیدن به یک وضعیت پایدار پولینگ متوقف می‌شود
    refetchInterval: query => {
      const status = query.state.data?.status
      return status && TERMINAL_STATUSES.has(status) ? false : 3000
    },
  })
}

// آپلود ویدیو multipart — تنها نقطه‌ی این پروژه که واقعاً FormData می‌فرستد (نه data-URL
// base64 مثل عکس‌های موجود)، چون فایل ویدیو می‌تواند صدها مگابایت باشد
export function useCreateCaptionProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .post<CaptionProject>('/caption-studio/projects', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    },
    onSuccess: data => qc.setQueryData(keys.captionStudio.detail(data.id), data),
  })
}

// autosave (بخش ۵.۳) — فرانت فقط فیلدهای واقعاً تغییرکرده را می‌فرستد
export function useUpdateCaptionProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { segments?: CaptionSegment[]; styleId?: string; styleOverrides?: CaptionStyleOverrides }) =>
      api.patch<CaptionProject>(`/caption-studio/projects/${id}`, dto).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.captionStudio.detail(id), data),
  })
}

export function useRetryCaptionTranscription(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<CaptionProject>(`/caption-studio/projects/${id}/retry`).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.captionStudio.detail(id), data),
  })
}

export function useStartCaptionRender(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<CaptionProject>(`/caption-studio/projects/${id}/render`).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.captionStudio.detail(id), data),
  })
}

// آدرس نسبی (پشت JwtGuard) برای پخش ویدیوی مبدأ/رندرشده — با useAuthedImageUrl می‌شود
// (نه <video src> مستقیم، چون هدر Authorization لازم دارد)
export function captionAssetSrc(key: string) {
  return `/caption-studio/assets/${key}`
}

// بخش ۸.۲ — دانلود فایل زیرنویس خام. axios با responseType:'blob' چون این مسیر هم پشت
// JwtGuard است (نه یک لینک مستقیم قابل‌کلیک)؛ فایل با یک <a> موقت به کاربر داده می‌شود.
export async function downloadCaptionSubtitle(projectId: string, format: 'srt' | 'vtt' | 'ass') {
  const res = await api.get(`/caption-studio/projects/${projectId}/export`, {
    params: { format },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `captions.${format}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
