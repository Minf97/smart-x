import type { Item } from "@shared/types/alert";
import type { Project } from "@shared/types/project";

// 面板数据
export interface DashboardData {
  alerts: Item[]; // 报警
  projects: Project[]; // 项目
}
