import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    setBusy(true);
    const res =
      mode === "signin" ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (res.error) setErr(res.error);
  }

  return (
    <div className="relative grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative flex items-center justify-center bg-white px-6 py-14">
        <div
          className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 select-none whitespace-nowrap font-serif text-2xl italic tracking-wide text-[color:var(--royal)]"
        >
          Built by Muzi
        </div>
        <div
          className="animate-rise w-full max-w-md rounded-md border p-10"
          style={{ borderColor: "rgba(27,63,190,0.14)" }}
        >
          <div>
            <div className="font-serif text-4xl leading-none text-[color:var(--ink)]">Alpine-Eco</div>
            <div className="mt-1 font-serif text-lg italic text-[color:var(--muted-navy)]">Workflow</div>
          </div>
          <p className="mt-6 text-sm text-[color:var(--muted-navy)]">
            {mode === "signin" ? "Sign in to access the workshop." : "Create your staff account."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-6">
            {mode === "signup" && (
              <Field label="Name">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[color:var(--royal)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[color:var(--royal)]"
                style={{ borderColor: "var(--border)" }}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[color:var(--royal)]"
                style={{ borderColor: "var(--border)" }}
              />
            </Field>

            {err && (
              <div className="rounded border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/5 px-3 py-2 text-xs text-[color:var(--danger)]">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[4px] bg-[color:var(--royal)] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[color:var(--muted-navy)]">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold uppercase tracking-wide text-[color:var(--royal)]"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile hero strip — visible when the right panel is hidden */}
      <div className="relative overflow-hidden border-t bg-[color:var(--offwhite)] px-6 py-10 md:hidden" style={{ borderColor: "var(--border)" }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="select-none whitespace-nowrap font-serif text-[3.5rem] italic leading-none text-[color:var(--royal)]/8">
            The Accounting Tool
          </span>
        </div>
        <div className="relative text-center">
          <p className="font-serif text-2xl leading-snug text-[color:var(--ink)]">
            Quotes to invoices, invoices to delivery — <em className="text-[color:var(--royal)]">tracked in one place.</em>
          </p>
          <p className="mt-3 text-sm text-[color:var(--muted-navy)]">
            Alpine-Eco Workflow · Est. 2026
          </p>
          <p className="mt-6 font-serif text-xl italic text-[color:var(--royal)]">Built by Muzi</p>
        </div>
      </div>

      <div
        className="relative hidden min-h-screen overflow-hidden md:block"
        style={{
          background: "linear-gradient(145deg, #f4f7f2 0%, #e8edf8 55%, #f4f7f2 100%)",
          clipPath: "polygon(5% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        <div className="absolute inset-0 dot-grid opacity-50" />

        {/* Large background watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span
            className="select-none whitespace-nowrap font-serif text-[5.5rem] italic leading-none text-[color:var(--royal)]/[0.07] lg:text-[7rem]"
            style={{ transform: "rotate(-12deg)" }}
          >
            The Accounting Tool
          </span>
        </div>

        {/* Accent shapes */}
        <div className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-[color:var(--royal)]/5 blur-3xl" />
        <div className="absolute bottom-32 left-8 h-48 w-48 rounded-full bg-[color:var(--eco)]/8 blur-3xl" />

        <div className="relative flex h-full min-h-screen flex-col justify-between px-12 py-16 lg:px-20">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--royal)] backdrop-blur-sm" style={{ borderColor: "rgba(27,63,190,0.2)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--eco)]" />
              Alpine-Eco Workflow
            </div>

            <h2 className="mt-8 font-serif text-5xl leading-[1.1] text-[color:var(--ink)] lg:text-6xl">
              The <em className="text-[color:var(--royal)]">accounting tool</em> for a busy workshop.
            </h2>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-[color:var(--mid-navy)]">
              Quotes become invoices. Invoices become delivery notes. Job cards keep the floor on track —
              every step logged from first estimate to final handover.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2">
              {["Quotations", "Invoices", "Delivery", "Job Cards"].map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[color:var(--muted-navy)]">→</span>}
                  <span
                    className="rounded border bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[color:var(--mid-navy)] backdrop-blur-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {step}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between gap-6 border-t pt-8" style={{ borderColor: "rgba(27,63,190,0.12)" }}>
            <div>
              <div className="h-[2px] w-12 bg-[color:var(--royal)]" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-navy)]">
                Alpine-Eco · Est. 2026
              </p>
            </div>
            <p className="font-serif text-2xl italic tracking-wide text-[color:var(--royal)]">
              Built by Muzi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="label-caps mb-1">{label}</div>
      {children}
    </label>
  );
}
