import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import type { UsageToday, BudgetStatus, WalletTransaction } from '@/types/api'

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

export interface WalletDetail {
  balanceToman: number
  transactions: WalletTransaction[]
}

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: keys.usage.wallet(),
    queryFn: () => api.get<WalletDetail>('/usage/wallet').then(r => r.data),
    enabled,
  })
}
