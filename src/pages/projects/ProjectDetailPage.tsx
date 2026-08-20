import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProject, useUpdateProject, useDeleteProject } from "@/queries/projects.queries";
import { useDiscoveryGallery, useGenerateCreative, useProjectCustomizations } from "@/queries/discovery.queries";
import { useAuthedImageUrl } from "@/hooks/useAuthedImageUrl";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { StylePickerPanel } from "@/components/projects/StylePickerPanel";
import { fa } from "@/locales/fa";
import type { CreativeGalleryItem, CreativePromptCatalogItem } from "@/types/api";

// ورک‌اسپیس یک پروژه — سبک پین‌شده رو یک بار انتخاب می‌کنی، بعد هر بار فقط یک متن
// شخصی‌سازی (اختیاری) می‌نویسی و «تولید عکس جدید» می‌زنی؛ پرامپت پایه‌ی زیرین هیچ‌وقت به
// فرانت برنمی‌گرده — سرور خودش موقع generate آن را با pinnedPromptId ترکیب می‌کند.
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id ?? "");
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const generate = useGenerateCreative();
  const { data: gallery, isLoading: galleryLoading } = useDiscoveryGallery(id);
  const { data: customizations } = useProjectCustomizations(id ?? "");

  const [customization, setCustomization] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950" dir="rtl">
        <p className="text-sm text-slate-500">{fa.projects.notFound}</p>
        <button
          onClick={() => navigate("/projects")}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
        >
          {fa.projects.workspaceBack}
        </button>
      </div>
    );
  }

  function handlePick(item: CreativePromptCatalogItem) {
    if (!project) return;
    updateProject.mutate({ id: project.id, data: { pinnedPromptId: item.id } });
  }

  function handleGenerate() {
    if (!project?.pinnedPromptId) return;
    generate.mutate(
      { promptId: project.pinnedPromptId, projectId: project.id, userInput: customization.trim() || undefined },
      { onSuccess: () => setCustomization("") },
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/projects")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-colors"
            aria-label={fa.common.back}
          >
            {/* chevron-right — دکمه‌ی «بازگشت» در RTL باید رو به راست اشاره کند (CLAUDE.md) */}
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {project.brandColor && (
                <span className="size-3 shrink-0 rounded-full" style={{ background: project.brandColor }} />
              )}
              <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{fa.projects.platforms[project.platform as keyof typeof fa.projects.platforms]}</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100 transition-colors"
          >
            {fa.projects.settingsCta}
          </button>
        </div>

        {/* سبک پین‌شده */}
        <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-100">{fa.projects.pinnedStyleLabel}</h2>
          {project.pinnedPrompt ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
              {project.pinnedPrompt.exampleImageUrl && (
                <img src={project.pinnedPrompt.exampleImageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{project.pinnedPrompt.title}</p>
                <p className="mt-0.5 text-xs text-emerald-400">{fa.discover.creditCost(project.pinnedPrompt.creditCost)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
              >
                {fa.projects.changeStyleCta}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-xs text-slate-500">{fa.projects.noStyleHint}</p>
              <StylePickerPanel onPick={handlePick} disabled={updateProject.isPending} />
              {updateProject.isError && <p className="mt-2 text-xs text-red-400">{fa.projects.pinFailed}</p>}
            </div>
          )}
        </div>

        {/* تولید عکس جدید */}
        {project.pinnedPrompt && (
          <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
            <label className="mb-1 block text-xs text-slate-500">{fa.projects.customizationLabel}</label>
            <textarea
              value={customization}
              onChange={(e) => setCustomization(e.target.value)}
              placeholder={fa.projects.customizationPlaceholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />

            {!!customizations?.length && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-slate-500">{fa.projects.pastCustomizationsTitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {customizations.map((c, i) => (
                    <button
                      key={`${c.text}-${i}`}
                      type="button"
                      onClick={() => setCustomization(c.text)}
                      className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {generate.isError && <p className="mt-2 text-xs text-red-400">{fa.projects.generateFailed}</p>}

            <button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {generate.isPending ? fa.projects.generating : fa.projects.generateNew}
            </button>
          </div>
        )}

        {/* گالری این پروژه */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-100">{fa.projects.galleryTitle}</h2>
          {galleryLoading ? (
            <div className="flex justify-center py-12">
              <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : !gallery?.length ? (
            <p className="py-12 text-center text-sm text-slate-600">{fa.projects.galleryEmpty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((item) => (
                <ProjectGalleryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {settingsOpen && (
        <ProjectModal
          project={project}
          onClose={() => setSettingsOpen(false)}
          onSave={(data) => {
            updateProject.mutate(
              { id: project.id, data },
              { onSuccess: () => setSettingsOpen(false) },
            );
          }}
          onDelete={() => {
            deleteProject.mutate(project.id, { onSuccess: () => navigate("/projects") });
          }}
          saving={updateProject.isPending}
        />
      )}
    </div>
  );
}

function ProjectGalleryCard({ item }: { item: CreativeGalleryItem }) {
  const imageUrl = useAuthedImageUrl(item.outputImageKey ? `/v2/discovery/images/${item.outputImageKey}` : "");

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
      {item.outputType === "IMAGE" ? (
        imageUrl ? (
          <img src={imageUrl} alt={item.prompt.title} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-slate-800/60">
            <div className="size-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        )
      ) : (
        <p className="line-clamp-6 whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-300">
          {item.outputText}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-200">{item.prompt.title}</p>
          <p className="text-[11px] text-slate-600">{new Date(item.createdAt).toLocaleDateString("fa-IR")}</p>
        </div>
      </div>
    </div>
  );
}
