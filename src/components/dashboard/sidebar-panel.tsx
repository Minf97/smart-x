import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAlertView } from "@/hooks/use-alerts";
import { useAlertStore } from "@/store/alert-store";
import { getLastSeen, getStatusIcon } from "./helpers";
import ProjectSwitcher from "./project-switcher";
import SettingsTrigger from "./settings-trigger";

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
        <SettingsTrigger />
      </div>

      <SidebarContent className="px-0">
        <SidebarMenu className="gap-0 px-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                className="h-8 gap-2 px-2 hover:bg-accent"
                isActive={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* 图标 */}
                <div className="shrink-0">{getStatusIcon(item.status)}</div>

                {/* 编号 */}
                <span className="w-16 shrink-0 font-mono text-muted-foreground text-xs">
                  {item.id}
                </span>

                {/* 标题 */}
                <span className="flex-1 truncate text-xs">{item.title}</span>

                {/* 时间 */}
                {hoveredId === item.id && (
                  <span className="shrink-0 text-muted-foreground text-xs">
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
