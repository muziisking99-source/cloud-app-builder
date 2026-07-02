import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QuoteForm } from "@/components/QuoteForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quotes/new")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <NewQuote />
      </AppShell>
    </AuthProvider>
  ),
});

function NewQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    if (error || !doc) { alert(error?.message); return; }
    if (items.length) {
      await supabase.from("line_items").insert(items.map((it, i) => ({ ...it, document_id: doc.id, sort_order: i })));
    }
    await supabase.from("activity_log").insert({ document_id: doc.id, action: sendMode ? "sent" : "created", description: `Quote ${doc.doc_number} ${sendMode ? "sent" : "created"}`, performed_by: user.id });
    navigate({ to: "/quotes/$id", params: { id: doc.id } });
  }

  return <QuoteForm onSubmit={handleSave} />;
}
