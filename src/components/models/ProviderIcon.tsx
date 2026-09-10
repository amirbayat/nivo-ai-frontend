function OpenAISwirl({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="currentColor" className="text-slate-300 shrink-0">
      <path d="M22.28 9.28a5.76 5.76 0 0 0-.49-4.73 5.83 5.83 0 0 0-6.27-2.8A5.76 5.76 0 0 0 11.19 0a5.82 5.82 0 0 0-5.55 4.04 5.76 5.76 0 0 0-3.84 2.79 5.83 5.83 0 0 0 .72 6.84 5.76 5.76 0 0 0 .49 4.73 5.83 5.83 0 0 0 6.27 2.8A5.76 5.76 0 0 0 12.81 24a5.82 5.82 0 0 0 5.55-4.04 5.76 5.76 0 0 0 3.84-2.79 5.83 5.83 0 0 0-.72-6.84zm-8.47 11.88a4.31 4.31 0 0 1-2.77-1 .5.5 0 0 0 .05-.03l4.6-2.66a.74.74 0 0 0 .38-.65v-6.5l1.95 1.12a.07.07 0 0 1 .04.05v5.38a4.33 4.33 0 0 1-4.25 4.29zM3.42 17.57a4.3 4.3 0 0 1-.52-2.89.5.5 0 0 0 .05.03l4.6 2.66a.76.76 0 0 0 .75 0l5.62-3.24v2.24a.07.07 0 0 1-.03.06l-4.65 2.69a4.34 4.34 0 0 1-5.82-1.55zm-1.39-9.49a4.3 4.3 0 0 1 2.24-1.9v5.47a.75.75 0 0 0 .38.65l5.62 3.24-1.95 1.12a.07.07 0 0 1-.07 0L3.6 13.97a4.33 4.33 0 0 1-1.57-5.89zm16.03 3.72-5.62-3.24 1.95-1.13a.07.07 0 0 1 .07 0l4.65 2.68a4.32 4.32 0 0 1-.67 7.8v-5.47a.74.74 0 0 0-.38-.64zM19.9 8.1a.5.5 0 0 0-.05-.03l-4.6-2.66a.76.76 0 0 0-.76 0L8.88 8.65V6.41a.07.07 0 0 1 .03-.06l4.65-2.68a4.32 4.32 0 0 1 6.34 4.43zm-12.22 4-1.95-1.12a.07.07 0 0 1-.04-.05V5.54a4.32 4.32 0 0 1 7.08-3.32.5.5 0 0 0-.05.03L8.13 4.9a.74.74 0 0 0-.38.65zm1.06-2.28 2.5-1.44 2.5 1.44v2.87l-2.5 1.44-2.5-1.44z" />
    </svg>
  )
}

const LETTER_BADGES: Record<string, { bg: string; fg: string; letter: string }> = {
  google: { bg: 'bg-blue-500/15', fg: 'text-blue-400', letter: 'G' },
  anthropic: { bg: 'bg-orange-500/15', fg: 'text-orange-300', letter: 'A' },
  'x-ai': { bg: 'bg-slate-200/15', fg: 'text-slate-100', letter: 'X' },
  deepseek: { bg: 'bg-cyan-500/15', fg: 'text-cyan-400', letter: 'D' },
  qwen: { bg: 'bg-violet-500/15', fg: 'text-violet-300', letter: 'Q' },
}

export function ProviderIcon({ provider, size = 14 }: { provider: string; size?: number }) {
  if (provider === 'openai') return <OpenAISwirl px={size} />

  const badge = LETTER_BADGES[provider] ?? { bg: 'bg-slate-500/15', fg: 'text-slate-400', letter: provider.charAt(0).toUpperCase() }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${badge.bg} ${badge.fg}`}
      style={{ width: size, height: size, fontSize: size * 0.62 }}
    >
      {badge.letter}
    </span>
  )
}
