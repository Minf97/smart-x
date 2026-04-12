import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createProject } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import {
  type Project,
  type ProjectInput,
  REQUEST_PROVIDER_LABELS,
  type RequestProvider,
} from "@/types/project";
import { cn } from "@/utils/tailwind";

interface CreateProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

// 默认值
function getDefaultInput(): ProjectInput {
  return {
    name: "",
    repoConfig: {
      baseBranch: "main",
      provider: "github",
      repoName: "",
    },
  };
}

// 写缓存
function appendProjectCache(data: DashboardData | undefined, project: Project) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    projects: [...data.projects, project],
  };
}

export default function CreateProjectDialog({
  onOpenChange,
  open,
}: CreateProjectDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addProject = useProjectStore((state) => state.addProject);
  const [input, setInput] = useState<ProjectInput>(getDefaultInput);
  const mutation = useMutation({
    mutationFn: createProject,
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.createProjectFailed")
      );
    },
    onSuccess(project) {
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        appendProjectCache(data, project)
      );
      addProject(project);
      toast.success(t("dashboard.createProjectSuccess"));
      setInput(getDefaultInput());
      onOpenChange(false);
    },
  });
  const disabled =
    mutation.isPending ||
    input.name.trim().length === 0 ||
    input.repoConfig.repoName.trim().length === 0 ||
    input.repoConfig.baseBranch.trim().length === 0;

  // 更新字段
  function setField(field: keyof ProjectInput, value: string) {
    setInput((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // 更新配置
  function setRepoField<K extends keyof ProjectInput["repoConfig"]>(
    field: K,
    value: ProjectInput["repoConfig"][K]
  ) {
    setInput((current) => ({
      ...current,
      repoConfig: {
        ...current.repoConfig,
        [field]: value,
      },
    }));
  }

  // 提交表单
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutation.mutate({
      name: input.name.trim(),
      repoConfig: {
        baseBranch: input.repoConfig.baseBranch.trim(),
        provider: input.repoConfig.provider,
        repoName: input.repoConfig.repoName.trim(),
      },
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setInput(getDefaultInput());
        }

        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.createProject")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.createProjectHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1.5" htmlFor="create-project-name">
              <span className="font-medium text-xs">
                {t("dashboard.projectName")}
              </span>
              <Input
                id="create-project-name"
                onChange={(event) => setField("name", event.target.value)}
                placeholder={t("dashboard.projectNamePlaceholder")}
                value={input.name}
              />
            </label>

            <div className="space-y-1.5">
              <span className="font-medium text-xs">
                {t("dashboard.provider")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["github", "gitlab"] as RequestProvider[]).map((provider) => (
                  <Button
                    className={cn(
                      "justify-start",
                      input.repoConfig.provider === provider &&
                        "border-primary bg-muted"
                    )}
                    key={provider}
                    onClick={() => setRepoField("provider", provider)}
                    type="button"
                    variant="outline"
                  >
                    {REQUEST_PROVIDER_LABELS[provider]}
                  </Button>
                ))}
              </div>
            </div>

            <label
              className="block space-y-1.5"
              htmlFor="create-project-repo-name"
            >
              <span className="font-medium text-xs">
                {t("dashboard.repository")}
              </span>
              <Input
                id="create-project-repo-name"
                onChange={(event) =>
                  setRepoField("repoName", event.target.value)
                }
                placeholder={t("dashboard.repoNamePlaceholder")}
                value={input.repoConfig.repoName}
              />
            </label>

            <label
              className="block space-y-1.5"
              htmlFor="create-project-base-branch"
            >
              <span className="font-medium text-xs">
                {t("dashboard.baseBranch")}
              </span>
              <Input
                id="create-project-base-branch"
                onChange={(event) =>
                  setRepoField("baseBranch", event.target.value)
                }
                placeholder={t("dashboard.baseBranchPlaceholder")}
                value={input.repoConfig.baseBranch}
              />
            </label>
          </div>

          <DialogFooter>
            <Button
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              {t("dashboard.cancel")}
            </Button>
            <Button disabled={disabled} type="submit">
              {t("dashboard.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
