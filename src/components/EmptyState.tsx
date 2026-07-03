import type { LucideIcon } from "lucide-react";

type Props = {
  Icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ Icon, title, message, actionLabel, onAction }: Props) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--offwhite)" }}
      >
        <Icon className="h-6 w-6" style={{ color: "var(--royal)" }} />
      </div>
      <h3 className="mt-4 font-serif text-xl text-[color:var(--ink)]">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-sm text-[color:var(--muted-navy)]">{message}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="press mt-5 rounded-[4px] bg-[color:var(--royal)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
