import type { Project } from "@shared/types/project";
import { create } from "zustand";

// 状态结构
interface ProjectStore {
  addProject: (project: Project) => void;
  currentProjectId: string | null;
  hydrateProjects: (projects: Project[]) => void;
  projects: Project[];
  removeProject: (projectId: string) => void;
  setCurrentProjectId: (projectId: string) => void;
  updateProject: (project: Project) => void;
}

// 首项选择
function getDefaultProjectId(projects: Project[]) {
  const configured = projects.find(
    (project) => project.repoConfig.managedRepoPath.trim().length > 0
  );

  return configured?.id ?? projects[0].id;
}

// 解析选择
function resolveProjectId(
  projects: Project[],
  currentProjectId: string | null
) {
  if (projects.length === 0) {
    return null;
  }

  if (!currentProjectId) {
    return getDefaultProjectId(projects);
  }

  const exists = projects.some((project) => project.id === currentProjectId);

  return exists ? currentProjectId : getDefaultProjectId(projects);
}

// 项目仓库
export const useProjectStore = create<ProjectStore>((set) => ({
  // 新建项目
  addProject(project) {
    set((state) => ({
      currentProjectId: project.id,
      projects: [...state.projects, project],
    }));
  },
  currentProjectId: null,
  // 初始化项目
  hydrateProjects(projects) {
    set((state) => ({
      currentProjectId: resolveProjectId(projects, state.currentProjectId),
      projects,
    }));
  },
  projects: [],
  removeProject(projectId) {
    set((state) => {
      const projects = state.projects.filter(
        (project) => project.id !== projectId
      );

      return {
        currentProjectId: resolveProjectId(projects, state.currentProjectId),
        projects,
      };
    });
  },
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
