import { useTranslation } from "react-i18next";
import type { Item } from "@/types/alert";
import { getStack } from "../helpers";

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
