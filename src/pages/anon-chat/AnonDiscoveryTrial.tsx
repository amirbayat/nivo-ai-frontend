import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAnonDiscoveryStatus, useAnonUploadDiscoveryImage, useAnonGenerateCreative } from '@/queries/anonDiscovery.queries'
import { fireAnonCtaClick } from '@/queries/anonChat.queries'
import { fa } from '@/locales/fa'
import type { CreativePromptCatalogItem, AnonCreativeGenerationResult } from '@/types/api'

// پنل امتحان رایگان یک‌باره‌ی استودیو محتوا برای کاربر مهمان — وقتی از DiscoverPage یک سبک
// انتخاب می‌کند و هنوز لاگین نکرده، به‌جای UI چت معمولی (AnonChatPage) همین پنل رندر می‌شود.
// برخلاف چت مهمان (۱۰ پیام رایگان روزانه)، اینجا gate یک‌بارمصرف است — سرور (AnonymousIdentity.
// discoveryTrialUsedAt) منبع حقیقت است، نه state این کامپوننت، پس رفرش/بازگشت هم وضعیت
// «مصرف‌شده» را درست نشان می‌دهد.
export function AnonDiscoveryTrial({ prompt, onExit }: { prompt: CreativePromptCatalogItem; onExit: () => void }) {
  const navigate = useNavigate()
  const { data: status, isLoading: statusLoading } = useAnonDiscoveryStatus()
  const [userInput, setUserInput] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [result, setResult] = useState<AnonCreativeGenerationResult | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadImage = useAnonUploadDiscoveryImage()
  const generate = useAnonGenerateCreative()

  const onSignup = () => {
    fireAnonCtaClick()
    navigate('/login')
  }

  function handleFileSelected(file: File) {
    setImageError(null)
    setImageKey(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImagePreview(dataUrl)
      uploadImage.mutate(dataUrl, {
        onSuccess: data => setImageKey(data.key),
        onError: () => {
          setImageError(fa.discover.uploadImageFailed)
          setImagePreview(null)
        },
      })
    }
    reader.readAsDataURL(file)
  }

  function handleGenerate() {
    setGenerateError(null)
    if (prompt.requiresUserImage && !imageKey) {
      setImageError(fa.discover.imageRequiredError)
      return
    }
    generate.mutate(
      { promptId: prompt.id, userInput: userInput.trim() || undefined, inputImageKeys: imageKey ? [imageKey] : undefined },
      {
        onSuccess: data => setResult(data),
        onError: err => {
          const code = axios.isAxiosError(err) ? (err.response?.data as { code?: string } | undefined)?.code : undefined
          if (code !== 'discovery_trial_used') setGenerateError(fa.discover.generateFailed)
        },
      },
    )
  }

  // نتیجه‌ای که همین الان گرفتیم همیشه نمایش داده می‌شود، حتی بعد از این‌که رفرش وضعیت
  // (invalidate در useAnonGenerateCreative) سرور را «مصرف‌شده» نشان می‌دهد — وگرنه نتیجه‌ی
  // تازه‌ی کاربر جلوی چشمش با بنر ثبت‌نام جایگزین می‌شد
  const trialUsed = !statusLoading && status?.available === false && !result

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/discover')}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {fa.discover.anonTrialBackToStudio}
          </button>
          <button
            onClick={onExit}
            aria-label={fa.discover.exitStyleMode}
            className="flex size-6 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {trialUsed ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 text-center">
            <p className="text-base font-semibold text-slate-100">{fa.discover.anonTrialUsedTitle}</p>
            <p className="mt-2 text-sm text-slate-400">{fa.discover.anonTrialUsedMessage}</p>
            <button
              onClick={onSignup}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              {fa.discover.anonTrialSignupCta}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              {prompt.outputType === 'IMAGE' && prompt.exampleImageUrl && (
                <img src={prompt.exampleImageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-emerald-400/80">{fa.discover.selectedStyleLabel}</p>
                <p className="truncate text-sm font-semibold text-slate-100">{prompt.title}</p>
                <p className="mt-0.5 text-xs text-emerald-400">{fa.discover.anonFreeLabel}</p>
              </div>
            </div>

            {!result && (
              <>
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder={fa.discover.inputPlaceholder}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />

                {prompt.requiresUserImage && (
                  <div className="mt-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelected(file)
                        e.target.value = ''
                      }}
                    />
                    {imagePreview ? (
                      <div className="relative inline-block overflow-hidden rounded-lg border border-slate-700">
                        <img src={imagePreview} alt="" className="h-16 w-16 object-cover" />
                        {uploadImage.isPending && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                            <div className="size-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                          </div>
                        )}
                        {imageKey && !uploadImage.isPending && (
                          <button
                            onClick={() => { setImagePreview(null); setImageKey(null) }}
                            className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-0.5 text-[10px] text-slate-300 hover:text-red-400 transition-colors"
                          >
                            {fa.discover.removeImage}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                      >
                        {fa.discover.uploadImageLabel}
                      </button>
                    )}
                    {imageError && <p className="mt-1 text-[11px] text-red-400">{imageError}</p>}
                  </div>
                )}

                {generateError && <p className="mt-2 text-xs text-red-400">{generateError}</p>}

                <button
                  onClick={handleGenerate}
                  disabled={generate.isPending || uploadImage.isPending}
                  className="mt-3 w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors"
                >
                  {generate.isPending ? fa.discover.generating : fa.discover.generate}
                </button>
              </>
            )}

            {result && (
              <>
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-2 text-[11px] font-medium text-emerald-400/80">{fa.discover.resultTitle}</p>
                  {result.outputType === 'TEXT' && result.outputText ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result.outputText}</p>
                  ) : result.outputImageDataUrl ? (
                    <img src={result.outputImageDataUrl} alt={prompt.title} className="max-w-full rounded-xl" />
                  ) : null}
                </div>

                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                  <p className="text-xs text-emerald-300">{fa.discover.anonTrialUsedMessage}</p>
                  <button
                    onClick={onSignup}
                    className="mt-2 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
                  >
                    {fa.discover.anonTrialSignupCta}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
