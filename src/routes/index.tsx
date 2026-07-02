import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { money, fmtDate, DOC_LABEL } from "@/lib/format";
import { FileText, Receipt, ClipboardList, Truck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <Dashboard />
      </AppShell>
    </AuthProvider>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingQuotes: 0, unpaid: 0, unpaidTotal: 0, activeJobs: 0, deliveries: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: docs } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (!docs) return;
      const pendingQuotes = docs.filter((d) => d.doc_type === "quote" && ["draft", "sent"].includes(d.status)).length;
      const unpaidDocs = docs.filter((d) => d.doc_type === "invoice" && ["unpaid", "sent", "overdue"].includes(d.status));
      const activeJobs = docs.filter((d) => d.doc_type === "job_card" && ["pending", "in_progress"].includes(d.status)).length;
      const deliveries = docs.filter((d) => d.doc_type === "delivery_note" && ["ready", "in_transit"].includes(d.status)).length;
      setStats({
        pendingQuotes,
        unpaid: unpaidDocs.length,
        unpaidTotal: unpaidDocs.reduce((s, d) => s + Number(d.total || 0), 0),
        activeJobs,
        deliveries,
      });
      setRecent(docs.slice(0, 8));
    })();
  }, [user]);

  const cards = [
    { label: "Pending Quotes", value: stats.pendingQuotes, sub: "awaiting response", Icon: FileText, tone: "var(--royal)" },
    { label: "Unpaid Invoices", value: stats.unpaid, sub: money(stats.unpaidTotal) + " total", Icon: Receipt, tone: "var(--amber-warn)" },
    { label: "Active Jobs", value: stats.activeJobs, sub: "on the floor", Icon: ClipboardList, tone: "var(--ink)" },
    { label: "Deliveries", value: stats.deliveries, sub: "in motion", Icon: Truck, tone: "var(--eco)" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl leading-none">Dashboard</h1>
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
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="animate-rise group relative overflow-hidden rounded-md border bg-white p-5 transition-transform"
            style={{ borderColor: "var(--border)", animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="label-caps">{c.label}</div>
              <c.Icon className="h-4 w-4" style={{ color: c.tone }} />
            </div>
            <div className="mt-4 font-serif text-4xl leading-none text-[color:var(--ink)]">{c.value}</div>
            <div className="mt-2 text-xs text-[color:var(--muted-navy)]">{c.sub}</div>
            <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[color:var(--royal)] to-[color:var(--eco)] transition-all duration-300 group-hover:w-full" />
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-serif text-xl">Recent Activity</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center text-sm text-[color:var(--muted-navy)]">
            No documents yet. <Link to="/quotes/new" className="text-[color:var(--royal)] underline">Create your first quote</Link>.
          </div>
        ) : (
          <table className="w-full">
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
              {recent.map((d) => (
                <tr key={d.id} className="group border-b transition-colors hover:bg-[color:var(--offwhite)]" style={{ borderColor: "var(--border)" }}>
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
                      to={routeFor(d.doc_type)}
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

function routeFor(t: string) {
  if (t === "quote") return "/quotes";
  if (t === "invoice") return "/invoices";
  if (t === "delivery_note") return "/delivery";
  return "/jobs";
}

function Th({ children, className = "" }: { children?: any; className?: string }) {
  return <th className={`px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] ${className}`}>{children}</th>;
}
