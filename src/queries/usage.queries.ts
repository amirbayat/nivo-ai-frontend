import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { UsageToday, BudgetStatus, MessageQuota } from '@/types/api'

export function useUsageToday() {
  return useQuery({
    queryKey: keys.usage.today(),
    queryFn: () => api.get<UsageToday>('/usage/today').then(r => r.data),
    refetchInterval: 30_000,
  })
}

export function useBudgetStatus() {
  return useQuery({
    queryKey: keys.usage.budget(),
    queryFn: () => api.get<BudgetStatus>('/usage/budget').then(r => r.data),
    refetchInterval: 60_000,
  })
}

export function useMessageQuota() {
  return useQuery({
    queryKey: keys.usage.messageQuota(),
    queryFn: () => api.get<MessageQuota>('/usage/message-quota').then(r => r.data),
    refetchInterval: 30_000,
  })
}
