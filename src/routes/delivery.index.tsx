import { createFileRoute } from "@tanstack/react-router";
import { DocumentList } from "@/components/DocumentList";

export const Route = createFileRoute("/delivery/")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  const { tab } = Route.useSearch();
  return (
    <DocumentList
      docType="delivery_note"
      title="Delivery Notes"
      tabs={["all", "ready", "in_transit", "delivered", "returned"]}
      detailBase="/delivery"
      initialTab={tab}
      markDelivered
    />
  );
}
