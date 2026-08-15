import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { Project } from '@/types/api'

// docs/PRD-discovery-and-credits.md بخش ۵.۹ — «پروژه» (پیج اینستاگرام/کانال یوتیوب کاربر)

export function useProjects() {
  return useQuery({
    queryKey: keys.projects.list(),
    queryFn: () => api.get<Project[]>('/v2/projects').then(r => r.data),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; platform: string; niche?: string; contextMd: string; brandColor?: string }) =>
      api.post<Project>('/v2/projects', data).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.projects.list() }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; platform: string; niche: string; contextMd: string; brandColor: string; isActive: boolean }> }) =>
      api.patch<Project>(`/v2/projects/${id}`, data).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.projects.list() }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/v2/projects/${id}`).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.projects.list() }),
  })
}
