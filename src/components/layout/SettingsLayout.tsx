import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { fa } from '@/locales/fa'

const navItems = [
  { to: '/settings/profile', label: fa.settings.profile },
  { to: '/settings/subscription', label: fa.settings.subscription },
  { to: '/settings/usage', label: fa.settings.usage },
  { to: '/settings/tickets', label: fa.settings.tickets },
]

export function SettingsLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {fa.common.back}
          </button>
          <h1 className="text-xl font-bold text-slate-100">{fa.settings.title}</h1>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-44 sm:flex-col">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
