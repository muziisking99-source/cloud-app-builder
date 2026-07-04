export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    currencyDisplay: "narrowSymbol",
  }).format(v || 0);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

export const DOC_LABEL: Record<string, string> = {
  quote: "Quotation",
  invoice: "Invoice",
  delivery_note: "Delivery Note",
  job_card: "Job Card",
  statement: "Statement",
};

export const DOC_PREFIX: Record<string, string> = {
  quote: "QT",
  invoice: "INV",
  delivery_note: "DN",
  job_card: "JC",
};

/** Invoice statuses that still owe money (for statements, dashboard, overdue checks). */
export const OPEN_INVOICE_STATUSES = ["unpaid", "sent", "overdue", "part_paid"] as const;

export function invoiceBalance(d: { total?: number | string | null; amount_paid?: number | string | null }): number {
  return Math.max(0, Number(d.total || 0) - Number(d.amount_paid || 0));
}

export function isOpenInvoice(d: { doc_type?: string; status?: string }): boolean {
  return d.doc_type === "invoice" && OPEN_INVOICE_STATUSES.includes(d.status as (typeof OPEN_INVOICE_STATUSES)[number]);
}

export function isInvoiceOverdue(d: {
  status?: string;
  due_date?: string | null;
}): boolean {
  return (
    isOpenInvoice({ doc_type: "invoice", status: d.status }) &&
    !!d.due_date &&
    new Date(d.due_date) < new Date()
  );
}
