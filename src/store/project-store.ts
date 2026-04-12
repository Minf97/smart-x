import { create } from "zustand";
import type { Project } from "@/types/project";

// 状态结构
interface ProjectStore {
  currentProjectId: string | null;
  hydrateProjects: (projects: Project[]) => void;
  projects: Project[];
  setCurrentProjectId: (projectId: string) => void;
  updateProject: (project: Project) => void;
}

// 首项选择
function resolveProjectId(
  projects: Project[],
  currentProjectId: string | null
) {
  if (projects.length === 0) {
    return null;
  }

  if (!currentProjectId) {
    return projects[0].id;
  }

  const exists = projects.some((project) => project.id === currentProjectId);

  return exists ? currentProjectId : projects[0].id;
}

// 项目仓库
export const useProjectStore = create<ProjectStore>((set) => ({
  currentProjectId: null,
  hydrateProjects(projects) {
    set((state) => ({
      currentProjectId: resolveProjectId(projects, state.currentProjectId),
      projects,
    }));
  },
  projects: [],
  setCurrentProjectId(currentProjectId) {
    set((state) => {
      const exists = state.projects.some(
        (project) => project.id === currentProjectId
      );

      if (!exists) {
        throw new Error("Project not found.");
      }

      return {
        currentProjectId,
      };
    });
  },
  updateProject(project) {
    set((state) => {
      const index = state.projects.findIndex((item) => item.id === project.id);

      if (index === -1) {
        throw new Error("Project not found.");
      }

      const projects = [...state.projects];
      projects[index] = project;

      return {
        projects,
      };
    });
  },
}));
