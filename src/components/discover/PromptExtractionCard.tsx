import { useRef, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { useExtractionModels, useExtractPrompt, useUploadDiscoveryImage } from "@/queries/discovery.queries";
import { fa } from "@/locales/fa";
import type { CreativePromptCatalogItem } from "@/types/api";

type ExtractionResult = CreativePromptCatalogItem & {
  extractedPrompt: string;
  usedModel: { name: string; displayName: string };
};

type SelectionMode = "best_answer" | "cost_optimized";

interface PromptExtractionCardProps {
  onUsePrompt: (item: CreativePromptCatalogItem) => void;
}

// کارت بزرگ «تبدیل عکس به پرامپت» — بالای صفحه‌ی استودیو (DiscoverPage)، قبل از دسته‌بندی‌ها.
// کاربر عکس آپلود می‌کنه → استخراج پرامپت (هزینه‌بردار) → متن پرامپت رو می‌بینه → با یک کلیک
// همون پرامپت رو به‌عنوان selectedCreativePrompt به چت می‌بره (از طریق handleSelectPrompt موجود).
export function PromptExtractionCard({ onUsePrompt }: PromptExtractionCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [used, setUsed] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [autoSelectionMode, setAutoSelectionMode] = useState<SelectionMode>("best_answer");
  const [manualModelId, setManualModelId] = useState<string | null>(null);

  const { data: modelOptions } = useExtractionModels();
  const uploadImage = useUploadDiscoveryImage();
  const extractPrompt = useExtractPrompt();

  const effectiveManualModelId = manualModelId ?? modelOptions?.models[0]?.name ?? null;

  const estimatedCreditCost =
    mode === "manual"
      ? modelOptions?.models.find((m) => m.name === effectiveManualModelId)?.estimatedCreditCost
      : autoSelectionMode === "best_answer"
        ? modelOptions?.auto?.bestAnswer.estimatedCreditCost
        : modelOptions?.auto?.costOptimized.estimatedCreditCost;

  function handleFileSelected(f: File) {
    setError(null);
    setResult(null);
    setFile(f);
    // پیش‌نمایش سمت کلاینت — از exampleImageUrl سرور استفاده نمی‌کنیم چون تا تایید ادمین ۴۰۴ می‌ده
    const objectUrl = URL.createObjectURL(f);
    setPreview(objectUrl);
  }

  function handleExtract() {
    setError(null);
    if (!file) {
      setError(fa.discover.extractPrompt.imageRequiredError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      uploadImage.mutate(dataUrl, {
        onSuccess: (data) => {
          extractPrompt.mutate(
            mode === "manual" && effectiveManualModelId
              ? { imageKey: data.key, modelId: effectiveManualModelId }
              : { imageKey: data.key, selectionMode: autoSelectionMode },
            {
              onSuccess: (res) => setResult(res),
              onError: (err) => setError(extractErrorMessage(err)),
            },
          );
        },
        onError: (err) => setError(extractErrorMessage(err, fa.discover.extractPrompt.uploadFailed)),
      });
    };
    reader.readAsDataURL(file);
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setUsed(false);
  }

  function handleUsePrompt() {
    if (!result) return;
    const { extractedPrompt: _extractedPrompt, ...catalogItem } = result;
    onUsePrompt(catalogItem);
    setUsed(true);
  }

  const isBusy = uploadImage.isPending || extractPrompt.isPending;

  // بعد از استفاده‌ی موفق، کارت رو جمع می‌کنیم تا مرور دسته‌بندی‌ها همیشه زیر یک کارت بزرگ دفن نشه
  if (used && result) {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-slate-800/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">{fa.discover.extractPrompt.title}</p>
          <button
            onClick={handleReset}
            className="rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors"
          >
            {fa.discover.extractPrompt.tryAgainCta}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 md:text-2xl">{fa.discover.extractPrompt.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{fa.discover.extractPrompt.subtitle}</p>

        {!result && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex w-fit gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-xs">
              {(
                [
                  ["auto", fa.discover.extractPrompt.modeAuto],
                  ["manual", fa.discover.extractPrompt.modeManual],
                ] as [typeof mode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 transition-colors",
                    mode === value ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "auto" ? (
              <div className="flex w-fit gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-xs">
                {(
                  [
                    ["best_answer", fa.discover.extractPrompt.bestResultOption],
                    ["cost_optimized", fa.discover.extractPrompt.optimalUsageOption],
                  ] as [SelectionMode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAutoSelectionMode(value)}
                    className={clsx(
                      "rounded-full px-3 py-1.5 transition-colors",
                      autoSelectionMode === value
                        ? "bg-emerald-500/20 text-emerald-300 shadow-sm"
                        : "text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <select
                value={effectiveManualModelId ?? ""}
                onChange={(e) => setManualModelId(e.target.value)}
                className="w-fit rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none"
              >
                {!modelOptions?.models.length && <option>{fa.discover.extractPrompt.selectModelPlaceholder}</option>}
                {modelOptions?.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName} — {m.estimatedCreditCost.toLocaleString("fa-IR")} نیوو
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {typeof estimatedCreditCost === "number" && (
          <p className="mt-2 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            {fa.discover.extractPrompt.costLabel(estimatedCreditCost)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* آپلود عکس / پیش‌نمایش */}
        <div className="md:w-72 shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
              e.target.value = "";
            }}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-700">
              <img src={preview} alt="" className="h-56 w-full object-cover md:h-64" />
              {!result && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isBusy}
                  className="absolute inset-x-0 bottom-0 bg-slate-950/80 py-2 text-xs text-slate-200 hover:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  {fa.discover.extractPrompt.changeImage}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors md:h-64"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9m0 0 3.75 3.75M12 9l-3.75 3.75M3.75 18.75h16.5A2.25 2.25 0 0 0 22.5 16.5V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <span className="text-sm">{fa.discover.extractPrompt.uploadCta}</span>
            </button>
          )}
        </div>

        {/* دکمه‌ی استخراج / نتیجه */}
        <div className="min-w-0 flex-1">
          {result ? (
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-300">{fa.discover.extractPrompt.resultLabel}</p>
                  <p className="text-xs text-slate-500">
                    {fa.discover.extractPrompt.usedModelLabel(result.usedModel.displayName)}
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {result.extractedPrompt}
                </div>
              </div>
              <button
                onClick={handleUsePrompt}
                className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors md:w-auto"
              >
                {fa.discover.extractPrompt.useThisPromptCta}
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3">
              <button
                onClick={handleExtract}
                disabled={!file || isBusy}
                className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 md:w-auto"
              >
                {isBusy
                  ? uploadImage.isPending
                    ? fa.discover.extractPrompt.uploadingImage
                    : fa.discover.extractPrompt.extracting
                  : fa.discover.extractPrompt.extractCta}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
          {result && error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function extractErrorMessage(err: unknown, fallback?: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback ?? fa.discover.extractPrompt.errorGeneric;
}
