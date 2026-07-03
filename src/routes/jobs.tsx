import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  useDocumentsByType,
  useJobTasks,
  useToggleTask,
  useAddTask,
  useDeleteTask,
  useDeleteJob,
  useUpdateStatus,
  useIsAdmin,
} from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { TabBar } from "@/components/TabBar";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/TableSkeleton";
import { useConfirm } from "@/components/ConfirmDialog";
import { useDebounced } from "@/hooks/useDebounced";
import { fmtDate } from "@/lib/format";
import { Plus, Trash2, FileDown, Search, ClipboardList } from "lucide-react";
import { generatePDF } from "@/lib/pdf";

export const Route = createFileRoute("/jobs")({
  component: JobCards,
});

const TABS = ["all", "pending", "in_progress", "completed"];

function JobCards() {
  const confirm = useConfirm();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 200);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const [draftTask, setDraftTask] = useState<Record<string, string>>({});

  const { data: jobs = [], isPending } = useDocumentsByType("job_card");
  const { data: allTasks = [] } = useJobTasks();
  const toggleTask = useToggleTask();
  const addTaskMut = useAddTask();
  const deleteTask = useDeleteTask();
  const deleteJobMut = useDeleteJob();
  const updateStatus = useUpdateStatus();
  const isAdmin = useIsAdmin();

  const tasksMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const t of allTasks as any[]) {
      map[t.job_card_id] = map[t.job_card_id] ?? [];
      map[t.job_card_id].push(t);
    }
    return map;
  }, [allTasks]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length };
    for (const t of TABS) if (t !== "all") c[t] = jobs.filter((j: any) => j.status === t).length;
    return c;
  }, [jobs]);

  function addTask(jobId: string) {
    const description = (draftTask[jobId] ?? "").trim();
    if (!description) return;
    addTaskMut.mutate({ jobId, description, sortOrder: (tasksMap[jobId] ?? []).length });
    setDraftTask((p) => ({ ...p, [jobId]: "" }));
  }

  function handleToggle(t: any) {
    const completing = t.status !== "completed";
    toggleTask.mutate({ task: t });
    if (completing) {
      setFlashing((prev) => new Set(prev).add(t.id));
      setTimeout(() => {
        setFlashing((prev) => {
          const next = new Set(prev);
          next.delete(t.id);
          return next;
        });
      }, 450);
    }
  }

  async function removeTask(t: any) {
    const ok = await confirm({
      title: "Delete task?",
      description: `“${t.task_description}” will be permanently removed.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteTask.mutate({ taskId: t.id });
  }

  async function deleteJob(job: any) {
    const ok = await confirm({
      title: `Delete ${job.doc_number}?`,
      description: "This job card and all of its tasks will be permanently deleted.",
      confirmLabel: "Delete Job Card",
      destructive: true,
    });
    if (!ok) return;
    deleteJobMut.mutate({ job });
  }

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return jobs.filter((j: any) => {
      if (tab !== "all" && j.status !== tab) return false;
      if (!q) return true;
      return (
        (j.doc_number ?? "").toLowerCase().includes(q) ||
        (j.customer_name ?? "").toLowerCase().includes(q) ||
        (j.project_description ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobs, tab, debouncedQuery]);

  return (
    <div>
      <div>
        <h1 className="page-title font-serif text-4xl leading-none">Job Cards</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-navy)]">Workshop floor tasks.</p>
      </div>

      <div className="mt-6 relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-navy)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search job cards…"
          className="w-full rounded-[4px] border bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[color:var(--royal)]"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      <div className="mt-6">
        <TabBar tabs={TABS} active={tab} onChange={setTab} counts={tabCounts} />
      </div>

      {isPending ? (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-md border bg-white" style={{ borderColor: "var(--border)" }}>
          {debouncedQuery.trim() ? (
            <EmptyState Icon={Search} title="No matches" message={`Nothing matches “${debouncedQuery}”.`} />
          ) : (
            <EmptyState Icon={ClipboardList} title="No job cards yet" message="Create a job card from an approved quote to start tracking workshop tasks." />
          )}
        </div>
      ) : (
        <div className="content-fade mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((j: any) => (
              <motion.div
                key={j.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="row-underline rounded-md border bg-white p-6"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded border border-[color:var(--royal)]/30 px-2 py-0.5 font-mono text-[11px] text-[color:var(--royal)]">{j.doc_number}</span>
                    <h3 className="mt-2 font-serif text-xl text-[color:var(--ink)]">{j.project_description || j.customer_name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={j.status}
                      onChange={(e) => updateStatus.mutate({ id: j.id, status: e.target.value, docNumber: j.doc_number })}
                      className="h-11 rounded border bg-white px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {["pending", "in_progress", "on_hold", "completed", "cancelled"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    {isAdmin && (
                      <button
                        onClick={() => deleteJob(j)}
                        title="Delete job card"
                        className="flex h-11 w-11 items-center justify-center rounded border text-[color:var(--danger)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4"><StatusBadge status={j.status} /></div>

                <div className="mt-5 grid grid-cols-3 gap-4 border-y py-4 text-xs" style={{ borderColor: "var(--border)" }}>
                  <MetaCell label="Customer" value={j.customer_name} />
                  <MetaCell label="Created" value={fmtDate(j.created_at)} />
                  <MetaCell label="Tasks" value={String((tasksMap[j.id] ?? []).length)} />
                </div>

                <div className="mt-5 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {(tasksMap[j.id] ?? []).map((t: any) => {
                      const done = t.status === "completed";
                      return (
                        <motion.div
                          key={t.id}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className={`group flex items-center gap-3 overflow-hidden rounded px-2 transition-colors hover:bg-[color:var(--offwhite)] ${flashing.has(t.id) ? "task-flash" : ""}`}
                        >
                          <button
                            onClick={() => handleToggle(t)}
                            aria-pressed={done}
                            aria-label={done ? "Mark task incomplete" : "Mark task complete"}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors active:scale-[0.97]"
                          >
                            <motion.span
                              animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className={`flex h-6 w-6 items-center justify-center rounded transition-all ${done ? "bg-[color:var(--eco)]" : "border-2"}`}
                              style={{ borderColor: done ? "var(--eco)" : "var(--royal)" }}
                            >
                              {done && (
                                <svg className="check-draw h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </motion.span>
                          </button>
                          <span className={`flex-1 py-1.5 text-sm ${done ? "text-[color:var(--muted-navy)] line-through" : "text-[color:var(--ink)]"}`}>{t.task_description}</span>
                          <button
                            onClick={() => removeTask(t)}
                            aria-label="Delete task"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                          >
                            <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  <form
                    onSubmit={(e) => { e.preventDefault(); addTask(j.id); }}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <input
                      value={draftTask[j.id] ?? ""}
                      onChange={(e) => setDraftTask((p) => ({ ...p, [j.id]: e.target.value }))}
                      placeholder="Add a task…"
                      className="h-11 min-w-0 flex-1 basis-full rounded border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[color:var(--royal)] sm:basis-auto"
                      style={{ borderColor: "var(--border)" }}
                    />
                    <button
                      type="submit"
                      className="flex h-11 items-center justify-center gap-2 rounded border border-dashed px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
                      style={{ borderColor: "var(--royal)" }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => generatePDF(j, [], { tasks: tasksMap[j.id] ?? [] })}
                      className="flex h-11 w-11 items-center justify-center rounded border text-[color:var(--mid-navy)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
                      style={{ borderColor: "var(--border)" }}
                      title="Download PDF"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
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
