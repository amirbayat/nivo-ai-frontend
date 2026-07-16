import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import {
  usePlans,
  useInitiatePayment,
  useEnabledGateways,
  useValidateDiscountCode,
  useModelCatalog,
  type PaymentGatewayName,
} from "@/queries/plans.queries";
import { useMe } from "@/queries/auth.queries";
import { SalesChatbot } from "@/components/sales/SalesChatbot";
import { env } from "@/env";
import { ExitIntentModal } from "@/components/sales/ExitIntentModal";
import { GatewayPickerModal } from "@/components/payment/GatewayPickerModal";
import { WalletTopupModal } from "@/components/payment/WalletTopupModal";
import { ModelShowcase } from "@/components/models/ModelShowcase";
import { ProviderIcon } from "@/components/models/ProviderIcon";
import { PlanLimitsTable } from "@/components/plans/PlanLimitsTable";
import { fa } from "@/locales/fa";
import {
  PLAN_TIER_MODEL_DESCRIPTIONS,
  dailyLimitText,
  supportText,
  imageGenSupport,
  imageGenCardText,
  upgradePreviewAmount,
} from "@/lib/plan-copy";
import type { Plan } from "@/types/api";

const DEFAULT_PAYG_PRESETS = [1_000_000, 2_000_000, 5_000_000];

