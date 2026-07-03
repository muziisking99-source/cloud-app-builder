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
            {/* Desktop table */}
            <div className="hidden md:block">
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
                          <DocActions
                            doc={d}
                            detailBase={detailBase}
                            onView={() => navigate({ to: `${detailBase}/$id`, params: { id: d.id } })}
                            onPDF={() => handlePDF(d)}
                            onConvert={onConvert ? () => handleConvert(d) : undefined}
                            convertLabel={convertLabel}
                            markPaid={markPaid}
                            markDelivered={markDelivered}
                            onMarkPaid={() => updateStatus.mutate({ id: d.id, status: "paid", docNumber: d.doc_number })}
                            onCancel={() => cancelInvoice(d)}
                            onMarkDelivered={() => updateStatus.mutate({ id: d.id, status: "delivered", docNumber: d.doc_number })}
                          />
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--border)" }}>
              <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((d: any) => (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="p-4"
                  >
                    <button
                      type="button"
                      onClick={() => navigate({ to: `${detailBase}/$id`, params: { id: d.id } })}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">{d.doc_number}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="mt-2 text-sm font-medium text-[color:var(--ink)]">{d.customer_name}</div>
                      {d.customer_email && (
                        <div className="text-[11px] text-[color:var(--muted-navy)]">{d.customer_email}</div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--mid-navy)]">
                        <span>{fmtDate(d.doc_date)}</span>
                        {docType === "invoice" && d.due_date && (
                          <span className={isOverdue(d) ? "font-medium text-[color:var(--danger)]" : ""}>
                            Due {fmtDate(d.due_date)}
                            {isOverdue(d) && (
                              <span className="ml-1 rounded bg-[color:var(--danger)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">overdue</span>
                            )}
                          </span>
                        )}
                        <span className="ml-auto font-medium text-[color:var(--ink)]">{money(d.total)}</span>
                      </div>
                    </button>
                    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
                      <DocActions
                        doc={d}
                        detailBase={detailBase}
                        onView={() => navigate({ to: `${detailBase}/$id`, params: { id: d.id } })}
                        onPDF={() => handlePDF(d)}
                        onConvert={onConvert ? () => handleConvert(d) : undefined}
                        convertLabel={convertLabel}
                        markPaid={markPaid}
                        markDelivered={markDelivered}
                        onMarkPaid={() => updateStatus.mutate({ id: d.id, status: "paid", docNumber: d.doc_number })}
                        onCancel={() => cancelInvoice(d)}
                        onMarkDelivered={() => updateStatus.mutate({ id: d.id, status: "delivered", docNumber: d.doc_number })}
                        mobile
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children?: any; className?: string }) {
  return <th className={`bg-white px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] ${className}`}>{children}</th>;
}

function DocActions({
  doc,
  onView,
  onPDF,
  onConvert,
  convertLabel,
  markPaid,
  markDelivered,
  onMarkPaid,
  onCancel,
  onMarkDelivered,
  mobile,
}: {
  doc: any;
  detailBase: string;
  onView: () => void;
  onPDF: () => void;
  onConvert?: () => void;
  convertLabel?: string;
  markPaid?: boolean;
  markDelivered?: boolean;
  onMarkPaid: () => void;
  onCancel: () => void;
  onMarkDelivered: () => void;
  mobile?: boolean;
}) {
  const wrapCls = mobile
    ? "flex flex-wrap items-center gap-2"
    : "flex items-center justify-end gap-1.5";
  const btnCls = mobile ? "h-11 w-11" : "h-8 w-8";

  return (
    <div className={wrapCls}>
      <button type="button" onClick={onView} title="View" aria-label="View">
        <IconBtn className={btnCls}><Eye className="h-4 w-4" /></IconBtn>
      </button>
      <button type="button" onClick={onPDF} title="PDF" aria-label="Download PDF">
        <IconBtn className={btnCls}><FileDown className="h-4 w-4" /></IconBtn>
      </button>
      {onConvert && (
        <button type="button" onClick={onConvert} title={convertLabel} aria-label={convertLabel}>
          <IconBtn className={btnCls}><ArrowRightCircle className="h-4 w-4 text-[color:var(--royal)]" /></IconBtn>
        </button>
      )}
      {markPaid && doc.status !== "paid" && doc.status !== "cancelled" && (
        <button type="button" onClick={onMarkPaid} title="Mark paid" aria-label="Mark paid">
          <IconBtn className={btnCls}><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
        </button>
      )}
      {markPaid && doc.status !== "cancelled" && doc.status !== "paid" && (
        <button type="button" onClick={onCancel} title="Cancel invoice" aria-label="Cancel invoice">
          <IconBtn className={btnCls}><XCircle className="h-4 w-4 text-[color:var(--danger)]" /></IconBtn>
        </button>
      )}
      {markDelivered && doc.status !== "delivered" && (
        <button type="button" onClick={onMarkDelivered} title="Mark delivered" aria-label="Mark delivered">
          <IconBtn className={btnCls}><CheckCircle2 className="h-4 w-4 text-[color:var(--eco)]" /></IconBtn>
        </button>
      )}
    </div>
  );
}

function IconBtn({ children, className = "h-8 w-8" }: { children: any; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] border text-[color:var(--mid-navy)] transition-colors hover:bg-[color:var(--offwhite)] ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </span>
  );
}
