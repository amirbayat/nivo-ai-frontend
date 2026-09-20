import { create } from 'zustand'

export type Theme = 'dark' | 'light'

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>(set => ({
  theme: (typeof window !== 'undefined' ? (localStorage.getItem('nivo:theme') as Theme | null) : null) ?? 'dark',
  setTheme: theme => {
    if (typeof window !== 'undefined') localStorage.setItem('nivo:theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => set(s => {
    const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
    if (typeof window !== 'undefined') localStorage.setItem('nivo:theme', next)
    applyTheme(next)
    return { theme: next }
  }),
}))
