export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="border-b" style={{ borderColor: "var(--border)" }}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} className="px-6 py-4">
                <div
                  className="skeleton h-4"
                  style={{ width: c === 0 ? "70%" : c === cols - 1 ? "40%" : "60%" }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-md border bg-white p-6" style={{ borderColor: "var(--border)" }}>
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-3 h-6 w-2/3" />
      <div className="skeleton mt-5 h-16 w-full" />
      <div className="skeleton mt-4 h-4 w-full" />
      <div className="skeleton mt-2 h-4 w-5/6" />
    </div>
  );
}
