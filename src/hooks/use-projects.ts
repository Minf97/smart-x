import { useMemo } from "react";
import { useProjectStore } from "@/store/project-store";
import type { Project } from "@/types/project";

// 当前项目
export function getCurrentProject(
  projects: Project[],
  currentProjectId: string | null
) {
  if (!currentProjectId) {
    return null;
  }

  return projects.find((project) => project.id === currentProjectId) ?? null;
}

// 项目视图
export function useProjects() {
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useMemo(
    () => getCurrentProject(projects, currentProjectId),
    [currentProjectId, projects]
  );

  return {
    currentProject,
    currentProjectId,
    projects,
  };
}

// 当前项目
export function useCurrentProject() {
  const { currentProject } = useProjects();

  if (!currentProject) {
    throw new Error("Current project not found.");
  }

  return currentProject;
}
