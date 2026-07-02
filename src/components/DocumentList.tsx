import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { money, fmtDate, DOC_LABEL } from "@/lib/format";
import { generatePDF } from "@/lib/pdf";
import { Eye, FileDown, ArrowRightCircle, CheckCircle2 } from "lucide-react";

type Props = {
  docType: "quote" | "invoice" | "delivery_note";
  title: string;
  tabs: string[]; // first is "all"
  newHref?: string;
  detailBase: string; // e.g. "/quotes"
  onConvert?: (doc: any) => Promise<void>;
  convertLabel?: string;
  markPaid?: boolean;
  markDelivered?: boolean;
};

export function DocumentList({ docType, title, tabs, newHref, detailBase, onConvert, convertLabel, markPaid, markDelivered }: Props) {
  const [docs, setDocs] = useState<any[]>([]);
  const [tab, setTab] = useState<string>(tabs[0]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").eq("doc_type", docType).order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [docType]);

  const filtered = useMemo(() => {
    if (tab === "all") return docs;
    return docs.filter((d) => d.status === tab);
  }, [docs, tab]);

  async function handlePDF(doc: any) {
    const { data: items } = await supabase.from("line_items").select("*").eq("document_id", doc.id).order("sort_order");
    generatePDF(doc, (items ?? []).map((i: any) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total_price: Number(i.total_price),
    })));
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("documents").update({ status }).eq("id", id);
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({ document_id: id, action: "status_changed", description: `Marked ${status}`, performed_by: user.user?.id });
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-none">{title}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted-navy)]">{DOC_LABEL[docType]} archive.</p>
        </div>
        {newHref && (
          <button
            onClick={() => navigate({ to: newHref })}
            className="rounded-[4px] bg-[color:var(--royal)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
          >
            + New {DOC_LABEL[docType]}
          </button>
        )}
      </div>

      <div className="mt-8 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative pb-3 text-xs font-semibold uppercase tracking-[0.08em] capitalize transition-colors"
              style={{ color: tab === t ? "var(--royal)" : "var(--muted-navy)" }}
            >
              {t.replace(/_/g, " ")}
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[color:var(--royal)]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
        {loading ? (
          <div className="p-10 text-center text-sm text-[color:var(--muted-navy)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[color:var(--muted-navy)]">Nothing here yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                {docType === "invoice" && <Th>Due</Th>}
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="group border-b transition-colors hover:bg-[color:var(--offwhite)]" style={{ borderColor: "var(--border)" }}>
                  <td className="px-6 py-4">
                    <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">{d.doc_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[color:var(--ink)]">{d.customer_name}</div>
                    <div className="text-[11px] text-[color:var(--muted-navy)]">{d.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[color:var(--mid-navy)]">{fmtDate(d.doc_date)}</td>
                  {docType === "invoice" && <td className="px-6 py-4 text-sm text-[color:var(--mid-navy)]">{fmtDate(d.due_date)}</td>}
                  <td className="px-6 py-4 text-right text-sm font-medium text-[color:var(--ink)]">{money(d.total)}</td>
                  <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link to={`${detailBase}/$id`} params={{ id: d.id }} title="View">
                        <IconBtn><Eye className="h-4 w-4" /></IconBtn>
                      </Link>
                      <button onClick={() => handlePDF(d)} title="PDF">
                        <IconBtn><FileDown className="h-4 w-4" /></IconBtn>
                      </button>
                      {onConvert && (
                        <button onClick={() => onConvert(d)} title={convertLabel}>
                          <IconBtn><ArrowRightCircle className="h-4 w-4 text-[color:var(--royal)]" /></IconBtn>
                        </button>
                      )}
                      {markPaid && d.status !== "paid" && (
                        <button onClick={() => updateStatus(d.id, "paid")} title="Mark paid">
                          <IconBtn><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
                        </button>
                      )}
                      {markDelivered && d.status !== "delivered" && (
                        <button onClick={() => updateStatus(d.id, "delivered")} title="Mark delivered">
                          <IconBtn><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: any; className?: string }) {
  return <th className={`px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] ${className}`}>{children}</th>;
}
function IconBtn({ children }: { children: any }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border text-[color:var(--mid-navy)] transition-colors hover:bg-[color:var(--offwhite)]"
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </span>
  );
}
