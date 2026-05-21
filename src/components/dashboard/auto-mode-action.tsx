import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAutoModeStore } from "@/store/auto-mode-store";
import { cn } from "@/utils/tailwind";

// 自动开关
export default function AutoModeAction() {
  const { t } = useTranslation();
  const enabled = useAutoModeStore((state) => state.enabled);
  const toggle = useAutoModeStore((state) => state.toggle);
  const title = enabled
    ? t("dashboard.autoModeDisable")
    : t("dashboard.autoModeEnable");

  // 切换模式
  function handleToggle() {
    toggle();
    toast.success(
      enabled ? t("dashboard.autoModeStopped") : t("dashboard.autoModeStarted")
    );
  }

  return (
    <Button
      aria-label={t("dashboard.autoMode")}
      aria-pressed={enabled}
      onClick={handleToggle}
      size="icon"
      title={title}
      type="button"
      variant={enabled ? "secondary" : "ghost"}
    >
      <RotateCw className={cn("size-4", enabled && "animate-spin")} />
    </Button>
  );
}
