import { Navigate, Route, Routes } from 'react-router-dom'
import { useMe } from '@/queries/auth.queries'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { PricingPage } from '@/pages/pricing/PricingPage'
import { CallbackPage } from '@/pages/payment/CallbackPage'
import { ProfilePage } from '@/pages/settings/ProfilePage'
import { SubscriptionPage } from '@/pages/settings/SubscriptionPage'
import { UsagePage } from '@/pages/settings/UsagePage'
import { TicketsPage } from '@/pages/settings/TicketsPage'
import { TicketDetailPage } from '@/pages/settings/TicketDetailPage'
import { LandingPage } from '@/pages/landing/LandingPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const hasToken = !!localStorage.getItem('access_token')
  if (!hasToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { data } = useMe()
  if (data) return <Navigate to="/chat" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<LandingPage />} />

      {/* guest */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/otp"   element={<GuestRoute><OtpPage /></GuestRoute>} />

      {/* protected */}
      <Route
        path="/chat"
        element={<ProtectedRoute><ChatLayout><ChatPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/chat/:id"
        element={<ProtectedRoute><ChatLayout><ChatPage /></ChatLayout></ProtectedRoute>}
      />
      <Route
        path="/pricing"
        element={<ProtectedRoute><PricingPage /></ProtectedRoute>}
      />
      <Route path="/payment" element={<CallbackPage />} />

      <Route
        path="/settings"
        element={<ProtectedRoute><SettingsLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="/settings/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
      </Route>

      {/* default */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
