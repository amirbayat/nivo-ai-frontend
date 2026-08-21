import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiscoveryGallery } from "@/queries/discovery.queries";
import { useAuthedImageUrl } from "@/hooks/useAuthedImageUrl";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { fa } from "@/locales/fa";
import type { CreativeGalleryItem } from "@/types/api";

export function GalleryPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useDiscoveryGallery();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-5xl">
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
            <h1 className="text-2xl font-bold text-slate-100">{fa.gallery.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{fa.gallery.subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : !items?.length ? (
          <p className="py-16 text-center text-sm text-slate-600">{fa.gallery.empty}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} onImageClick={setLightboxSrc} />
            ))}
          </div>
        )}
      </div>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} analyticsSource="gallery" />
      )}
    </div>
  );
}

function GalleryCard({ item, onImageClick }: { item: CreativeGalleryItem; onImageClick: (src: string) => void }) {
  const imageKey = item.outputImageKey ? `/v2/discovery/images/${item.outputImageKey}` : "";
  const imageUrl = useAuthedImageUrl(imageKey);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/40">
      {item.outputType === "IMAGE" ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={item.prompt.title}
            onClick={() => onImageClick(imageKey)}
            className="h-48 w-full cursor-pointer object-cover"
          />
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
          <p className="text-[11px] text-slate-600">
            {item.project?.name ?? ''} {item.project?.name ? '·' : ''} {new Date(item.createdAt).toLocaleDateString('fa-IR')}
          </p>
        </div>
      </div>
    </div>
  );
}
