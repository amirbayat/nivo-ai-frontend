import { useNavigate } from 'react-router-dom'
import { useVideoProjects } from '@/queries/videoStudio.queries'

// دقیقاً معادل ImageStudioHistoryDrawer.tsx برای استودیوی ویدیو — لیست پروژه‌های ویدیویی
// کاربر (نه یک فید تخت از تک‌تک shotها، چون واحد کار اینجا هم مثل عکس «گفتگو/پروژه» است).
interface Props {
  open: boolean
  onClose: () => void
}

function projectDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR')
}

export function VideoStudioHistoryDrawer({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { data: projects, isLoading } = useVideoProjects()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1" onClick={onClose} />
      <div
        className="flex h-full w-full max-w-sm shrink-0 flex-col"
        style={{ background: '#080f1e', borderInlineStart: '1px solid rgba(148,163,184,0.16)' }}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
          <span className="text-[15px] font-bold text-white">تاریخچه‌ی استودیوی ویدیو</span>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="بستن"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-7 animate-spin rounded-full border-2 border-slate-600/40" style={{ borderTopColor: '#38bdf8' }} />
            </div>
          ) : !projects || projects.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px]" style={{ color: '#64748b' }}>
              هنوز هیچ پروژه‌ی ویدیویی نساختی
            </p>
          ) : (
            projects.map(project => {
              const succeeded = project.shots.filter(s => s.videoStatus === 'SUCCEEDED').length
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    navigate(`/video/${project.id}`)
                    onClose()
                  }}
                  className="mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-right transition-colors hover:bg-white/[0.05]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-slate-200">
                      {project.initialPrompt || 'بدون عنوان'}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: '#64748b' }}>
                      {projectDateLabel(project.createdAt)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.24)', color: '#7dd3fc' }}
                  >
                    {succeeded > 0 ? `${succeeded} ویدیو` : 'پیش‌نویس'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
