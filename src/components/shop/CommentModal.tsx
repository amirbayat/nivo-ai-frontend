import { useRef, useState } from 'react'
import { fa } from '@/locales/fa'

type CommentMedia = { imageKey?: string; videoKey?: string; audioKey?: string }
type MediaSlot = { key: string; name: string } | null

// docs/PRD-buyer-orders-page-and-direct-order.md بخش ۲.۳ — ثبت نظر مستقیم از روی محصول
// (ShopChatPage's ProductDetailSheet) یا از روی سفارش (ShopOrdersPage)، مستقل از پیام پیگیریِ
// چت فعلی که دست‌نخورده می‌ماند. عیناً همون bottom-sheet موجود (RegisterModal در ShopChatPage.tsx)
// docs/PRD-order-status-chat-tool-and-fulfillment-delay-reviews.md بخش ۳.۴ — قبلاً فقط یک
// فایل‌پیکر عمومی (یک رسانه در هر نوبت) داشت؛ حالا سه دکمه‌ی جدا (عکس/ویدیو/ضبط صدا) تا
// خریدار بتواند هر ترکیبی را با هم پیوست کند، و متن دیگر اجباری نیست (نظر فقط-رسانه هم مجاز است)
export function CommentModal({
  productId,
  onClose,
  onSubmit,
  onUploadMedia,
}: {
  productId?: string
  onClose: () => void
  onSubmit: (
    productId: string | undefined,
    text: string | undefined,
    rating?: number,
    media?: CommentMedia,
  ) => Promise<{ ok: boolean; message: string }>
  onUploadMedia: (file: File) => Promise<{ key: string; kind: 'image' | 'video' | 'audio' } | null>
}) {
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [image, setImage] = useState<MediaSlot>(null)
  const [video, setVideo] = useState<MediaSlot>(null)
  const [audio, setAudio] = useState<MediaSlot>(null)
  const [uploadingKind, setUploadingKind] = useState<'image' | 'video' | 'audio' | null>(null)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const hasAnyMedia = !!(image || video || audio)
  const canSubmit = !busy && uploadingKind === null && (text.trim() || hasAnyMedia)

  async function pickMedia(file: File | undefined, expectedKind: 'image' | 'video') {
    if (!file) return
    setUploadingKind(expectedKind)
    setError(null)
    const res = await onUploadMedia(file)
    setUploadingKind(null)
    if (!res) {
      setError(fa.shop.reviewMediaUploadError)
      return
    }
    const slot = { key: res.key, name: file.name }
    if (res.kind === 'image') setImage(slot)
    else if (res.kind === 'video') setVideo(slot)
    else setAudio(slot)
  }

  // عیناً الگوی toggleRecording در ShopChatPage.tsx، فقط به‌جای sendVoiceMessage (که فوری
  // می‌فرستد) خروجی را مثل بقیه‌ی رسانه‌ها از طریق onUploadMedia آپلود می‌کند
  async function toggleRecordAudio() {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(fa.shop.micNotSupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setUploadingKind('audio')
        setError(null)
        void onUploadMedia(new File([blob], 'review-voice.webm', { type: 'audio/webm' })).then((res) => {
          setUploadingKind(null)
          if (!res) {
            setError(fa.shop.reviewMediaUploadError)
            return
          }
          setAudio({ key: res.key, name: fa.shop.reviewVoiceAttached })
        })
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setError(fa.shop.micNotSupported)
    }
  }

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    const mediaPayload: CommentMedia | undefined = hasAnyMedia
      ? { imageKey: image?.key, videoKey: video?.key, audioKey: audio?.key }
      : undefined
    const res = await onSubmit(productId, text.trim() || undefined, rating ?? undefined, mediaPayload)
    setBusy(false)
    if (res.ok) setDone(true)
    else setError(res.message)
  }

  function slotRow(slot: MediaSlot, onRemove: () => void) {
    if (!slot) return null
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-700 light:border-slate-300 px-3 py-2 text-xs text-slate-300 light:text-slate-700">
        <span className="truncate">{slot.name}</span>
        <button type="button" onClick={onRemove} className="shrink-0 text-red-400 hover:underline">
          {fa.shop.reviewMediaRemove}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 light:border-slate-200 bg-slate-900 light:bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200 light:text-slate-900">{fa.shop.reviewModalTitle}</span>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 light:hover:text-slate-700">
            {fa.common.close}
          </button>
        </div>

        {done ? (
          <p className="py-6 text-center text-sm font-semibold text-emerald-400">{fa.shop.reviewSuccess}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400 light:text-slate-600">{fa.shop.reviewRatingLabel}</span>
            <div dir="ltr" className="mb-1 flex justify-end gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className="text-2xl leading-none"
                >
                  {rating !== null && n <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              dir="auto"
              placeholder={fa.shop.reviewTextPlaceholder}
              className="resize-none rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-white px-3.5 py-2.5 text-sm text-slate-200 light:text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />

            {slotRow(image, () => setImage(null))}
            {slotRow(video, () => setVideo(null))}
            {slotRow(audio, () => setAudio(null))}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickMedia(e.target.files?.[0], 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => void pickMedia(e.target.files?.[0], 'video')}
            />
            <div className="flex gap-2">
              {!image && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingKind !== null}
                  className="flex-1 rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-xs font-medium text-slate-400 light:text-slate-600 disabled:opacity-50"
                >
                  {uploadingKind === 'image' ? fa.shop.reviewMediaUploading : fa.shop.reviewAddImageButton}
                </button>
              )}
              {!video && (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingKind !== null}
                  className="flex-1 rounded-xl border border-dashed border-slate-700 light:border-slate-300 py-2.5 text-xs font-medium text-slate-400 light:text-slate-600 disabled:opacity-50"
                >
                  {uploadingKind === 'video' ? fa.shop.reviewMediaUploading : fa.shop.reviewAddVideoButton}
                </button>
              )}
              {!audio && (
                <button
                  type="button"
                  onClick={() => void toggleRecordAudio()}
                  disabled={uploadingKind !== null}
                  className={`flex-1 rounded-xl border border-dashed py-2.5 text-xs font-medium disabled:opacity-50 ${
                    recording
                      ? 'animate-pulse border-red-500 text-red-400'
                      : 'border-slate-700 light:border-slate-300 text-slate-400 light:text-slate-600'
                  }`}
                >
                  {recording
                    ? fa.shop.reviewRecordingStop
                    : uploadingKind === 'audio'
                      ? fa.shop.reviewMediaUploading
                      : fa.shop.reviewRecordVoiceButton}
                </button>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40"
            >
              {fa.shop.reviewSubmitButton}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
