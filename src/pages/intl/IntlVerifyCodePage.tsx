import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSendEmailCode, useVerifyEmailCode } from '@/queries/intlAuth.queries'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { en } from '@/locales/en'

const RESEND_SECONDS = 120

export function IntlVerifyCodePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [autoSubmittedCode, setAutoSubmittedCode] = useState<string | null>(null)

  const verifyCode = useVerifyEmailCode()
  const sendCode = useSendEmailCode()

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true })
      return
    }
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(timer)
  }, [email, navigate])

  const submit = async () => {
    setError('')
    try {
      await verifyCode.mutateAsync({ email, code })
      navigate('/app', { replace: true })
    } catch {
      setError(en.common.error)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await submit()
  }

  useEffect(() => {
    if (code.length === 6 && code !== autoSubmittedCode && !verifyCode.isPending) {
      setAutoSubmittedCode(code)
      void submit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const onResend = async () => {
    if (countdown > 0) return
    try {
      await sendCode.mutateAsync(email)
      setCountdown(RESEND_SECONDS)
      setCode('')
      setError('')
    } catch {
      setError(en.common.error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-white p-4" dir="ltr">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">{en.auth.enterCode}</h1>
          <p className="mt-1 text-sm text-slate-500">{en.auth.codeSentTo(email)}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="● ● ● ● ● ●"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            error={error}
            autoFocus
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <Button type="submit" className="w-full" loading={verifyCode.isPending} disabled={code.length < 6}>
            {en.auth.verifyCode}
          </Button>
        </form>

        <div className="mt-4 text-center">
          {countdown > 0 ? (
            <p className="text-sm text-slate-500">{en.auth.resendIn(countdown)}</p>
          ) : (
            <button onClick={onResend} disabled={sendCode.isPending} className="text-sm text-emerald-400 light:text-emerald-600 hover:text-emerald-300 light:hover:text-emerald-700">
              {en.auth.resendCode}
            </button>
          )}
        </div>
        <button onClick={() => navigate('/login')} className="mt-2 w-full text-center text-sm text-slate-600 hover:text-slate-400 light:hover:text-slate-700">
          {en.common.back}
        </button>
      </div>
    </div>
  )
}
