import { Hono } from "hono";
import {
  listAlerts,
  updateAlertStatus,
  updateStatusSchema,
} from "./repository";

// 报警路由
export const alertsRouter = new Hono();

alertsRouter.get("/alerts", async (context) => {
  const items = await listAlerts();

  return context.json(items);
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
        message:
          error instanceof Error ? error.message : "Failed to update alert.",
      },
      404
    );
  }
});
