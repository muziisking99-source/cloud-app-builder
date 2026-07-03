import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DocumentDetail, InfoCard } from "@/components/DocumentDetail";
import { DeleteDocButton } from "@/components/DeleteDocButton";
import { useConfirm } from "@/components/ConfirmDialog";
import { useDocument, useUpdateStatus, useInvalidateDocuments } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import { CheckCircle2, XCircle, ClipboardList, Truck } from "lucide-react";

export const Route = createFileRoute("/invoices/$id")({
  component: InvoiceDetail,
});

function isOverdue(d: any) {
  return (
    ["unpaid", "sent", "overdue"].includes(d.status) && d.due_date && new Date(d.due_date) < new Date()
  );
}

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateStatus = useUpdateStatus();
  const invalidateDocuments = useInvalidateDocuments();
  const confirm = useConfirm();

  async function cancelInvoice(doc: any) {
    const ok = await confirm({
      title: `Cancel ${doc.doc_number}?`,
      description: "This marks the invoice as cancelled and can't be undone from here.",
      confirmLabel: "Cancel Invoice",
      cancelLabel: "Keep It",
      destructive: true,
    });
    if (!ok) return;
    updateStatus.mutate({ id: doc.id, status: "cancelled", docNumber: doc.doc_number });
  }

  async function createDeliveryNote(doc: any, items: any[]) {
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "delivery_note" });
    const { data: dn, error } = await supabase.from("documents").insert({
      doc_type: "delivery_note", doc_number: numData as string, parent_id: doc.id,
      customer_name: doc.customer_name, customer_email: doc.customer_email,
      customer_phone: doc.customer_phone, customer_address: doc.customer_address,
      project_description: doc.project_description, status: "ready",
      created_by: user?.id,
    }).select().single();
    if (error || !dn) { toast.error(error?.message ?? "Could not create delivery note"); return; }
    if (items.length) {
      await supabase.from("line_items").insert(items.map((i: any) => ({
        document_id: dn.id, description: i.description, quantity: i.quantity,
        unit_price: i.unit_price, total_price: i.total_price, sort_order: i.sort_order,
      })));
    }
    await supabase.from("activity_log").insert({ document_id: doc.id, action: "delivery_note_created", description: `Delivery Note ${dn.doc_number} created`, performed_by: user?.id });
    toast.success(`Delivery Note ${dn.doc_number} created from ${doc.doc_number}`);
    invalidateDocuments();
    navigate({ to: "/delivery/$id", params: { id: dn.id } });
  }

  async function createJobCard(doc: any) {
    // Tie the job card back to the originating quote so it stays in the same
    // order chain; fall back to the invoice itself if there's no parent.
    const linkId = doc.parent_id ?? doc.id;
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "job_card" });
    const { data: jc, error } = await supabase.from("documents").insert({
      doc_type: "job_card", doc_number: numData as string, parent_id: linkId,
      customer_name: doc.customer_name, customer_email: doc.customer_email,
      project_description: doc.project_description, status: "pending",
      created_by: user?.id,
    }).select().single();
    if (error || !jc) { toast.error(error?.message ?? "Could not create job card"); return; }
    await supabase.from("activity_log").insert({ document_id: linkId, action: "job_carded", description: `Job Card ${jc.doc_number} created`, performed_by: user?.id });
    toast.success(`Job Card ${jc.doc_number} created`);
    invalidateDocuments();
    navigate({ to: "/jobs" });
  }

  return (
    <DocumentDetail
      id={id}
      listLabel="Invoices"
      listTo="/invoices"
      extraCards={(doc) => (
        <>
          <InfoCard label="Due Date">
            {doc.due_date ? (
              <div className={`text-sm ${isOverdue(doc) ? "font-medium text-[color:var(--danger)]" : "text-[color:var(--ink)]"}`}>
                {fmtDate(doc.due_date)}
                {isOverdue(doc) && (
                  <span className="ml-2 rounded bg-[color:var(--danger)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">overdue</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-[color:var(--muted-navy)]">—</div>
            )}
          </InfoCard>
          {doc.parent_id && <ParentDocCard parentId={doc.parent_id} label="Source Quote" detailPath="/quotes/$id" />}
        </>
      )}
      actions={(doc, items) => (
        <>
          {doc.status !== "paid" && doc.status !== "cancelled" && (
            <button
              onClick={() => updateStatus.mutate({ id: doc.id, status: "paid", docNumber: doc.doc_number })}
              className="press inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--eco)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:brightness-95 active:scale-[0.97]"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Paid
            </button>
          )}
          <button
            onClick={() => createDeliveryNote(doc, items)}
            className="press inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--royal)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
          >
            <Truck className="h-4 w-4" /> Create Delivery Note
          </button>
          <button
            onClick={() => createJobCard(doc)}
            className="press inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
            style={{ borderColor: "var(--royal)" }}
          >
            <ClipboardList className="h-4 w-4" /> Create Job Card
          </button>
          {doc.status !== "paid" && doc.status !== "cancelled" && (
            <button
              onClick={() => cancelInvoice(doc)}
              className="press inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
              style={{ borderColor: "var(--danger)" }}
            >
              <XCircle className="h-4 w-4" /> Cancel Invoice
            </button>
          )}
          <DeleteDocButton doc={doc} listTo="/invoices" label="Delete Invoice" />
        </>
      )}
    />
  );
}

export function ParentDocCard({
  parentId,
  label,
  detailPath,
}: {
  parentId: string;
  label: string;
  detailPath: "/quotes/$id" | "/invoices/$id" | "/delivery/$id";
}) {
  const { data: parent } = useDocument(parentId);
  if (!parent) return null;
  return (
    <InfoCard label={label}>
      <Link
        to={detailPath}
        params={{ id: parent.id }}
        className="font-mono text-sm text-[color:var(--royal)] hover:underline"
      >
        {parent.doc_number}
      </Link>
      <div className="mt-1 text-xs text-[color:var(--muted-navy)]">{fmtDate(parent.doc_date)}</div>
    </InfoCard>
  );
}
