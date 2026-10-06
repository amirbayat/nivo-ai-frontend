import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'

// docs/PRD-instagram-smart-dm-and-ir-intl-split.md بخش ۳/۳.۱/۷.۱ — معادل auth.queries.ts
// ولی برای REGION=INTL: ایمیل+کد به‌جای شماره+OTP، بدون referral/anonSession/events (هیچ‌کدام
// برای مینی‌پنل رایگان فاز ۱ موضوعیت ندارند؛ عمداً فایل جدا، نه شاخه‌زدن داخل همان فایل)

interface IntlTokens {
  accessToken: string
  refreshToken: string
}

interface IntlMe {
  sub: string
  email: string
  storeId: string
}

export function useIntlMe() {
  return useQuery({
    queryKey: keys.intl.me(),
    queryFn: () => api.get<IntlMe>('/intl-auth/me').then(r => r.data),
    enabled: !!localStorage.getItem('access_token'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useSendEmailCode() {
  return useMutation({
    mutationFn: (email: string) => api.post<{ message: string }>('/intl-auth/send-code', { email }).then(r => r.data),
  })
}

export function useVerifyEmailCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      api.post<IntlTokens>('/intl-auth/verify-code', { email, code }).then(r => r.data),
    onSuccess: data => {
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      void qc.invalidateQueries({ queryKey: keys.intl.me() })
    },
  })
}

export function useIntlLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refresh_token') ?? ''
      return api.post('/intl-auth/logout', { refreshToken }).then(r => r.data)
    },
    onSettled: () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      qc.clear()
      window.location.href = '/login'
    },
  })
}
