import { useState } from "react";
import { StylePickerPanel } from "@/components/projects/StylePickerPanel";
import { fa } from "@/locales/fa";
import type { CreativePromptCatalogItem, Project } from "@/types/api";

export type PlatformKey = keyof typeof fa.projects.platforms;

export interface ProjectModalSaveData {
  name: string;
  platform: string;
  niche?: string;
  contextMd: string;
  brandColor?: string;
  pinnedPromptId?: string;
}

// فرم ساخت/ویرایش پروژه — هم از ProjectsPage (ساخت پروژه‌ی جدید) و هم از ProjectDetailPage
// (دکمه‌ی «تنظیمات پروژه» توی workspace) استفاده می‌شه، تا فرم دوباره تکرار نشه.
export function ProjectModal({
  project,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (data: ProjectModalSaveData) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [platform, setPlatform] = useState<PlatformKey>((project?.platform as PlatformKey) ?? "INSTAGRAM");
  const [niche, setNiche] = useState(project?.niche ?? "");
  const [contextMd, setContextMd] = useState(project?.contextMd ?? "");
  const [brandColor, setBrandColor] = useState(project?.brandColor ?? "");

  // پین‌کردن سبک اینجا فقط local state است — واقعاً موقع «ذخیره» به سرور فرستاده می‌شه (create/update)
  const [pinnedPromptId, setPinnedPromptId] = useState<string | null>(project?.pinnedPromptId ?? null);
  const [pinnedPreview, setPinnedPreview] = useState<Project["pinnedPrompt"]>(project?.pinnedPrompt ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSave() {
    if (!name.trim() || !contextMd.trim()) return;
    onSave({
      name: name.trim(),
      platform,
      niche: niche.trim() || undefined,
      contextMd: contextMd.trim(),
      brandColor: brandColor.trim() || undefined,
      pinnedPromptId: pinnedPromptId ?? undefined,
    });
  }

  function handlePick(item: CreativePromptCatalogItem) {
    setPinnedPromptId(item.id);
    setPinnedPreview({
      id: item.id,
      title: item.title,
      exampleImageUrl: item.exampleImageUrl,
      creditCost: item.creditCost,
      outputType: item.outputType,
    });
    setPickerOpen(false);
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
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
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

          <div>
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.pinnedStyleLabel}</label>
            {pickerOpen ? (
              <div className="flex flex-col gap-2">
                <StylePickerPanel onPick={handlePick} />
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="self-start text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {fa.projects.cancelPick}
                </button>
              </div>
            ) : pinnedPreview ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                {pinnedPreview.exampleImageUrl && (
                  <img src={pinnedPreview.exampleImageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{pinnedPreview.title}</p>
                  <p className="mt-0.5 text-xs text-emerald-400">{fa.discover.creditCost(pinnedPreview.creditCost)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                >
                  {fa.projects.changeStyleCta}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 p-3 text-center">
                <p className="mb-2 text-xs text-slate-500">{fa.projects.noStyleYet}</p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                >
                  {fa.projects.pickStyleCta}
                </button>
              </div>
            )}
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
