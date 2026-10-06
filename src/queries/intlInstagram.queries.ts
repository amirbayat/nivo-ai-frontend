import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { AutomationTriggerType, InstagramAutomationRule } from '@/types/api'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳.۱/۴.۴ — معادل instagram.queries.ts
// برای مسیر خارجی (`intl/instagram`)؛ storeId از توکن می‌آید، نه از پارامتر مسیر (هر کاربر
// INTL دقیقاً یک فروشگاه دارد — IntlAuthService.verifyCode)

export function useIntlInstagramStatus() {
  return useQuery({
    queryKey: keys.intl.instagramStatus(),
    queryFn: () =>
      api
        .get<{ instagramBusinessId: string | null; instagramConnectedAt: string | null }>('/intl/instagram/status')
        .then(r => r.data),
  })
}

export function useIntlInstagramConnectUrl() {
  return useQuery({
    queryKey: ['intl', 'instagram-connect-url'],
    queryFn: () => api.get<{ url: string | null }>('/intl/instagram/connect-url').then(r => r.data),
    staleTime: Infinity,
  })
}

export function useIntlConnectInstagram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      api.post<{ connected: boolean }>('/intl/instagram/connect', { code }).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.intl.instagramStatus() }),
  })
}

export function useIntlInstagramRules() {
  return useQuery({
    queryKey: keys.intl.instagramRules(),
    queryFn: () => api.get<InstagramAutomationRule[]>('/intl/instagram/rules').then(r => r.data),
  })
}

export interface CreateIntlInstagramRuleInput {
  triggerType: AutomationTriggerType
  targetMediaId?: string
  keyword?: string
  staticReplyText?: string
  staticDmText: string
  publicReplyEnabled?: boolean
}

export function useIntlCreateInstagramRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateIntlInstagramRuleInput) =>
      api.post<InstagramAutomationRule>('/intl/instagram/rules', dto).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.intl.instagramRules() }),
  })
}

export function useIntlUpdateInstagramRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, ...data }: { ruleId: string; isActive?: boolean }) =>
      api.patch<InstagramAutomationRule>(`/intl/instagram/rules/${ruleId}`, data).then(r => r.data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.intl.instagramRules() }),
  })
}

export function useIntlDeleteInstagramRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => api.delete(`/intl/instagram/rules/${ruleId}`).then(() => undefined),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.intl.instagramRules() }),
  })
}
