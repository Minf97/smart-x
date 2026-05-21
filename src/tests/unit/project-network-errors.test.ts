import { afterEach, expect, test, vi } from "vitest";
import { listGithubAccessibleRepos } from "@/server/projects/github-service";
import { listGitlabAccessibleRepos } from "@/server/projects/gitlab-service";
import { createBackendProject } from "@/server/projects/remote-project-service";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("explains remote project backend fetch failures", async () => {
  vi.stubEnv("ALERTS_BACKEND_BASE_URL", "https://alerts.example.com");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch failed")))
  );

  await expect(createBackendProject("Demo")).rejects.toThrow(
    "Remote project backend is unreachable. Check ALERTS_BACKEND_BASE_URL and network."
  );
});

test("explains github fetch failures", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch failed")))
  );

  await expect(listGithubAccessibleRepos("token")).rejects.toThrow(
    "GitHub is unreachable. Check GitHub network access."
  );
});

test("explains gitlab fetch failures", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch failed")))
  );

  await expect(
    listGitlabAccessibleRepos("token", "https://gitlab.example.com")
  ).rejects.toThrow("GitLab is unreachable. Check GitLab URL and network.");
});
