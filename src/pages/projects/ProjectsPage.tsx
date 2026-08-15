import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/queries/projects.queries";
import { fa } from "@/locales/fa";
import type { Project } from "@/types/api";

type PlatformKey = keyof typeof fa.projects.platforms;

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-100">{fa.projects.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{fa.projects.subtitle}</p>
          </div>
          <button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            {fa.projects.addProject}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : !projects?.length ? (
          <p className="py-16 text-center text-sm text-slate-600">{fa.projects.empty}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => { setEditing(p); setOpen(true); }}
                className="cursor-pointer rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 transition-colors hover:border-slate-600"
              >
                <div className="flex items-center gap-2">
                  {p.brandColor && (
                    <span className="size-3 shrink-0 rounded-full" style={{ background: p.brandColor }} />
                  )}
                  <h3 className="text-sm font-bold text-slate-100">{p.name}</h3>
                </div>
                <p className="mt-1 text-xs text-emerald-400">{fa.projects.platforms[p.platform as PlatformKey]}</p>
                {p.niche && <p className="mt-2 text-xs text-slate-500">{p.niche}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <ProjectModal
          project={editing}
          onClose={() => setOpen(false)}
          onSave={(data) => {
            if (editing) {
              updateProject.mutate({ id: editing.id, data }, { onSuccess: () => setOpen(false) });
            } else {
              createProject.mutate(data as { name: string; platform: string; contextMd: string }, { onSuccess: () => setOpen(false) });
            }
          }}
          onDelete={editing ? () => deleteProject.mutate(editing.id, { onSuccess: () => setOpen(false) }) : undefined}
          saving={createProject.isPending || updateProject.isPending}
        />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: { name: string; platform: string; niche?: string; contextMd: string; brandColor?: string }) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [platform, setPlatform] = useState<PlatformKey>((project?.platform as PlatformKey) ?? "INSTAGRAM");
  const [niche, setNiche] = useState(project?.niche ?? "");
  const [contextMd, setContextMd] = useState(project?.contextMd ?? "");
  const [brandColor, setBrandColor] = useState(project?.brandColor ?? "");

  function handleSave() {
    if (!name.trim() || !contextMd.trim()) return;
    onSave({ name: name.trim(), platform, niche: niche.trim() || undefined, contextMd: contextMd.trim(), brandColor: brandColor.trim() || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-600 hover:text-slate-400 transition-colors"
          aria-label={fa.common.close}
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h3 className="mb-4 text-base font-bold text-slate-100">
          {project ? fa.projects.editProject : fa.projects.addProject}
        </h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.name}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.platform}</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformKey)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
            >
              {Object.entries(fa.projects.platforms).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.niche}</label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.contextMd}</label>
            <textarea
              value={contextMd}
              onChange={(e) => setContextMd(e.target.value)}
              rows={4}
              placeholder={fa.projects.contextMdHint}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.brandColor}</label>
            <input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#10b981"
              dir="ltr"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              {fa.common.delete}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {fa.projects.save}
          </button>
        </div>
      </div>
    </div>
  );
}
