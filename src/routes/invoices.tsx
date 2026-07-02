import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
import { DocumentList } from "@/components/DocumentList";

export const Route = createFileRoute("/invoices")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <DocumentList
          docType="invoice"
          title="Invoices"
          tabs={["all", "unpaid", "paid", "overdue", "cancelled"]}
          detailBase="/invoices"
          markPaid
        />
      </AppShell>
    </AuthProvider>
  ),
});
