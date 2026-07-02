import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
import { DocumentList } from "@/components/DocumentList";

export const Route = createFileRoute("/delivery")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <DocumentList
          docType="delivery_note"
          title="Delivery Notes"
          tabs={["all", "ready", "in_transit", "delivered", "returned"]}
          detailBase="/delivery"
          markDelivered
        />
      </AppShell>
    </AuthProvider>
  ),
});
