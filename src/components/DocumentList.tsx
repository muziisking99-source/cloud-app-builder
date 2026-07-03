import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentsByType, useUpdateStatus } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { TabBar } from "@/components/TabBar";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useConfirm } from "@/components/ConfirmDialog";
import { useDebounced } from "@/hooks/useDebounced";
import { money, fmtDate, DOC_LABEL } from "@/lib/format";
import { generatePDF } from "@/lib/pdf";
import { Eye, FileDown, ArrowRightCircle, CheckCircle2, Search, FileText, XCircle } from "lucide-react";

type Props = {
  docType: "quote" | "invoice" | "delivery_note";
  title: string;
  tabs: string[]; // first is "all"
  newHref?: string;
  detailBase: string; // e.g. "/quotes"
  initialTab?: string;
  onConvert?: (doc: any) => Promise<void>;
  convertLabel?: string;
  markPaid?: boolean;
  markDelivered?: boolean;
};

function isOverdue(d: any) {
  return (
    d.doc_type === "invoice" &&
    ["unpaid", "sent", "overdue"].includes(d.status) &&
    d.due_date &&
    new Date(d.due_date) < new Date()
  );
}

export function DocumentList({ docType, title, tabs, newHref, detailBase, initialTab, onConvert, convertLabel, markPaid, markDelivered }: Props) {
  const [tab, setTab] = useState<string>(initialTab && tabs.includes(initialTab) ? initialTab : tabs[0]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 200);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { data: docs = [], isPending } = useDocumentsByType(docType);
  const updateStatus = useUpdateStatus();

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length };
    for (const t of tabs) if (t !== "all") c[t] = docs.filter((d: any) => d.status === t).length;
    return c;
  }, [docs, tabs]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return docs.filter((d: any) => {
      if (tab !== "all" && d.status !== tab) return false;
      if (!q) return true;
      return (
        (d.doc_number ?? "").toLowerCase().includes(q) ||
        (d.customer_name ?? "").toLowerCase().includes(q) ||
        (d.customer_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [docs, tab, debouncedQuery]);

  async function handlePDF(doc: any) {
    const { data: items } = await supabase.from("line_items").select("*").eq("document_id", doc.id).order("sort_order");
    let parentRef: string | null = null;
    if (doc.doc_type === "delivery_note" && doc.parent_id) {
      const { data: parent } = await supabase.from("documents").select("doc_number").eq("id", doc.parent_id).maybeSingle();
      parentRef = parent?.doc_number ?? null;
    }
    generatePDF(doc, (items ?? []).map((i: any) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total_price: Number(i.total_price),
    })), { parentRef });
    toast.success(`${doc.doc_number} downloaded`);
  }

  async function handleConvert(doc: any) {
    if (!onConvert) return;
    try {
      await onConvert(doc);
      toast.success(`${doc.doc_number} ${convertLabel?.toLowerCase() ?? "converted"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Conversion failed");
    }
  }

  async function cancelInvoice(doc: any) {
    const ok = await confirm({
      title: `Cancel ${doc.doc_number}?`,
      description: "This marks the invoice as cancelled. You can't undo this from the list.",
      confirmLabel: "Cancel Invoice",
      cancelLabel: "Keep It",
      destructive: true,
    });
    if (!ok) return;
    updateStatus.mutate({ id: doc.id, status: "cancelled", docNumber: doc.doc_number });
  }

  const colCount = docType === "invoice" ? 7 : 6;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-serif text-4xl leading-none">{title}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted-navy)]">{DOC_LABEL[docType]} archive.</p>
        </div>
        {newHref && (
          <button
            onClick={() => navigate({ to: newHref })}
            className="press rounded-[4px] bg-[color:var(--royal)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
          >
            + New {DOC_LABEL[docType]}
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-navy)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${DOC_LABEL[docType].toLowerCase()}s…`}
            className="w-full rounded-[4px] border bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[color:var(--royal)]"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      <div className="mt-6">
        <TabBar tabs={tabs} active={tab} onChange={setTab} counts={tabCounts} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
        {isPending ? (
          <TableSkeleton rows={5} cols={colCount} />
        ) : filtered.length === 0 ? (
          debouncedQuery.trim() ? (
            <EmptyState Icon={Search} title="No matches" message={`Nothing matches “${debouncedQuery}”. Try a different search.`} />
          ) : (
            <EmptyState
              Icon={FileText}
              title={tab === "all" ? `No ${DOC_LABEL[docType].toLowerCase()}s yet` : `Nothing ${tab.replace(/_/g, " ")}`}
              message={
                tab === "all"
                  ? `Your ${DOC_LABEL[docType].toLowerCase()}s will appear here once created.`
                  : `No ${DOC_LABEL[docType].toLowerCase()}s with this status right now.`
              }
              actionLabel={newHref && tab === "all" ? `New ${DOC_LABEL[docType]}` : undefined}
              onAction={newHref && tab === "all" ? () => navigate({ to: newHref }) : undefined}
            />
          )
        ) : (
          <div className="content-fade max-h-[70vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-white">
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
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((d: any) => (
                    <motion.tr
                      key={d.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      onClick={() => navigate({ to: `${detailBase}/$id`, params: { id: d.id } })}
                      className="group row-underline cursor-pointer border-b transition-colors hover:bg-[color:var(--offwhite)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="px-6 py-4">
                        <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">{d.doc_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[color:var(--ink)]">{d.customer_name}</div>
                        <div className="text-[11px] text-[color:var(--muted-navy)]">{d.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[color:var(--mid-navy)]">{fmtDate(d.doc_date)}</td>
                      {docType === "invoice" && (
                        <td className="px-6 py-4 text-sm">
                          {isOverdue(d) ? (
                            <span className="font-medium text-[color:var(--danger)]">
                              {fmtDate(d.due_date)}
                              <span className="ml-1.5 rounded bg-[color:var(--danger)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">overdue</span>
                            </span>
                          ) : (
                            <span className="text-[color:var(--mid-navy)]">{fmtDate(d.due_date)}</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right text-sm font-medium text-[color:var(--ink)]">{money(d.total)}</td>
                      <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => navigate({ to: `${detailBase}/$id`, params: { id: d.id } })} title="View">
                            <IconBtn><Eye className="h-4 w-4" /></IconBtn>
                          </button>
                          <button onClick={() => handlePDF(d)} title="PDF">
                            <IconBtn><FileDown className="h-4 w-4" /></IconBtn>
                          </button>
                          {onConvert && (
                            <button onClick={() => handleConvert(d)} title={convertLabel}>
                              <IconBtn><ArrowRightCircle className="h-4 w-4 text-[color:var(--royal)]" /></IconBtn>
                            </button>
                          )}
                          {markPaid && d.status !== "paid" && d.status !== "cancelled" && (
                            <button onClick={() => updateStatus.mutate({ id: d.id, status: "paid", docNumber: d.doc_number })} title="Mark paid">
                              <IconBtn><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
                            </button>
                          )}
                          {markPaid && d.status !== "cancelled" && d.status !== "paid" && (
                            <button onClick={() => cancelInvoice(d)} title="Cancel invoice">
                              <IconBtn><XCircle className="h-4 w-4 text-[color:var(--danger)]" /></IconBtn>
                            </button>
                          )}
                          {markDelivered && d.status !== "delivered" && (
                            <button onClick={() => updateStatus.mutate({ id: d.id, status: "delivered", docNumber: d.doc_number })} title="Mark delivered">
                              <IconBtn><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: any; className?: string }) {
  return <th className={`bg-white px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] ${className}`}>{children}</th>;
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
