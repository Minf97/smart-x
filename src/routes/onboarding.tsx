import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, GitBranch, Play, RadioTower } from "lucide-react";
import { useEffect } from "react";
import { completeOnboarding, isSignedIn } from "@/actions/auth-session";
import { Button } from "@/components/ui/button";

function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  // 进入工作台
  function enterDashboard() {
    completeOnboarding();
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] items-center justify-center bg-background px-6">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[0.68rem] text-muted-foreground uppercase tracking-[0.24em]">
              <RadioTower className="size-3" />
              Onboarding
            </div>
            <h1 className="mt-4 max-w-2xl font-semibold text-3xl tracking-normal">
              先跑通一条 Alert，再进入工作台
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6">
              下一阶段会在这里引导你连接 GitHub 或 GitLab，选择是否已有报警，
              再安装 SDK 或复制 webhook。现在先建立新老用户分流和教程入口。
            </p>
          </div>
          <Button
            className="hidden h-9 md:inline-flex"
            onClick={enterDashboard}
          >
            稍后设置
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            className="group rounded-lg border bg-card p-6 text-left transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5"
            onClick={enterDashboard}
            type="button"
          >
            <div className="flex size-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <GitBranch className="size-5" />
            </div>
            <h2 className="mt-5 font-semibold text-xl">接入我的项目</h2>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              连接代码仓库，拿到 webhook，把 User Project 的错误接进平台。
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-medium text-sm">
              Phase C 完成此路径
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <button
            className="group rounded-lg border bg-card p-6 text-left transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
            onClick={enterDashboard}
            type="button"
          >
            <div className="flex size-10 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <Play className="size-5" />
            </div>
            <h2 className="mt-5 font-semibold text-xl">先看演示</h2>
            <p className="mt-2 text-muted-foreground text-sm leading-6">
              用 demo Alert 预览报错、Analysis、修复建议和 Code Request。
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-medium text-sm">
              Phase D 完成此路径
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>

        <Button className="mt-6 h-9 w-full md:hidden" onClick={enterDashboard}>
          稍后设置
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
