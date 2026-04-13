import type { Project, ProjectInput } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateProject } from "@/api/alerts";
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
import { useCurrentProject } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";

interface SettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
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

// 项目入参
function getProjectInput(project: Project) {
  return {
    name: project.name,
    repoConfig: {
      baseBranch: project.repoConfig.baseBranch,
      provider: project.repoConfig.provider,
      repoName: project.repoConfig.repoName,
      token: "",
    },
  } satisfies ProjectInput;
}

export default function SettingsDialog({
  onOpenChange,
  open,
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const project = useCurrentProject();
  const queryClient = useQueryClient();
  const updateProjectStore = useProjectStore((state) => state.updateProject);
  const [input, setInput] = useState<ProjectInput>(() =>
    getProjectInput(project)
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
      onOpenChange(false);
    },
  });
  const disabled =
    mutation.isPending ||
    input.name.trim().length === 0 ||
    input.repoConfig.baseBranch.trim().length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setInput(getProjectInput(project));
  }, [open, project]);

  // 改名称
  function handleNameChange(value: string) {
    setInput((current) => ({
      ...current,
      name: value,
    }));
  }

  // 改分支
  function handleBaseBranchChange(value: string) {
    setInput((current) => ({
      ...current,
      repoConfig: {
        ...current.repoConfig,
        baseBranch: value,
      },
    }));
  }

  // 提交表单
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutation.mutate({
      name: input.name.trim(),
      repoConfig: {
        baseBranch: input.repoConfig.baseBranch.trim(),
        provider: input.repoConfig.provider,
        repoName: input.repoConfig.repoName,
        token: "",
      },
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.projectSettings")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.projectSettingsHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1.5" htmlFor="project-name">
              <span className="font-medium text-xs">
                {t("dashboard.projectName")}
              </span>
              <Input
                id="project-name"
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder={t("dashboard.projectNamePlaceholder")}
                value={input.name}
              />
            </label>

            <label className="block space-y-1.5" htmlFor="project-provider">
              <span className="font-medium text-xs">
                {t("dashboard.provider")}
              </span>
              <Input
                disabled
                id="project-provider"
                value={input.repoConfig.provider}
              />
            </label>

            <label className="block space-y-1.5" htmlFor="project-repo-name">
              <span className="font-medium text-xs">
                {t("dashboard.repository")}
              </span>
              <Input
                disabled
                id="project-repo-name"
                value={input.repoConfig.repoName}
              />
            </label>

            <label className="block space-y-1.5" htmlFor="project-base-branch">
              <span className="font-medium text-xs">
                {t("dashboard.baseBranch")}
              </span>
              <Input
                id="project-base-branch"
                onChange={(event) => handleBaseBranchChange(event.target.value)}
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
              {t("dashboard.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
