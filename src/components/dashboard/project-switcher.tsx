import { SiGithub, SiGitlab } from "@icons-pack/react-simple-icons";
import type { RequestProvider } from "@shared/types/project";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentProject, useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project-store";
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
  const [open, setOpen] = useState(false);
  const currentProject = useCurrentProject();
  const { projects } = useProjects();
  const setProjectId = useProjectStore((state) => state.setCurrentProjectId);

  // 打开新建
  function handleCreateProject(event: Event) {
    event.preventDefault();
    setOpen(true);
  }

  return (
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
              <span className="block truncate font-medium">{project.name}</span>
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
      </DropdownMenuContent>
      <CreateProjectDialog onOpenChange={setOpen} open={open} />
    </DropdownMenu>
  );
}
