import type { Item } from "@shared/types/alert";
import { useTranslation } from "react-i18next";
import { getStack } from "@/components/dashboard/helpers";

interface DetailStackProps {
  item: Item;
}

export default function DetailStack({ item }: DetailStackProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">
        {t("dashboard.stackTrace")}
      </h3>
      <div className="rounded-lg border bg-muted/30 p-4 font-mono text-xs">
        <pre className="whitespace-pre-wrap text-muted-foreground">
          {getStack(item)}
        </pre>
      </div>
    </div>
  );
}
