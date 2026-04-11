import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAlertStore } from "@/store/alert-store";

export default function FooterBar() {
  const { t } = useTranslation();
  const disabled = useAlertStore(
    (state) => state.loading || !state.selectedItem
  );

  return (
    <div className="border-t px-6 py-4">
      <div className="flex gap-2">
        <Button disabled={disabled} size="sm">
          {t("dashboard.createPr")}
        </Button>
        <Button disabled={disabled} size="sm" variant="outline">
          {t("dashboard.markResolved")}
        </Button>
        <Button disabled={disabled} size="sm" variant="ghost">
          {t("dashboard.dismiss")}
        </Button>
      </div>
    </div>
  );
}
