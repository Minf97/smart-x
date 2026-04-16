import {
  getDefaultProjectAiConfig,
  type Project,
  type ProjectInput,
  REQUEST_PROVIDER_LABELS,
  type RequestProvider,
} from "@shared/types/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { copyText, openExternalLink } from "@/actions/shell";
import {
  createProject,
  getGithubAuth,
  getGitlabAuth,
  listGithubRepos,
  listGitlabRepos,
  pollGithubDeviceFlow,
  pollGitlabOauthFlow,
  startGithubDeviceFlow,
  startGitlabOauthFlow,
} from "@/api/alerts";
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
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import type { GithubDeviceFlow, GithubRepoItem } from "@/types/github";
import type { GitlabOauthFlow, GitlabRepoItem } from "@/types/gitlab";

const GITHUB_AUTH_QUERY_KEY = ["github-auth"] as const;
const GITHUB_REPOS_QUERY_KEY = ["github-repos"] as const;
const GITLAB_AUTH_QUERY_KEY = ["gitlab-auth"] as const;
const GITLAB_REPOS_QUERY_KEY = ["gitlab-repos"] as const;

interface CreateProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
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
  noRepos: string;
  openPage: string;
  repoLabel: string;
  repoPlaceholder: string;
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

interface RepoSelectFieldProps {
  connected: boolean;
  loading: boolean;
  onChange: (value: string) => void;
  repos: RepoOption[] | undefined;
  selectedRepo: string;
  texts: ProviderTexts;
}

type RepoOption = GithubRepoItem | GitlabRepoItem;

