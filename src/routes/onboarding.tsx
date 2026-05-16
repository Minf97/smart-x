import type { Project } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Clipboard,
  GitBranch,
  Play,
  RadioTower,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { completeOnboarding, isSignedIn } from "@/actions/auth-session";
import { copyText } from "@/actions/shell";
import { syncAlerts } from "@/api/alerts";
import CreateProjectDialog from "@/components/dashboard/create-project-dialog";
import { Button } from "@/components/ui/button";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useProjects } from "@/hooks/use-projects";

type AlertSetupMode = "existing" | "sdk" | "demo";
// 构建测试
function buildTestAlertPayload() {
  return {
    count: 1,
    environment: "onboarding",
    message: "Cannot read properties of undefined (reading map)",
    occurredAt: new Date().toISOString(),
    priority: "P1",
    source: "onboarding-test",
    sourceUrl: "https://example.com/onboarding",
    stack:
      "TypeError: Cannot read properties of undefined (reading map)\n" +
      "    at UserList (src/pages/UserList.tsx:42:18)",
    title: "Onboarding test alert",
  };
}
// 发送测试
async function sendTestAlert(project: Project) {
  const response = await fetch(project.webhookUrl, {
    body: JSON.stringify(buildTestAlertPayload()),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Webhook failed: ${response.status}`);
  }

  return syncAlerts();
}
// 生成片段
function getSdkSnippet(webhookUrl: string) {
  return `import { initSmartXAlert } from "@smart-x/alert/browser";

initSmartXAlert({
  environment: "production",
  source: "web",
  webhookUrl: process.env.SMART_X_WEBHOOK_URL,
});

// .env
SMART_X_WEBHOOK_URL=${webhookUrl}`;
}
// 模式标题
function getModeTitle(mode: AlertSetupMode) {
  if (mode === "sdk") {
    return "我还没有报警系统";
  }

  if (mode === "demo") {
    return "我只是想先看看";
  }

  return "我已经有报警系统";
}
// 模式描述
function getModeDescription(mode: AlertSetupMode) {
  if (mode === "sdk") {
    return "先复制 env 和 SDK 片段，把 User Project 的运行时错误送进平台。";
  }

  if (mode === "demo") {
    return "下一阶段会提供可点击触发 Alert 的 demo site。现在先进入工作台查看主界面。";
  }

  return "把现有监控、飞书机器人或后端服务再发一份 webhook 到平台。";
}
// 页面主体
export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<AlertSetupMode>("existing");
  const webhookUrl = currentProject?.webhookUrl ?? "";
  const sdkSnippet = useMemo(() => getSdkSnippet(webhookUrl), [webhookUrl]);
  const testAlertMutation = useMutation({
    mutationFn: () => {
      if (!currentProject) {
        throw new Error("请先连接一个项目");
      }

      return sendTestAlert(currentProject);
    },
    onError(error) {
      toast.error(error instanceof Error ? error.message : "测试 Alert 失败");
    },
    onSuccess(result) {
      queryClient.invalidateQueries({
        queryKey: ALERTS_QUERY_KEY,
      });
      toast.success(`测试 Alert 已同步：${result.insertedCount} 条新增`);
    },
  });
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

  // 复制文本
  async function copyValue(value: string, message: string) {
    await copyText(value);
    toast.success(message);
  }

  return (
    <div className="h-full overflow-y-auto bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl pb-6">
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
              连接 GitHub 或 GitLab，选择是否已有报警，再复制 webhook 或 SDK
              片段。完成后发送一条测试 Alert，确认 Remote Backend 到 Desktop
              Agent 的接入链路可用。
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
            onClick={() => setCreateOpen(true)}
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
              连接代码平台
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

        <section className="mt-6 rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-semibold text-xl">选择 Alert 接入方式</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                这一步决定你从哪里把错误送进平台。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["existing", "sdk", "demo"] as const).map((item) => (
                <Button
                  key={item}
                  onClick={() => setMode(item)}
                  type="button"
                  variant={mode === item ? "default" : "outline"}
                >
                  {getModeTitle(item)}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="font-medium text-sm">{getModeTitle(mode)}</p>
              <p className="mt-2 text-muted-foreground text-sm leading-6">
                {getModeDescription(mode)}
              </p>
              {currentProject ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="font-medium text-xs">Webhook URL</p>
                    <p className="mt-1 break-all rounded-md bg-background p-2 font-mono text-xs">
                      {currentProject.webhookUrl}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        copyValue(currentProject.webhookUrl, "Webhook 已复制")
                      }
                      type="button"
                      variant="outline"
                    >
                      <Clipboard className="size-4" />
                      复制 webhook
                    </Button>
                    <Button
                      disabled={testAlertMutation.isPending}
                      onClick={() => testAlertMutation.mutate()}
                      type="button"
                    >
                      <Send className="size-4" />
                      发送测试 Alert
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed p-3 text-muted-foreground text-sm">
                  先连接 GitHub 或 GitLab 项目，平台会生成 webhook。
                </div>
              )}
            </div>

            <div className="rounded-md border bg-[#101418] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-sm">SDK / env 片段</p>
                <Button
                  disabled={!webhookUrl}
                  onClick={() => copyValue(sdkSnippet, "SDK 片段已复制")}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Clipboard className="size-3" />
                  复制
                </Button>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-black/35 p-3 text-[0.72rem] text-emerald-100 leading-5">
                <code>{sdkSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

        <Button className="mt-6 h-9 w-full md:hidden" onClick={enterDashboard}>
          稍后设置
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <CreateProjectDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
