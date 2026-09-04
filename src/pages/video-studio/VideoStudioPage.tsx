import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { useModelCatalog } from '@/queries/plans.queries'
import {
  useCreateVideoProject,
  useGenerateCharacters,
  useGenerateStoryboard,
  useRegenerateCharacters,
  useRequestShotVideo,
  useSelectCharacter,
  useSetVideoStudioModels,
  useVideoProject,
  type SetVideoStudioModelsDto,
} from '@/queries/videoStudio.queries'
import { ModelDropdownChip, AspectRatioSegmented } from './ModelPickers'
import {
  CharacterGrid,
  ResultActionBar,
  ShotGrid,
  StudioVideo,
  VideoStudioEmptyState,
  getVideoStudioStage,
  type VideoStudioStage,
} from './VideoStudioGallery'
import { VideoStudioSettingsModal } from './VideoStudioSettingsModal'
import type { StudioAspectRatio, StudioProject } from '@/types/api'

// docs/PRD-video-studio-chat-flow.md — صفحه‌ی واحد استودیوی ویدیو، بدون wizard/استپر. دسکتاپ:
// دو ستون (چت راست / گالری چپ)، هر دو همیشه روی صفحه. موبایل: یک فید تک‌ستونه که گالری مستقیم
// داخل پیام‌های دستیار رندر می‌شود؛ انتخاب مدل/ابعاد از یک آیکون هدر، مدال تمام‌صفحه‌ی انیمیشن‌دار
// دقیقاً به سبک StudioComposer.tsx (استودیوی عکس) باز می‌شود.
//
// این فیچر بر خلاف استودیوی عکس، روی یک Conversation/چت واقعی LLM سوار نیست — بک‌اند فقط
// اکشن‌های مشخص (ساخت پروژه، ساخت کاراکتر، استوری‌برد، رندر هر صحنه) را دارد، نه یک endpoint
// «ارسال پیام» عمومی. پس «گفتگو»ی این صفحه یک فید ثابت از متن‌های راهنمای دستیار + اکشن‌های
// واقعی است (نه چتِ استریم‌شونده) — دقیقاً هم‌راستا با PRD («کاربر مرحله را از متن پیام‌های
// دستیار می‌فهمد»)، فقط بدون یک LLM واقعی پشت این متن‌ها (که چیزی هم در قرارداد بک‌اند برایش
// وجود ندارد).

interface ModelPrefs {
  chatModelId: string | null
  photoModelId: string | null
  videoModelId: string | null
  imageAspectRatio: string | null
  videoAspectRatio: string | null
}

const PREF_KEYS: Record<keyof ModelPrefs, string> = {
  chatModelId: 'nivo:videoStudio:chatModelId',
  photoModelId: 'nivo:videoStudio:photoModelId',
  videoModelId: 'nivo:videoStudio:videoModelId',
  imageAspectRatio: 'nivo:videoStudio:imageAspectRatio',
  videoAspectRatio: 'nivo:videoStudio:videoAspectRatio',
}

function loadPrefs(): ModelPrefs {
  const out = {} as ModelPrefs
  for (const k of Object.keys(PREF_KEYS) as (keyof ModelPrefs)[]) {
    out[k] = localStorage.getItem(PREF_KEYS[k])
  }
  return out
}

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-purple-600 text-xs font-bold text-white shadow-[0_0_14px_rgba(16,185,129,0.25)]">
        AI
      </div>
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-slate-100">{children}</div>
    </div>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row-reverse gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
        ش
      </div>
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-emerald-500/[0.18] bg-emerald-500/[0.14] px-4 py-3 text-[13.5px] leading-relaxed text-emerald-50">
        {children}
      </div>
    </div>
  )
}

// زیر آواتار AI هم‌تراز می‌شود (۳۲پیکسل آواتار + ۱۲پیکسل gap ≈ mr-11)
function UnderAvatar({ children }: { children: ReactNode }) {
  return <div className="mr-11">{children}</div>
}

