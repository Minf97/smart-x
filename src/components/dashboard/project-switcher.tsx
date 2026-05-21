import { SiGithub, SiGitlab } from "@icons-pack/react-simple-icons";
import type { RequestProvider } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { deleteProject } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useCurrentProject, useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import { cn } from "@/utils/tailwind";
import CreateProjectDialog from "./create-project-dialog";

// 平台图标
function ProviderIcon({
  className,
  provider,
}: {
  className?: string;
  provider: RequestProvider;
}) {
  const Icon = provider === "gitlab" ? SiGitlab : SiGithub;

  return <Icon className={cn("size-4 text-muted-foreground", className)} />;
}

export default function ProjectSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const currentProject = useCurrentProject();
  const { projects } = useProjects();
  const setProjectId = useProjectStore((state) => state.setCurrentProjectId);
  const removeProject = useProjectStore((state) => state.removeProject);
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onError(error) {
      toast.error(error.message);
    },
    onSuccess(_, projectId) {
      const nextProjects = projects.filter(
        (project) => project.id !== projectId
      );

      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) => {
        if (!data) {
          return data;
        }

        return {
          ...data,
          alerts: data.alerts.filter((item) => item.projectId !== projectId),
          projects: data.projects.filter((project) => project.id !== projectId),
        };
      });
      removeProject(projectId);
      setDeleteOpen(false);
      toast.success("项目已删除");

      if (nextProjects.length === 0) {
        navigate({ to: "/onboarding" });
      }
    },
  });

  // 打开新建
  function handleCreateProject(event: Event) {
    event.preventDefault();
    setOpen(true);
  }

  // 打开删除
  function handleDeleteProject(event: Event) {
    event.preventDefault();
    setDeleteOpen(true);
  }

  // 确认删除
  function confirmDeleteProject() {
    deleteMutation.mutate(currentProject.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-9 w-full justify-between px-3 hover:bg-accent"
            variant="ghost"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ProviderIcon provider={currentProject.repoConfig.provider} />
              <div className="min-w-0 text-left">
                <span className="block truncate font-medium text-sm">
                  {currentProject.name}
                </span>
                <span className="block truncate text-muted-foreground text-xs">
                  {currentProject.repoConfig.repoName}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>{t("dashboard.projects")}</DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onSelect={() => setProjectId(project.id)}
            >
              <ProviderIcon provider={project.repoConfig.provider} />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {project.name}
                </span>
                <span className="block truncate text-muted-foreground">
                  {project.repoConfig.repoName}
                </span>
              </div>
              {project.id === currentProject.id && (
                <Check className="size-3 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleCreateProject}>
            <Plus className="size-3.5" />
            {t("dashboard.createProject")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={deleteMutation.isPending}
            onSelect={handleDeleteProject}
            variant="destructive"
          >
            <Trash2 className="size-3.5" />
            删除当前项目
          </DropdownMenuItem>
        </DropdownMenuContent>
        <CreateProjectDialog onOpenChange={setOpen} open={open} />
      </DropdownMenu>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
            <DialogDescription>
              删除「{currentProject.name}」会移除本地项目记录、相关 Alert
              记录，以及 Smart X 管理目录里的本地 clone。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-medium">{currentProject.repoConfig.repoName}</p>
            <p className="mt-1 break-all text-muted-foreground">
              {currentProject.repoConfig.managedRepoPath}
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(false)}
              type="button"
              variant="ghost"
            >
              取消
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={confirmDeleteProject}
              type="button"
              variant="destructive"
            >
              删除项目
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
