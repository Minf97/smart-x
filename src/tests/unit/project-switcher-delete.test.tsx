import type { Project } from "@shared/types/project";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import ProjectSwitcher from "@/components/dashboard/project-switcher";
import "@/localization/i18n";
import { useProjectStore } from "@/store/project-store";

const deleteProjectMock = vi.hoisted(() => vi.fn(async () => undefined));
const navigateMock = vi.hoisted(() => vi.fn());
const clientProjectPattern = /client/;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/api/alerts", () => ({
  deleteProject: deleteProjectMock,
}));

vi.mock("@/components/dashboard/create-project-dialog", () => ({
  default: () => null,
}));

function createProject(id: string, name: string): Project {
  return {
    aiConfig: {
      apiKey: "sk-test",
      baseUrl: "https://codex-api.packycode.com/v1",
      model: "gpt5.4",
    },
    createdAt: "2026-05-21T00:00:00.000Z",
    id,
    name,
    repoConfig: {
      baseBranch: "main",
      hasToken: true,
      instanceUrl: "https://github.com",
      managedRepoPath: `/Users/test/Documents/workspace/managed-repos/github/${name}`,
      provider: "github",
      repoName: `demo/${name}`,
    },
    requestMap: {},
    updatedAt: "2026-05-21T00:00:00.000Z",
    webhookEnabled: true,
    webhookId: `webhook-${id}`,
    webhookUrl: `https://example.com/${id}`,
  };
}

function renderSwitcher() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return render(<ProjectSwitcher />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  deleteProjectMock.mockClear();
  navigateMock.mockClear();
  useProjectStore.setState({
    currentProjectId: "client",
    projects: [
      createProject("client", "client"),
      createProject("server", "server"),
    ],
  });
});

test("deletes current project from switcher", async () => {
  const user = userEvent.setup();
  renderSwitcher();

  await user.click(screen.getByRole("button", { name: clientProjectPattern }));
  await user.click(await screen.findByText("删除当前项目"));
  await user.click(screen.getByRole("button", { name: "删除项目" }));

  await waitFor(() => {
    expect(deleteProjectMock.mock.calls[0]?.[0]).toBe("client");
  });

  expect(useProjectStore.getState().currentProjectId).toBe("server");
  expect(useProjectStore.getState().projects).toHaveLength(1);
});
