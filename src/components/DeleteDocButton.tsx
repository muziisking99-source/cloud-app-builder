import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useIsAdmin, useDeleteDocument } from "@/lib/queries";

type ListRoute = "/quotes" | "/invoices" | "/delivery" | "/jobs";

/**
 * Admin-only delete action for a document. Renders nothing for staff, so the
 * capability is hidden in the UI and enforced again by RLS on the server.
 */
export function DeleteDocButton({
  doc,
  listTo,
  label = "Delete",
}: {
  doc: any;
  listTo: ListRoute;
  label?: string;
}) {
  const isAdmin = useIsAdmin();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const deleteDoc = useDeleteDocument();

  if (!isAdmin) return null;

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${doc.doc_number}?`,
      description: "This document and everything linked to it will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep It",
      destructive: true,
    });
    if (!ok) return;
    deleteDoc.mutate(
      { doc },
      { onSuccess: () => navigate({ to: listTo }) },
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="press inline-flex items-center gap-2 rounded-[4px] border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--danger)] transition-colors hover:bg-[color:var(--offwhite)] active:scale-[0.97]"
      style={{ borderColor: "var(--danger)" }}
    >
      <Trash2 className="h-4 w-4" /> {label}
    </button>
  );
}
