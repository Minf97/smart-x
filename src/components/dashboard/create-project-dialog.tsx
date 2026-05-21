import {
  DEFAULT_PROJECT_AI_CONFIG,
  type Project,
  type ProjectCreateProgress,
  type ProjectInput,
  REQUEST_PROVIDER_LABELS,
  type RequestProvider,
} from "@shared/types/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { copyText, openExternalLink } from "@/actions/shell";
import {
  getGithubAuth,
  getGitlabAuth,
  listGithubRepos,
  listGitlabRepos,
  pollCreateProject,
  pollGithubDeviceFlow,
  pollGitlabOauthFlow,
  startCreateProject,
  startGithubDeviceFlow,
  startGitlabOauthFlow,
} from "@/api/alerts";
import { ProjectCreateProgressSection } from "@/components/dashboard/project-create-progress-section";
import { RepoSelectDropdown } from "@/components/dashboard/repo-select-dropdown";
import ExternalLink from "@/components/external-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useCurrentProjectRepo } from "@/hooks/use-projects";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import type { GithubDeviceFlow, GithubRepoItem } from "@/types/github";
import type { GitlabOauthFlow, GitlabRepoItem } from "@/types/gitlab";

const GITHUB_AUTH_QUERY_KEY = ["github-auth"] as const;
const GITHUB_REPOS_QUERY_KEY = ["github-repos"] as const;
const GITLAB_AUTH_QUERY_KEY = ["gitlab-auth"] as const;
const GITLAB_REPOS_QUERY_KEY = ["gitlab-repos"] as const;
const PROJECT_CREATE_QUERY_KEY = ["project-create"] as const;

interface CreateProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: Project) => void;
  open: boolean;
}

interface CreateProjectInlineProps {
  onCancel: () => void;
  onProjectCreated: (project: Project) => void;
}

interface ProviderTexts {
  connectButton: string;
  connectDone: string;
  connectedAs: string;
  connectFailed: string;
  connectHint: string;
  connectStarted: string;
  connectSuccess: string;
  connectTitle: string;
  openPage: string;
  userCodeLabel: string;
  waiting: string;
}

interface ProviderStatusCardProps {
  connectDisabled: boolean;
  connected: boolean;
  connectPending: boolean;
  flow: GithubDeviceFlow | GitlabOauthFlow | null;
  login: string | null | undefined;
  onConnect: () => void;
  onOpen: () => void;
  provider: RequestProvider;
  texts: ProviderTexts;
}

type RepoOption = GithubRepoItem | GitlabRepoItem;
type CreateProjectSurface = "dialog" | "inline";

// 区域标题
function CreateProjectHeader({
  description,
  surface,
  title,
}: {
  description: string;
  surface: CreateProjectSurface;
  title: string;
}) {
  if (surface === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-muted-foreground text-xs leading-5">{description}</p>
    </div>
  );
}

// 区域底部
function CreateProjectFooter({
  children,
  surface,
}: {
  children: ReactNode;
  surface: CreateProjectSurface;
}) {
  if (surface === "dialog") {
    return <DialogFooter>{children}</DialogFooter>;
  }

  return <div className="flex justify-end gap-2">{children}</div>;
}

