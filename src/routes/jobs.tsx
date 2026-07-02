import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/jobs")({
  component: () => (
    <AuthProvider>
      <AppShell>
        <JobCards />
      </AppShell>
    </AuthProvider>
  ),
});

const TABS = ["all", "pending", "in_progress", "completed"];

function JobCards() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, any[]>>({});
  const [tab, setTab] = useState("all");

  async function load() {
    const { data } = await supabase.from("documents").select("*").eq("doc_type", "job_card").order("created_at", { ascending: false });
    setJobs(data ?? []);
    if (data && data.length) {
      const { data: tasks } = await supabase.from("job_tasks").select("*").in("job_card_id", data.map((d) => d.id)).order("sort_order");
      const map: Record<string, any[]> = {};
      (tasks ?? []).forEach((t: any) => {
        map[t.job_card_id] = map[t.job_card_id] ?? [];
        map[t.job_card_id].push(t);
      });
      setTasksMap(map);
    }
  }
  useEffect(() => { load(); }, []);

  async function addTask(jobId: string) {
    const description = prompt("Task description?");
    if (!description) return;
    const existing = tasksMap[jobId] ?? [];
    await supabase.from("job_tasks").insert({ job_card_id: jobId, task_description: description, sort_order: existing.length });
    load();
  }

  async function toggleTask(t: any) {
    const newStatus = t.status === "completed" ? "pending" : "completed";
    await supabase.from("job_tasks").update({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }).eq("id", t.id);
    load();
  }

  async function removeTask(id: string) {
    await supabase.from("job_tasks").delete().eq("id", id);
    load();
  }

  async function setJobStatus(id: string, status: string) {
    await supabase.from("documents").update({ status }).eq("id", id);
    await supabase.from("activity_log").insert({ document_id: id, action: "status_changed", description: `Job marked ${status}`, performed_by: user?.id });
    load();
  }

  const filtered = tab === "all" ? jobs : jobs.filter((j) => j.status === tab);

  return (
    <div>
      <div>
        <h1 className="font-serif text-4xl leading-none">Job Cards</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-navy)]">Workshop floor tasks.</p>
      </div>

      <div className="mt-8 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative pb-3 text-xs font-semibold uppercase tracking-[0.08em] capitalize"
              style={{ color: tab === t ? "var(--royal)" : "var(--muted-navy)" }}
            >
              {t.replace(/_/g, " ")}
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[color:var(--royal)]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {filtered.map((j, idx) => (
          <div key={j.id} className="animate-rise rounded-md border bg-white p-6" style={{ borderColor: "var(--border)", animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">{j.doc_number}</span>
                <h3 className="mt-2 font-serif text-xl text-[color:var(--ink)]">{j.project_description || j.customer_name}</h3>
              </div>
              <select
                value={j.status}
                onChange={(e) => setJobStatus(j.id, e.target.value)}
                className="rounded border bg-white px-2 py-1 text-[11px]"
                style={{ borderColor: "var(--border)" }}
              >
                {["pending", "in_progress", "on_hold", "completed", "cancelled"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="mt-4"><StatusBadge status={j.status} /></div>

            <div className="mt-5 grid grid-cols-3 gap-4 border-y py-4 text-xs" style={{ borderColor: "var(--border)" }}>
              <MetaCell label="Customer" value={j.customer_name} />
              <MetaCell label="Created" value={fmtDate(j.created_at)} />
              <MetaCell label="Tasks" value={String((tasksMap[j.id] ?? []).length)} />
            </div>

            <div className="mt-5 space-y-2">
              {(tasksMap[j.id] ?? []).map((t) => (
                <div key={t.id} className="group flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-[color:var(--offwhite)]">
                  <button
                    onClick={() => toggleTask(t)}
                    className={`flex h-5 w-5 items-center justify-center rounded transition-all ${t.status === "completed" ? "bg-[color:var(--eco)]" : "border"}`}
                    style={{ borderColor: t.status === "completed" ? "var(--eco)" : "var(--royal)" }}
                  >
                    {t.status === "completed" && <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                  <span className={`flex-1 text-sm ${t.status === "completed" ? "text-[color:var(--muted-navy)] line-through" : "text-[color:var(--ink)]"}`}>{t.task_description}</span>
                  <button onClick={() => removeTask(t.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addTask(j.id)}
                className="flex w-full items-center justify-center gap-2 rounded border border-dashed py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] hover:bg-[color:var(--offwhite)]"
                style={{ borderColor: "var(--royal)" }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-md border bg-white p-10 text-center text-sm text-[color:var(--muted-navy)]" style={{ borderColor: "var(--border)" }}>
            No job cards. Create one from a quote.
          </div>
        )}
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-caps mb-1">{label}</div>
      <div className="text-sm text-[color:var(--mid-navy)]">{value}</div>
    </div>
  );
}
