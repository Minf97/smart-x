import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import HeaderLangToggle from "@/components/header-lang-toggle";
import ToggleTheme from "@/components/toggle-theme";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderBarProps {
  onSearchChange: (value: string) => void;
  search: string;
}

export default function HeaderBar({ onSearchChange, search }: HeaderBarProps) {
  const { t } = useTranslation();

  return (
    <header className="flex items-center gap-4 border-b px-4 py-3">
      <SidebarTrigger />
      <div className="max-w-md flex-1">
        <div className="relative">
          {/* 搜索框 */}
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            value={search}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <HeaderLangToggle />
        <ToggleTheme />
      </div>
    </header>
  );
}
