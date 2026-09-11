import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useFeatureFlags } from '@/queries/config.queries'
import { useModelCatalog } from '@/queries/plans.queries'
import { useChatStore } from '@/store/chat.store'
import { useToastStore } from '@/store/toast.store'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { resizeImage } from '@/components/chat/MessageInput'
import { WebSearchToggle } from '@/components/chat/WebSearchToggle'
import {
  classifyAttachment,
  composerAccept,
  modelInputCaps,
} from '@/lib/chat-attachments'
import { fa } from '@/locales/fa'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('file read failed'))
    reader.readAsDataURL(file)
  })
}

export function ChatHeroComposer({ onSend, disabled }: {
  onSend: (
    content: string,
    images?: string[],
    imageModel?: string,
    preserveFace?: boolean,
    files?: { data: string; filename: string }[],
  ) => void
  disabled?: boolean
}) {
  const { data: flags } = useFeatureFlags()
  const { data: catalog } = useModelCatalog()
  const MAX_IMAGES = flags?.maxImagesPerMessage ?? 4
  const MAX_SIZE_BYTES = (flags?.maxImageSizeMb ?? 8) * 1024 * 1024
  const MAX_FILES = flags?.maxFilesPerMessage ?? 3
  const MAX_FILE_SIZE_BYTES = (flags?.maxFileSizeMb ?? 10) * 1024 * 1024
  const MAX_VIDEO_SIZE_BYTES = (flags?.maxVideoSizeMb ?? 12) * 1024 * 1024
  const MAX_AUDIO_SIZE_BYTES = (flags?.maxAudioSizeMb ?? 10) * 1024 * 1024
  const { thinkingMode, setThinkingMode, selectedModel } = useChatStore()
  const inputCaps = useMemo(
    () => modelInputCaps(selectedModel, catalog),
    [selectedModel, catalog],
  )
  const isTouchDevice = useIsTouchDevice()

  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [files, setFiles] = useState<{ data: string; filename: string; size: number }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = (value.trim() || images.length > 0 || files.length > 0) && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(
      value.trim(),
      images.length ? images : undefined,
      undefined,
      true,
      files.length ? files.map(({ data, filename }) => ({ data, filename })) : undefined,
    )
    setValue('')
    setImages([])
    setFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22
    const maxHeight = lineHeight * 4
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return
    const all = Array.from(fileList)
    const imageFiles = all.filter(f => classifyAttachment(f) === 'image')
    const docFiles = all.filter(f => classifyAttachment(f) === 'doc')
    const videoFiles = all.filter(f => classifyAttachment(f) === 'video')
    const audioFiles = all.filter(f => classifyAttachment(f) === 'audio')
    const unknown = all.filter(f => classifyAttachment(f) === 'unknown')

    const remainingImages = MAX_IMAGES - images.length
    const imageResults: string[] = []
    let failedImages = 0
    for (const file of imageFiles.slice(0, remainingImages)) {
      if (file.size > MAX_SIZE_BYTES) continue
      try { imageResults.push(await resizeImage(file)) } catch { failedImages++ }
    }
    if (imageResults.length) setImages(prev => [...prev, ...imageResults].slice(0, MAX_IMAGES))

    const remainingFiles = MAX_FILES - files.length
    const extraResults: { data: string; filename: string; size: number }[] = []
    let oversized = 0
    let unsupported = 0
    const pushFile = async (file: File, maxBytes: number, allowed: boolean) => {
      if (!allowed) { unsupported++; return }
      if (remainingFiles - extraResults.length <= 0) return
      if (file.size > maxBytes) { oversized++; return }
      try {
        extraResults.push({ data: await readAsDataUrl(file), filename: file.name, size: file.size })
      } catch { oversized++ }
    }
    for (const file of docFiles) await pushFile(file, MAX_FILE_SIZE_BYTES, true)
    for (const file of videoFiles) await pushFile(file, MAX_VIDEO_SIZE_BYTES, inputCaps.video)
    for (const file of audioFiles) await pushFile(file, MAX_AUDIO_SIZE_BYTES, inputCaps.audio)
    if (extraResults.length) setFiles(prev => [...prev, ...extraResults].slice(0, MAX_FILES))

    if (fileRef.current) fileRef.current.value = ''
    if (failedImages > 0) useToastStore.getState().addToast(fa.chat.imageProcessFailed(failedImages))
    if (oversized > 0) useToastStore.getState().addToast(fa.chatFiles.tooLargeToast(flags?.maxFileSizeMb ?? 10))
    if (unsupported > 0 || unknown.length > 0) {
      useToastStore.getState().addToast(fa.chatFiles.unsupportedForModel)
    }
  }

  return (
    <div className="flex w-full max-w-[760px] flex-col items-center">
      <div className="mb-3.5 flex flex-wrap items-center justify-center gap-2">
        <div
          className="flex gap-1.5 rounded-full p-[5px]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.18)' }}
        >
          <button
            type="button"
            onClick={() => setThinkingMode('fast')}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold"
            style={thinkingMode === 'fast' ? { background: 'rgba(124,58,237,0.16)', color: '#c4b5fd' } : { color: '#64748b' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            سریع
          </button>
          <button
            type="button"
            onClick={() => setThinkingMode('smart')}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold"
            style={thinkingMode === 'smart' ? { background: 'rgba(124,58,237,0.16)', color: '#c4b5fd' } : { color: '#64748b' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
            </svg>
            با تفکر
          </button>
        </div>
        <WebSearchToggle disabled={disabled} />
      </div>

      {images.length > 0 && (
        <div className="mb-2 flex w-full flex-wrap gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="group relative">
              <img src={src} className="size-14 rounded-xl border border-slate-600 object-cover" alt={`عکس پیوست‌شده ${idx + 1}`} />
              <button
                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs leading-none text-slate-300 hover:text-white"
                aria-label="حذف عکس"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex w-full flex-wrap gap-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/60 px-2.5 py-1.5"
            >
              <span className="max-w-[9rem] truncate text-xs text-slate-300">{f.filename}</span>
              <button
                onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                className="text-slate-500 hover:text-red-400 text-xs leading-none"
                aria-label={fa.chatFiles.remove}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex w-full items-end gap-3 rounded-[26px] p-2.5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,58,237,0.32)', boxShadow: '0 0 50px rgba(124,58,237,0.08)' }}
      >
        <button
          onClick={submit}
          disabled={!canSend}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: '#7c3aed', color: '#fff', opacity: canSend ? 1 : 0.6 }}
          aria-label="ارسال"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={onInput}
          disabled={disabled}
          placeholder="پیامتو بنویس، یا فایل و عکس ضمیمه کن..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          style={{ minHeight: 24 }}
        />

        <input
          ref={fileRef}
          type="file"
          accept={composerAccept(inputCaps)}
          multiple
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={disabled || (images.length >= MAX_IMAGES && files.length >= MAX_FILES)}
          onClick={() => fileRef.current?.click()}
          className="flex shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          style={{ width: 38, height: 38, color: '#94a3b8' }}
          aria-label={fa.chatFiles.attachLabel}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
