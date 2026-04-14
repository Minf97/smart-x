import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { AlertSyncAckInput } from "../../shared/types/alert";
import { normalizePayload } from "./alert-normalizer";
import { BackendDatabase } from "./db";
import { hasDatabaseUrl } from "./db/client";

export const app = new Hono();
const db = new BackendDatabase();
const TRAILING_SLASH_RE = /\/$/;

// 建项目
const createProjectSchema = z.object({
  name: z.string().trim().min(1),
});

// 回执入参
const syncAckSchema = z.object({
  alertIds: z.array(z.string().trim().min(1)).min(1),
});

// 错误包
function toMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// 取域名
function getRequestBaseUrl(url: string) {
  const customBaseUrl = process.env.BACKEND_BASE_URL?.trim();

  if (customBaseUrl) {
    return customBaseUrl.replace(TRAILING_SLASH_RE, "");
  }

  return new URL(url).origin;
}

app.use("*", cors());

app.onError((error, context) => {
  return context.json(
    {
      message: toMessage(error, "Internal server error."),
    },
    500
  );
});

// 健康检
app.get("/health", (context) => {
  return context.json({
    databaseConfigured: hasDatabaseUrl(),
    ok: true,
  });
});

// 建项目
app.post("/projects", async (context) => {
  const body = await context.req.json().catch(() => null);
  const result = createProjectSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid project payload.",
      },
      400
    );
  }

  const project = await db.createProject(
    result.data.name,
    getRequestBaseUrl(context.req.url)
  );

  return context.json(project, 201);
});

// 收报警
app.post("/ingest/:webhookId", async (context) => {
  const webhookId = context.req.param("webhookId");
  const project = await db.getProjectByWebhookId(webhookId);

  if (!project?.webhookEnabled) {
    return context.json(
      {
        message: "Webhook not found.",
      },
      404
    );
  }

  try {
    const body = await context.req.json();
    const payload = normalizePayload(body);
    const alert = await db.ingestAlert(project.id, payload);

    return context.json({
      alertId: alert.id,
      ok: true,
      projectId: project.id,
    });
  } catch (error) {
    return context.json(
      {
        message: toMessage(error, "Invalid alert payload."),
      },
      400
    );
  }
});

// 拉列表
app.get("/projects/:projectId/alerts", async (context) => {
  const projectId = context.req.param("projectId");
  const alerts = await db.listAlerts(projectId);

  return context.json({
    alerts,
  });
});

// 同步回执
app.post("/projects/:projectId/alerts/sync-ack", async (context) => {
  const projectId = context.req.param("projectId");
  const body = await context.req.json().catch(() => null);
  const result = syncAckSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid sync ack payload.",
      },
      400
    );
  }

  const input: AlertSyncAckInput = result.data;
  await db.markAlertsSynced(projectId, input.alertIds);

  return context.body(null, 204);
});

export default app;
