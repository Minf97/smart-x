import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const createProjectNamePattern = /新建项目/;
const enterDashboardPattern = /进入 Dashboard/;
const projectState = vi.hoisted(() => ({
  currentProject: null as null | {
    aiConfig: {
      apiKey: string;
      baseUrl: string;
      model: string;
    };
    createdAt: string;
    id: string;
    name: string;
    repoConfig: {
      baseBranch: string;
      hasToken: boolean;
      instanceUrl: string;
      managedRepoPath: string;
      provider: "github";
      repoName: string;
    };
    requestMap: Record<string, never>;
    updatedAt: string;
    webhookEnabled: boolean;
    webhookId: string;
    webhookUrl: string;
  },
}));

vi.stubEnv("AI_BASE_URL", "https://codex-api.packycode.com/v1");
vi.stubEnv("AI_MODEL", "gpt5.4");
vi.stubEnv("AI_API_KEY", "sk-test");

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => navigateMock,
}));

vi.mock("@/actions/auth-session", () => ({
  completeOnboarding: vi.fn(),
  isSignedIn: () => true,
}));

vi.mock("@/actions/shell", () => ({
  copyText: vi.fn(),
}));

vi.mock("@/api/alerts", () => ({
  syncAlerts: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/components/dashboard/create-project-dialog", () => ({
  CreateProjectInline: () => <div>inline create project form</div>,
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({
    currentProject: projectState.currentProject,
  }),
}));

import "@/localization/i18n";
import { OnboardingPage } from "@/routes/onboarding";

// 查询环境
function renderOnboarding() {
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

  return render(<OnboardingPage />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

test("renders only current onboarding step", () => {
  projectState.currentProject = null;
  const { container } = renderOnboarding();
  const page = container.firstElementChild;

  expect(page).toHaveClass("h-full", "overflow-y-auto", "items-center");
  expect(
    screen.queryByRole("heading", {
      name: "连接项目，配置 AI，再接入 Webhook",
    })
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Onboarding")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "稍后设置" })
  ).not.toBeInTheDocument();
  expect(screen.getByText("Step 1 / 4")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "新建项目" })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "AI Settings" })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "生成 Webhook" })
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "新建项目" }).closest("section")
  ).toHaveClass("smartx-step-enter");
});

test("advances after clicking create project", async () => {
  const user = userEvent.setup();
  projectState.currentProject = null;
  renderOnboarding();

  await user.click(
    screen.getByRole("button", { name: createProjectNamePattern })
  );

  expect(screen.getByText("Step 2 / 4")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "连接代码仓库" })
  ).toBeInTheDocument();
  expect(screen.getByText("inline create project form")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "新建项目" })
  ).not.toBeInTheDocument();
});

test("renders ai settings inline after project creation", () => {
  projectState.currentProject = {
    aiConfig: {
      apiKey: "",
      baseUrl: "",
      model: "",
    },
    createdAt: "2026-05-21T00:00:00.000Z",
    id: "project-1",
    name: "Demo",
    repoConfig: {
      baseBranch: "main",
      hasToken: true,
      instanceUrl: "https://github.com",
      managedRepoPath: "",
      provider: "github",
      repoName: "demo/web",
    },
    requestMap: {},
    updatedAt: "2026-05-21T00:00:00.000Z",
    webhookEnabled: true,
    webhookId: "webhook-1",
    webhookUrl: "https://example.com/ingest/webhook-1",
  };

  renderOnboarding();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Step 3 / 4")).toBeInTheDocument();
  expect(screen.getByLabelText("Base URL")).toHaveValue(
    "https://codex-api.packycode.com/v1"
  );
  expect(screen.getByLabelText("Model")).toHaveValue("gpt5.4");
  expect(screen.getByLabelText("API Key")).toHaveValue("sk-test");
  expect(
    screen.getByRole("button", { name: "保存并继续" })
  ).toBeInTheDocument();
});

test("opens webhook step for configured projects", async () => {
  const user = userEvent.setup();
  projectState.currentProject = {
    aiConfig: {
      apiKey: "sk-test",
      baseUrl: "https://codex-api.packycode.com/v1",
      model: "gpt5.4",
    },
    createdAt: "2026-05-21T00:00:00.000Z",
    id: "project-1",
    name: "Demo",
    repoConfig: {
      baseBranch: "main",
      hasToken: true,
      instanceUrl: "https://github.com",
      managedRepoPath: "",
      provider: "github",
      repoName: "demo/web",
    },
    requestMap: {},
    updatedAt: "2026-05-21T00:00:00.000Z",
    webhookEnabled: true,
    webhookId: "webhook-1",
    webhookUrl: "https://example.com/ingest/webhook-1",
  };

  renderOnboarding();

  expect(screen.getByText("Step 4 / 4")).toBeInTheDocument();
  expect(
    screen.getByText("https://example.com/ingest/webhook-1")
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: enterDashboardPattern }));

  expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard" });
});
