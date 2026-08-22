import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthedImageUrl } from '@/hooks/useAuthedImageUrl'
import { useFoodLogs, useScanFood } from '@/queries/nivoCal.queries'
import { NutritionResultCard } from '@/components/nivo-cal/NutritionResultCard'
import { fa } from '@/locales/fa'
import type { NivoCalLog, NivoCalScanResult } from '@/types/api'

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const MAX_DIM = 1024
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject
    img.src = url
  })
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fa.nivoCal.errorGeneric
}

export function NivoCalPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NivoCalScanResult | null>(null)
  const [scanningStep, setScanningStep] = useState(0)

  const scanFood = useScanFood()
  const { data: logs, isLoading: logsLoading } = useFoodLogs()

  useEffect(() => {
    if (!scanFood.isPending) return
    const interval = setInterval(() => {
      setScanningStep(s => (s + 1) % fa.nivoCal.scanning.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [scanFood.isPending])

  function handleFileSelected(file: File) {
    setError(null)
    setResult(null)
    resizeImage(file)
      .then(dataUrl => {
        setPreview(dataUrl)
        setScanningStep(0)
        scanFood.mutate(
          { image: dataUrl },
          {
            onSuccess: res => setResult(res),
            onError: err => setError(extractErrorMessage(err)),
          },
        )
      })
      .catch(() => setError(fa.nivoCal.errorGeneric))
  }

  function handleReset() {
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
            aria-label={fa.common.back}
          >
            {/* chevron-right — دکمه‌ی «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{fa.nivoCal.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{fa.nivoCal.subtitle}</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileSelected(file)
          }}
        />

        {!preview && (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 py-14 transition-colors hover:border-emerald-500/50 hover:bg-slate-800/50"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" className="size-7">
                <path d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-200">{fa.nivoCal.uploadCta}</span>
            <span className="text-xs text-slate-500">{fa.nivoCal.uploadHint}</span>
          </button>
        )}

        {preview && scanFood.isPending && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-800/40 py-14">
            <img src={preview} alt="" className="size-24 rounded-xl object-cover opacity-60" />
            <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400">{fa.nivoCal.scanning[scanningStep]}</p>
          </div>
        )}

        {preview && !scanFood.isPending && result && (
          <div className="space-y-4">
            <NutritionResultCard result={result} imageUrl={preview} />
            <button
              onClick={handleReset}
              className="w-full rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
            >
              {fa.nivoCal.scanAnother}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={handleReset}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
            >
              {fa.nivoCal.retry}
            </button>
          </div>
        )}

        <div className="mt-10">
          <h2 className="mb-3 text-sm font-bold text-slate-300">{fa.nivoCal.historyTitle}</h2>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : !logs?.length ? (
            <p className="py-8 text-center text-sm text-slate-600">{fa.nivoCal.historyEmpty}</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => <FoodLogRow key={log.id} log={log} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FoodLogRow({ log }: { log: NivoCalLog }) {
  const imageUrl = useAuthedImageUrl(log.imageUrl)
  const title = log.isFood ? log.items.map(it => it.nameFa).join('، ') : fa.nivoCal.notFoodTitle

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="size-12 shrink-0 rounded-lg bg-slate-700/50" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">
          {new Date(log.createdAt).toLocaleDateString('fa-IR')}
        </p>
      </div>
      {log.isFood && (
        <span className="shrink-0 text-sm font-bold text-slate-100" dir="ltr">~{log.totalCalories}</span>
      )}
    </div>
  )
}
