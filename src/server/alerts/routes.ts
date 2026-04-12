import { Hono } from "hono";
import {
  closeAlertRequest,
  createAlertRequest,
  getDashboardData,
  mergeAlertRequest,
  updateAlertStatus,
  updateStatusSchema,
} from "./repository";

// 报警路由
export const alertsRouter = new Hono();

// 错误包
function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

alertsRouter.get("/alerts", async (context) => {
  const data = await getDashboardData();

  return context.json(data);
});

alertsRouter.patch("/alerts/:id/status", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json();
  const result = updateStatusSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid status payload.",
      },
      400
    );
  }

  try {
    const item = await updateAlertStatus(id, result.data.status);

    return context.json(item);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to update alert."),
      },
      404
    );
  }
});

alertsRouter.post("/alerts/:id/request", async (context) => {
  try {
    const item = await createAlertRequest(context.req.param("id"));

    return context.json(item);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to create PR/MR."),
      },
      404
    );
  }
});

alertsRouter.post("/alerts/:id/request/merge", async (context) => {
  try {
    const item = await mergeAlertRequest(context.req.param("id"));

    return context.json(item);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to merge PR/MR."),
      },
      404
    );
  }
});

alertsRouter.post("/alerts/:id/request/close", async (context) => {
  try {
    const item = await closeAlertRequest(context.req.param("id"));

    return context.json(item);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to close PR/MR."),
      },
      404
    );
  }
});
