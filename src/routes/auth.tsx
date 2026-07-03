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
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 select-none text-sm font-bold uppercase tracking-[0.28em] text-[color:var(--muted-navy)]/70"
      >
        Built by Muzi
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-14">
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

      <div
        className="relative hidden overflow-hidden md:block"
        style={{
          backgroundColor: "#f4f7f2",
          clipPath: "polygon(6% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      >
        <div className="absolute inset-0 dot-grid opacity-70" />
        <div className="relative flex h-full items-center justify-center px-16">
          <div className="max-w-md">
            <div className="font-serif text-6xl leading-tight text-[color:var(--ink)]">
              A quiet <em className="font-serif italic text-[color:var(--royal)]">tool</em> for a busy floor.
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[color:var(--mid-navy)]">
              Quotes flow to invoices, invoices to deliveries, and every job card lands with the workshop —
              tracked from the first estimate to the last delivery.
            </p>
            <div className="mt-10 h-[1px] w-16 bg-[color:var(--royal)]" />
            <div className="mt-4 label-caps">Alpine-Eco · Est. 2026</div>
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
