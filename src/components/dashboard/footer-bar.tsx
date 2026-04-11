import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface FooterBarProps {
  disabled: boolean;
}

export default function FooterBar({ disabled }: FooterBarProps) {
  const { t } = useTranslation();

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
