import type { ProjectCreateProgress } from "@shared/types/project";
import { useTranslation } from "react-i18next";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 步骤文案
function getCreateStepText(
  step: ProjectCreateProgress["step"],
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const stepMap = {
    cloneManagedRepo: t("dashboard.projectCreateStepCloneManagedRepo"),
    createBackendProject: t("dashboard.projectCreateStepCreateBackendProject"),
    done: t("dashboard.projectCreateStepDone"),
    listProjectRows: t("dashboard.projectCreateStepListProjectRows"),
    saveProject: t("dashboard.projectCreateStepSaveProject"),
    validateProjectConnection: t(
      "dashboard.projectCreateStepValidateProjectConnection"
    ),
  } as const satisfies Record<ProjectCreateProgress["step"], string>;

  return stepMap[step];
}

interface ProjectCreateProgressSectionProps {
  progress: ProjectCreateProgress;
  surface?: "dialog" | "inline";
}

// 创建进度
export function ProjectCreateProgressSection({
  progress,
  surface = "dialog",
}: ProjectCreateProgressSectionProps) {
  const { t } = useTranslation();
  const stepText = getCreateStepText(progress.step, t);

  return (
    <div className="space-y-4">
      {surface === "dialog" ? (
        <DialogHeader>
          <DialogTitle>{t("dashboard.createProjectProgressTitle")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.createProjectProgressHint")}
          </DialogDescription>
        </DialogHeader>
      ) : (
        <div className="space-y-1">
          <h3 className="font-medium text-sm">
            {t("dashboard.createProjectProgressTitle")}
          </h3>
          <p className="text-muted-foreground text-xs leading-5">
            {t("dashboard.createProjectProgressHint")}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-medium text-sm">
              {stepText}
            </span>
            <span className="text-muted-foreground text-xs">
              {progress.progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        {progress.errorMessage ? (
          <p className="text-destructive text-xs">{progress.errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
