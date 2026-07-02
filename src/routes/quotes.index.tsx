import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth";
import { DocumentList } from "@/components/DocumentList";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quotes/")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <QuotesPage />
      </AppShell>
    </AuthProvider>
  ),
});

function QuotesPage() {
  const navigate = useNavigate();

  async function convertToInvoice(quote: any) {
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "invoice" });
    const { data: user } = await supabase.auth.getUser();
    const { data: inv, error } = await supabase.from("documents").insert({
      doc_type: "invoice",
      doc_number: numData,
      parent_id: quote.id,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      customer_phone: quote.customer_phone,
      customer_address: quote.customer_address,
      project_description: quote.project_description,
      status: "unpaid",
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      total: quote.total,
      created_by: user.user?.id,
    }).select().single();
    if (error || !inv) { alert(error?.message); return; }

    const { data: items } = await supabase.from("line_items").select("*").eq("document_id", quote.id);
    if (items && items.length) {
      await supabase.from("line_items").insert(items.map((i: any) => ({
        document_id: inv.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        sort_order: i.sort_order,
      })));
    }
    await supabase.from("activity_log").insert({ document_id: quote.id, action: "converted_to_invoice", description: `Invoice ${inv.doc_number} created`, performed_by: user.user?.id });
    navigate({ to: "/invoices" });
  }

  return (
    <DocumentList
      docType="quote"
      title="Quotations"
      tabs={["all", "draft", "sent", "approved", "rejected"]}
      newHref="/quotes/new"
      detailBase="/quotes"
      onConvert={convertToInvoice}
      convertLabel="Convert to Invoice"
    />
  );
}
