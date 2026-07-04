import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DocumentDetail, InfoCard } from "@/components/DocumentDetail";
import { DeleteDocButton } from "@/components/DeleteDocButton";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  useDocument,
  useInvalidateDocuments,
  useMarkInvoicePaid,
  useRecordPayment,
} from "@/lib/queries";
import { fmtDate, invoiceBalance, isInvoiceOverdue, money } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, ClipboardList, Truck, Banknote } from "lucide-react";

export const Route = createFileRoute("/invoices/$id")({
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const invalidateDocuments = useInvalidateDocuments();
  const confirm = useConfirm();
  const markPaid = useMarkInvoicePaid();
  const recordPayment = useRecordPayment();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDoc, setPaymentDoc] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  async function cancelInvoice(doc: any) {
    const ok = await confirm({
      title: `Cancel ${doc.doc_number}?`,
      description: "This marks the invoice as cancelled and can't be undone from here.",
      confirmLabel: "Cancel Invoice",
      cancelLabel: "Keep It",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("documents").update({ status: "cancelled" }).eq("id", doc.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${doc.doc_number} cancelled`);
      invalidateDocuments();
    }
  }

  function openPaymentDialog(doc: any) {
    const balance = invoiceBalance(doc);
    setPaymentDoc(doc);
    setPaymentAmount(balance > 0 ? balance.toFixed(2) : "");
    setPaymentOpen(true);
  }

  async function submitPayment() {
    if (!paymentDoc) return;
    const amount = Number(paymentAmount.replace(/[^0-9.-]/g, "")) || 0;
    const balance = invoiceBalance(paymentDoc);
    if (amount <= 0) {
      toast.error("Enter a payment amount greater than zero.");
      return;
    }
    if (amount > balance) {
      toast.error(`Payment cannot exceed the balance due of ${money(balance)}.`);
      return;
    }
    await recordPayment.mutateAsync({ doc: paymentDoc, amount });
    setPaymentOpen(false);
    setPaymentDoc(null);
    setPaymentAmount("");
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
    <>
      <DocumentDetail
        id={id}
        listLabel="Invoices"
        listTo="/invoices"
        extraCards={(doc) => {
          const paid = Number(doc.amount_paid || 0);
          const balance = invoiceBalance(doc);
          return (
            <>
              {paid > 0 && (
                <>
                  <InfoCard label="Paid So Far">
                    <div className="text-sm font-medium text-[color:var(--eco)]">{money(paid)}</div>
                  </InfoCard>
                  <InfoCard label="Balance Due">
                    <div className={`text-sm font-medium ${balance > 0 ? "text-[color:var(--ink)]" : "text-[color:var(--eco)]"}`}>
                      {money(balance)}
                    </div>
                  </InfoCard>
                </>
              )}
              <InfoCard label="Due Date">
                {doc.due_date ? (
                  <div className={`text-sm ${isInvoiceOverdue(doc) ? "font-medium text-[color:var(--danger)]" : "text-[color:var(--ink)]"}`}>
                    {fmtDate(doc.due_date)}
                    {isInvoiceOverdue(doc) && (
                      <span className="ml-2 rounded bg-[color:var(--danger)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">overdue</span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[color:var(--muted-navy)]">—</div>
                )}
              </InfoCard>
              {doc.parent_id && <ParentDocCard parentId={doc.parent_id} label="Source Quote" detailPath="/quotes/$id" />}
            </>
          );
        }}
        actions={(doc, items) => (
          <>
            {doc.status !== "paid" && doc.status !== "cancelled" && (
              <>
                <button
                  onClick={() => openPaymentDialog(doc)}
                  className="press inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
                  style={{ borderColor: "var(--royal)" }}
                >
                  <Banknote className="h-4 w-4" /> Record Payment
                </button>
                <button
                  onClick={() => markPaid.mutate({ doc })}
                  disabled={markPaid.isPending}
                  className="press inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--eco)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Paid
                </button>
              </>
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

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Record Payment</DialogTitle>
            <DialogDescription>
              {paymentDoc
                ? `${paymentDoc.doc_number} · Balance due ${money(invoiceBalance(paymentDoc))}`
                : "Enter the payment amount received."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <label className="label-caps mb-1.5 block">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--royal)]"
              style={{ borderColor: "var(--border)" }}
              placeholder="0.00"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setPaymentOpen(false)}
              className="rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--mid-navy)]"
              style={{ borderColor: "var(--border)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitPayment()}
              disabled={recordPayment.isPending}
              className="rounded-[4px] bg-[color:var(--royal)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              {recordPayment.isPending ? "Saving…" : "Record Payment"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
