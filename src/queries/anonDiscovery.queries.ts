import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import { getAnonSessionId } from '@/lib/anonSession'
import type { AnonDiscoveryStatus, AnonCreativeGenerationResult } from '@/types/api'

// امتحان رایگان یک‌باره‌ی استودیو محتوا برای کاربر مهمان — همون الگوی anonChat.queries.ts
// (هدر X-Anon-Session-Id)، فقط gate یک‌بارمصرف است نه شمارنده‌ی روزانه

function anonHeaders() {
  return { 'X-Anon-Session-Id': getAnonSessionId() }
}

export function useAnonDiscoveryStatus() {
  return useQuery({
    queryKey: keys.anonDiscovery.status(),
    queryFn: () =>
      api.get<AnonDiscoveryStatus>('/v2/discovery/anon/status', { headers: anonHeaders() }).then(r => r.data),
  })
}

export function useAnonUploadDiscoveryImage() {
  return useMutation({
    mutationFn: (dataUrl: string) =>
      api.post<{ key: string }>('/v2/discovery/anon/upload-image', { image: dataUrl }, { headers: anonHeaders() }).then(r => r.data),
  })
}

export function useAnonGenerateCreative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { promptId: string; userInput?: string; inputImageKeys?: string[] }) =>
      api.post<AnonCreativeGenerationResult>('/v2/discovery/anon/generate', dto, { headers: anonHeaders() }).then(r => r.data),
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.anonDiscovery.status() }),
  })
}
