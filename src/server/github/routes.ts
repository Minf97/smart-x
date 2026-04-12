import { Hono } from "hono";
import {
  getGithubAuthState,
  listConnectedGithubRepos,
  pollGithubDeviceFlow,
  startGithubDeviceFlow,
} from "./auth-service";

// GitHub 路由
export const githubRouter = new Hono();

// 错误包
function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

githubRouter.get("/github/auth", (context) => {
  return context.json(getGithubAuthState());
});

githubRouter.post("/github/device/start", async (context) => {
  try {
    const flow = await startGithubDeviceFlow();

    return context.json(flow);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to start GitHub auth."),
      },
      400
    );
  }
});

githubRouter.post("/github/device/:sessionId/poll", async (context) => {
  try {
    const flow = await pollGithubDeviceFlow(context.req.param("sessionId"));

    return context.json(flow);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to poll GitHub auth."),
      },
      400
    );
  }
});

githubRouter.get("/github/repos", async (context) => {
  try {
    const repos = await listConnectedGithubRepos();

    return context.json(repos);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to load GitHub repos."),
      },
      400
    );
  }
});