// 默认值
function getDefaultInput(provider: RequestProvider = "github"): ProjectInput {
  return {
    aiConfig: getDefaultProjectAiConfig(),
    name: "",
    repoConfig: {
      baseBranch: "",
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
    aiConfig: getDefaultProjectAiConfig(),
    name: repo.name,
    repoConfig: {
      baseBranch: repo.defaultBranch,
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
      noRepos: t("dashboard.noGitlabRepos"),
      openPage: t("dashboard.openGitlab"),
      repoLabel: t("dashboard.repository"),
      repoPlaceholder: t("dashboard.repoSelectPlaceholder"),
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
    noRepos: t("dashboard.noGithubRepos"),
    openPage: t("dashboard.openGithub"),
    repoLabel: t("dashboard.repository"),
    repoPlaceholder: t("dashboard.repoSelectPlaceholder"),
    userCodeLabel: t("dashboard.githubUserCode"),
    waiting: t("dashboard.waitingGithub"),
  };
}

// 成功视图
function WebhookReadySection({
  onCopy,
  onDone,
  project,
  t,
}: {
  onCopy: () => Promise<void>;
  onDone: () => void;
  project: Project;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("dashboard.createProject")}</DialogTitle>
        <DialogDescription>{t("dashboard.webhookReady")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <label className="block space-y-1.5" htmlFor="project-webhook">
          <span className="font-medium text-xs">
            {t("dashboard.webhookUrl")}
          </span>
          <Input disabled id="project-webhook" value={project.webhookUrl} />
        </label>
      </div>

      <DialogFooter>
        <Button onClick={onCopy} type="button" variant="outline">
          {t("dashboard.copy")}
        </Button>
        <Button onClick={onDone} type="button">
          {t("dashboard.done")}
        </Button>
      </DialogFooter>
    </div>
  );
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

// 仓库下拉
function RepoSelectField({
  connected,
  loading,
  onChange,
  repos,
  selectedRepo,
  texts,
}: RepoSelectFieldProps) {
  return (
    <label className="block space-y-1.5" htmlFor="create-project-repo">
      <span className="font-medium text-xs">{texts.repoLabel}</span>
      <select
        className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        disabled={!connected || loading}
        id="create-project-repo"
        onChange={(event) => onChange(event.target.value)}
        value={selectedRepo}
      >
        <option value="">{texts.repoPlaceholder}</option>
        {repos?.map((repo) => (
          <option key={repo.id} value={repo.fullName}>
            {repo.fullName}
          </option>
        ))}
      </select>
      {connected && !repos?.length ? (
        <p className="text-muted-foreground text-xs">{texts.noRepos}</p>
      ) : null}
    </label>
  );
}

export default function CreateProjectDialog({
  onOpenChange,
  open,
}: CreateProjectDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addProject = useProjectStore((state) => state.addProject);
  const [input, setInput] = useState<ProjectInput>(getDefaultInput);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [githubFlow, setGithubFlow] = useState<GithubDeviceFlow | null>(null);
  const [gitlabFlow, setGitlabFlow] = useState<GitlabOauthFlow | null>(null);
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState("");
  const [gitlabClientId, setGitlabClientId] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const provider = input.repoConfig.provider;
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
  const mutation = useMutation({
    mutationFn: createProject,
    onError(error) {
      console.trace("创建项目失败", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.createProjectFailed")
      );
    },
    onSuccess(project) {
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        appendProjectCache(data, project)
      );
      addProject(project);
      setCreatedProject(project);
      toast.success(t("dashboard.createProjectSuccess"));
      setGithubFlow(null);
      setGitlabFlow(null);
      setInput(getDefaultInput());
      setSelectedRepo("");
    },
  });
  const currentAuth =
    provider === "gitlab" ? gitlabAuthQuery.data : githubAuthQuery.data;
  const currentRepos =
    provider === "gitlab" ? gitlabReposQuery.data : githubReposQuery.data;
  const currentFlow = provider === "gitlab" ? gitlabFlow : githubFlow;
  const currentReposLoading =
    provider === "gitlab"
      ? gitlabReposQuery.isLoading
      : githubReposQuery.isLoading;
  const selectedRepoItem = useMemo(() => {
    return currentRepos?.find((repo) => repo.fullName === selectedRepo) ?? null;
  }, [currentRepos, selectedRepo]);
  const disabled =
    mutation.isPending ||
    currentAuth?.connected !== true ||
    input.name.trim().length === 0 ||
    input.repoConfig.repoName.trim().length === 0 ||
    input.repoConfig.baseBranch.trim().length === 0;

  useEffect(() => {
    if (pollGithubQuery.data?.status !== "connected") {
      return;
    }

    setGithubFlow(null);
    queryClient.invalidateQueries({
      queryKey: GITHUB_AUTH_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: GITHUB_REPOS_QUERY_KEY,
    });
    toast.success(t("dashboard.connectGithubSuccess"));
  }, [pollGithubQuery.data, queryClient, t]);

  useEffect(() => {
    if (pollGitlabQuery.data?.status !== "connected") {
      return;
    }

    setGitlabFlow(null);
    queryClient.invalidateQueries({
      queryKey: GITLAB_AUTH_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: GITLAB_REPOS_QUERY_KEY,
    });
    toast.success(t("dashboard.connectGitlabSuccess"));
  }, [pollGitlabQuery.data, queryClient, t]);

  useEffect(() => {
    if (!(githubFlow && pollGithubQuery.error)) {
      return;
    }

    setGithubFlow(null);
    toast.error(
      pollGithubQuery.error instanceof Error
        ? pollGithubQuery.error.message
        : t("dashboard.connectGithubFailed")
    );
  }, [githubFlow, pollGithubQuery.error, t]);

  useEffect(() => {
    if (!(gitlabFlow && pollGitlabQuery.error)) {
      return;
    }

    setGitlabFlow(null);
    toast.error(
      pollGitlabQuery.error instanceof Error
        ? pollGitlabQuery.error.message
        : t("dashboard.connectGitlabFailed")
    );
  }, [gitlabFlow, pollGitlabQuery.error, t]);

  useEffect(() => {
    if (provider !== "gitlab") {
      return;
    }

    if (!gitlabAuthQuery.data?.baseUrl) {
      return;
    }

    setGitlabBaseUrl(
      (current) => current || gitlabAuthQuery.data?.baseUrl || ""
    );
  }, [gitlabAuthQuery.data?.baseUrl, provider]);

  useEffect(() => {
    if (provider !== "gitlab") {
      return;
    }

    if (!gitlabAuthQuery.data?.clientId) {
      return;
    }

    setGitlabClientId(
      (current) => current || gitlabAuthQuery.data?.clientId || ""
    );
  }, [gitlabAuthQuery.data?.clientId, provider]);

  useEffect(() => {
    if (!(currentRepos && currentRepos.length > 0)) {
      return;
    }

    if (selectedRepo) {
      return;
    }

    const repo = currentRepos[0];

    setSelectedRepo(repo.fullName);
    setInput(applyRepoInput(provider, repo));
  }, [currentRepos, provider, selectedRepo]);

  // 重置弹窗态
  function resetState() {
    setCreatedProject(null);
    setGithubFlow(null);
    setGitlabFlow(null);
    setGitlabBaseUrl(gitlabAuthQuery.data?.baseUrl || "");
    setGitlabClientId(gitlabAuthQuery.data?.clientId || "");
    setInput(getDefaultInput());
    setSelectedRepo("");
  }

  // 改平台值
  function handleProviderChange(value: string) {
    const nextProvider = value as RequestProvider;

    setGithubFlow(null);
    setGitlabFlow(null);
    setInput(getDefaultInput(nextProvider));
    setSelectedRepo("");
  }

  // 改名称
  function handleNameChange(value: string) {
    setInput((current) => ({
      ...current,
      name: value,
    }));
  }

  // 改基线
  function handleBaseBranchChange(value: string) {
    setInput((current) => ({
      ...current,
      repoConfig: {
        ...current.repoConfig,
        baseBranch: value,
      },
    }));
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
    if (provider === "gitlab") {
      if (gitlabFlow) {
        openExternalLink(gitlabFlow.authorizeUrl);
      }
      return;
    }

    if (githubFlow) {
      openExternalLink(githubFlow.verificationUri);
    }
  }

  // 选仓库
  function handleRepoChange(fullName: string) {
    setSelectedRepo(fullName);
    const repo = currentRepos?.find((item) => item.fullName === fullName);

    if (!repo) {
      return;
    }

    setInput(applyRepoInput(provider, repo));
  }

  // 复制webhook
  async function handleCopyWebhook() {
    if (!createdProject) {
      return;
    }

    await copyText(createdProject.webhookUrl);
    toast.success(t("dashboard.copyWebhookSuccess"));
  }

  // 关闭成功态
  function handleDone() {
    resetState();
    onOpenChange(false);
  }

  // 提交表单
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutation.mutate({
      aiConfig: {
        apiKey: input.aiConfig.apiKey,
        baseUrl: input.aiConfig.baseUrl,
        model: input.aiConfig.model,
      },
      name: input.name.trim(),
      repoConfig: {
        baseBranch: input.repoConfig.baseBranch.trim(),
        provider,
        repoId: input.repoConfig.repoId?.trim() || "",
        repoName: input.repoConfig.repoName.trim(),
        token: "",
      },
    });
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetState();
        }

        onOpenChange(nextOpen);
      }}
      open={open}
    >
      <DialogContent>
        {createdProject ? (
          <WebhookReadySection
            onCopy={handleCopyWebhook}
            onDone={handleDone}
            project={createdProject}
            t={t}
          />
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("dashboard.createProject")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.createProjectHint")}
              </DialogDescription>
            </DialogHeader>

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
                  <option value="github">
                    {REQUEST_PROVIDER_LABELS.github}
                  </option>
                  <option value="gitlab">
                    {REQUEST_PROVIDER_LABELS.gitlab}
                  </option>
                </select>
              </label>

              {provider === "gitlab" ? (
                <div className="space-y-3">
                  <label
                    className="block space-y-1.5"
                    htmlFor="create-project-gitlab-base-url"
                  >
                    <span className="font-medium text-xs">
                      {t("dashboard.gitlabBaseUrl")}
                    </span>
                    <Input
                      disabled={currentAuth?.connected === true}
                      id="create-project-gitlab-base-url"
                      onChange={(event) =>
                        handleGitlabBaseUrlChange(event.target.value)
                      }
                      placeholder={t("dashboard.gitlabBaseUrlPlaceholder")}
                      value={gitlabBaseUrl}
                    />
                  </label>

                  <label
                    className="block space-y-1.5"
                    htmlFor="create-project-gitlab-client-id"
                  >
                    <span className="font-medium text-xs">
                      {t("dashboard.gitlabClientId")}
                    </span>
                    <Input
                      disabled={currentAuth?.connected === true}
                      id="create-project-gitlab-client-id"
                      onChange={(event) =>
                        handleGitlabClientIdChange(event.target.value)
                      }
                      placeholder={t("dashboard.gitlabClientIdPlaceholder")}
                      value={gitlabClientId}
                    />
                  </label>
                </div>
              ) : null}

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

              <RepoSelectField
                connected={currentAuth?.connected === true}
                loading={currentReposLoading}
                onChange={handleRepoChange}
                repos={currentRepos}
                selectedRepo={selectedRepo}
                texts={providerTexts}
              />

              <label
                className="block space-y-1.5"
                htmlFor="create-project-name"
              >
                <span className="font-medium text-xs">
                  {t("dashboard.projectName")}
                </span>
                <Input
                  id="create-project-name"
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder={t("dashboard.projectNamePlaceholder")}
                  value={input.name}
                />
              </label>

              <label
                className="block space-y-1.5"
                htmlFor="create-project-base-branch"
              >
                <span className="font-medium text-xs">
                  {t("dashboard.baseBranch")}
                </span>
                <Input
                  id="create-project-base-branch"
                  onChange={(event) =>
                    handleBaseBranchChange(event.target.value)
                  }
                  placeholder={t("dashboard.baseBranchPlaceholder")}
                  value={input.repoConfig.baseBranch}
                />
              </label>

              {selectedRepoItem && (
                <p className="text-muted-foreground text-xs">
                  {selectedRepoItem.private
                    ? t("dashboard.privateRepo")
                    : t("dashboard.publicRepo")}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                disabled={mutation.isPending}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                {t("dashboard.cancel")}
              </Button>
              <Button disabled={disabled} type="submit">
                {t("dashboard.connect")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
