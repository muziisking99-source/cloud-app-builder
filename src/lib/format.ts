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
};

export const DOC_PREFIX: Record<string, string> = {
  quote: "QT",
  invoice: "INV",
  delivery_note: "DN",
  job_card: "JC",
};
