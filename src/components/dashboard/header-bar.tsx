import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import FilterBar from "@/components/dashboard/filter-bar";
import HeaderLangToggle from "@/components/header-lang-toggle";
import ToggleTheme from "@/components/toggle-theme";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAlertStore } from "@/store/alert-store";

export default function HeaderBar() {
  const { t } = useTranslation();
  const search = useAlertStore((state) => state.search);
  const setSearch = useAlertStore((state) => state.setSearch);

  return (
    <header className="flex items-center gap-4 border-b px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="max-w-md flex-1">
            <div className="relative">
              {/* 搜索框 */}
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("dashboard.searchPlaceholder")}
                value={search}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <HeaderLangToggle />
            <ToggleTheme />
          </div>
        </div>
        <FilterBar />
      </div>
    </header>
  );
}
