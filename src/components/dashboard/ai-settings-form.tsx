import type {
  Project,
  ProjectAiConfig,
  ProjectInput,
} from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateProject } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";

interface AiSettingsFormProps {
  onSaved?: () => void;
  preferEnv?: boolean;
  project: Project;
  submitLabel?: string;
}

// 更新缓存
function updateProjectCache(data: DashboardData | undefined, project: Project) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    projects: data.projects.map((item) =>
      item.id === project.id ? project : item
    ),
  };
}

// 合并环境
function resolveAiConfig(project: Project, preferEnv: boolean) {
  if (!preferEnv) {
    return project.aiConfig;
  }

  return {
    apiKey: import.meta.env.AI_API_KEY || project.aiConfig.apiKey,
    baseUrl: import.meta.env.AI_BASE_URL || project.aiConfig.baseUrl,
    model: import.meta.env.AI_MODEL || project.aiConfig.model,
  } satisfies ProjectAiConfig;
}

// 项目入参
function getProjectInput(project: Project, aiConfig: ProjectAiConfig) {
  return {
    aiConfig,
    name: project.name,
    repoConfig: {
      baseBranch: project.repoConfig.baseBranch,
      managedRepoPath: project.repoConfig.managedRepoPath,
      provider: project.repoConfig.provider,
      repoId: project.repoConfig.repoId,
      repoName: project.repoConfig.repoName,
      token: "",
    },
  } satisfies ProjectInput;
}

// AI 表单
export function AiSettingsForm({
  onSaved,
  preferEnv = false,
  project,
  submitLabel,
}: AiSettingsFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateProjectStore = useProjectStore((state) => state.updateProject);
  const [input, setInput] = useState<ProjectAiConfig>(() =>
    resolveAiConfig(project, preferEnv)
  );
  const mutation = useMutation({
    mutationFn: (nextInput: ProjectInput) =>
      updateProject(project.id, nextInput),
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.updateProjectFailed")
      );
    },
    onSuccess(updatedProject) {
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        updateProjectCache(data, updatedProject)
      );
      updateProjectStore(updatedProject);
      toast.success(t("dashboard.updateProjectSuccess"));
      onSaved?.();
    },
  });
  const disabled =
    mutation.isPending ||
    input.apiKey.trim().length === 0 ||
    input.baseUrl.trim().length === 0 ||
    input.model.trim().length === 0;

  useEffect(() => {
    setInput(resolveAiConfig(project, preferEnv));
  }, [project, preferEnv]);

  // 更新字段
  function updateField(key: keyof ProjectAiConfig, value: string) {
    setInput((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // 提交配置
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutation.mutate(
      getProjectInput(project, {
        apiKey: input.apiKey.trim(),
        baseUrl: input.baseUrl.trim(),
        model: input.model.trim(),
      })
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <label className="block space-y-1.5" htmlFor="onboarding-ai-base-url">
          <span className="font-medium text-xs">
            {t("dashboard.aiBaseUrl")}
          </span>
          <Input
            id="onboarding-ai-base-url"
            onChange={(event) => updateField("baseUrl", event.target.value)}
            placeholder={t("dashboard.aiBaseUrlPlaceholder")}
            value={input.baseUrl}
          />
        </label>

        <label className="block space-y-1.5" htmlFor="onboarding-ai-model">
          <span className="font-medium text-xs">{t("dashboard.aiModel")}</span>
          <Input
            id="onboarding-ai-model"
            onChange={(event) => updateField("model", event.target.value)}
            placeholder={t("dashboard.aiModelPlaceholder")}
            value={input.model}
          />
        </label>

        <label className="block space-y-1.5" htmlFor="onboarding-ai-key">
          <span className="font-medium text-xs">{t("dashboard.aiApiKey")}</span>
          <Input
            id="onboarding-ai-key"
            onChange={(event) => updateField("apiKey", event.target.value)}
            placeholder={t("dashboard.aiApiKeyPlaceholder")}
            type="password"
            value={input.apiKey}
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button disabled={disabled} type="submit">
          {submitLabel ?? t("dashboard.save")}
        </Button>
      </div>
    </form>
  );
}
