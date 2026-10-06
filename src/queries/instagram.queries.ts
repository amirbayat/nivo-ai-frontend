import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { AutomationTriggerType, InstagramAutomationRule } from '@/types/api'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۴.۴ — مسیر ایرانی (v2/stores/:storeId/instagram)؛
// معادل این فایل برای مسیر خارجی queries/intl-instagram.queries.ts است (مبنای توکن/endpoint فرق دارد)

export function useInstagramConnectUrl(storeId: string) {
  return useQuery({
    queryKey: ['seller', 'instagram-connect-url', storeId],
    queryFn: () =>
      api.get<{ url: string | null }>(`/v2/stores/${storeId}/instagram/connect-url`).then(r => r.data),
    enabled: !!storeId,
    staleTime: Infinity,
  })
}

export function useConnectInstagram(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ connected: boolean }>(`/v2/stores/${storeId}/instagram/connect`, { code }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.stores() }),
  })
}

export function useInstagramRules(storeId: string) {
  return useQuery({
    queryKey: keys.seller.instagramRules(storeId),
    queryFn: () =>
      api.get<InstagramAutomationRule[]>(`/v2/stores/${storeId}/instagram/rules`).then(r => r.data),
    enabled: !!storeId,
  })
}

export interface CreateInstagramRuleInput {
  triggerType: AutomationTriggerType
  targetMediaId?: string
  keyword?: string
  staticReplyText?: string
  staticDmText: string
  publicReplyEnabled?: boolean
}

export function useCreateInstagramRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInstagramRuleInput) =>
      api.post<InstagramAutomationRule>(`/v2/stores/${storeId}/instagram/rules`, dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.instagramRules(storeId) }),
  })
}

export function useUpdateInstagramRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, ...data }: { ruleId: string; isActive?: boolean }) =>
      api.patch<InstagramAutomationRule>(`/v2/stores/${storeId}/instagram/rules/${ruleId}`, data).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.instagramRules(storeId) }),
  })
}

export function useDeleteInstagramRule(storeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete(`/v2/stores/${storeId}/instagram/rules/${ruleId}`).then(() => undefined),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.seller.instagramRules(storeId) }),
  })
}
