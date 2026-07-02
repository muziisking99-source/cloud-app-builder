import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { money, fmtDate, DOC_LABEL } from "@/lib/format";
import { generatePDF } from "@/lib/pdf";
import { FileDown, ArrowRightCircle, ClipboardList, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/quotes/$id")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <QuoteDetail />
      </AppShell>
    </AuthProvider>
  ),
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  async function load() {
    const { data: d } = await supabase.from("documents").select("*").eq("id", id).single();
    setDoc(d);
    const { data: li } = await supabase.from("line_items").select("*").eq("document_id", id).order("sort_order");
    setItems(li ?? []);
    const { data: log } = await supabase.from("activity_log").select("*").eq("document_id", id).order("performed_at", { ascending: false });
    setActivity(log ?? []);
  }
  useEffect(() => { load(); }, [id]);

  async function setStatus(status: string) {
    await supabase.from("documents").update({ status }).eq("id", id);
    await supabase.from("activity_log").insert({ document_id: id, action: "status_changed", description: `Marked ${status}`, performed_by: user?.id });
    load();
  }

  async function convertToInvoice() {
    if (!doc) return;
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "invoice" });
    const { data: inv } = await supabase.from("documents").insert({
      doc_type: "invoice", doc_number: numData as string, parent_id: doc.id,
      customer_name: doc.customer_name, customer_email: doc.customer_email,
      customer_phone: doc.customer_phone, customer_address: doc.customer_address,
      project_description: doc.project_description, status: "unpaid",
      subtotal: doc.subtotal, tax_rate: doc.tax_rate, tax_amount: doc.tax_amount, total: doc.total,
      created_by: user?.id,
    }).select().single();
    if (!inv) return;
    if (items.length) {
      await supabase.from("line_items").insert(items.map((i) => ({
        document_id: inv.id, description: i.description, quantity: i.quantity,
        unit_price: i.unit_price, total_price: i.total_price, sort_order: i.sort_order,
      })));
    }
    await supabase.from("activity_log").insert({ document_id: doc.id, action: "converted_to_invoice", description: `Invoice ${inv.doc_number} created`, performed_by: user?.id });
    navigate({ to: "/invoices" });
  }

  async function createJobCard() {
    if (!doc) return;
    const { data: numData } = await supabase.rpc("generate_doc_number", { p_doc_type: "job_card" });
    const { data: jc } = await supabase.from("documents").insert({
      doc_type: "job_card", doc_number: numData as string, parent_id: doc.id,
      customer_name: doc.customer_name, customer_email: doc.customer_email,
      project_description: doc.project_description, status: "pending",
      created_by: user?.id,
    }).select().single();
    if (!jc) return;
    await supabase.from("activity_log").insert({ document_id: doc.id, action: "job_carded", description: `Job Card ${jc.doc_number} created`, performed_by: user?.id });
    navigate({ to: "/jobs" });
  }

  if (!doc) return <div className="text-sm text-[color:var(--muted-navy)]">Loading…</div>;

  return (
    <div>
      <Link to="/quotes" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] hover:text-[color:var(--royal)]">
        <ArrowLeft className="h-3 w-3" /> Back to Quotations
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label-caps">{DOC_LABEL[doc.doc_type]}</div>
          <h1 className="mt-1 font-serif text-4xl leading-none">{doc.doc_number}</h1>
          <div className="mt-3"><StatusBadge status={doc.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => generatePDF(doc, items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total_price: Number(i.total_price) })))}
            className="inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--mid-navy)] hover:bg-[color:var(--offwhite)]"
            style={{ borderColor: "var(--border)" }}
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
          {doc.status !== "approved" && (
            <button onClick={() => setStatus("approved")} className="inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--eco)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-95">
              Mark Approved
            </button>
          )}
          <button onClick={convertToInvoice} className="inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--royal)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[color:var(--royal-deep)]">
            <ArrowRightCircle className="h-4 w-4" /> Convert to Invoice
          </button>
          <button onClick={createJobCard} className="inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] hover:bg-[color:var(--offwhite)]" style={{ borderColor: "var(--royal)" }}>
            <ClipboardList className="h-4 w-4" /> Create Job Card
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <InfoCard label="Customer">
          <div className="text-sm text-[color:var(--ink)]">{doc.customer_name}</div>
          <div className="mt-1 text-xs text-[color:var(--muted-navy)]">{doc.customer_email}</div>
          <div className="text-xs text-[color:var(--muted-navy)]">{doc.customer_phone}</div>
          <div className="text-xs text-[color:var(--muted-navy)]">{doc.customer_address}</div>
        </InfoCard>
        <InfoCard label="Project">
          <div className="text-sm text-[color:var(--ink)]">{doc.project_description || "—"}</div>
        </InfoCard>
        <InfoCard label="Date">
          <div className="text-sm text-[color:var(--ink)]">{fmtDate(doc.doc_date)}</div>
        </InfoCard>
      </div>

      <div className="mt-8 rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]">Description</th>
              <th className="px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]">Qty</th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]">Unit</th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="px-6 py-3 text-sm text-[color:var(--ink)]">{i.description}</td>
                <td className="px-6 py-3 text-center text-sm">{Number(i.quantity)}</td>
                <td className="px-6 py-3 text-right text-sm">{money(i.unit_price)}</td>
                <td className="px-6 py-3 text-right text-sm font-medium">{money(i.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end px-6 py-4">
          <div className="w-72">
            <div className="flex justify-between py-1 text-sm text-[color:var(--mid-navy)]"><span>Subtotal</span><span>{money(doc.subtotal)}</span></div>
            <div className="flex justify-between py-1 text-sm text-[color:var(--mid-navy)]"><span>Tax ({doc.tax_rate}%)</span><span>{money(doc.tax_amount)}</span></div>
            <div className="mt-2 flex items-baseline justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <span className="label-caps">Total</span>
              <span className="font-serif text-2xl text-[color:var(--royal)]">{money(doc.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {doc.notes && (
        <div className="mt-6 rounded-md border p-5" style={{ borderColor: "var(--border)" }}>
          <div className="label-caps mb-2">Notes</div>
          <div className="text-sm text-[color:var(--mid-navy)]">{doc.notes}</div>
        </div>
      )}

      <div className="mt-10">
        <h3 className="font-serif text-xl">Activity</h3>
        <div className="mt-4 space-y-3">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="mt-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: "var(--royal)" }} />
              <div>
                <div className="text-sm text-[color:var(--ink)]">{a.description || a.action}</div>
                <div className="text-[11px] text-[color:var(--muted-navy)]">{fmtDate(a.performed_at)}</div>
              </div>
            </div>
          ))}
          {activity.length === 0 && <div className="text-sm text-[color:var(--muted-navy)]">No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: any }) {
  return (
    <div className="rounded-md border p-5" style={{ borderColor: "var(--border)" }}>
      <div className="label-caps mb-2">{label}</div>
      {children}
    </div>
  );
}
