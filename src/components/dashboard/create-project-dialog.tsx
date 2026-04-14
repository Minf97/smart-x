import {
  getDefaultProjectAiConfig,
  type Project,
  type ProjectInput,
} from "@shared/types/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { copyText, openExternalLink } from "@/actions/shell";
import {
  createProject,
  getGithubAuth,
  listGithubRepos,
  pollGithubDeviceFlow,
  startGithubDeviceFlow,
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

const GITHUB_AUTH_QUERY_KEY = ["github-auth"] as const;
const GITHUB_REPOS_QUERY_KEY = ["github-repos"] as const;

interface CreateProjectDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

// 默认值
function getDefaultInput(): ProjectInput {
  return {
    aiConfig: getDefaultProjectAiConfig(),
    name: "",
    repoConfig: {
      baseBranch: "",
      provider: "github",
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

// 选仓库
function applyRepoInput(repo: GithubRepoItem): ProjectInput {
  return {
    aiConfig: getDefaultProjectAiConfig(),
    name: repo.name,
    repoConfig: {
      baseBranch: repo.defaultBranch,
      provider: "github",
      repoName: repo.fullName,
      token: "",
    },
  };
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
  const [deviceFlow, setDeviceFlow] = useState<GithubDeviceFlow | null>(null);
  const [selectedRepo, setSelectedRepo] = useState("");
  const githubAuthQuery = useQuery({
    queryFn: getGithubAuth,
    queryKey: GITHUB_AUTH_QUERY_KEY,
  });
  const githubReposQuery = useQuery({
    enabled: githubAuthQuery.data?.connected === true,
    queryFn: listGithubRepos,
    queryKey: GITHUB_REPOS_QUERY_KEY,
  });
  const pollGithubQuery = useQuery({
    enabled: !!deviceFlow,
    queryFn: () => {
      if (!deviceFlow) {
        throw new Error("GitHub authorization is not ready.");
      }

      return pollGithubDeviceFlow(deviceFlow.sessionId);
    },
    queryKey: ["github-device-flow", deviceFlow?.sessionId],
    refetchInterval(query) {
      if (query.state.data?.status !== "pending") {
        return false;
      }

      return query.state.data.interval * 1000;
    },
    retry: false,
  });
  const startGithubMutation = useMutation({
    mutationFn: startGithubDeviceFlow,
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.connectGithubFailed")
      );
    },
    onSuccess(flow) {
      setDeviceFlow(flow);
      openExternalLink(flow.verificationUri);
      toast.success(t("dashboard.connectGithubStarted"));
    },
  });
  const mutation = useMutation({
    mutationFn: createProject,
    onError(error) {
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
      setDeviceFlow(null);
      setInput(getDefaultInput());
      setSelectedRepo("");
    },
  });
  const selectedRepoItem = useMemo(() => {
    return (
      githubReposQuery.data?.find((repo) => repo.fullName === selectedRepo) ??
      null
    );
  }, [githubReposQuery.data, selectedRepo]);
  const disabled =
    mutation.isPending ||
    githubAuthQuery.data?.connected !== true ||
    input.name.trim().length === 0 ||
    input.repoConfig.repoName.trim().length === 0 ||
    input.repoConfig.baseBranch.trim().length === 0;

  useEffect(() => {
    if (pollGithubQuery.data?.status !== "connected") {
      return;
    }

    setDeviceFlow(null);
    queryClient.invalidateQueries({
      queryKey: GITHUB_AUTH_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: GITHUB_REPOS_QUERY_KEY,
    });
    toast.success(t("dashboard.connectGithubSuccess"));
  }, [pollGithubQuery.data, queryClient, t]);

  useEffect(() => {
    if (!githubReposQuery.data?.length) {
      return;
    }

    if (selectedRepo) {
      return;
    }

    const repo = githubReposQuery.data[0];

    setSelectedRepo(repo.fullName);
    setInput(applyRepoInput(repo));
  }, [githubReposQuery.data, selectedRepo]);

  // 重置弹窗态
  function resetState() {
    setCreatedProject(null);
    setDeviceFlow(null);
    setInput(getDefaultInput());
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

  // 连 GitHub
  function handleConnectGithub() {
    startGithubMutation.mutate();
  }

  // 打开授权
  function handleOpenGithub() {
    if (!deviceFlow) {
      return;
    }

    openExternalLink(deviceFlow.verificationUri);
  }

  // 选仓库
  function handleRepoChange(fullName: string) {
    setSelectedRepo(fullName);
    const repo = githubReposQuery.data?.find(
      (item) => item.fullName === fullName
    );

    if (!repo) {
      return;
    }

    setInput(applyRepoInput(repo));
  }

  // 复制 webhook
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
        provider: "github",
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
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("dashboard.createProject")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.webhookReady")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <label className="block space-y-1.5" htmlFor="project-webhook">
                <span className="font-medium text-xs">
                  {t("dashboard.webhookUrl")}
                </span>
                <Input
                  disabled
                  id="project-webhook"
                  value={createdProject.webhookUrl}
                />
              </label>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCopyWebhook}
                type="button"
                variant="outline"
              >
                {t("dashboard.copy")}
              </Button>
              <Button onClick={handleDone} type="button">
                {t("dashboard.done")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("dashboard.createProject")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.createProjectHint")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {githubAuthQuery.data?.connected ? (
                <div className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">
                    {t("dashboard.connectGithubDone")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("dashboard.connectedAs", {
                      login: githubAuthQuery.data.login || "github",
                    })}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border px-3 py-3">
                  <p className="font-medium text-sm">
                    {t("dashboard.connectGithubTitle")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("dashboard.connectGithubHint")}
                  </p>
                  <Button
                    disabled={startGithubMutation.isPending}
                    onClick={handleConnectGithub}
                    type="button"
                  >
                    {t("dashboard.connectGithub")}
                  </Button>
                  {deviceFlow && (
                    <div className="space-y-2 rounded-md bg-muted px-3 py-2">
                      <p className="text-xs">{t("dashboard.githubUserCode")}</p>
                      <p className="font-mono text-sm">{deviceFlow.userCode}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleOpenGithub}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {t("dashboard.openGithub")}
                        </Button>
                        <span className="self-center text-muted-foreground text-xs">
                          {t("dashboard.waitingGithub")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label
                className="block space-y-1.5"
                htmlFor="create-project-repo"
              >
                <span className="font-medium text-xs">
                  {t("dashboard.repository")}
                </span>
                <select
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  disabled={
                    githubAuthQuery.data?.connected !== true ||
                    githubReposQuery.isLoading
                  }
                  id="create-project-repo"
                  onChange={(event) => handleRepoChange(event.target.value)}
                  value={selectedRepo}
                >
                  <option value="">
                    {t("dashboard.repoSelectPlaceholder")}
                  </option>
                  {githubReposQuery.data?.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
                {githubAuthQuery.data?.connected &&
                  !githubReposQuery.data?.length && (
                    <p className="text-muted-foreground text-xs">
                      {t("dashboard.noGithubRepos")}
                    </p>
                  )}
              </label>

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
