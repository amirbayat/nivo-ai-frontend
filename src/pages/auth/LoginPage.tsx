import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSendOtp } from "@/queries/auth.queries";
import {
  useCampaignStatus,
  useCampaignDisplayCounter,
} from "@/queries/campaign.queries";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { fa } from "@/locales/fa";
import { DigitsInput } from '@/components/ui/DigitsInput'

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const sendOtp = useSendOtp();
  const { data: campaignStatus } = useCampaignStatus();
  const displayCounter = useCampaignDisplayCounter(campaignStatus);
  const [searchParams] = useSearchParams();
  const waitlistToken = searchParams.get("wl"); // لینک پیامک «دسترسی باز شد» — بخش ۱۸.۵

  const validate = (val: string) => /^(\+98|0)?9[0-9]{9}$/.test(val);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate(phone)) {
      setError(fa.auth.invalidPhone);
      return;
    }
    try {
      await sendOtp.mutateAsync(phone);
      navigate("/otp", { state: { phone, waitlistToken } });
    } catch {
      setError(fa.common.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 light:bg-white">
      <div className="w-full max-w-sm">
        {/* logo */}
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-4 w-48" />
          <h1 className="text-xl font-bold text-slate-100 light:text-slate-900">نیوو</h1>
          <p className="mt-1 text-sm text-slate-500 light:text-slate-400">
            با شماره موبایل وارد شوید
          </p>
        </div>

        {campaignStatus?.active && displayCounter !== null && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-300 light:border-amber-200 light:bg-amber-50 light:text-amber-700">
            {fa.waitlist.remainingCapacity(displayCounter)}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <DigitsInput kind="phone"
            placeholder={fa.auth.phonePlaceholder}
            value={phone}
            onChange={setPhone}
            error={error}
            autoFocus
            className="text-center tracking-widest"
          />
          <Button type="submit" className="w-full" loading={sendOtp.isPending}>
            {fa.auth.sendOtp}
          </Button>
        </form>
      </div>
    </div>
  );
}
