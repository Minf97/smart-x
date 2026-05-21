import type { Item } from "@shared/types/alert";
import type { CodeRequest, Project } from "@shared/types/project";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import AutoModeRunner from "@/components/dashboard/auto-mode-runner";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import "@/localization/i18n";
import { useAutoModeStore } from "@/store/auto-mode-store";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";

const apiMocks = vi.hoisted(() => ({
  analyzeAlert: vi.fn(),
  listAlerts: vi.fn(),
  pollCreateAlertRequest: vi.fn(),
  startCreateAlertRequest: vi.fn(),
  syncAlerts: vi.fn(),
  updateAlertStatus: vi.fn(),
}));

vi.mock("@/api/alerts", () => apiMocks);

// 构造请求
function createRequest(alert: Item): CodeRequest {
  return {
    baseBranch: "main",
    branchName: `auto/${alert.id}`,
    createdAt: "2026-05-21T00:00:00.000Z",
    provider: "gitlab",
    remoteId: "1",
    repoName: "demo/app",
    state: "open",
    title: `[${alert.id}] ${alert.title}`,
    updatedAt: "2026-05-21T00:01:00.000Z",
    url: `https://gitlab.example.com/demo/app/-/merge_requests/${alert.id}`,
  };
}

// 构造报警
function createAlert(): Item {
  return {
    createdAt: "2026-05-21T00:00:00.000Z",
    detail: {
      error: {
        groupKey: "auto-alert",
        message: "Cannot read properties of undefined",
        rawAlert: {},
        stack: "TypeError at src/App.tsx:12:4",
      },
      summary: {
        occurrenceCount: 1,
        source: "test",
      },
    },
    groupKey: "auto-alert",
    id: "AL-1",
    isRead: false,
    isSyncedLocal: true,
    priority: "P1",
    projectId: "project-1",
    readAt: null,
    status: "backlog",
    syncedAt: "2026-05-21T00:00:00.000Z",
    title: "Auto alert",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

// 构造项目
function createProject(requestMap: Project["requestMap"] = {}): Project {
  return {
    aiConfig: {
      apiKey: "sk-test",
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
    },
    createdAt: "2026-05-21T00:00:00.000Z",
    id: "project-1",
    name: "Demo",
    repoConfig: {
      baseBranch: "main",
      hasToken: true,
      instanceUrl: "https://gitlab.example.com",
      managedRepoPath: "/Users/test/workspace/demo",
      provider: "gitlab",
      repoId: "1",
      repoName: "demo/app",
    },
    requestMap,
    updatedAt: "2026-05-21T00:00:00.000Z",
    webhookEnabled: true,
    webhookId: "webhook-1",
    webhookUrl: "https://example.com/webhook-1",
  };
}

// 渲染执行器
function renderRunner(queryClient: QueryClient) {
  return render(<AutoModeRunner />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  apiMocks.analyzeAlert.mockReset();
  apiMocks.listAlerts.mockReset();
  apiMocks.pollCreateAlertRequest.mockReset();
  apiMocks.startCreateAlertRequest.mockReset();
  apiMocks.syncAlerts.mockReset();
  apiMocks.updateAlertStatus.mockReset();
  useAutoModeStore.setState({ enabled: false });
  useProjectStore.setState({
    currentProjectId: null,
    projects: [],
  });
});

test("analyzes alert and creates request in automatic mode", async () => {
  const alert = createAlert();
  const analyzedAlert = {
    ...alert,
    detail: {
      ...alert.detail,
      analysis: {
        businessImpact: {
          actualBehavior: "页面抛错",
          affectedSurface: "App",
          affectsUser: true,
          confidence: "high",
          evidence: "堆栈命中 App.tsx",
          expectedBehavior: "页面正常渲染",
        },
        fixDecision: {
          action: "create_request",
          reason: "用户可见页面失败",
        },
        impact: "影响当前页面",
        rootCause: "空值未保护",
      },
    },
    status: "in_progress",
  } satisfies Item;
  const request = createRequest(alert);
  const project = createProject();
  const updatedProject = createProject({
    [alert.id]: request,
  });
  const data = {
    alerts: [alert],
    projects: [project],
  } satisfies DashboardData;
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  apiMocks.listAlerts.mockResolvedValue(data);
  apiMocks.analyzeAlert.mockResolvedValue(analyzedAlert);
  apiMocks.startCreateAlertRequest.mockResolvedValue({
    errorMessage: null,
    progress: 8,
    project: null,
    sessionId: "session-1",
    status: "pending",
    step: "loadAlert",
  });
  apiMocks.pollCreateAlertRequest.mockResolvedValue({
    errorMessage: null,
    progress: 100,
    project: updatedProject,
    sessionId: "session-1",
    status: "completed",
    step: "done",
  });
  useProjectStore.setState({
    currentProjectId: project.id,
    projects: [project],
  });
  useAutoModeStore.setState({ enabled: true });

  renderRunner(queryClient);

  await waitFor(() => {
    expect(apiMocks.analyzeAlert).toHaveBeenCalledWith(alert.id);
  });
  await waitFor(() => {
    expect(apiMocks.startCreateAlertRequest).toHaveBeenCalledWith(alert.id);
  });
  await waitFor(() => {
    const cached = queryClient.getQueryData<DashboardData>(ALERTS_QUERY_KEY);

    expect(cached?.alerts[0]?.status).toBe("in_review");
    expect(cached?.projects[0]?.requestMap[alert.id]).toMatchObject({
      state: "open",
    });
  });
  expect(useProjectStore.getState().projects[0]?.requestMap[alert.id]).toBe(
    request
  );
});

test("keeps non-impacting alert in backlog in automatic mode", async () => {
  const alert = createAlert();
  const analyzedAlert = {
    ...alert,
    detail: {
      ...alert.detail,
      analysis: {
        businessImpact: {
          actualBehavior: "控制台记录一次异常",
          affectedSurface: "后台监控",
          affectsUser: false,
          confidence: "medium",
          evidence: "没有用户可见页面或交互失败证据",
          expectedBehavior: "用户界面保持可用",
        },
        fixDecision: {
          action: "keep_backlog",
          reason: "未证明影响实际业务",
        },
        impact: "未证明影响用户可见行为",
        rootCause: "监控捕获到非关键路径异常",
      },
    },
    status: "in_progress",
  } satisfies Item;
  const backlogAlert = {
    ...analyzedAlert,
    status: "backlog",
  } satisfies Item;
  const project = createProject();
  const data = {
    alerts: [alert],
    projects: [project],
  } satisfies DashboardData;
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  apiMocks.listAlerts.mockResolvedValue(data);
  apiMocks.analyzeAlert.mockResolvedValue(analyzedAlert);
  apiMocks.updateAlertStatus.mockResolvedValue(backlogAlert);
  useProjectStore.setState({
    currentProjectId: project.id,
    projects: [project],
  });
  useAutoModeStore.setState({ enabled: true });

  renderRunner(queryClient);

  await waitFor(() => {
    expect(apiMocks.updateAlertStatus).toHaveBeenCalledWith(
      alert.id,
      "backlog"
    );
  });

  expect(apiMocks.startCreateAlertRequest).not.toHaveBeenCalled();
  await waitFor(() => {
    const cached = queryClient.getQueryData<DashboardData>(ALERTS_QUERY_KEY);

    expect(cached?.alerts[0]?.status).toBe("backlog");
    expect(cached?.alerts[0]?.detail.analysis?.fixDecision?.action).toBe(
      "keep_backlog"
    );
  });
});
