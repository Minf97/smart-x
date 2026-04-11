import { AlertCircle, ChevronDown, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useAlertStore } from "@/store/alert-store";
import { getLastSeen, getStatusIcon } from "./helpers";

export default function SidebarPanel() {
  const { t } = useTranslation();
  const hoveredId = useAlertStore((state) => state.hoveredId);
  const items = useAlertStore((state) => state.filteredItems);
  const selectedId = useAlertStore((state) => state.selectedItem?.id ?? null);
  const setHoveredId = useAlertStore((state) => state.setHoveredId);
  const setSelectedId = useAlertStore((state) => state.setSelectedId);

  return (
    <Sidebar className="border-r" variant="inset">
      <SidebarHeader className="border-b">
        <Button
          className="h-9 w-full justify-between px-3 hover:bg-accent"
          variant="ghost"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium text-sm">{t("dashboard.title")}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </SidebarHeader>

      {/* 统计栏 */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <span className="font-medium">{t("dashboard.allAlerts")}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground/60">{items.length}</span>
        </div>
        <Button className="h-7 w-7" size="icon" variant="ghost">
          <Settings className="h-3.5 w-3.5" />
        </Button>
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