function TextComposer({
  placeholder,
  onSubmit,
  loading,
  buttonLabel,
}: {
  placeholder: string
  onSubmit: (text: string) => void
  loading: boolean
  buttonLabel: string
}) {
  const [value, setValue] = useState('')
  function submit() {
    if (!value.trim() || loading) return
    onSubmit(value.trim())
    setValue('')
  }
  return (
    <div
      className="flex flex-col gap-2.5 rounded-[22px] p-4"
      style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.05) 0%, rgba(255,255,255,0.025) 100%)', border: '1px solid rgba(16,185,129,0.28)' }}
    >
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        rows={3}
        placeholder={placeholder}
        className="resize-none bg-transparent text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim() || loading}
        className="rounded-full py-3 text-[14px] font-bold text-[#02170f] transition-opacity disabled:opacity-50"
        style={{ background: '#10b981' }}
      >
        {loading ? 'در حال ارسال...' : buttonLabel}
      </button>
    </div>
  )
}

function ActionButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'rounded-full px-4 py-2 text-[12.5px] font-bold text-[#02170f] disabled:opacity-50',
        props.className,
      )}
      style={{ background: '#10b981', ...props.style }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={clsx('rounded-full px-4 py-2 text-[12.5px] font-semibold text-slate-200 disabled:opacity-50', props.className)}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.24)', ...props.style }}
    >
      {children}
    </button>
  )
}

export function VideoStudioPage() {
  const { id } = useParams<{ id?: string }>()
  return <VideoStudioWorkspace key={id ?? 'new'} id={id} />
}

