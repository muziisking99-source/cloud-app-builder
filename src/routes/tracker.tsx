import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentsByType, useActivity } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useDebounced } from "@/hooks/useDebounced";
import { fmtDate, DOC_LABEL } from "@/lib/format";

export const Route = createFileRoute("/tracker")({
  component: Tracker,
});

function Tracker() {
  const [selected, setSelected] = useState<any>(null);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 200);

  const { data: quotes = [], isPending } = useDocumentsByType("quote");
  const { data: activity = [] } = useActivity(selected?.id ?? "", !!selected);
  const { data: related = [] } = useQuery({
    queryKey: ["related", selected?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .or(`id.eq.${selected.id},parent_id.eq.${selected.id}`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selected,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (quotes.length && !selected) setSelected(quotes[0]);
  }, [quotes, selected]);

  const filtered = quotes.filter(
    (qt: any) =>
      !debouncedQ.trim() ||
      qt.customer_name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
      qt.doc_number.toLowerCase().includes(debouncedQ.toLowerCase()),
  );

  return (
    <div>
      <h1 className="page-title font-serif text-4xl leading-none">Order Tracker</h1>
      <p className="mt-2 text-sm text-[color:var(--muted-navy)]">Follow every order from first quote to final delivery.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
          <div className="border-b p-4" style={{ borderColor: "var(--border)" }}>
            <input
              placeholder="Search customer or number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[color:var(--royal)]"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {isPending ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                {filtered.map((qt: any) => (
                  <button
                    key={qt.id}
                    onClick={() => setSelected(qt)}
                    className="relative flex w-full items-start justify-between gap-3 border-b p-4 text-left transition-colors hover:bg-[color:var(--offwhite)]"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: selected?.id === qt.id ? "var(--offwhite)" : "transparent",
                    }}
                  >
                    {selected?.id === qt.id && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[color:var(--royal)]" />}
                    <div>
                      <div className="font-mono text-[11px] text-[color:var(--royal)]">{qt.doc_number}</div>
                      <div className="mt-1 text-sm text-[color:var(--ink)]">{qt.customer_name}</div>
                      <div className="text-[11px] text-[color:var(--muted-navy)]">{fmtDate(qt.doc_date)}</div>
                    </div>
                    <StatusBadge status={qt.status} />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <EmptyState Icon={Search} title="No orders found" message={debouncedQ.trim() ? `Nothing matches “${debouncedQ}”.` : "Orders will appear here once quotes exist."} />
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-white p-6" style={{ borderColor: "var(--border)" }}>
          {!selected ? (
            <div className="text-sm text-[color:var(--muted-navy)]">Select a quote to view its journey.</div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="label-caps">Order</div>
                  <h2 className="mt-1 font-serif text-2xl">{selected.customer_name}</h2>
                  <div className="mt-1 font-mono text-[11px] text-[color:var(--royal)]">{selected.doc_number}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="mt-6">
                <div className="label-caps mb-4">Documents in this order</div>
                <div className="flex flex-wrap gap-2">
                  {related.map((r: any) => (
                    <span key={r.id} className="rounded border px-3 py-1.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
                      <span className="font-mono text-[color:var(--royal)]">{r.doc_number}</span>
                      <span className="ml-2 text-[color:var(--muted-navy)]">· {DOC_LABEL[r.doc_type]}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="label-caps mb-4">Timeline</div>
                <div className="relative pl-6" key={selected.id}>
                  <div className="timeline-line timeline-scroll absolute left-[7px] top-1 bottom-1 w-[2px] bg-gradient-to-b from-[color:var(--royal)] to-[color:var(--eco)]" />
                  {activity.length === 0 && <div className="text-sm text-[color:var(--muted-navy)]">No activity yet.</div>}
                  {activity.map((a: any, i: number) => (
                    <div
                      key={a.id}
                      className="animate-rise relative mb-5 last:mb-0"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span
                        className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-white"
                        style={{ backgroundColor: i === activity.length - 1 ? "var(--eco)" : "var(--royal)" }}
                      />
                      <div className="font-serif text-lg text-[color:var(--ink)]">{prettyAction(a.action)}</div>
                      <div className="text-sm text-[color:var(--mid-navy)]">{a.description}</div>
                      <div className="text-[11px] text-[color:var(--muted-navy)]">{fmtDate(a.performed_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function prettyAction(a: string) {
  return a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
