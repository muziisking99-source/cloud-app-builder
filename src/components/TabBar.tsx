import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
};

/** Tab strip whose active underline slides between positions on change. */
export function TabBar({ tabs, active, onChange, counts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const measure = () => {
    const el = btnRefs.current[active];
    const container = containerRef.current;
    if (!el || !container) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tabs.length, counts]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <div ref={containerRef} className="relative flex gap-6">
        {tabs.map((t) => (
          <button
            key={t}
            ref={(el) => {
              btnRefs.current[t] = el;
            }}
            onClick={() => onChange(t)}
            className="relative pb-3 text-xs font-semibold uppercase tracking-[0.08em] capitalize transition-colors"
            style={{ color: active === t ? "var(--royal)" : "var(--muted-navy)" }}
          >
            {t.replace(/_/g, " ")}
            {counts && counts[t] !== undefined && (
              <span className="ml-1.5 rounded-full bg-[color:var(--offwhite)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {counts[t]}
              </span>
            )}
          </button>
        ))}
        <span
          className="pointer-events-none absolute -bottom-px h-[2px] bg-[color:var(--royal)] transition-all duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
    </div>
  );
}