function VideoStudioWorkspace({ id }: { id?: string }) {
  const navigate = useNavigate()
  const { data: catalog } = useModelCatalog()
  const { data: project, isLoading } = useVideoProject(id)

  const [prefs, setPrefs] = useState<ModelPrefs>(() => loadPrefs())
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const [playerVideoKey, setPlayerVideoKey] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const createProject = useCreateVideoProject()
  const setModels = useSetVideoStudioModels(id ?? '')
  const generateCharacters = useGenerateCharacters(id ?? '')
  const regenerateCharacters = useRegenerateCharacters(id ?? '')
  const selectCharacter = useSelectCharacter(id ?? '')
  const generateStoryboard = useGenerateStoryboard(id ?? '')
  const requestShotVideo = useRequestShotVideo(id ?? '')
  const [renderAllPending, setRenderAllPending] = useState(false)

  const chatModels = (catalog ?? []).filter(m => m.modelType === 'CHAT')
  const photoModels = (catalog ?? []).filter(m => m.modelType === 'IMAGE_GEN')
  const videoModels = (catalog ?? []).filter(m => m.modelType === 'VIDEO_GEN')

  const chatModelId = project?.chatModelId ?? prefs.chatModelId
  const photoModelId = project?.photoModelId ?? prefs.photoModelId
  const videoModelId = project?.videoModelId ?? prefs.videoModelId
  const imageAspectRatio = project?.imageAspectRatio ?? prefs.imageAspectRatio
  const videoAspectRatio = project?.videoAspectRatio ?? prefs.videoAspectRatio

  const stage: VideoStudioStage = getVideoStudioStage(project)

  function updateModel(field: keyof ModelPrefs, value: string) {
    localStorage.setItem(PREF_KEYS[field], value)
    setPrefs(prev => ({ ...prev, [field]: value }))
    if (id) setModels.mutate({ [field]: value } as SetVideoStudioModelsDto)
  }

  async function handleCreateProject(text: string) {
    setErrorMsg(null)
    try {
      const created = await createProject.mutateAsync({ initialPrompt: text })
      const toSet: SetVideoStudioModelsDto = {}
      if (prefs.chatModelId) toSet.chatModelId = prefs.chatModelId
      if (prefs.photoModelId) toSet.photoModelId = prefs.photoModelId
      if (prefs.videoModelId) toSet.videoModelId = prefs.videoModelId
      if (prefs.imageAspectRatio) toSet.imageAspectRatio = prefs.imageAspectRatio
      if (prefs.videoAspectRatio) toSet.videoAspectRatio = prefs.videoAspectRatio
      if (Object.keys(toSet).length > 0) {
        await api.patch(`/video-studio/projects/${created.id}/models`, toSet).catch(() => undefined)
      }
      navigate(`/video/${created.id}`)
    } catch {
      setErrorMsg('ساخت پروژه ناموفق بود، دوباره امتحان کن')
    }
  }

  async function handleRenderAll() {
    if (!project) return
    setRenderAllPending(true)
    try {
      const pending = project.shots.filter(s => s.videoStatus === 'NOT_STARTED')
      await Promise.all(pending.map(s => requestShotVideo.mutateAsync(s.id).catch(() => undefined)))
    } finally {
      setRenderAllPending(false)
    }
  }

  // ── فید چت — بازنمایی متنی مراحل + اکشن‌ها. embedGallery=true یعنی گالری هم داخل همین فید
  // رندر شود (موبایل)؛ روی دسکتاپ فقط متن/اکشن است، چون گالری در ستون جدای خودش است.
  function buildFeed(embedGallery: boolean): ReactNode {
    if (!project) {
      return (
        <AssistantBubble>
          سلام! بگو ایده‌ی ویدیویی که می‌خوای بسازیم چیه — تیزر، روایت کوتاه، معرفی محصول یا هرچی تو ذهنته.
        </AssistantBubble>
      )
    }

    const nodes: ReactNode[] = [<UserBubble key="idea">{project.initialPrompt}</UserBubble>]

    if (project.characterOptions.length === 0) {
      nodes.push(
        <AssistantBubble key="ask-character">
          ایده‌ی خوبیه! قبل از هرچی بذار یه کاراکتر برات طراحی کنم — چهار طرح مختلف می‌سازم تا از بینشون انتخاب کنی.
        </AssistantBubble>,
      )
      nodes.push(
        <UnderAvatar key="gen-character-btn">
          <ActionButton disabled={generateCharacters.isPending} onClick={() => generateCharacters.mutate()}>
            {generateCharacters.isPending ? 'در حال طراحی کاراکترها...' : 'ساخت طرح‌های کاراکتر'}
          </ActionButton>
        </UnderAvatar>,
      )
    } else if (project.status === 'DRAFT') {
      nodes.push(
        <AssistantBubble key="pick-character">
          این چهار طرح کاراکتر رو برات ساختم؛ کدومش رو دوست داری؟ اگه هیچ‌کدوم مناسب نبود، «بازطراحی کن» رو بزن.
        </AssistantBubble>,
      )
      if (embedGallery) {
        nodes.push(
          <UnderAvatar key="character-grid">
            <CharacterGrid
              options={project.characterOptions}
              selecting={selectCharacter.isPending}
              onSelect={optId => selectCharacter.mutate(optId)}
              compact
            />
          </UnderAvatar>,
        )
      }
      nodes.push(
        <UnderAvatar key="regen-character-btn">
          <SecondaryButton disabled={regenerateCharacters.isPending} onClick={() => regenerateCharacters.mutate()}>
            {regenerateCharacters.isPending ? 'در حال بازطراحی...' : 'بازطراحی کن'}
          </SecondaryButton>
        </UnderAvatar>,
      )
    } else if (project.shots.length === 0) {
      nodes.push(
        <AssistantBubble key="ask-storyboard">
          عالی! حالا بگو داستان چند صحنه باشه، دیالوگ/موسیقی مدنظرته یا نه، و آخرش چطوری تموم بشه.
        </AssistantBubble>,
      )
    } else if (stage === 'storyboard') {
      nodes.push(
        <AssistantBubble key="storyboard-ready">
          استوری‌بردت آماده‌ست — هر صحنه یک تصویره؛ می‌تونی متن هر صحنه رو ویرایش کنی، بعد بزن «ساخت ویدیو» براش یا برای همه‌ی صحنه‌ها.
        </AssistantBubble>,
      )
      if (embedGallery) {
        nodes.push(
          <UnderAvatar key="shot-grid">
            <ShotGrid projectId={project.id} shots={project.shots} stage={stage} compact onOpenPlayer={setPlayerVideoKey} />
          </UnderAvatar>,
        )
      }
      nodes.push(
        <UnderAvatar key="render-all-btn">
          <ActionButton disabled={renderAllPending} onClick={() => void handleRenderAll()}>
            {renderAllPending ? 'در حال ارسال...' : 'ساخت ویدیوی همه‌ی صحنه‌ها'}
          </ActionButton>
        </UnderAvatar>,
      )
    } else if (stage === 'render') {
      nodes.push(
        <AssistantBubble key="rendering">
          صحنه‌ها دارن رندر می‌شن — می‌تونی این صفحه رو ببندی، وقتی آماده شد بهت اطلاع می‌دیم.
        </AssistantBubble>,
      )
      if (embedGallery) {
        nodes.push(
          <UnderAvatar key="shot-grid-render">
            <ShotGrid projectId={project.id} shots={project.shots} stage={stage} compact onOpenPlayer={setPlayerVideoKey} />
          </UnderAvatar>,
        )
      }
    } else {
      nodes.push(<AssistantBubble key="done">همه‌ی صحنه‌ها آماده‌ست! هر کلیپ رو جدا دانلود کن یا از «تدوین یکجا» برای دانلود پشت‌سرهم همه استفاده کن.</AssistantBubble>)
      if (embedGallery) {
        nodes.push(
          <UnderAvatar key="shot-grid-result">
            <ShotGrid projectId={project.id} shots={project.shots} stage={stage} compact onOpenPlayer={setPlayerVideoKey} />
          </UnderAvatar>,
        )
        nodes.push(
          <UnderAvatar key="result-actions">
            <ResultActionBar shots={project.shots} />
          </UnderAvatar>,
        )
      }
    }

    return <>{nodes}</>
  }

  function getComposer(): { placeholder: string; onSubmit: (text: string) => void; loading: boolean; buttonLabel: string } | null {
    if (!project) {
      return { placeholder: 'ایده‌ی ویدیوتو توصیف کن...', onSubmit: v => void handleCreateProject(v), loading: createProject.isPending, buttonLabel: 'شروع' }
    }
    if (project.status === 'CHARACTER_SELECTED' && project.shots.length === 0) {
      return {
        placeholder: 'مثلاً: ۴ صحنه، بدون دیالوگ با موسیقی آرام، پایان با لبخند کاراکتر...',
        onSubmit: v => generateStoryboard.mutate(v),
        loading: generateStoryboard.isPending,
        buttonLabel: 'ساخت استوری‌برد',
      }
    }
    return null
  }

  const composer = getComposer()

  useEffect(() => {
    if (createProject.isError) setErrorMsg('ساخت پروژه ناموفق بود، دوباره امتحان کن')
  }, [createProject.isError])

  const showPhotoChip = stage === 'character' || stage === 'storyboard'
  const showImageRatio = stage === 'storyboard'
  const showVideoChip = stage === 'render' || stage === 'result'

  return (
    <div className="flex flex-1 flex-col overflow-hidden" style={{ background: '#020C18' }} dir="rtl">
      {/* top bar */}
      <div className="flex shrink-0 items-center justify-between px-5 pt-5 sm:px-10 sm:pt-7">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            aria-label="بازگشت به خانه"
          >
            {/* chevron-right — «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="text-[17px] font-bold text-white">{project?.initialPrompt ? 'استودیوی ویدیو' : 'ساخت ویدیوی جدید'}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* دکمه‌ی تنظیمات مدل/ابعاد — فقط موبایل، مدال تمام‌صفحه‌ی VideoStudioSettingsModal را باز می‌کند */}
          <button
            onClick={() => setMobileSettingsOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full sm:hidden"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            aria-label="مدل‌ها و ابعاد"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/video')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
            style={{ background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.22)', color: '#cbd5e1' }}
            title="پروژه‌ی جدید"
            aria-label="شروع پروژه‌ی جدید"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">در حال بارگذاری پروژه...</div>
      )}

      {!isLoading && (
        <div className="relative flex flex-1 flex-col overflow-hidden sm:flex-row" style={{ padding: '20px 0' }}>
          {/* ── دسکتاپ: ستون چت (راست) ── */}
          <div
            className="hidden shrink-0 flex-col sm:order-1 sm:flex sm:w-[420px] sm:border-t sm:pr-10"
            style={{ borderColor: 'rgba(148,163,184,0.14)' }}
          >
            <div className="mb-4 flex items-center justify-between px-1">
              <span className="text-[12px] font-semibold text-slate-500">مدل چت</span>
              <ModelDropdownChip label="مدل چت" models={chatModels} selectedName={chatModelId} onSelect={v => updateModel('chatModelId', v)} />
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-1 pb-4">
              {buildFeed(false)}
              {errorMsg && <p className="mr-11 text-[12.5px] text-red-400">{errorMsg}</p>}
            </div>
            {composer && (
              <div className="px-1 pt-3">
                <TextComposer {...composer} />
              </div>
            )}
          </div>

          {/* ── دسکتاپ: ستون گالری (چپ) ── */}
          <div className="order-1 hidden flex-1 flex-col overflow-y-auto px-5 pb-6 sm:order-2 sm:flex sm:px-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-[13px]" style={{ color: '#64748b' }}>گالری این پروژه</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {showPhotoChip && (
                  <>
                    <ModelDropdownChip label="مدل عکس" models={photoModels} selectedName={photoModelId} onSelect={v => updateModel('photoModelId', v)} />
                    {showImageRatio && (
                      <AspectRatioSegmented value={imageAspectRatio} onChange={(v: StudioAspectRatio) => updateModel('imageAspectRatio', v)} size="sm" />
                    )}
                  </>
                )}
                {showVideoChip && (
                  <>
                    <ModelDropdownChip label="مدل ویدیو" models={videoModels} selectedName={videoModelId} onSelect={v => updateModel('videoModelId', v)} />
                    <AspectRatioSegmented value={videoAspectRatio} onChange={(v: StudioAspectRatio) => updateModel('videoAspectRatio', v)} size="sm" />
                  </>
                )}
              </div>
            </div>

            {project ? (
              <GalleryBody
                project={project}
                stage={stage}
                selectCharacter={selectCharacter}
                regenerateCharacters={regenerateCharacters}
                onOpenPlayer={setPlayerVideoKey}
              />
            ) : (
              <VideoStudioEmptyState />
            )}
          </div>

          {/* ── موبایل: فید یک‌ستونه ── */}
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-28 sm:hidden">
            <div className="space-y-5 py-2">
              {buildFeed(true)}
              {errorMsg && <p className="mr-11 text-[12.5px] text-red-400">{errorMsg}</p>}
            </div>
          </div>

          {composer && (
            <div
              className="absolute inset-x-0 bottom-0 z-10 sm:hidden"
              style={{ background: 'linear-gradient(0deg, #020C18 60%, transparent)', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', paddingTop: 12 }}
            >
              <div className="px-4">
                <TextComposer {...composer} />
              </div>
            </div>
          )}
        </div>
      )}

      {playerVideoKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPlayerVideoKey(null)}
        >
          <div className="max-h-full max-w-full" onClick={e => e.stopPropagation()}>
            <StudioVideo videoKey={playerVideoKey} className="max-h-[80vh] max-w-full rounded-2xl" />
          </div>
        </div>
      )}

      <VideoStudioSettingsModal
        open={mobileSettingsOpen}
        onClose={() => setMobileSettingsOpen(false)}
        stage={stage}
        chatModels={chatModels}
        photoModels={photoModels}
        videoModels={videoModels}
        chatModelId={chatModelId}
        photoModelId={photoModelId}
        videoModelId={videoModelId}
        imageAspectRatio={imageAspectRatio}
        videoAspectRatio={videoAspectRatio}
        onSelectChatModel={v => updateModel('chatModelId', v)}
        onSelectPhotoModel={v => updateModel('photoModelId', v)}
        onSelectVideoModel={v => updateModel('videoModelId', v)}
        onSelectImageAspectRatio={v => updateModel('imageAspectRatio', v)}
        onSelectVideoAspectRatio={v => updateModel('videoAspectRatio', v)}
      />
    </div>
  )
}

function GalleryBody({
  project,
  stage,
  selectCharacter,
  regenerateCharacters,
  onOpenPlayer,
}: {
  project: StudioProject
  stage: VideoStudioStage
  selectCharacter: ReturnType<typeof useSelectCharacter>
  regenerateCharacters: ReturnType<typeof useRegenerateCharacters>
  onOpenPlayer: (key: string) => void
}) {
  if (stage === 'empty') return <VideoStudioEmptyState />

  if (stage === 'character') {
    return (
      <div className="flex flex-col gap-4">
        <CharacterGrid
          options={project.characterOptions}
          selecting={selectCharacter.isPending}
          onSelect={optId => selectCharacter.mutate(optId)}
        />
        <SecondaryButton
          disabled={regenerateCharacters.isPending}
          onClick={() => regenerateCharacters.mutate()}
          className="self-start"
        >
          {regenerateCharacters.isPending ? 'در حال بازطراحی...' : 'بازطراحی کن'}
        </SecondaryButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ShotGrid projectId={project.id} shots={project.shots} stage={stage} onOpenPlayer={onOpenPlayer} />
      {stage === 'result' && <ResultActionBar shots={project.shots} />}
    </div>
  )
}
