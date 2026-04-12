import { Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import SettingsDialog from "./settings-dialog";

export default function SettingsTrigger() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // 打开设置
  function openSettings() {
    setOpen(true);
  }

  return (
    <>
      <Button
        aria-label={t("dashboard.projectSettings")}
        className="h-7 w-7"
        onClick={openSettings}
        size="icon"
        variant="ghost"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>
      <SettingsDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
