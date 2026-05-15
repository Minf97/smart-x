import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { isOnboardingComplete, isSignedIn } from "@/actions/auth-session";

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isSignedIn()) {
        navigate({ to: "/login" });
        return;
      }

      navigate({ to: isOnboardingComplete() ? "/dashboard" : "/onboarding" });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0b0d0f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.18),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.12),transparent_42%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="relative flex flex-col items-center gap-5">
        <div className="smartx-logo-pulse relative grid size-28 place-items-center rounded-[28px] border border-white/15 bg-white/[0.04] shadow-2xl shadow-blue-500/15">
          <div className="absolute inset-2 rounded-[22px] border border-emerald-300/20" />
          <div className="smartx-logo-scan absolute inset-0 rounded-[28px]" />
          <ShieldCheck className="size-12 text-emerald-200" />
        </div>
        <div className="smartx-logo-rise text-center">
          <div className="flex items-center justify-center gap-2 font-mono text-[0.68rem] text-emerald-200/80 uppercase tracking-[0.34em]">
            <Activity className="size-3" />
            Alert loop
          </div>
          <h1 className="mt-2 font-semibold text-2xl tracking-normal">
            Smart X
          </h1>
          <p className="mt-1 text-sm text-white/55">准备你的报警工作台</p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
