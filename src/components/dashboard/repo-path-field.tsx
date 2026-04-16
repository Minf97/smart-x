import { FolderOpen } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { openPath } from "@/actions/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentProject } from "@/hooks/use-projects";

// 路径输入
export function RepoPathField() {
  const { t } = useTranslation();
  const project = useCurrentProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultPath = project.repoConfig.managedRepoPath;

  async function handleOpen() {
    const repoPath = inputRef.current
      ? inputRef.current.value.trim()
      : defaultPath.trim();

    if (!repoPath) {
      return;
    }

    try {
      await openPath(repoPath);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("dashboard.openFolderFailed")
      );
    }
  }

  return (
    <label className="block space-y-1.5" htmlFor="project-repo-path">
      <span className="font-medium text-xs">{t("dashboard.repoPath")}</span>
      <div className="flex gap-2">
        <Input
          defaultValue={defaultPath}
          id="project-repo-path"
          key={project.id}
          name="managedRepoPath"
          placeholder={t("dashboard.repoPathPlaceholder")}
          ref={inputRef}
        />
        <Button
          aria-label={t("dashboard.openFolder")}
          onClick={handleOpen}
          size="icon"
          type="button"
          variant="outline"
        >
          <FolderOpen className="size-4" />
        </Button>
      </div>
    </label>
  );
}
