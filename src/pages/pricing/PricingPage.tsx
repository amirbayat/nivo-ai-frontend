import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import {
  usePlans,
  useInitiatePayment,
  useEnabledGateways,
  type PaymentGatewayName,
} from "@/queries/plans.queries";
import { useMe } from "@/queries/auth.queries";
import { SalesChatbot } from "@/components/sales/SalesChatbot";
import { ExitIntentModal } from "@/components/sales/ExitIntentModal";
import { GatewayPickerModal } from "@/components/payment/GatewayPickerModal";
import { ModelShowcase } from "@/components/models/ModelShowcase";
import { PlanLimitsTable } from "@/components/plans/PlanLimitsTable";
import { fa } from "@/locales/fa";
import type { Plan } from "@/types/api";

export function PricingPage() {
  const { data: plans, isLoading } = usePlans();
  const { data: me } = useMe();
  const { data: gateways } = useEnabledGateways();
  const initPayment = useInitiatePayment();
  const navigate = useNavigate();
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const currentPlanId = me?.subscription?.planId;

  function handleBuy(planId: string) {
    if ((gateways?.length ?? 0) > 1) {
      setPendingPlanId(planId);
      return;
    }
    initPayment.mutate({ planId, gateway: gateways?.[0] });
  }

  function handleGatewaySelect(gateway: PaymentGatewayName) {
    if (!pendingPlanId) return;
    initPayment.mutate({ planId: pendingPlanId, gateway });
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

        <div
          className="grid gap-6 md:grid-cols-3"
          role="list"
          aria-label="پلن‌های اشتراک"
        >
          {plans?.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isFree = plan.priceMonthly === 0;
            const isPopular = !isCurrent && plan.isPopular;

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
                  {isFree ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <TokenIcon />
                      {fa.plans.dailyFree(plan.dailyFreeTokens)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <TokenIcon />
                      {fa.plans.monthly(plan.monthlyTotalTokens)}
                    </div>
                  )}
                </div>

                <div className="mb-8 flex-1">
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    {fa.plans.models}
                  </p>
                  <ModelShowcase
                    isFree={isFree}
                    allowedModels={plan.allowedModels}
                    featuredModels={plan.featuredModels}
                    max={plan.featuredModelsCount}
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
                      : fa.plans.buy}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* جدول جزییات کامل محدودیت‌ها — شفافیت کامل قبل از خرید */}
        {plans && plans.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-100">
                جزییات کامل پلن‌ها
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                همه‌ی محدودیت‌ها، شفاف و بدون سورپرایز
              </p>
            </div>
            <PlanLimitsTable plans={plans as Plan[]} />
          </div>
        )}

        {/* Sales chatbot below plan cards */}
        <div className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-100">
              نمیدونی کدوم پلن مناسبته؟
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              از دستیار هوشمند نیوو بپرس
            </p>
          </div>
          <div className="mx-auto max-w-lg">
            <SalesChatbot source="pricing_page" />
          </div>
        </div>
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
    </div>
  );
}

function TokenIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0 text-emerald-500"
    >
      <path
        d="M8 1.5l1.4 4.2 4.2 1.4-4.2 1.4L8 12.7l-1.4-4.2-4.2-1.4 4.2-1.4L8 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}
