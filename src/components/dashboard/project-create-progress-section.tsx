import {
  PROJECT_CREATE_STEP_VALUES,
  type ProjectCreateProgress,
} from "@shared/types/project";
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

// 状态色
function getCreateStepTone(input: {
  isActive: boolean;
  isDone: boolean;
  isFailed: boolean;
}) {
  if (input.isFailed) {
    return "text-destructive";
  }

  if (input.isActive) {
    return "text-primary";
  }

  if (input.isDone) {
    return "text-foreground";
  }

  return "text-muted-foreground";
}

interface ProjectCreateProgressSectionProps {
  progress: ProjectCreateProgress;
}

// 创建进度
export function ProjectCreateProgressSection({
  progress,
}: ProjectCreateProgressSectionProps) {
  const { t } = useTranslation();
  const activeIndex = PROJECT_CREATE_STEP_VALUES.indexOf(progress.step);

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("dashboard.createProjectProgressTitle")}</DialogTitle>
        <DialogDescription>
          {t("dashboard.createProjectProgressHint")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{progress.step}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {getCreateStepText(progress.step, t)}
          </p>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          {PROJECT_CREATE_STEP_VALUES.map((step, index) => {
            const isDone =
              index < activeIndex || progress.status === "completed";
            const isActive =
              step === progress.step && progress.status === "pending";
            const isFailed =
              step === progress.step && progress.status === "failed";

            return (
              <div
                className="flex items-center justify-between gap-3 text-xs"
                key={step}
              >
                <span className="min-w-0 truncate font-mono">{step}</span>
                <span
                  className={getCreateStepTone({
                    isActive,
                    isDone,
                    isFailed,
                  })}
                >
                  {getCreateStepText(step, t)}
                </span>
              </div>
            );
          })}
        </div>

        {progress.errorMessage ? (
          <p className="text-destructive text-xs">{progress.errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
