import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import DetailContent from "@/components/dashboard/detail-content";
import DetailHeader from "@/components/dashboard/detail-header";
import FooterBar from "@/components/dashboard/footer-bar";
import HeaderBar from "@/components/dashboard/header-bar";
import SidebarPanel from "@/components/dashboard/sidebar-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAlertStore } from "@/store/alert-store";

function DashboardPage() {
  const fetchItems = useAlertStore((state) => state.fetchItems);

  // 首次拉取
  useEffect(() => {
    fetchItems().catch(() => undefined);
  }, [fetchItems]);

  return (
    <SidebarProvider defaultOpen>
      {/* 主容器 */}
      <div className="flex h-screen w-full bg-background">
        {/* 侧栏区 */}
        <SidebarPanel />

        {/* 主内容 */}
        <SidebarInset>
          <div className="flex h-full flex-col">
            <HeaderBar />
            <DetailHeader />
            <div className="flex-1 overflow-auto">
              <DetailContent />
            </div>
            <FooterBar />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
