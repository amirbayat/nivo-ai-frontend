import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { StudioMessage, StudioProject, StudioShot, StudioShotVideoStatusResponse } from '@/types/api'

// docs/PRD-video-studio-chat-flow.md — استودیوی ویدیو (فلوی چت‌محور، بدون wizard/استپر).
// همه‌ی این هوک‌ها مستقیم روی /video-studio بک‌اند سوارند (nivo-ai-backend/src/modules/video-studio).

export function useVideoProjects() {
  return useQuery({
    queryKey: keys.videoStudio.list(),
    queryFn: () => api.get<StudioProject[]>('/video-studio/projects').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useVideoProject(id?: string) {
  return useQuery({
    queryKey: keys.videoStudio.detail(id ?? ''),
    queryFn: () => api.get<StudioProject>(`/video-studio/projects/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateVideoProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { initialPrompt: string; visualStyle?: string }) =>
      api.post<StudioProject>('/video-studio/projects', dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.videoStudio.list() }),
  })
}

export interface SetVideoStudioModelsDto {
  chatModelId?: string
  photoModelId?: string
  videoModelId?: string
  imageAspectRatio?: string
  videoAspectRatio?: string
}

export function useSetVideoStudioModels(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: SetVideoStudioModelsDto) =>
      api.patch<StudioProject>(`/video-studio/projects/${projectId}/models`, dto).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.videoStudio.detail(projectId), data),
  })
}

export function useRegenerateCharacters(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<StudioProject>(`/video-studio/projects/${projectId}/characters/regenerate`).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.videoStudio.detail(projectId), data),
  })
}

export function useSelectCharacter(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (optionId: string) =>
      api.post<StudioProject>(`/video-studio/projects/${projectId}/characters/${optionId}/select`).then(r => r.data),
    onSuccess: data => qc.setQueryData(keys.videoStudio.detail(projectId), data),
  })
}

export function useUpdateShot(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shotId, ...dto }: { shotId: string; title?: string; scenario?: string; audioEnabled?: boolean }) =>
      api.patch<StudioShot>(`/video-studio/projects/${projectId}/shots/${shotId}`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.videoStudio.detail(projectId) }),
  })
}

export function useRequestShotVideo(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shotId: string) =>
      api.post<StudioShot>(`/video-studio/projects/${projectId}/shots/${shotId}/video`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.videoStudio.detail(projectId) }),
  })
}

// چت واقعی — دستور صریح کاربر: بدون wizard/دکمه‌ی ثابت، بک‌اند خودش intent را از متن آزاد
// تشخیص می‌دهد (video-studio.service.ts/sendMessage) و اکشن مناسب را اجرا می‌کند
export function useProjectMessages(projectId?: string) {
  return useQuery({
    queryKey: keys.videoStudio.messages(projectId ?? ''),
    queryFn: () => api.get<StudioMessage[]>(`/video-studio/projects/${projectId}/messages`).then(r => r.data),
    enabled: !!projectId,
  })
}

export function useSendMessage(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { content: string; imageKey?: string }) =>
      api.post<{ message: StudioMessage; project: StudioProject }>(`/video-studio/projects/${projectId}/messages`, dto).then(r => r.data),
    onSuccess: data => {
      qc.setQueryData(keys.videoStudio.detail(projectId), data.project)
      void qc.invalidateQueries({ queryKey: keys.videoStudio.messages(projectId) })
    },
  })
}

// «افزودن عکس» توی کامپوزر — قبل از ارسال پیام صدا زده می‌شود، کلید MinIO برگشتی در
// sendMessage به‌عنوان imageKey فرستاده می‌شود (دقیقاً الگوی useUploadDiscoveryImage)
export function useUploadVideoStudioImage() {
  return useMutation({
    mutationFn: (dataUrl: string) =>
      api.post<{ key: string }>('/video-studio/upload-image', { image: dataUrl }).then(r => r.data),
  })
}

// پولینگ وضعیت رندر یک صحنه — فقط وقتی enabled باشد (یعنی صحنه هنوز PENDING/PROCESSING است)
// هر ۵ ثانیه یک‌بار چک می‌کند؛ به محض SUCCEEDED/FAILED خودِ کامپوننت صدازننده باید پروژه را
// invalidate کند تا videoKey/videoStatus نهایی از GET پروژه به‌روز شود (طبق توضیح بک‌اند)
export function useShotVideoStatus(projectId: string, shotId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.videoStudio.shotVideoStatus(projectId, shotId),
    queryFn: () =>
      api
        .get<StudioShotVideoStatusResponse>(`/video-studio/projects/${projectId}/shots/${shotId}/video-status`)
        .then(r => r.data),
    enabled,
    refetchInterval: query => {
      const status = query.state.data?.videoStatus
      return status === 'SUCCEEDED' || status === 'FAILED' ? false : 5000
    },
  })
}
