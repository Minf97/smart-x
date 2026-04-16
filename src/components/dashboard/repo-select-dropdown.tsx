import type { RequestProvider } from "@shared/types/project";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/tailwind";

export interface RepoSelectOption {
  defaultBranch: string;
  disabled?: boolean;
  fullName: string;
  id: number;
  name: string;
  private: boolean;
}

interface RepoSelectDropdownProps {
  allReposConnected: boolean;
  connected: boolean;
  loading: boolean;
  onChange: (value: string) => void;
  provider: RequestProvider;
  repos: RepoSelectOption[] | undefined;
  selectedRepoId: string;
}

function findRepoById(repos: RepoSelectOption[] | undefined, repoId: string) {
  return repos?.find((repo) => String(repo.id) === repoId) ?? null;
}

export function RepoSelectDropdown({
  allReposConnected,
  connected,
  loading,
  onChange,
  provider,
  repos,
  selectedRepoId,
}: RepoSelectDropdownProps) {
  const { t } = useTranslation();
  const selectedRepo = findRepoById(repos, selectedRepoId);
  const noReposText =
    provider === "gitlab"
      ? t("dashboard.noGitlabRepos")
      : t("dashboard.noGithubRepos");

  return (
    <label className="block space-y-1.5" htmlFor="create-project-repo">
      <span className="font-medium text-xs">{t("dashboard.repository")}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-9 w-full justify-between px-3 font-normal"
            disabled={!connected || loading || !repos?.length}
            id="create-project-repo"
            type="button"
            variant="outline"
          >
            <span className="truncate">
              {selectedRepo?.fullName || t("dashboard.repoSelectPlaceholder")}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80">
          <DropdownMenuLabel>{t("dashboard.repository")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {repos?.map((repo) => {
            const isSelected = selectedRepoId === String(repo.id);

            return (
              <DropdownMenuItem
                className="gap-3 py-2"
                disabled={repo.disabled === true}
                key={repo.id}
                onSelect={() => onChange(String(repo.id))}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent"
                  )}
                >
                  <Check className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {repo.fullName}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <Badge variant="outline">
                      {repo.private
                        ? t("dashboard.privateRepo")
                        : t("dashboard.publicRepo")}
                    </Badge>
                    {repo.disabled ? (
                      <Badge variant="secondary">
                        {t("dashboard.connectedRepo")}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {connected && !loading && !repos?.length ? (
        <p className="text-muted-foreground text-xs">{noReposText}</p>
      ) : null}
      {connected && !loading && allReposConnected ? (
        <p className="text-muted-foreground text-xs">
          {t("dashboard.allReposConnected")}
        </p>
      ) : null}
    </label>
  );
}
