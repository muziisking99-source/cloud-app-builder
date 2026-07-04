const MAP: Record<string, { bg: string; fg: string; dot: string }> = {
  draft: { bg: "#e5e7eb", fg: "#4b5563", dot: "#6b7280" },
  sent: { bg: "#e0e7ff", fg: "#1b3fbe", dot: "#1b3fbe" },
  approved: { bg: "#d1fae5", fg: "#1e9e5e", dot: "#1e9e5e" },
  rejected: { bg: "#fee2e2", fg: "#ef4444", dot: "#ef4444" },
  expired: { bg: "#e5e7eb", fg: "#4b5563", dot: "#6b7280" },
  unpaid: { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
  part_paid: { bg: "#dbeafe", fg: "#1d4ed8", dot: "#3b82f6" },
  paid: { bg: "#d1fae5", fg: "#1e9e5e", dot: "#1e9e5e" },
  overdue: { bg: "#fee2e2", fg: "#ef4444", dot: "#ef4444" },
  cancelled: { bg: "#e5e7eb", fg: "#4b5563", dot: "#6b7280" },
  invoiced: { bg: "#c7d2fe", fg: "#122e9a", dot: "#122e9a" },
  ready: { bg: "#e0e7ff", fg: "#1b3fbe", dot: "#1b3fbe" },
  in_transit: { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
  delivered: { bg: "#d1fae5", fg: "#1e9e5e", dot: "#1e9e5e" },
  returned: { bg: "#fee2e2", fg: "#ef4444", dot: "#ef4444" },
  pending: { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
  in_progress: { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
  on_hold: { bg: "#e5e7eb", fg: "#4b5563", dot: "#6b7280" },
  completed: { bg: "#d1fae5", fg: "#1e9e5e", dot: "#1e9e5e" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = MAP[status] ?? MAP.draft;
  const label = status.replace(/_/g, " ");
  return (
    <span
      key={status}
      className="badge-fade inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {label}
    </span>
  );
}
