import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useDocuments } from "@/lib/queries";
import { useCountUp } from "@/hooks/useCountUp";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { money, fmtDate, DOC_LABEL } from "@/lib/format";
import { FileText, Receipt, ClipboardList, Truck, ArrowRight, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function isOverdue(d: any) {
  return (
    d.doc_type === "invoice" &&
    ["unpaid", "sent", "overdue"].includes(d.status) &&
    d.due_date &&
    new Date(d.due_date) < new Date()
  );
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: docs, isPending } = useDocuments(!!user);

  const { stats, recent } = useMemo(() => {
    const all = docs ?? [];
    const unpaidDocs = all.filter((d: any) => d.doc_type === "invoice" && ["unpaid", "sent", "overdue"].includes(d.status));
    return {
      stats: {
        pendingQuotes: all.filter((d: any) => d.doc_type === "quote" && ["draft", "sent"].includes(d.status)).length,
        unpaid: unpaidDocs.length,
        unpaidTotal: unpaidDocs.reduce((s: number, d: any) => s + Number(d.total || 0), 0),
        overdue: unpaidDocs.filter(isOverdue).length,
        activeJobs: all.filter((d: any) => d.doc_type === "job_card" && ["pending", "in_progress"].includes(d.status)).length,
        deliveries: all.filter((d: any) => d.doc_type === "delivery_note" && ["ready", "in_transit"].includes(d.status)).length,
      },
      recent: all.slice(0, 8),
    };
  }, [docs]);

  const cards = [
    { label: "Pending Quotes", value: stats.pendingQuotes, sub: "awaiting response", Icon: FileText, tone: "var(--royal)", to: "/quotes" },
    {
      label: "Unpaid Invoices",
      value: stats.unpaid,
      sub: stats.overdue > 0 ? `${money(stats.unpaidTotal)} · ${stats.overdue} overdue` : money(stats.unpaidTotal) + " total",
      Icon: Receipt,
      tone: stats.overdue > 0 ? "var(--danger)" : "var(--amber-warn)",
      to: "/invoices",
      search: { tab: "unpaid" },
    },
    { label: "Active Jobs", value: stats.activeJobs, sub: "on the floor", Icon: ClipboardList, tone: "var(--ink)", to: "/jobs" },
    { label: "Deliveries", value: stats.deliveries, sub: "in motion", Icon: Truck, tone: "var(--eco)", to: "/delivery" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-serif text-4xl leading-none">Dashboard</h1>
          <p className="mt-2 text-sm text-[color:var(--muted-navy)]">Overview of your factory floor today.</p>
        </div>
        <button
          onClick={() => navigate({ to: "/quotes/new" })}
          className="rounded-[4px] bg-[color:var(--royal)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
        >
          + New Quote
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isPending
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border bg-white p-5" style={{ borderColor: "var(--border)" }}>
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-5 h-9 w-16" />
                <div className="skeleton mt-3 h-3 w-20" />
              </div>
            ))
          : cards.map((c, i) => (
              <button
                key={c.label}
                onClick={() => navigate({ to: c.to, search: c.search as any })}
                className="animate-rise content-fade group relative overflow-hidden rounded-md border bg-white p-5 text-left transition-transform active:scale-[0.99]"
                style={{ borderColor: "var(--border)", animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="label-caps">{c.label}</div>
                  <c.Icon className="h-4 w-4" style={{ color: c.tone }} />
                </div>
                <div className="mt-4 font-serif text-4xl leading-none text-[color:var(--ink)]">
                  <CountUpNumber value={c.value} />
                </div>
                <div className="mt-2 text-xs text-[color:var(--muted-navy)]">{c.sub}</div>
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[color:var(--royal)] to-[color:var(--eco)] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
      </div>

      <div className="mt-10 rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-serif text-xl">Recent Activity</h2>
        </div>
        {isPending ? (
          <TableSkeleton rows={5} cols={5} />
        ) : recent.length === 0 ? (
          <EmptyState
            Icon={LayoutDashboard}
            title="Nothing here yet"
            message="Create your first quote to start tracking work across the factory floor."
            actionLabel="New Quote"
            onAction={() => navigate({ to: "/quotes/new" })}
          />
        ) : (
          <table className="content-fade w-full">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>Document</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {recent.map((d: any) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(linkFor(d))}
                  className="group row-underline cursor-pointer border-b transition-colors hover:bg-[color:var(--offwhite)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-6 py-4">
                    <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">
                      {d.doc_number}
                    </span>
                    <div className="mt-1 text-[11px] text-[color:var(--muted-navy)]">{DOC_LABEL[d.doc_type]}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[color:var(--ink)]">{d.customer_name}</div>
                    <div className="text-[11px] text-[color:var(--muted-navy)]">{d.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[color:var(--mid-navy)]">{fmtDate(d.doc_date)}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-[color:var(--ink)]">{money(d.total)}</td>
                  <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-6 py-4">
                    <Link
                      {...(linkFor(d) as any)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--royal)] opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
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

function CountUpNumber({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{Math.round(v)}</>;
}

function linkFor(d: any): { to: string; params?: Record<string, string> } {
  if (d.doc_type === "quote") return { to: "/quotes/$id", params: { id: d.id } };
  if (d.doc_type === "invoice") return { to: "/invoices/$id", params: { id: d.id } };
  if (d.doc_type === "delivery_note") return { to: "/delivery/$id", params: { id: d.id } };
  return { to: "/jobs" };
}

function Th({ children, className = "" }: { children?: any; className?: string }) {
  return <th className={`px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] ${className}`}>{children}</th>;
}
