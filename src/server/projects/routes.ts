import { Hono } from "hono";
import {
  createProject,
  createProjectSchema,
  startCreateProject,
  updateProject,
  updateProjectSchema,
  validateProjectConnection,
  validateProjectSchema,
} from "@/server/alerts/repository";
import { deleteProject } from "@/server/projects/delete-project-service";
import { getCreateProjectProgress } from "@/server/projects/project-create-progress";

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

projectsRouter.post("/projects/create/start", async (context) => {
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
    const session = startCreateProject(result.data);

    return context.json(session);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to start project creation."),
      },
      400
    );
  }
});

projectsRouter.post("/projects/create/:sessionId/poll", (context) => {
  try {
    const session = getCreateProjectProgress(context.req.param("sessionId"));

    return context.json(session);
  } catch (error) {
    return context.json(
      {
        message: toErrorMessage(error, "Failed to poll project creation."),
      },
      404
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

projectsRouter.delete("/projects/:id", async (context) => {
  try {
    await deleteProject(context.req.param("id"));

    return context.body(null, 204);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "Project not found."
        ? 404
        : 500;

    return context.json(
      {
        message: toErrorMessage(error, "Failed to delete project."),
      },
      status
    );
  }
});
