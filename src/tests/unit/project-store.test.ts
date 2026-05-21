import type { Project } from "@shared/types/project";
import { beforeEach, describe, expect, test } from "vitest";
import { useProjectStore } from "@/store/project-store";

// 构造项目
function createProject(input: {
  id: string;
  managedRepoPath?: string;
}): Project {
  return {
    aiConfig: {
      apiKey: "sk-test",
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
    },
    createdAt: "2026-05-21T00:00:00.000Z",
    id: input.id,
    name: input.id,
    repoConfig: {
      baseBranch: "main",
      hasToken: true,
      instanceUrl: "https://github.com",
      managedRepoPath: input.managedRepoPath ?? "",
      provider: "github",
      repoName: `demo/${input.id}`,
    },
    requestMap: {},
    updatedAt: "2026-05-21T00:00:00.000Z",
    webhookEnabled: true,
    webhookId: `webhook-${input.id}`,
    webhookUrl: `https://example.com/${input.id}`,
  };
}

describe("project store", () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProjectId: null,
      projects: [],
    });
  });

  test("prefers configured project when hydrating without selection", () => {
    useProjectStore.getState().hydrateProjects([
      createProject({ id: "mock-client" }),
      createProject({
        id: "real-project",
        managedRepoPath: "/Users/test/workspace/demo",
      }),
    ]);

    expect(useProjectStore.getState().currentProjectId).toBe("real-project");
  });

  test("keeps existing selection when hydrating current project", () => {
    useProjectStore.setState({
      currentProjectId: "mock-client",
      projects: [createProject({ id: "mock-client" })],
    });

    useProjectStore.getState().hydrateProjects([
      createProject({ id: "mock-client" }),
      createProject({
        id: "real-project",
        managedRepoPath: "/Users/test/workspace/demo",
      }),
    ]);

    expect(useProjectStore.getState().currentProjectId).toBe("mock-client");
  });
});
