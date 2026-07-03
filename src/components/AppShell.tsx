import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Truck,
  ClipboardList,
  History,
  LogOut,
  Menu,
  X,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof FileText; badgeKey?: string };

const MAIN: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quotes", label: "Quotations", icon: FileText, badgeKey: "quote" },
  { to: "/invoices", label: "Invoices", icon: Receipt, badgeKey: "invoice" },
  { to: "/delivery", label: "Delivery", icon: Truck, badgeKey: "delivery_note" },
  { to: "/jobs", label: "Job Cards", icon: ClipboardList, badgeKey: "job_card" },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("documents")
      .select("doc_type")
      .then(({ data }) => {
        if (!data) return;
        const c: Record<string, number> = {};
        data.forEach((d: any) => (c[d.doc_type] = (c[d.doc_type] ?? 0) + 1));
        setCounts(c);
      });
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfileName(data?.name ?? user.email ?? ""));
  }, [user, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-serif text-xl text-[color:var(--muted-navy)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside
        className="hidden w-[260px] shrink-0 flex-col border-r bg-white md:flex"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="px-6 py-7">
          <div className="font-serif text-2xl leading-none text-[color:var(--ink)]">
            Alpine-Eco
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-navy)]">
            Workflow
          </div>
        </div>

        <div className="px-3">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-navy)]">
            Main
          </div>
          <nav className="flex flex-col gap-0.5">
            {MAIN.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                label={item.label}
                Icon={item.icon}
                count={item.badgeKey ? counts[item.badgeKey] : undefined}
                active={pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to))}
              />
            ))}
          </nav>

          <div className="mt-6 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-navy)]">
            History
          </div>
          <nav className="flex flex-col gap-0.5">
            <SidebarLink
              to="/tracker"
              label="Order Tracker"
              Icon={History}
              active={pathname.startsWith("/tracker")}
            />
          </nav>
        </div>

        <div className="mt-auto border-t p-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--offwhite)] font-serif text-sm text-[color:var(--royal)]">
              {(profileName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[color:var(--ink)]">
                {profileName || user.email}
              </div>
              <div className="truncate text-[11px] text-[color:var(--muted-navy)]">
                Factory Staff
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="rounded-md p-1.5 text-[color:var(--muted-navy)] transition-colors hover:bg-[color:var(--offwhite)] hover:text-[color:var(--royal)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-8 md:px-10 md:py-10">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  Icon,
  count,
  active,
}: {
  to: string;
  label: string;
  Icon: typeof FileText;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150"
      style={{
        backgroundColor: active ? "var(--offwhite)" : "transparent",
        color: active ? "var(--royal)" : "var(--mid-navy)",
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r"
          style={{ backgroundColor: "var(--royal)" }}
        />
      )}
      <Icon className="h-4 w-4" />
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: "var(--eco)" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
