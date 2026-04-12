import { Separator } from "@/components/ui/separator";
import { useAlertView } from "@/hooks/use-alerts";
import DetailActivity from "./activity";
import DetailAnalysis from "./analysis";
import DetailRequest from "./request";
import DetailStack from "./stack";
import DetailSummary from "./summary";

export default function DetailContent() {
  const { selectedItem: item, selectedRequest } = useAlertView();

  if (!item) {
    return null;
  }

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <DetailSummary item={item} />

      <Separator />

      <DetailStack item={item} />

      <Separator />

      <DetailAnalysis item={item} />

      <Separator />

      <DetailRequest request={selectedRequest} />

      <Separator />

      <DetailActivity item={item} />
    </div>
  );
}
