import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useDocuments, useProfile } from "@/lib/queries";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: docs } = useDocuments(!!user);
  const { data: profile } = useProfile(user?.id);
  const profileName = profile?.name ?? user?.email ?? "";
  const roleLabel = profile?.role === "admin" ? "Administrator" : "Factory Staff";

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (docs ?? []).forEach((d: any) => (c[d.doc_type] = (c[d.doc_type] ?? 0) + 1));
    return c;
  }, [docs]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen bg-white">
        <div className="hidden w-[260px] shrink-0 border-r p-6 md:block" style={{ borderColor: "var(--border)" }}>
          <div className="skeleton h-7 w-32" />
          <div className="mt-10 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 px-10 py-10">
          <div className="skeleton h-10 w-56" />
          <div className="skeleton mt-3 h-4 w-72" />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile top bar */}
      <header
        className="vt-topbar fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-[color:var(--ink)] hover:bg-[color:var(--offwhite)]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="font-serif text-lg text-[color:var(--ink)]">Alpine-Eco</div>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`vt-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col border-r bg-white transition-all duration-200 md:static md:flex md:w-16 md:translate-x-0 lg:w-[260px] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between px-6 py-7 md:justify-center md:px-3 lg:justify-between lg:px-6">
          <div>
            <div className="font-serif text-2xl leading-none text-[color:var(--ink)] md:text-center md:text-xl lg:text-left lg:text-2xl">
              <span className="md:hidden lg:inline">Alpine-Eco</span>
              <span className="hidden md:inline lg:hidden">AE</span>
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-navy)] md:hidden lg:block">
              Workflow
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-[color:var(--muted-navy)] hover:bg-[color:var(--offwhite)] md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-navy)] md:hidden lg:block">
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

          <div className="mt-6 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-navy)] md:hidden lg:block">
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

        <div className="mt-auto border-t p-4 md:px-2 lg:px-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 md:justify-center lg:justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--offwhite)] font-serif text-sm text-[color:var(--royal)]">
              {(profileName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 md:hidden lg:block">
              <div className="truncate text-sm font-medium text-[color:var(--ink)]">
                {profileName || user.email}
              </div>
              <div className="truncate text-[11px] text-[color:var(--muted-navy)]">
                {roleLabel}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="rounded-md p-1.5 text-[color:var(--muted-navy)] transition-colors hover:bg-[color:var(--offwhite)] hover:text-[color:var(--royal)] md:hidden lg:block"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white pt-14 md:pt-0">
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
      title={label}
      className="group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 md:justify-center lg:justify-start"
      style={{
        backgroundColor: active ? "var(--offwhite)" : "transparent",
        color: active ? "var(--royal)" : "var(--mid-navy)",
      }}
    >
      <span
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r transition-all duration-150 ease-out"
        style={{
          backgroundColor: "var(--royal)",
          opacity: active ? 1 : 0,
          transform: active ? "translateX(0)" : "translateX(-3px)",
        }}
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 font-medium md:hidden lg:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          key={count}
          className="badge-pop rounded-full px-2 py-0.5 text-[10px] font-semibold text-white md:hidden lg:inline"
          style={{ backgroundColor: "var(--eco)" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
