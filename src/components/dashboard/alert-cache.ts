import type { Item, ItemStatus } from "@shared/types/alert";
import type { DashboardData } from "@/types/dashboard";

// 替换报警
export function replaceAlertInDashboard(
  data: DashboardData | undefined,
  updatedAlert: Item
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    alerts: data.alerts.map((item) =>
      item.id === updatedAlert.id ? updatedAlert : item
    ),
  };
}

// 改状态
export function updateAlertStatusInDashboard(
  data: DashboardData | undefined,
  alertId: string,
  status: ItemStatus
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    alerts: data.alerts.map((item) =>
      item.id === alertId
        ? {
            ...item,
            status,
            updatedAt: new Date().toISOString(),
          }
        : item
    ),
  };
}
