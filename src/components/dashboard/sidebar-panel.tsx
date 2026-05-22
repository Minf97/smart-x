import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { listAlerts, syncAlerts } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import { useAlertStore } from "@/store/alert-store";
import AlertStatusDropdown from "./alert-status-dropdown";
import { getLastSeen } from "./helpers";
import ProjectSwitcher from "./project-switcher";
import SettingsTrigger from "./settings-trigger";

function AlertsRefreshButton() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    async mutationFn() {
      const result = await syncAlerts();

      await queryClient.fetchQuery({
        queryFn: listAlerts,
        queryKey: ALERTS_QUERY_KEY,
      });

      return result;
    },
    onError(error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.refreshAlertsFailed")
      );
    },
    onSuccess(result) {
      toast.success(t("dashboard.refreshAlertsSuccess"));
    },
  });

  return (
    <Button
      aria-label={t("dashboard.refreshAlerts")}
      className="h-7 w-7"
      disabled={refreshMutation.isPending}
      onClick={() => refreshMutation.mutate()}
      size="icon"
      title={t("dashboard.refreshAlerts")}
      type="button"
      variant="ghost"
    >
      <RefreshCw
        className={
          refreshMutation.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"
        }
      />
    </Button>
  );
}

export default function SidebarPanel() {
  const { t } = useTranslation();
  const hoveredId = useAlertStore((state) => state.hoveredId);
  const setHoveredId = useAlertStore((state) => state.setHoveredId);
  const setSelectedId = useAlertStore((state) => state.setSelectedId);
  const { filteredItems: items, selectedItem } = useAlertView();
  const selectedId = selectedItem?.id ?? null;

  return (
    <Sidebar className="border-r" variant="inset">
      <SidebarHeader className="border-b">
        <ProjectSwitcher />
      </SidebarHeader>

      {/* 统计栏 */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <span className="font-medium">{t("dashboard.allAlerts")}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground/60">{items.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertsRefreshButton />
          <SettingsTrigger />
        </div>
      </div>

      <SidebarContent className="px-0">
        <SidebarMenu className="gap-0">
          {items.map((item) => (
            <SidebarMenuItem
              className="flex min-w-0 items-center gap-1"
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <AlertStatusDropdown
                item={item}
                triggerClassName="h-8 w-7 shrink-0"
              />
              <SidebarMenuButton
                className="h-8 min-w-0 flex-1 gap-2 px-2 hover:bg-accent"
                isActive={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
              >
                {/* 编号 */}
                <span
                  className="w-16 shrink-0 truncate font-mono text-muted-foreground text-xs"
                  title={item.id}
                >
                  {item.id}
                </span>

                {/* 标题 */}
                <span
                  className="min-w-0 flex-1 truncate text-xs"
                  title={item.title}
                >
                  {item.title}
                </span>

                {/* 时间 */}
                {hoveredId === item.id && (
                  <span className="max-w-16 shrink-0 truncate text-muted-foreground text-xs">
                    {getLastSeen(item)}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
