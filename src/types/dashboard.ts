import type { Item } from "./alert";
import type { Project } from "./project";

// 面板数据
export interface DashboardData {
  alerts: Item[]; // 报警
  projects: Project[]; // 项目
}
