import { Hono } from "hono";
import {
  createProject,
  createProjectSchema,
  updateProject,
  updateProjectSchema,
  validateProjectConnection,
  validateProjectSchema,
} from "@/server/alerts/repository";

// 项目路由
export const projectsRouter = new Hono();

// 错误包
function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

projectsRouter.post("/projects/validate", async (context) => {
  const body = await context.req.json();
  const result = validateProjectSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid project payload.",
      },
      400
    );
  }

  try {
    const project = await validateProjectConnection(result.data);

    return context.json(project);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to validate project."),
      },
      400
    );
  }
});

projectsRouter.post("/projects", async (context) => {
  const body = await context.req.json();
  const result = createProjectSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid project payload.",
      },
      400
    );
  }

  try {
    const project = await createProject(result.data);

    return context.json(project);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to create project."),
      },
      400
    );
  }
});

projectsRouter.patch("/projects/:id", async (context) => {
  const body = await context.req.json();
  const result = updateProjectSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        message: "Invalid project payload.",
      },
      400
    );
  }

  try {
    const project = await updateProject(context.req.param("id"), result.data);

    return context.json(project);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to update project."),
      },
      404
    );
  }
});
