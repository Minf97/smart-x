import type { CodeLocation, Item } from "@shared/types/alert";
import { FileCode2, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { openPath } from "@/actions/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DetailLocationProps {
  item: Item;
}

// 文件位置
function formatLocation(location: CodeLocation) {
  const line = location.line ? `:${location.line}` : "";
  const column = location.column ? `:${location.column}` : "";

  return `${location.filePath}${line}${column}`;
}

export default function DetailLocation({ item }: DetailLocationProps) {
  const { t } = useTranslation();
  const locations = item.detail.analysis?.codeLocations ?? [];

  async function handleOpenLocation(location: CodeLocation) {
    if (!location.absolutePath) {
      return;
    }

    try {
      await openPath(location.absolutePath);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("dashboard.openLocationFailed")
      );
    }
  }

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">
        {t("dashboard.alertLocation")}
      </h3>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
          {t("dashboard.alertLocationEmpty")}
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div
              className="rounded-lg border bg-card p-4"
              key={`${location.filePath}-${location.line ?? index}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="size-3.5 text-blue-500" />
                <Button
                  className="h-auto min-h-0 break-all px-0 py-0 font-mono text-sm"
                  disabled={!location.absolutePath}
                  onClick={() => handleOpenLocation(location)}
                  title={t("dashboard.openLocation")}
                  type="button"
                  variant="link"
                >
                  {formatLocation(location)}
                </Button>
                {location.symbolName && (
                  <Badge className="font-mono" variant="outline">
                    {location.symbolName}
                  </Badge>
                )}
              </div>

              {location.reason && (
                <p className="mt-2 text-muted-foreground text-xs">
                  {location.reason}
                </p>
              )}

              {location.snippet && (
                <div className="mt-3 rounded-md border bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <FileCode2 className="size-3" />
                    <span>{t("dashboard.codeContext")}</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {location.snippet}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
