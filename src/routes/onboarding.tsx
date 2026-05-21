import type { Project } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Clipboard,
  GitBranch,
  Send,
  Webhook,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { completeOnboarding, isSignedIn } from "@/actions/auth-session";
import { copyText } from "@/actions/shell";
import { syncAlerts } from "@/api/alerts";
import { AiSettingsForm } from "@/components/dashboard/ai-settings-form";
import { CreateProjectInline } from "@/components/dashboard/create-project-dialog";
import { StepCard } from "@/components/onboarding/step-card";
import { Button } from "@/components/ui/button";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useProjects } from "@/hooks/use-projects";

type OnboardingStep = "project" | "createProject" | "ai" | "webhook";

const STEP_LABELS: Record<OnboardingStep, string> = {
  ai: "Step 3 / 4",
  createProject: "Step 2 / 4",
  project: "Step 1 / 4",
  webhook: "Step 4 / 4",
};
const STEP_PROGRESS: Record<OnboardingStep, number> = {
  ai: 75,
  createProject: 50,
  project: 25,
  webhook: 100,
};

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

// 页面主体
export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProjects();
  const [step, setStep] = useState<OnboardingStep>(() => {
    if (!currentProject) {
      return "project";
    }

    return currentProject.aiConfig.apiKey.trim() &&
      currentProject.aiConfig.baseUrl.trim() &&
      currentProject.aiConfig.model.trim()
      ? "webhook"
      : "ai";
  });
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

  useEffect(() => {
    if (currentProject && step === "project") {
      setStep(
        currentProject.aiConfig.apiKey.trim() &&
          currentProject.aiConfig.baseUrl.trim() &&
          currentProject.aiConfig.model.trim()
          ? "webhook"
          : "ai"
      );
    }
  }, [currentProject, step]);

  // 打开新建
  function openCreateProject() {
    setStep("createProject");
  }

  // 复制文本
  async function copyValue(value: string, message: string) {
    await copyText(value);
    toast.success(message);
  }

  // 进入工作台
  function enterDashboard() {
    completeOnboarding();
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex h-full items-center overflow-y-auto bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div>
          {step === "project" ? (
            <StepCard
              action={
                <Button onClick={openCreateProject} type="button">
                  新建项目
                  <ArrowRight className="size-4" />
                </Button>
              }
              description="打开 create new project dialog 后，只需要选择平台和 repo。Project name 会使用 repo 名称，base branch 会使用仓库默认分支。"
              icon={<GitBranch className="size-4" />}
              key="project"
              progress={STEP_PROGRESS.project}
              stepLabel={STEP_LABELS.project}
              title="新建项目"
            />
          ) : null}

          {step === "createProject" ? (
            <StepCard
              description="选择代码平台和 repo。项目名称会使用 repo 名称，base branch 会使用仓库默认分支。"
              icon={<GitBranch className="size-4" />}
              key="create-project"
              progress={STEP_PROGRESS.createProject}
              stepLabel={STEP_LABELS.createProject}
              title="连接代码仓库"
            >
              <CreateProjectInline
                onCancel={() => setStep("project")}
                onProjectCreated={() => setStep("ai")}
              />
            </StepCard>
          ) : null}

          {step === "ai" ? (
            <StepCard
              description="AI Settings 是项目级配置。不同项目可以填写不同的 Base URL、Model 和 API Key，方便按项目追踪 AI 用量。"
              icon={<Bot className="size-4" />}
              key="ai"
              progress={STEP_PROGRESS.ai}
              stepLabel={STEP_LABELS.ai}
              title="AI Settings"
            >
              {currentProject ? (
                <div className="space-y-3">
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground text-xs">
                    当前项目：{currentProject.name}
                  </p>
                  <AiSettingsForm
                    onSaved={() => setStep("webhook")}
                    preferEnv
                    project={currentProject}
                    submitLabel="保存并继续"
                  />
                </div>
              ) : null}
            </StepCard>
          ) : null}

          {step === "webhook" ? (
            <StepCard
              action={
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    disabled={!webhookUrl}
                    onClick={() => copyValue(sdkSnippet, "SDK 片段已复制")}
                    type="button"
                    variant="outline"
                  >
                    <Clipboard className="size-4" />
                    复制片段
                  </Button>
                  <Button onClick={enterDashboard} type="button">
                    进入 Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              }
              description="项目创建完成后会生成 webhook。把它配置到现有监控、后端服务或前端 SDK 中，错误就会进入 Smart X。"
              icon={<Webhook className="size-4" />}
              key="webhook"
              progress={STEP_PROGRESS.webhook}
              stepLabel={STEP_LABELS.webhook}
              title="生成 Webhook"
            >
              {currentProject ? (
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="font-medium text-xs">Webhook URL</p>
                    <p className="mt-2 break-all rounded-md bg-background p-2 font-mono text-xs">
                      {currentProject.webhookUrl}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  <pre className="max-h-72 overflow-auto rounded-md border bg-[#101418] p-4 text-[0.72rem] text-emerald-100 leading-5">
                    <code>{sdkSnippet}</code>
                  </pre>
                </div>
              ) : null}
            </StepCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
