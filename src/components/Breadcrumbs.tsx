import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.to && !last ? (
              <Link
                to={item.to}
                className="font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)] transition-colors hover:text-[color:var(--royal)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold uppercase tracking-[0.08em] text-[color:var(--ink)]">
                {item.label}
              </span>
            )}
            {!last && <ChevronRight className="h-3 w-3 text-[color:var(--muted-navy)]" />}
          </span>
        );
      })}
    </nav>
  );
}