// 表单标题
function CreateProjectFormHeader({
  surface,
  t,
}: {
  surface: CreateProjectSurface;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (surface === "inline") {
    return null;
  }

  return (
    <CreateProjectHeader
      description={t("dashboard.createProjectHint")}
      surface={surface}
      title={t("dashboard.createProject")}
    />
  );
}

// 外层承载
function CreateProjectShell({
  children,
  onClose,
  open,
  surface,
}: {
  children: ReactNode;
  onClose: (open: boolean) => void;
  open: boolean;
  surface: CreateProjectSurface;
}) {
  if (surface === "inline") {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <Dialog onOpenChange={onClose} open={open}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

// 默认值
function getDefaultInput(provider: RequestProvider = "github"): ProjectInput {
  return {
    aiConfig: { ...DEFAULT_PROJECT_AI_CONFIG },
    name: "",
    repoConfig: {
      baseBranch: "",
      managedRepoPath: "",
      provider,
      repoId: "",
      repoName: "",
      token: "",
    },
  };
}

// 写缓存
function appendProjectCache(data: DashboardData | undefined, project: Project) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    projects: [...data.projects, project],
  };
}

// 套仓库值
function applyRepoInput(
  provider: RequestProvider,
  repo: RepoOption
): ProjectInput {
  return {
    aiConfig: { ...DEFAULT_PROJECT_AI_CONFIG },
    name: repo.name,
    repoConfig: {
      baseBranch: repo.defaultBranch,
      managedRepoPath: "",
      provider,
      repoId: String(repo.id), // 存储项目 ID
      repoName: repo.fullName,
      token: "",
    },
  };
}

// 平台文案
function getProviderTexts(
  provider: RequestProvider,
  t: (key: string, options?: Record<string, unknown>) => string
): ProviderTexts {
  if (provider === "gitlab") {
    return {
      connectButton: t("dashboard.connectGitlab"),
      connectDone: t("dashboard.connectGitlabDone"),
      connectFailed: t("dashboard.connectGitlabFailed"),
      connectHint: t("dashboard.connectGitlabHint"),
      connectStarted: t("dashboard.connectGitlabStarted"),
      connectSuccess: t("dashboard.connectGitlabSuccess"),
      connectTitle: t("dashboard.connectGitlabTitle"),
      connectedAs: t("dashboard.connectedAs", {
        login: REQUEST_PROVIDER_LABELS.gitlab.toLowerCase(),
      }),
      openPage: t("dashboard.openGitlab"),
      userCodeLabel: t("dashboard.githubUserCode"),
      waiting: t("dashboard.waitingGitlab"),
    };
  }

  return {
    connectButton: t("dashboard.connectGithub"),
    connectDone: t("dashboard.connectGithubDone"),
    connectFailed: t("dashboard.connectGithubFailed"),
    connectHint: t("dashboard.connectGithubHint"),
    connectStarted: t("dashboard.connectGithubStarted"),
    connectSuccess: t("dashboard.connectGithubSuccess"),
    connectTitle: t("dashboard.connectGithubTitle"),
    connectedAs: t("dashboard.connectedAs", {
      login: REQUEST_PROVIDER_LABELS.github.toLowerCase(),
    }),
    openPage: t("dashboard.openGithub"),
    userCodeLabel: t("dashboard.githubUserCode"),
    waiting: t("dashboard.waitingGithub"),
  };
}

// 成功视图
function WebhookReadySection({
  onCopy,
  onDone,
  project,
  surface,
  t,
}: {
  onCopy: () => Promise<void>;
  onDone: () => void;
  project: Project;
  surface: CreateProjectSurface;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-4">
      <CreateProjectHeader
        description={t("dashboard.webhookReady")}
        surface={surface}
        title={t("dashboard.createProject")}
      />

      <div className="space-y-3">
        <label className="block space-y-1.5" htmlFor="project-webhook">
          <span className="font-medium text-xs">
            {t("dashboard.webhookUrl")}
          </span>
          <Input disabled id="project-webhook" value={project.webhookUrl} />
        </label>
      </div>

      <CreateProjectFooter surface={surface}>
        <Button onClick={onCopy} type="button" variant="outline">
          {t("dashboard.copy")}
        </Button>
        <Button onClick={onDone} type="button">
          {t("dashboard.done")}
        </Button>
      </CreateProjectFooter>
    </div>
  );
}

// 查仓库
function findRepoById<T extends RepoOption>(
  repos: T[] | undefined,
  repoId: string
) {
  return repos?.find((repo) => String(repo.id) === repoId) ?? null;
}

// 打开授权
function openAuthorizePage(input: {
  githubFlow: GithubDeviceFlow | null;
  gitlabFlow: GitlabOauthFlow | null;
  provider: RequestProvider;
}) {
  if (input.provider === "gitlab") {
    if (input.gitlabFlow) {
      openExternalLink(input.gitlabFlow.authorizeUrl);
    }

    return;
  }

  if (input.githubFlow) {
    openExternalLink(input.githubFlow.verificationUri);
  }
}

// 复制链接
async function copyWebhookUrl(
  project: Project | null,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (!project) {
    return;
  }

  await copyText(project.webhookUrl);
  toast.success(t("dashboard.copyWebhookSuccess"));
}

// 当前进度
function getActiveCreateProgress(input: {
  createProgress: ProjectCreateProgress | null;
  createSessionId: string | null;
  pollCreateData: ProjectCreateProgress | undefined;
}) {
  return input.createSessionId
    ? (input.pollCreateData ?? input.createProgress)
    : input.createProgress;
}

// 是否禁用
function isCreateDisabled(input: {
  activeCreateProgress: ProjectCreateProgress | null;
  connected: boolean;
  isPending: boolean;
  name: string;
  repoName: string;
  baseBranch: string;
}) {
  return (
    input.isPending ||
    input.activeCreateProgress?.status === "pending" ||
    !input.connected ||
    input.name.trim().length === 0 ||
    input.repoName.trim().length === 0 ||
    input.baseBranch.trim().length === 0
  );
}

// GitLab 默认值
function useGitlabDefaultFields(input: {
  baseUrl: string | null | undefined;
  clientId: string | null | undefined;
  provider: RequestProvider;
  setGitlabBaseUrl: (value: string | ((current: string) => string)) => void;
  setGitlabClientId: (value: string | ((current: string) => string)) => void;
}) {
  useEffect(() => {
    if (!(input.provider === "gitlab" && input.baseUrl)) {
      return;
    }

    input.setGitlabBaseUrl((current) => current || input.baseUrl || "");
  }, [input]);

  useEffect(() => {
    if (!(input.provider === "gitlab" && input.clientId)) {
      return;
    }

    input.setGitlabClientId((current) => current || input.clientId || "");
  }, [input]);
}

// 授权轮询回写
function useProviderAuthEffects(input: {
  githubFlow: GithubDeviceFlow | null;
  gitlabFlow: GitlabOauthFlow | null;
  pollGithubError: Error | null;
  pollGithubStatus: "connected" | "pending" | undefined;
  pollGitlabError: Error | null;
  pollGitlabStatus: "connected" | "pending" | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
  setGithubFlow: (flow: GithubDeviceFlow | null) => void;
  setGitlabFlow: (flow: GitlabOauthFlow | null) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  useEffect(() => {
    if (input.pollGithubStatus !== "connected") {
      return;
    }

    input.setGithubFlow(null);
    input.queryClient.invalidateQueries({
      queryKey: GITHUB_AUTH_QUERY_KEY,
    });
    input.queryClient.invalidateQueries({
      queryKey: GITHUB_REPOS_QUERY_KEY,
    });
    toast.success(input.t("dashboard.connectGithubSuccess"));
  }, [input]);

  useEffect(() => {
    if (input.pollGitlabStatus !== "connected") {
      return;
    }

    input.setGitlabFlow(null);
    input.queryClient.invalidateQueries({
      queryKey: GITLAB_AUTH_QUERY_KEY,
    });
    input.queryClient.invalidateQueries({
      queryKey: GITLAB_REPOS_QUERY_KEY,
    });
    toast.success(input.t("dashboard.connectGitlabSuccess"));
  }, [input]);

  useEffect(() => {
    if (!(input.githubFlow && input.pollGithubError)) {
      return;
    }

    input.setGithubFlow(null);
    toast.error(
      input.pollGithubError instanceof Error
        ? input.pollGithubError.message
        : input.t("dashboard.connectGithubFailed")
    );
  }, [input]);

  useEffect(() => {
    if (!(input.gitlabFlow && input.pollGitlabError)) {
      return;
    }

    input.setGitlabFlow(null);
    toast.error(
      input.pollGitlabError instanceof Error
        ? input.pollGitlabError.message
        : input.t("dashboard.connectGitlabFailed")
    );
  }, [input]);
}

// 默认仓库
function useDefaultRepoSelection(input: {
  provider: RequestProvider;
  repos: RepoOption[] | undefined;
  selectedRepoId: string;
  setInput: (input: ProjectInput) => void;
  setSelectedRepoId: (repoId: string) => void;
}) {
  useEffect(() => {
    if (!(input.repos && input.repos.length > 0)) {
      return;
    }

    const selectedRepo = findRepoById(input.repos, input.selectedRepoId);

    if (
      selectedRepo &&
      !("disabled" in selectedRepo && selectedRepo.disabled)
    ) {
      return;
    }

    const repo = input.repos.find(
      (item) => !("disabled" in item && item.disabled)
    );

    if (!repo) {
      input.setSelectedRepoId("");
      return;
    }

    input.setSelectedRepoId(String(repo.id));
    input.setInput(applyRepoInput(input.provider, repo));
  }, [input]);
}

// 创建回调
function useProjectCreateState({
  addProject,
  pollCreateData,
  pollCreateError,
  queryClient,
  setCreateProgress,
  setCreateSessionId,
  setCreatedProject,
  setGithubFlow,
  setGitlabFlow,
  setInput,
  setSelectedRepoId,
  onProjectCreated,
  t,
}: {
  addProject: (project: Project) => void;
  onProjectCreated?: (project: Project) => void;
  pollCreateData: ProjectCreateProgress | undefined;
  pollCreateError: Error | null;
  queryClient: ReturnType<typeof useQueryClient>;
  setCreateProgress: (progress: ProjectCreateProgress | null) => void;
  setCreateSessionId: (sessionId: string | null) => void;
  setCreatedProject: (project: Project | null) => void;
  setGithubFlow: (flow: GithubDeviceFlow | null) => void;
  setGitlabFlow: (flow: GitlabOauthFlow | null) => void;
  setInput: (input: ProjectInput) => void;
  setSelectedRepoId: (repoId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  useEffect(() => {
    if (!pollCreateData) {
      return;
    }

    setCreateProgress(pollCreateData);
  }, [pollCreateData, setCreateProgress]);

  useEffect(() => {
    if (!(pollCreateData?.status === "completed" && pollCreateData.project)) {
      return;
    }

    const project = pollCreateData.project;

    queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
      appendProjectCache(data, project)
    );
    addProject(project);
    setCreatedProject(project);
    toast.success(t("dashboard.createProjectSuccess"));
    setGithubFlow(null);
    setGitlabFlow(null);
    setInput(getDefaultInput());
    setSelectedRepoId("");
    setCreateSessionId(null);
    onProjectCreated?.(project);
  }, [
    addProject,
    onProjectCreated,
    pollCreateData,
    queryClient,
    setCreateSessionId,
    setCreatedProject,
    setGithubFlow,
    setGitlabFlow,
    setInput,
    setSelectedRepoId,
    t,
  ]);

  useEffect(() => {
    if (pollCreateData?.status !== "failed") {
      return;
    }

    setCreateSessionId(null);
    setCreateProgress(null);
    toast.error(
      pollCreateData.errorMessage || t("dashboard.createProjectFailed")
    );
  }, [pollCreateData, setCreateProgress, setCreateSessionId, t]);

  useEffect(() => {
    if (!pollCreateError) {
      return;
    }

    setCreateProgress(null);
    setCreateSessionId(null);
    toast.error(
      pollCreateError instanceof Error
        ? pollCreateError.message
        : t("dashboard.createProjectFailed")
    );
  }, [pollCreateError, setCreateProgress, setCreateSessionId, t]);
}

// 连接卡片
function ProviderStatusCard({
  connectPending,
  connectDisabled,
  connected,
  flow,
  login,
  onConnect,
  onOpen,
  provider,
  texts,
}: ProviderStatusCardProps) {
  if (connected) {
    return (
      <div className="rounded-md border px-3 py-2 text-sm">
        <p className="font-medium">{texts.connectDone}</p>
        <p className="text-muted-foreground text-xs">
          {login
            ? texts.connectedAs.replace(
                REQUEST_PROVIDER_LABELS[provider].toLowerCase(),
                login
              )
            : texts.connectedAs}
        </p>
      </div>
    );
  }

  const githubFlow =
    provider === "github" ? (flow as GithubDeviceFlow | null) : null;

  return (
    <div className="space-y-2 rounded-md border px-3 py-3">
      <p className="font-medium text-sm">{texts.connectTitle}</p>
      <p className="text-muted-foreground text-xs">{texts.connectHint}</p>
      <Button
        disabled={connectPending || connectDisabled}
        onClick={onConnect}
        type="button"
      >
        {texts.connectButton}
      </Button>
      {flow ? (
        <div className="space-y-2 rounded-md bg-muted px-3 py-2">
          {githubFlow ? (
            <>
              <p className="text-xs">{texts.userCodeLabel}</p>
              <p className="font-mono text-sm">{githubFlow.userCode}</p>
            </>
          ) : null}
          <div className="flex gap-2">
            <Button onClick={onOpen} size="sm" type="button" variant="outline">
              {texts.openPage}
            </Button>
            <span className="self-center text-muted-foreground text-xs">
              {texts.waiting}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// GitLab 输入
function GitlabConnectionFields(input: {
  clientId: string;
  connected: boolean;
  onBaseUrlChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  provider: RequestProvider;
  t: (key: string, options?: Record<string, unknown>) => string;
  value: string;
}) {
  if (input.provider !== "gitlab") {
    return null;
  }

  const applicationsUrl = getGitlabApplicationsUrl(input.value);

  return (
    <div className="space-y-3">
      <label
        className="block space-y-1.5"
        htmlFor="create-project-gitlab-base-url"
      >
        <span className="font-medium text-xs">
          {input.t("dashboard.gitlabBaseUrl")}
        </span>
        <Input
          disabled={input.connected}
          id="create-project-gitlab-base-url"
          onChange={(event) => input.onBaseUrlChange(event.target.value)}
          placeholder={input.t("dashboard.gitlabBaseUrlPlaceholder")}
          value={input.value}
        />
      </label>

      <label
        className="block space-y-1.5"
        htmlFor="create-project-gitlab-client-id"
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-xs">
          <span>{input.t("dashboard.gitlabClientId")}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={input.t("dashboard.gitlabClientIdHelpLabel")}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                type="button"
              >
                <CircleHelp className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-80 flex-col items-start leading-5"
              side="top"
            >
              <span>{input.t("dashboard.gitlabClientIdHelp")}</span>
              {applicationsUrl ? (
                <ExternalLink
                  className="font-medium text-background underline-offset-2"
                  href={applicationsUrl}
                  type="button"
                >
                  {input.t("dashboard.gitlabClientIdHelpLink")}
                </ExternalLink>
              ) : (
                <span className="text-background/70">
                  {input.t("dashboard.gitlabClientIdHelpMissingBaseUrl")}
                </span>
              )}
              <span>{input.t("dashboard.gitlabClientIdHelpRedirect")}</span>
            </TooltipContent>
          </Tooltip>
        </span>
        <Input
          disabled={input.connected}
          id="create-project-gitlab-client-id"
          onChange={(event) => input.onClientIdChange(event.target.value)}
          placeholder={input.t("dashboard.gitlabClientIdPlaceholder")}
          value={input.clientId}
        />
      </label>
    </div>
  );
}

// 应用入口
function getGitlabApplicationsUrl(baseUrl: string) {
  const value = baseUrl.trim();

  if (!value) {
    return "";
  }

  return `${value.replace(/\/+$/g, "")}/oauth/applications`;
}

function CreateProjectFlow({
  onProjectCreated,
  onOpenChange,
  open,
  surface,
}: CreateProjectDialogProps & {
  surface: CreateProjectSurface;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addProject = useProjectStore((state) => state.addProject);
  const [input, setInput] = useState<ProjectInput>(getDefaultInput);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [githubFlow, setGithubFlow] = useState<GithubDeviceFlow | null>(null);
  const [gitlabFlow, setGitlabFlow] = useState<GitlabOauthFlow | null>(null);
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState("");
  const [gitlabClientId, setGitlabClientId] = useState("");
  const [createProgress, setCreateProgress] =
    useState<ProjectCreateProgress | null>(null);
  const [createSessionId, setCreateSessionId] = useState<string | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const provider = input.repoConfig.provider;
  const isGitlab = provider === "gitlab";
  const currentProjectRepo = useCurrentProjectRepo(provider);
  const providerTexts = getProviderTexts(provider, t);
  const githubAuthQuery = useQuery({
    queryFn: getGithubAuth,
    queryKey: GITHUB_AUTH_QUERY_KEY,
  });
  const gitlabAuthQuery = useQuery({
    queryFn: getGitlabAuth,
    queryKey: GITLAB_AUTH_QUERY_KEY,
  });
  const githubReposQuery = useQuery({
    enabled: provider === "github" && githubAuthQuery.data?.connected === true,
    queryFn: listGithubRepos,
    queryKey: GITHUB_REPOS_QUERY_KEY,
  });
  const gitlabReposQuery = useQuery({
    enabled: provider === "gitlab" && gitlabAuthQuery.data?.connected === true,
    queryFn: listGitlabRepos,
    queryKey: GITLAB_REPOS_QUERY_KEY,
  });
  const pollGithubQuery = useQuery({
    enabled: !!githubFlow,
    queryFn: () => {
      if (!githubFlow) {
        throw new Error("GitHub authorization is not ready.");
      }

      return pollGithubDeviceFlow(githubFlow.sessionId);
    },
    queryKey: ["github-device-flow", githubFlow?.sessionId],
    refetchInterval(query) {
      if (query.state.data?.status !== "pending") {
        return false;
      }

      return query.state.data.interval * 1000;
    },
    retry: false,
  });
  const pollGitlabQuery = useQuery({
    enabled: !!gitlabFlow,
    queryFn: () => {
      if (!gitlabFlow) {
        throw new Error("GitLab authorization is not ready.");
      }

      return pollGitlabOauthFlow(gitlabFlow.sessionId);
    },
    queryKey: ["gitlab-oauth-flow", gitlabFlow?.sessionId],
    refetchInterval(query) {
      if (query.state.data?.status !== "pending") {
        return false;
      }

      return 1500;
    },
    retry: false,
  });
  const startGithubMutation = useMutation({
    mutationFn: startGithubDeviceFlow,
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : getProviderTexts("github", t).connectFailed
      );
    },
    onSuccess(flow) {
      setGithubFlow(flow);
      openExternalLink(flow.verificationUri);
      toast.success(getProviderTexts("github", t).connectStarted);
    },
  });
  const startGitlabMutation = useMutation({
    mutationFn: () =>
      startGitlabOauthFlow(gitlabBaseUrl.trim(), gitlabClientId.trim()),
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : getProviderTexts("gitlab", t).connectFailed
      );
    },
    onSuccess(flow) {
      setGitlabFlow(flow);
      openExternalLink(flow.authorizeUrl);
      toast.success(getProviderTexts("gitlab", t).connectStarted);
    },
  });
  const startCreateMutation = useMutation({
    mutationFn: startCreateProject,
    onError(error) {
      console.trace("创建项目失败", error);
      setCreateProgress(null);
      setCreateSessionId(null);
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.createProjectFailed")
      );
    },
    onSuccess(progress) {
      setCreateProgress(progress);
      setCreateSessionId(progress.sessionId);
    },
  });
  const pollCreateQuery = useQuery({
    enabled: !!createSessionId,
    queryFn: () => {
      if (!createSessionId) {
        throw new Error("Project creation session is not ready.");
      }

      return pollCreateProject(createSessionId);
    },
    queryKey: [...PROJECT_CREATE_QUERY_KEY, createSessionId],
    refetchInterval(query) {
      if (query.state.data?.status !== "pending") {
        return false;
      }

      return 500;
    },
    retry: false,
  });
  const currentAuth = isGitlab ? gitlabAuthQuery.data : githubAuthQuery.data;
  const currentFlow = isGitlab ? gitlabFlow : githubFlow;
  const currentRepos = isGitlab ? gitlabReposQuery.data : githubReposQuery.data;
  const currentReposLoading = isGitlab
    ? gitlabReposQuery.isLoading
    : githubReposQuery.isLoading;
  const currentProjectRepoId = currentProjectRepo?.repoId ?? "";
  const currentProjectRepoName = currentProjectRepo?.repoName ?? "";
  const currentRepoOptions = useMemo(() => {
    return currentRepos?.map((repo) => ({
      ...repo,
      disabled:
        currentProjectRepoId === String(repo.id) ||
        currentProjectRepoName === repo.fullName,
    }));
  }, [currentProjectRepoId, currentProjectRepoName, currentRepos]);
  const allReposConnected = useMemo(() => {
    return (
      !!currentRepoOptions?.length &&
      currentRepoOptions.every((repo) => repo.disabled)
    );
  }, [currentRepoOptions]);
  const selectedRepoItem = useMemo(() => {
    return findRepoById(currentRepoOptions, selectedRepoId);
  }, [currentRepoOptions, selectedRepoId]);
  const activeCreateProgress = getActiveCreateProgress({
    createProgress,
    createSessionId,
    pollCreateData: pollCreateQuery.data,
  });
  const disabled = isCreateDisabled({
    activeCreateProgress,
    baseBranch: input.repoConfig.baseBranch,
    connected: currentAuth?.connected === true,
    isPending: startCreateMutation.isPending,
    name: input.name,
    repoName: input.repoConfig.repoName,
  });

  useProjectCreateState({
    addProject,
    pollCreateData: pollCreateQuery.data,
    pollCreateError: pollCreateQuery.error,
    queryClient,
    setCreateProgress,
    setCreateSessionId,
    setCreatedProject,
    setGithubFlow,
    setGitlabFlow,
    setInput,
    setSelectedRepoId,
    onProjectCreated,
    t,
  });

  useDefaultRepoSelection({
    provider,
    repos: currentRepoOptions,
    selectedRepoId,
    setInput,
    setSelectedRepoId,
  });
  useGitlabDefaultFields({
    baseUrl: gitlabAuthQuery.data?.baseUrl,
    clientId: gitlabAuthQuery.data?.clientId,
    provider,
    setGitlabBaseUrl,
    setGitlabClientId,
  });
  useProviderAuthEffects({
    githubFlow,
    gitlabFlow,
    pollGithubError: pollGithubQuery.error,
    pollGithubStatus: pollGithubQuery.data?.status,
    pollGitlabError: pollGitlabQuery.error,
    pollGitlabStatus: pollGitlabQuery.data?.status,
    queryClient,
    setGithubFlow,
    setGitlabFlow,
    t,
  });

  // 重置弹窗态
  function resetState() {
    setCreatedProject(null);
    setCreateProgress(null);
    setCreateSessionId(null);
    setGithubFlow(null);
    setGitlabFlow(null);
    setGitlabBaseUrl(gitlabAuthQuery.data?.baseUrl || "");
    setGitlabClientId(gitlabAuthQuery.data?.clientId || "");
    setInput(getDefaultInput());
    setSelectedRepoId("");
  }

  // 改平台值
  function handleProviderChange(value: string) {
    const nextProvider = value as RequestProvider;

    setGithubFlow(null);
    setGitlabFlow(null);
    setInput(getDefaultInput(nextProvider));
    setSelectedRepoId("");
  }

  // 改 GitLab 地址
  function handleGitlabBaseUrlChange(value: string) {
    setGitlabBaseUrl(value);
  }

  // 改 GitLab 客户端
  function handleGitlabClientIdChange(value: string) {
    setGitlabClientId(value);
  }

  // 连平台
  function handleConnectProvider() {
    if (provider === "gitlab") {
      startGitlabMutation.mutate();
      return;
    }

    startGithubMutation.mutate();
  }

  // 打开授权
  function handleOpenAuthorizePage() {
    openAuthorizePage({
      githubFlow,
      gitlabFlow,
      provider,
    });
  }

  // 选仓库
  function handleRepoChange(repoId: string) {
    setSelectedRepoId(repoId);
    const repo = findRepoById(currentRepoOptions, repoId);

    if (!(repo && !repo.disabled)) {
      return;
    }

    setInput(applyRepoInput(provider, repo));
  }

  // 复制webhook
  async function handleCopyWebhook() {
    await copyWebhookUrl(createdProject, t);
  }

  // 关闭成功态
  function handleDone() {
    resetState();
    onOpenChange(false);
  }

  // 提交表单
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateProgress({
      errorMessage: null,
      progress: 4,
      project: null,
      sessionId: "",
      status: "pending",
      step: "listProjectRows",
    });

    startCreateMutation.mutate({
      aiConfig: {
        apiKey: input.aiConfig.apiKey,
        baseUrl: input.aiConfig.baseUrl,
        model: input.aiConfig.model,
      },
      name: input.name.trim(),
      repoConfig: {
        baseBranch: input.repoConfig.baseBranch.trim(),
        managedRepoPath: input.repoConfig.managedRepoPath?.trim() || "",
        provider,
        repoId: input.repoConfig.repoId?.trim() || "",
        repoName: input.repoConfig.repoName.trim(),
        token: "",
      },
    });
  }

  let dialogBody: ReactNode;

  if (createdProject) {
    dialogBody = (
      <WebhookReadySection
        onCopy={handleCopyWebhook}
        onDone={handleDone}
        project={createdProject}
        surface={surface}
        t={t}
      />
    );
  } else if (activeCreateProgress) {
    dialogBody = (
      <ProjectCreateProgressSection
        progress={activeCreateProgress}
        surface={surface}
      />
    );
  } else {
    dialogBody = (
      <form className="space-y-4" onSubmit={handleSubmit}>
        <CreateProjectFormHeader surface={surface} t={t} />

        <div className="space-y-3">
          <label
            className="block space-y-1.5"
            htmlFor="create-project-provider"
          >
            <span className="font-medium text-xs">
              {t("dashboard.provider")}
            </span>
            <select
              className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              id="create-project-provider"
              onChange={(event) => handleProviderChange(event.target.value)}
              value={provider}
            >
              <option value="github">{REQUEST_PROVIDER_LABELS.github}</option>
              <option value="gitlab">{REQUEST_PROVIDER_LABELS.gitlab}</option>
            </select>
          </label>

          <GitlabConnectionFields
            clientId={gitlabClientId}
            connected={currentAuth?.connected === true}
            onBaseUrlChange={handleGitlabBaseUrlChange}
            onClientIdChange={handleGitlabClientIdChange}
            provider={provider}
            t={t}
            value={gitlabBaseUrl}
          />

          <ProviderStatusCard
            connectDisabled={
              provider === "gitlab" &&
              (gitlabBaseUrl.trim().length === 0 ||
                gitlabClientId.trim().length === 0)
            }
            connected={currentAuth?.connected === true}
            connectPending={
              startGithubMutation.isPending || startGitlabMutation.isPending
            }
            flow={currentFlow}
            login={currentAuth?.login}
            onConnect={handleConnectProvider}
            onOpen={handleOpenAuthorizePage}
            provider={provider}
            texts={providerTexts}
          />

          <RepoSelectDropdown
            allReposConnected={allReposConnected}
            connected={currentAuth?.connected === true}
            loading={currentReposLoading}
            onChange={handleRepoChange}
            provider={provider}
            repos={currentRepoOptions}
            selectedRepoId={selectedRepoId}
          />

          {selectedRepoItem ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
              <p>{t("dashboard.projectAutoFieldsHint")}</p>
              <p className="mt-1">
                {selectedRepoItem.private
                  ? t("dashboard.privateRepo")
                  : t("dashboard.publicRepo")}
                {" · "}
                {t("dashboard.baseBranch")}: {selectedRepoItem.defaultBranch}
              </p>
            </div>
          ) : null}
        </div>

        <CreateProjectFooter surface={surface}>
          <Button
            disabled={startCreateMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            {t("dashboard.cancel")}
          </Button>
          <Button disabled={disabled} type="submit">
            {t("dashboard.connect")}
          </Button>
        </CreateProjectFooter>
      </form>
    );
  }

  return (
    <CreateProjectShell
      onClose={(nextOpen) => {
        if (!nextOpen) {
          resetState();
        }

        onOpenChange(nextOpen);
      }}
      open={open}
      surface={surface}
    >
      {dialogBody}
    </CreateProjectShell>
  );
}

export function CreateProjectInline({
  onCancel,
  onProjectCreated,
}: CreateProjectInlineProps) {
  return (
    <CreateProjectFlow
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      onProjectCreated={onProjectCreated}
      open
      surface="inline"
    />
  );
}

export default function CreateProjectDialog(props: CreateProjectDialogProps) {
  return <CreateProjectFlow {...props} surface="dialog" />;
}
