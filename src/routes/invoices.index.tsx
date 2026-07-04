import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DocumentList } from "@/components/DocumentList";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentsByType, useInvalidateDocuments } from "@/lib/queries";
import { invoiceBalance, isOpenInvoice, money } from "@/lib/format";
import { generateStatementPDF } from "@/lib/pdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/invoices/")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: InvoicesPage,
});

type StatementCustomer = {
  name: string;
  address: string | null;
  invoices: any[];
  balance: number;
};

function InvoicesPage() {
  const navigate = useNavigate();
  const invalidateDocuments = useInvalidateDocuments();
  const { tab } = Route.useSearch();
  const { data: invoices = [] } = useDocumentsByType("invoice");
  const [stmtOpen, setStmtOpen] = useState(false);
  const [busyCustomer, setBusyCustomer] = useState<string | null>(null);

  const statementCustomers = useMemo(() => {
    const map = new Map<string, StatementCustomer>();
    for (const inv of invoices.filter(isOpenInvoice)) {
      const key = (inv.customer_name ?? "").trim().toLowerCase();
      if (!key) continue;
      const entry = map.get(key) ?? {
        name: inv.customer_name,
        address: inv.customer_address ?? null,
        invoices: [],
        balance: 0,
      };
      entry.invoices.push(inv);
      entry.balance += invoiceBalance(inv);
      if (!entry.address && inv.customer_address) entry.address = inv.customer_address;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

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

  async function downloadStatement(customer: StatementCustomer) {
    setBusyCustomer(customer.name);
    try {
      await generateStatementPDF(
        customer.name,
        customer.address,
        customer.invoices.map((inv) => ({
          doc_number: inv.doc_number,
          doc_date: inv.doc_date,
          due_date: inv.due_date,
          total: Number(inv.total),
          amount_paid: Number(inv.amount_paid || 0),
        })),
      );
      toast.success(`Statement for ${customer.name} downloaded`);
      setStmtOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate statement");
    } finally {
      setBusyCustomer(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setStmtOpen(true)}
          className="inline-flex items-center gap-2 rounded-[4px] border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
          style={{ borderColor: "var(--royal)" }}
        >
          <FileText className="h-4 w-4" /> Customer Statement
        </button>
      </div>

      <DocumentList
        docType="invoice"
        title="Invoices"
        tabs={["all", "unpaid", "part_paid", "paid", "overdue", "cancelled"]}
        detailBase="/invoices"
        initialTab={tab}
        onConvert={createDeliveryNote}
        convertLabel="Create Delivery Note"
        markPaid
      />

      <Dialog open={stmtOpen} onOpenChange={setStmtOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Customer Statement</DialogTitle>
            <DialogDescription>
              Download a PDF statement of open invoices for a customer.
            </DialogDescription>
          </DialogHeader>

          {statementCustomers.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--muted-navy)]">
              No customers with open invoices right now.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {statementCustomers.map((customer) => (
                <button
                  key={customer.name}
                  type="button"
                  disabled={busyCustomer === customer.name}
                  onClick={() => void downloadStatement(customer)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-[color:var(--offwhite)] disabled:opacity-60"
                >
                  <div>
                    <div className="text-sm font-medium text-[color:var(--ink)]">{customer.name}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted-navy)]">
                      {customer.invoices.length} open invoice{customer.invoices.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-lg text-[color:var(--royal)]">{money(customer.balance)}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]">
                      Balance due
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