export function PricingPage() {
  const { data: plans, isLoading } = usePlans();
  const { data: me } = useMe();
  const { data: gateways } = useEnabledGateways();
  const { data: modelCatalog } = useModelCatalog();
  const initPayment = useInitiatePayment();
  const navigate = useNavigate();
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [paygTopupOpen, setPaygTopupOpen] = useState(false);

  const regularPlans = plans?.filter((p) => !p.isPayAsYouGo);
  const paygPlan = plans?.find((p) => p.isPayAsYouGo);
  const isCurrentPayg = paygPlan && paygPlan.id === me?.subscription?.planId;

  // docs/PRD-plan-image-capability-and-upgrade.md بخش ۶.۱ — وقتی کاربر یک سابسکریپشن معمولی
  // (نه PAYG) فعال دارد، فقط پلن گران‌تر قابل‌خرید است؛ همین قانون سمت سرور (initiate) هم اعمال
  // می‌شود — این‌جا فقط برای غیرفعال‌کردن دکمه‌ها/پیش‌نمایش قیمت است.
  const currentSub = me?.subscription;
  const hasActiveRegularPlan = Boolean(
    currentSub &&
      currentSub.status === "ACTIVE" &&
      new Date(currentSub.periodEnd) > new Date() &&
      !currentSub.plan.isPayAsYouGo,
  );

  const currentPlanId = me?.subscription?.planId;
  const [discountCode, setDiscountCode] = useState("");
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const validateDiscount = useValidateDiscountCode();

  // اعمال‌شده فقط تا وقتی معتبره که کد تغییر نکرده باشه — با هر ادیت باید دوباره اعمال بشه
  function onDiscountInputChange(value: string) {
    setDiscountCode(value);
    if (appliedDiscount && value.trim() !== appliedDiscount.code) setAppliedDiscount(null);
    validateDiscount.reset();
  }

  function handleApplyDiscount() {
    const code = discountCode.trim();
    if (!code) return;
    validateDiscount.mutate(code, {
      onSuccess: ({ discountPercent }) => setAppliedDiscount({ code, percent: discountPercent }),
    });
  }

  const activeDiscountPercent = appliedDiscount?.code === discountCode.trim() ? appliedDiscount.percent : 0;

  function handleBuy(planId: string) {
    const code = activeDiscountPercent > 0 ? discountCode.trim() : undefined;
    if ((gateways?.length ?? 0) > 1) {
      setPendingPlanId(planId);
      return;
    }
    initPayment.mutate({ planId, gateway: gateways?.[0], discountCode: code });
  }

  function handleGatewaySelect(gateway: PaymentGatewayName) {
    if (!pendingPlanId) return;
    const code = activeDiscountPercent > 0 ? discountCode.trim() : undefined;
    initPayment.mutate({ planId: pendingPlanId, gateway, discountCode: code });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-slate-100">
            {fa.plans.title}
          </h1>
          <p className="mt-2 text-slate-500">{fa.plans.subtitle}</p>
        </div>

        <div className="mb-6 flex flex-col items-center gap-2">
          {showDiscountInput ? (
            <div className="flex w-full max-w-xs items-center gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => onDiscountInputChange(e.target.value)}
                placeholder="کد تخفیف"
                dir="ltr"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleApplyDiscount}
                disabled={!discountCode.trim() || validateDiscount.isPending || activeDiscountPercent > 0}
                className="shrink-0 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                {validateDiscount.isPending ? "..." : activeDiscountPercent > 0 ? "اعمال شد ✓" : "اعمال"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDiscountInput(true)}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              کد تخفیف داری؟
            </button>
          )}
          {activeDiscountPercent > 0 && (
            <p className="text-xs text-emerald-400">{activeDiscountPercent}٪ تخفیف روی همه‌ی پلن‌ها اعمال شد</p>
          )}
          {validateDiscount.isError && (
            <p className="text-xs text-red-400">کد تخفیف نامعتبر یا منقضی‌شده است</p>
          )}
        </div>

        <div
          className="grid gap-6 md:grid-cols-3"
          role="list"
          aria-label="پلن‌های اشتراک"
        >
          {regularPlans?.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId;
            const isFree = plan.priceMonthly === 0;
            const isPopular = !isCurrent && plan.isPopular;
            const limitText = dailyLimitText(plan);
            const support = !isFree ? supportText(plan) : null;
            const imageGen = imageGenCardText(imageGenSupport(plan, modelCatalog));

            // پلن‌های پایین‌تر/مساوی پلن فعال فعلی، طبق قانون «فقط خرید رو به بالا»، قابل‌خرید نیستند.
            const isLowerOrSamePaid =
              !isCurrent && !isFree && hasActiveRegularPlan && currentSub
                ? plan.priceMonthly <= currentSub.plan.priceMonthly
                : false;
            const isUpgradeable =
              !isCurrent && !isFree && hasActiveRegularPlan && currentSub
                ? plan.priceMonthly > currentSub.plan.priceMonthly
                : false;
            const upgradeAmount =
              isUpgradeable && currentSub
                ? upgradePreviewAmount(plan, currentSub.plan, currentSub.periodEnd)
                : null;
            const upgradeAmountWithDiscount =
              upgradeAmount !== null && activeDiscountPercent > 0
                ? Math.round(upgradeAmount * (1 - activeDiscountPercent / 100))
                : upgradeAmount;

            return (
              <div
                key={plan.id}
                className={clsx(
                  "relative flex flex-col rounded-2xl border p-7 transition-all duration-300",
                  isCurrent
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : isPopular
                      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.06] to-transparent shadow-[0_0_40px_rgba(16,185,129,0.08)]"
                      : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600",
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-medium text-white">
                    {fa.plans.current}
                  </span>
                )}
                {isPopular && (
                  <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white">
                    محبوب‌ترین
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-100">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-3xl font-extrabold text-emerald-400">
                        {fa.plans.free}
                      </span>
                    ) : activeDiscountPercent > 0 ? (
                      <>
                        <span className="text-3xl font-extrabold text-emerald-400">
                          {Math.round(plan.priceMonthly * (1 - activeDiscountPercent / 100)).toLocaleString("fa-IR")}
                        </span>
                        <span className="text-sm text-slate-500">
                          {fa.plans.perMonth}
                        </span>
                        <span className="mr-1 text-sm text-slate-500 line-through">
                          {plan.priceMonthly.toLocaleString("fa-IR")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-extrabold text-slate-100">
                          {plan.priceMonthly.toLocaleString("fa-IR")}
                        </span>
                        <span className="text-sm text-slate-500">
                          {fa.plans.perMonth}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-6 space-y-2.5 border-b border-slate-800 pb-6">
                  {limitText && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <MessageIcon />
                      {limitText}
                    </div>
                  )}
                  {support && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <SupportIcon />
                      {support}
                    </div>
                  )}
                  {imageGen && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <ImageGenIcon />
                      {imageGen}
                    </div>
                  )}
                </div>

                <div className="mb-8 flex-1">
                  <ModelShowcase
                    isFree={isFree}
                    allowedModels={plan.allowedModels}
                    description={PLAN_TIER_MODEL_DESCRIPTIONS[index] ?? ""}
                  />
                </div>

                {isCurrent ? (
                  <button
                    onClick={() => navigate("/chat")}
                    className="rounded-xl border border-emerald-500/40 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    {fa.common.back}
                  </button>
                ) : isFree ? (
                  <button
                    onClick={() => navigate("/chat")}
                    className="rounded-xl border border-slate-600 py-2.5 text-sm text-slate-400 hover:border-slate-500 transition-colors"
                  >
                    {fa.plans.startFree}
                  </button>
                ) : isLowerOrSamePaid ? (
                  <button
                    disabled
                    title="شما پلن بالاتری فعال دارید — برای تعویض پلن صبر کنید دوره‌ی فعلی تمام شود"
                    className="rounded-xl border border-slate-700 py-2.5 text-sm text-slate-500 cursor-not-allowed opacity-60"
                  >
                    غیرفعال
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(plan.id)}
                    disabled={initPayment.isPending}
                    className={clsx(
                      "rounded-xl py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50",
                      isPopular
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-slate-700 text-slate-100 hover:bg-slate-600",
                    )}
                  >
                    {initPayment.isPending
                      ? fa.payment.redirecting
                      : isUpgradeable && upgradeAmountWithDiscount !== null
                        ? `ارتقا — ${upgradeAmountWithDiscount.toLocaleString("fa-IR")} تومان`
                        : fa.plans.buy}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* docs/PRD-pay-as-you-go-wallet.md — کارت بزرگ‌تر، ردیف جدا، مدل‌های بیشتر روی خودِ کارت (نه پشت مودال) */}
        {paygPlan && (
          <div className="mt-8">
            <div className="relative flex flex-col gap-8 rounded-2xl border border-fuchsia-500/40 bg-gradient-to-b from-fuchsia-500/[0.06] to-transparent p-8 md:flex-row">
              {isCurrentPayg && (
                <span className="absolute -top-3 right-6 rounded-full bg-fuchsia-500 px-3 py-0.5 text-xs font-medium text-white">
                  {fa.plans.current}
                </span>
              )}
              <div className="flex-1">
                <span className="mb-3 inline-block rounded-full bg-fuchsia-500/15 px-3 py-1 text-xs font-medium text-fuchsia-300">
                  Pay-as-you-go
                </span>
                <h3 className="text-2xl font-bold text-slate-100">{paygPlan.name}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  هر مدلی رو که بخوای انتخاب کن و همون رو استفاده کن — بدون سقف روزانه، بدون تعویض خودکار به مدل ارزان‌تر. فقط به‌اندازه‌ی مصرف واقعی از کیف‌پولت کم می‌شود.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {paygPlan.allowedModels.map((name) => {
                    const entry = modelCatalog?.find((m) => m.name === name);
                    return (
                      <span
                        key={name}
                        className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300"
                      >
                        <ProviderIcon provider={entry?.provider ?? name.split("/")[0]} size={14} />
                        {entry?.displayName ?? name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex shrink-0 flex-col justify-center gap-3 md:w-64">
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center">
                  <p className="text-xs text-slate-500">ضریب محاسبه‌ی مصرف</p>
                  <p className="mt-1 text-lg font-bold text-fuchsia-300">× {paygPlan.payAsYouGoMarkup ?? 1.3}</p>
                </div>
                {isCurrentPayg ? (
                  <button
                    onClick={() => navigate("/settings/wallet")}
                    className="rounded-xl border border-fuchsia-500/40 py-2.5 text-sm text-fuchsia-300 hover:bg-fuchsia-500/10 transition-colors"
                  >
                    مدیریت کیف‌پول
                  </button>
                ) : (
                  <button
                    onClick={() => setPaygTopupOpen(true)}
                    className="rounded-xl bg-fuchsia-500 py-3 text-sm font-semibold text-white transition-all hover:bg-fuchsia-400 active:scale-95"
                  >
                    شارژ و شروع
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* جدول جزییات کامل محدودیت‌ها — شفافیت کامل قبل از خرید (PAYG سقف روزانه/ماهانه ندارد، پس در این جدول نمی‌آید) */}
        {regularPlans && regularPlans.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-100">
                جزییات کامل پلن‌ها
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                همه‌ی محدودیت‌ها، شفاف و بدون سورپرایز
              </p>
            </div>
            <PlanLimitsTable plans={regularPlans as Plan[]} modelCatalog={modelCatalog} />
          </div>
        )}

        {/* Sales chatbot below plan cards */}
        {env.VITE_SALES_BOT_ENABLED && (
          <div className="mt-14">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-100">
                نمیدونی کدوم پلن مناسبته؟
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                از دستیار هوشمند نیوو بپرس
              </p>
            </div>
            <div className="mx-auto max-w-4xl">
              <SalesChatbot source="pricing_page" />
            </div>
          </div>
        )}
      </div>

      <ExitIntentModal />

      {pendingPlanId && gateways && (
        <GatewayPickerModal
          gateways={gateways}
          loading={initPayment.isPending}
          onSelect={handleGatewaySelect}
          onClose={() => setPendingPlanId(null)}
        />
      )}

      {paygTopupOpen && paygPlan && (
        <WalletTopupModal
          presets={paygPlan.payAsYouGoTopupPresets ?? DEFAULT_PAYG_PRESETS}
          minActivation={paygPlan.payAsYouGoMinActivationToman ?? 1_000_000}
          minTopup={paygPlan.payAsYouGoMinTopupToman ?? 500_000}
          onClose={() => setPaygTopupOpen(false)}
        />
      )}
    </div>
  );
}

function SupportIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0 text-emerald-500"
    >
      <path
        d="M8 1.5a5 5 0 00-5 5v3a1.5 1.5 0 001.5 1.5H5v-4H4.5v-.5a3.5 3.5 0 017 0v.5H11v4h.5A1.5 1.5 0 0013 9.5v-3a5 5 0 00-5-5z"
        fill="currentColor"
      />
    </svg>
  );
}

function ImageGenIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0 text-emerald-500"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="6" r="1.25" fill="currentColor" />
      <path d="M2.5 11.5l3.5-3.5 2 2 3-3 2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0 text-emerald-500"
    >
      <path
        d="M2 3.5h12v7H6.5L3 13v-2.5H2v-7z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
