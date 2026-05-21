import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import CreateProjectDialog, {
  CreateProjectInline,
} from "@/components/dashboard/create-project-dialog";
import { ProjectCreateProgressSection } from "@/components/dashboard/project-create-progress-section";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/localization/i18n";
import { useProjectStore } from "@/store/project-store";

const openExternalLinkMock = vi.hoisted(() => vi.fn());
const gitlabClientIdHelpPattern = /Create an OAuth application in GitLab/;
const gitlabRedirectUriPattern =
  /http:\/\/127\.0\.0\.1:45913\/oauth\/gitlab\/callback/;

class ResizeObserverMock {
  disconnect() {
    return undefined;
  }
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
}

globalThis.ResizeObserver = ResizeObserverMock;

vi.mock("@/actions/shell", () => ({
  copyText: vi.fn(),
  openExternalLink: openExternalLinkMock,
}));

vi.mock("@/api/alerts", () => ({
  getGithubAuth: vi.fn(async () => ({
    avatarUrl: null,
    connected: true,
    login: "octo",
    name: "Octo",
  })),
  getGitlabAuth: vi.fn(async () => ({
    avatarUrl: null,
    baseUrl: null,
    clientId: null,
    connected: false,
    login: null,
    name: null,
  })),
  listGithubRepos: vi.fn(async () => [
    {
      defaultBranch: "main",
      fullName: "smart-x/web",
      id: 101,
      name: "web",
      private: true,
    },
  ]),
  listGitlabRepos: vi.fn(async () => []),
  pollCreateProject: vi.fn(),
  pollGithubDeviceFlow: vi.fn(),
  pollGitlabOauthFlow: vi.fn(),
  startCreateProject: vi.fn(),
  startGithubDeviceFlow: vi.fn(),
  startGitlabOauthFlow: vi.fn(),
}));

// 弹窗环境
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<CreateProjectDialog onOpenChange={vi.fn()} open />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    ),
  });
}

// 内嵌环境
function renderInline() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <CreateProjectInline onCancel={vi.fn()} onProjectCreated={vi.fn()} />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>{children}</TooltipProvider>
        </QueryClientProvider>
      ),
    }
  );
}

beforeEach(() => {
  useProjectStore.setState({
    currentProjectId: null,
    projects: [],
  });
});

test("keeps project name and base branch automatic", async () => {
  renderDialog();

  expect(await screen.findByText("New Project")).toBeInTheDocument();
  expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Base branch")).not.toBeInTheDocument();
  expect(
    await screen.findByText(
      "Project name and base branch are filled from the selected repository."
    )
  ).toBeInTheDocument();
});

test("shows provider logo in repository list", async () => {
  const user = userEvent.setup();
  renderDialog();

  await user.click(await screen.findByText("smart-x/web"));

  expect(screen.getAllByLabelText("github").length).toBeGreaterThan(1);
});

test("renders create project flow inline without dialog shell", async () => {
  renderInline();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(await screen.findByLabelText("Provider")).toBeInTheDocument();
  expect(await screen.findByText("smart-x/web")).toBeInTheDocument();
});

test("explains how to get gitlab client id", async () => {
  const user = userEvent.setup();
  renderInline();

  await user.selectOptions(await screen.findByLabelText("Provider"), "gitlab");
  await user.type(
    screen.getByLabelText("GitLab URL"),
    "https://gitlab.example.com/"
  );
  await user.hover(screen.getByLabelText("How to get GitLab Client ID"));

  expect(
    await screen.findAllByText(gitlabClientIdHelpPattern)
  ).not.toHaveLength(0);
  expect(screen.getAllByText(gitlabRedirectUriPattern)).not.toHaveLength(0);

  await user.click(
    screen.getAllByRole("button", { name: "Open OAuth applications" })[0]
  );

  expect(openExternalLinkMock).toHaveBeenCalledWith(
    "https://gitlab.example.com/oauth/applications"
  );
});

test("keeps create progress focused on current step", () => {
  render(
    <ProjectCreateProgressSection
      progress={{
        errorMessage: "Remote project backend is unreachable.",
        progress: 80,
        project: null,
        sessionId: "session-1",
        status: "failed",
        step: "cloneManagedRepo",
      }}
      surface="inline"
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <TooltipProvider>{children}</TooltipProvider>
      ),
    }
  );

  expect(screen.getByText("Cloning repository locally")).toBeInTheDocument();
  expect(screen.queryByText("cloneManagedRepo")).not.toBeInTheDocument();
  expect(
    screen.getByText("Remote project backend is unreachable.")
  ).toBeInTheDocument();
});
