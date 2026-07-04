import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chat.store'
import { useMe } from '@/queries/auth.queries'
import { env } from '@/env'

const STORAGE_KEY = 'nivo:selectedModel'

const MODEL_DISPLAY: Record<string, string> = {
  'openai/gpt-4o-mini': 'GPT-4o mini',
  'openai/gpt-4o': 'GPT-4o',
  'openai/gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4o-mini': 'GPT-4o mini',
  'gpt-4o': 'GPT-4o',
  'gpt-4-turbo': 'GPT-4 Turbo',
}

function displayName(model: string): string {
  return MODEL_DISPLAY[model] ?? model
}

function OpenAIIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400 shrink-0">
      <path d="M22.28 9.28a5.76 5.76 0 0 0-.49-4.73 5.83 5.83 0 0 0-6.27-2.8A5.76 5.76 0 0 0 11.19 0a5.82 5.82 0 0 0-5.55 4.04 5.76 5.76 0 0 0-3.84 2.79 5.83 5.83 0 0 0 .72 6.84 5.76 5.76 0 0 0 .49 4.73 5.83 5.83 0 0 0 6.27 2.8A5.76 5.76 0 0 0 12.81 24a5.82 5.82 0 0 0 5.55-4.04 5.76 5.76 0 0 0 3.84-2.79 5.83 5.83 0 0 0-.72-6.84zm-8.47 11.88a4.31 4.31 0 0 1-2.77-1 .5.5 0 0 0 .05-.03l4.6-2.66a.74.74 0 0 0 .38-.65v-6.5l1.95 1.12a.07.07 0 0 1 .04.05v5.38a4.33 4.33 0 0 1-4.25 4.29zM3.42 17.57a4.3 4.3 0 0 1-.52-2.89.5.5 0 0 0 .05.03l4.6 2.66a.76.76 0 0 0 .75 0l5.62-3.24v2.24a.07.07 0 0 1-.03.06l-4.65 2.69a4.34 4.34 0 0 1-5.82-1.55zm-1.39-9.49a4.3 4.3 0 0 1 2.24-1.9v5.47a.75.75 0 0 0 .38.65l5.62 3.24-1.95 1.12a.07.07 0 0 1-.07 0L3.6 13.97a4.33 4.33 0 0 1-1.57-5.89zm16.03 3.72-5.62-3.24 1.95-1.13a.07.07 0 0 1 .07 0l4.65 2.68a4.32 4.32 0 0 1-.67 7.8v-5.47a.74.74 0 0 0-.38-.64zM19.9 8.1a.5.5 0 0 0-.05-.03l-4.6-2.66a.76.76 0 0 0-.76 0L8.88 8.65V6.41a.07.07 0 0 1 .03-.06l4.65-2.68a4.32 4.32 0 0 1 6.34 4.43zm-12.22 4-1.95-1.12a.07.07 0 0 1-.04-.05V5.54a4.32 4.32 0 0 1 7.08-3.32.5.5 0 0 0-.05.03L8.13 4.9a.74.74 0 0 0-.38.65zm1.06-2.28 2.5-1.44 2.5 1.44v2.87l-2.5 1.44-2.5-1.44z" />
    </svg>
  )
}

export function ModelSelector({ currentModel }: { currentModel?: string }) {
  const { selectedModel, setSelectedModel } = useChatStore()
  const { data: me } = useMe()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const allowedModels: string[] = (me?.subscription?.plan?.allowedModels ?? [env.VITE_DEFAULT_MODEL])

  // pick active: selectedModel if valid for this plan, else fallback to currentModel or default
  const active = allowedModels.includes(selectedModel ?? '')
    ? selectedModel!
    : (currentModel && allowedModels.includes(currentModel) ? currentModel : allowedModels[0])

  // sync store when stale localStorage value is not in this plan
  useEffect(() => {
    if (active && active !== selectedModel) setSelectedModel(active)
  }, [active, selectedModel, setSelectedModel])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(model: string) {
    setSelectedModel(model)
    localStorage.setItem(STORAGE_KEY, model)
    setOpen(false)
  }

  if (allowedModels.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-slate-700/60 px-2.5 py-1">
        <OpenAIIcon />
        <span className="text-xs text-slate-400">{displayName(active)}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-700/60 px-2.5 py-1 hover:bg-slate-700 transition-colors group"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <OpenAIIcon />
        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
          {displayName(active)}
        </span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          className={`w-2.5 h-2.5 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] rounded-xl border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
          {allowedModels.map(model => (
            <button
              key={model}
              onClick={() => select(model)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors
                ${model === active
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
            >
              <OpenAIIcon />
              {displayName(model)}
              {model === active && (
                <svg viewBox="0 0 12 12" fill="none" className="ml-auto w-3 h-3 text-emerald-500 shrink-0">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
