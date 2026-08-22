import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from './keys'
import type { NivoCalLog, NivoCalScanResult } from '@/types/api'

export function useFoodLogs() {
  return useQuery({
    queryKey: keys.nivoCal.logs(),
    queryFn: () => api.get<NivoCalLog[]>('/nivo-cal/logs').then(r => r.data),
  })
}

export function useScanFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { image: string; note?: string }) =>
      api.post<NivoCalScanResult & { id: string; imageUrl: string; createdAt: string }>('/nivo-cal/scan', dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.nivoCal.logs() }),
  })
}
