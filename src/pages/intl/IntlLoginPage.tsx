import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSendEmailCode } from '@/queries/intlAuth.queries'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { en } from '@/locales/en'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function IntlLoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const sendCode = useSendEmailCode()

  useEffect(() => {
    if (localStorage.getItem('access_token')) navigate('/app', { replace: true })
  }, [navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      setError(en.auth.invalidEmail)
      return
    }
    try {
      await sendCode.mutateAsync(normalized)
      navigate('/verify', { state: { email: normalized } })
    } catch {
      setError(en.common.error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="ltr">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo variant="intl" className="mx-auto mb-4 w-60" />
          <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{en.auth.heading}</h1>
          <p className="mt-1 text-sm text-slate-500">{en.auth.subheading}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder={en.auth.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={error}
            autoFocus
            autoComplete="email"
          />
          <Button type="submit" className="w-full" loading={sendCode.isPending}>
            {en.auth.sendCode}
          </Button>
        </form>
      </div>
    </div>
  )
}
