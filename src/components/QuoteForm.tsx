import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { money } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";

type Item = { description: string; quantity: number; unit_price: number; total_price: number };
type Payload = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  project_description: string;
  notes: string;
  doc_date: string;
  due_date: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
};

export function QuoteForm({
  onSubmit,
  initial,
}: {
  onSubmit: (payload: Payload, items: Item[], send: boolean) => Promise<void>;
  initial?: Partial<Payload> & { items?: Item[] };
}) {
  const [customerName, setCustomerName] = useState(initial?.customer_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customer_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone ?? "");
  const [customerAddress, setCustomerAddress] = useState(initial?.customer_address ?? "");
  const [project, setProject] = useState(initial?.project_description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [docDate, setDocDate] = useState(initial?.doc_date ?? new Date().toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState<number>(initial?.tax_rate ?? 0);
  const [items, setItems] = useState<Item[]>(
    initial?.items ?? [{ description: "", quantity: 1, unit_price: 0, total_price: 0 }],
  );
  const [busy, setBusy] = useState(false);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, ...patch };
        next.total_price = Number((Number(next.quantity) * Number(next.unit_price)).toFixed(2));
        return next;
      }),
    );
  }

  const subtotal = items.reduce((s, it) => s + Number(it.total_price || 0), 0);
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  async function submit(send: boolean) {
    setBusy(true);
    await onSubmit(
      {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        project_description: project,
        notes,
        doc_date: docDate,
        due_date: null,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        total,
      },
      items.filter((it) => it.description.trim()),
      send,
    );
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl leading-none">New Quotation</h1>
        <StatusBadge status="draft" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Date">
          <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Customer Name">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Customer Email">
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Customer Phone">
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputCls} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Customer Address">
            <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Project / Job Description">
            <input value={project} onChange={(e) => setProject(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="mt-10">
        <div className="label-caps mb-3">Line Items</div>
        <div className="rounded-md border" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-[1fr_80px_120px_120px_40px] items-center gap-3 border-b bg-[color:var(--offwhite)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted-navy)]" style={{ borderColor: "var(--border)" }}>
            <div>Description</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Unit Price</div>
            <div className="text-right">Total</div>
            <div />
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              className="animate-slide-down group grid grid-cols-[1fr_80px_120px_120px_40px] items-center gap-3 border-b px-4 py-2.5"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Item description"
                className="border-b bg-transparent py-1 text-sm outline-none focus:border-[color:var(--royal)]"
                style={{ borderColor: "var(--border)" }}
              />
              <input
                type="number"
                min={0}
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                className="border-b bg-transparent py-1 text-center text-sm outline-none focus:border-[color:var(--royal)]"
                style={{ borderColor: "var(--border)" }}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={it.unit_price}
                onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                className="border-b bg-transparent py-1 text-right text-sm outline-none focus:border-[color:var(--royal)]"
                style={{ borderColor: "var(--border)" }}
              />
              <div className="rounded bg-[color:var(--offwhite)] px-2 py-1 text-right text-sm">{money(it.total_price)}</div>
              <button
                onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0, total_price: 0 }])}
            className="flex w-full items-center justify-center gap-2 border-t border-dashed py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--royal)] transition-colors hover:bg-[color:var(--offwhite)]"
            style={{ borderColor: "var(--royal)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Line Item
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <Field label="Notes">
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </Field>

        <div className="rounded-md border p-5" style={{ borderColor: "var(--border)" }}>
          <Row label="Subtotal" value={money(subtotal)} />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-[color:var(--mid-navy)]">Tax %</span>
            <input
              type="number"
              min={0}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-20 rounded border bg-white px-2 py-1 text-right text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <Row label="Tax" value={money(taxAmount)} />
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-baseline justify-between">
              <span className="label-caps">Total</span>
              <span className="font-serif text-3xl text-[color:var(--royal)]">{money(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          disabled={busy}
          onClick={() => submit(false)}
          className="rounded-[4px] border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--mid-navy)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97] disabled:opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          Save as Draft
        </button>
        <button
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded-[4px] bg-[color:var(--eco)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
        >
          Send Quote
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border-b bg-transparent py-2 text-sm outline-none focus:border-[color:var(--royal)]";

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <div className="label-caps mb-1.5">{label}</div>
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[color:var(--mid-navy)]">{label}</span>
      <span className="text-[color:var(--ink)]">{value}</span>
    </div>
  );
}

// Add missing style for inputs applied dynamically
if (typeof document !== "undefined") {
  const style = document.getElementById("qf-inline-style");
  if (!style) {
    const s = document.createElement("style");
    s.id = "qf-inline-style";
    s.textContent = `.${""}`;
    document.head.appendChild(s);
  }
}
