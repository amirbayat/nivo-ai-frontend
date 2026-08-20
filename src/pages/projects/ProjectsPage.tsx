import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject } from "@/queries/projects.queries";
import { ProjectModal, type PlatformKey } from "@/components/projects/ProjectModal";
import { fa } from "@/locales/fa";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();

  // این مودال دیگر فقط برای «ساخت پروژه‌ی جدید» استفاده می‌شه — ویرایش/حذف پروژه‌ی موجود
  // به workspace اختصاصی‌اش (/projects/:id → ProjectDetailPage → دکمه‌ی تنظیمات) منتقل شده
  const [open, setOpen] = useState(false);

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
            onClick={() => setOpen(true)}
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
                onClick={() => navigate(`/projects/${p.id}`)}
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
                {p.pinnedPrompt && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
                    {p.pinnedPrompt.exampleImageUrl && (
                      <img src={p.pinnedPrompt.exampleImageUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />
                    )}
                    <p className="truncate text-xs text-slate-400">{p.pinnedPrompt.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <ProjectModal
          project={null}
          onClose={() => setOpen(false)}
          onSave={(data) => {
            createProject.mutate(
              { name: data.name, platform: data.platform, niche: data.niche, contextMd: data.contextMd, brandColor: data.brandColor, pinnedPromptId: data.pinnedPromptId },
              { onSuccess: () => setOpen(false) },
            );
          }}
          saving={createProject.isPending}
        />
      )}
    </div>
  );
}
