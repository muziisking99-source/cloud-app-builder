import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DocumentList } from "@/components/DocumentList";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateDocuments } from "@/lib/queries";

export const Route = createFileRoute("/invoices/")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const navigate = useNavigate();
  const invalidateDocuments = useInvalidateDocuments();
  const { tab } = Route.useSearch();

  async function createDeliveryNote(invoice: any) {
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "delivery_note" });
    const { data: user } = await supabase.auth.getUser();
    const { data: dn, error } = await supabase.from("documents").insert({
      doc_type: "delivery_note",
      doc_number: numData as string,
      parent_id: invoice.id,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_phone: invoice.customer_phone,
      customer_address: invoice.customer_address,
      project_description: invoice.project_description,
      status: "ready",
      created_by: user.user?.id,
    }).select().single();
    if (error || !dn) { throw new Error(error?.message ?? "Could not create delivery note"); }

    const { data: items } = await supabase.from("line_items").select("*").eq("document_id", invoice.id);
    if (items && items.length) {
      await supabase.from("line_items").insert(items.map((i: any) => ({
        document_id: dn.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        sort_order: i.sort_order,
      })));
    }
    await supabase.from("activity_log").insert({ document_id: invoice.id, action: "delivery_note_created", description: `Delivery Note ${dn.doc_number} created`, performed_by: user.user?.id });
    invalidateDocuments();
    navigate({ to: "/delivery", search: { tab: undefined } });
  }

  return (
    <DocumentList
      docType="invoice"
      title="Invoices"
      tabs={["all", "unpaid", "paid", "overdue", "cancelled"]}
      detailBase="/invoices"
      initialTab={tab}
      onConvert={createDeliveryNote}
      convertLabel="Create Delivery Note"
      markPaid
    />
  );
}
