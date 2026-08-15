import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys } from '@/queries/keys'
import { getAndroidDeviceUuid } from '@/lib/android-bridge'
import { identify, resetIdentity, track } from '@/lib/events'
import { identifyClarity } from '@/lib/clarity'
import { peekAnonSessionId, clearAnonSession } from '@/lib/anonSession'
import type { User } from '@/types/api'

export interface WaitlistedInfo {
  message: string
  queuePosition: number
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
  waitlisted: WaitlistedInfo | null
  // فقط دقیقاً یک‌بار پر می‌شود — لحظه‌ی اولین ثبت‌نام واقعی (docs/PRD-discovery-and-credits.md بخش ۲.۲)
  signupBonusCredits: number | null
}

export function useMe() {
  return useQuery({
    queryKey: keys.auth.me(),
    queryFn: () => api.get<User>('/auth/me').then(r => r.data),
    enabled: !!localStorage.getItem('access_token'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      api.post('/auth/send-otp', { phone }).then(r => r.data),
    onSuccess: () => track('otp_requested'),
  })
}

export function useVerifyOtp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ phone, code, referralCode }: { phone: string; code: string; referralCode?: string }) => {
      // اگر کاربر قبل از لاگین یک مکالمه‌ی مهمان (چت بدون ثبت‌نام) داشته، شناسه‌ی سشنش را
      // می‌فرستیم تا بک‌اند آن مکالمه را به حساب واقعی‌اش migrate کند — فقط اگر واقعاً چنین
      // سشنی وجود داشته باشد (peek، نه get — نباید همین‌جا یک سشن مهمان تازه ساخته شود)
      const anonSessionId = peekAnonSessionId()
      return api.post<AuthTokens>('/auth/verify-otp', {
        phone,
        code,
        referralCode,
        deviceUuid: getAndroidDeviceUuid(),
        ...(anonSessionId ? { anonSessionId } : {}),
      }).then(r => r.data)
    },
    onSuccess: data => {
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      identify(data.user.id)
      identifyClarity(data.user.id)
      // سشن مهمان دیگر لازم نیست — پاک می‌شود تا اگر بعداً logout کرد، سشن مهمان کاملاً تازه شروع شود
      clearAnonSession()
      void qc.invalidateQueries({ queryKey: keys.auth.me() })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then(r => r.data),
    onSettled: () => {
      track('logout')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      resetIdentity()
      qc.clear()
      window.location.href = '/login'
    },
  })
}
