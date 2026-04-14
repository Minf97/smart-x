import { Hono } from "hono";
import { z } from "zod";
import {
  getGitlabAuthState,
  listConnectedGitlabRepos,
  pollGitlabOauthFlow,
  startGitlabOauthFlow,
} from "./auth-service";

// GitLab路由
export const gitlabRouter = new Hono();

// 错误包
function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const startOauthSchema = z.object({
  baseUrl: z.string().trim().min(1),
  clientId: z.string().trim().min(1),
});

gitlabRouter.get("/gitlab/auth", (context) => {
  return context.json(getGitlabAuthState());
});

gitlabRouter.post("/gitlab/oauth/start", async (context) => {
  const body = await context.req.json().catch(() => null);
  const result = startOauthSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid GitLab OAuth payload.",
      },
      400
    );
  }

  try {
    const flow = await startGitlabOauthFlow(
      result.data.baseUrl,
      result.data.clientId
    );

    return context.json(flow);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to start GitLab auth."),
      },
      400
    );
  }
});

gitlabRouter.post("/gitlab/oauth/:sessionId/poll", (context) => {
  try {
    const flow = pollGitlabOauthFlow(context.req.param("sessionId"));

    return context.json(flow);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to poll GitLab auth."),
      },
      400
    );
  }
});

gitlabRouter.get("/gitlab/repos", async (context) => {
  try {
    const repos = await listConnectedGitlabRepos();

    return context.json(repos);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to load GitLab repos."),
      },
      400
    );
  }
});
