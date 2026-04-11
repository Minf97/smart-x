import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import DetailContent from "@/components/dashboard/detail-content";
import DetailHeader from "@/components/dashboard/detail-header";
import FooterBar from "@/components/dashboard/footer-bar";
import HeaderBar from "@/components/dashboard/header-bar";
import SidebarPanel from "@/components/dashboard/sidebar-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAlertStore } from "@/store/alert-store";

function DashboardPage() {
  // 仓库状态
  const error = useAlertStore((state) => state.error);
  const fetchItems = useAlertStore((state) => state.fetchItems);
  const hoveredId = useAlertStore((state) => state.hoveredId);
  const items = useAlertStore((state) => state.items);
  const loading = useAlertStore((state) => state.loading);
  const search = useAlertStore((state) => state.search);
  const selectedId = useAlertStore((state) => state.selectedId);
  const setHoveredId = useAlertStore((state) => state.setHoveredId);
  const setSearch = useAlertStore((state) => state.setSearch);
  const setSelectedId = useAlertStore((state) => state.setSelectedId);

  // 首次拉取
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 搜索过滤
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(keyword) ||
        item.title.toLowerCase().includes(keyword) ||
        item.detail.summary.source.toLowerCase().includes(keyword)
      );
    });
  }, [items, search]);

  // 当前选中
  const selectedItem = useMemo(() => {
    return (
      items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null
    );
  }, [filteredItems, items, selectedId]);

  return (
    <SidebarProvider defaultOpen>
      {/* 主容器 */}
      <div className="flex h-screen w-full bg-background">
        {/* 侧栏区 */}
        <SidebarPanel
          hoveredId={hoveredId}
          items={filteredItems}
          onHoverChange={setHoveredId}
          onSelect={setSelectedId}
          selectedId={selectedItem?.id ?? null}
        />

        {/* 主内容 */}
        <SidebarInset>
          <div className="flex h-full flex-col">
            <HeaderBar onSearchChange={setSearch} search={search} />
            <DetailHeader item={selectedItem} />
            <div className="flex-1 overflow-auto">
              <DetailContent
                error={error}
                item={selectedItem}
                loading={loading}
                onRetry={() => {
                  fetchItems();
                }}
              />
            </div>
            <FooterBar disabled={loading || !selectedItem} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});
