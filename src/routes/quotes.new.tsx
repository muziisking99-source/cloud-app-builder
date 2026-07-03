import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { QuoteForm } from "@/components/QuoteForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateDocuments } from "@/lib/queries";

export const Route = createFileRoute("/quotes/new")({
  component: NewQuote,
});

function NewQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const invalidateDocuments = useInvalidateDocuments();

  async function handleSave(payload: any, items: any[], sendMode: boolean) {
    if (!user) return;
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "quote" });
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        ...payload,
        doc_type: "quote",
        doc_number: numData as string,
        status: sendMode ? "sent" : "draft",
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !doc) { toast.error(error?.message ?? "Could not save quote"); return; }
    if (items.length) {
      await supabase.from("line_items").insert(items.map((it, i) => ({ ...it, document_id: doc.id, sort_order: i })));
    }
    await supabase.from("activity_log").insert({ document_id: doc.id, action: sendMode ? "sent" : "created", description: `Quote ${doc.doc_number} ${sendMode ? "sent" : "created"}`, performed_by: user.id });
    toast.success(`Quote ${doc.doc_number} ${sendMode ? "sent" : "saved as draft"}`);
    invalidateDocuments();
    navigate({ to: "/quotes/$id", params: { id: doc.id } });
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Quotations", to: "/quotes" }, { label: "New" }]} />
      <QuoteForm onSubmit={handleSave} />
    </div>
  );
}
