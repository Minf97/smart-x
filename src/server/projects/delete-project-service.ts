import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import type { StoredProjectRepoConfig } from "@shared/types/project";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  alertsTable,
  feedbackSignalsTable,
  projectsTable,
} from "@/server/db/schema";
import { isManagedRepoPath } from "@/server/projects/repo-path-service";

// 删除仓库
async function deleteManagedRepo(repoPath: string) {
  if (!(repoPath && isManagedRepoPath(repoPath) && existsSync(repoPath))) {
    return;
  }

  await rm(repoPath, {
    recursive: true,
  });
}

// 删除项目
export async function deleteProject(id: string) {
  const db = getDb();
  const projectRow = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .get();

  if (!projectRow) {
    throw new Error("Project not found.");
  }

  const repoConfig = JSON.parse(
    projectRow.repoConfigJson
  ) as StoredProjectRepoConfig;
  const alertIds = db
    .select({ id: alertsTable.id })
    .from(alertsTable)
    .where(eq(alertsTable.projectId, id))
    .all()
    .map((row) => row.id);

  await deleteManagedRepo(repoConfig.managedRepoPath);

  if (alertIds.length > 0) {
    db.delete(feedbackSignalsTable)
      .where(inArray(feedbackSignalsTable.alertId, alertIds))
      .run();
  }

  db.delete(alertsTable).where(eq(alertsTable.projectId, id)).run();
  db.delete(projectsTable).where(eq(projectsTable.id, id)).run();
}
