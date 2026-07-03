import { createFileRoute } from "@tanstack/react-router";
import { DocumentDetail } from "@/components/DocumentDetail";
import { DeleteDocButton } from "@/components/DeleteDocButton";
import { ParentDocCard } from "@/routes/invoices.$id";
import { useDocument, useUpdateStatus } from "@/lib/queries";
import { CheckCircle2, Truck } from "lucide-react";

export const Route = createFileRoute("/delivery/$id")({
  component: DeliveryDetail,
});

function DeliveryDetail() {
  const { id } = Route.useParams();
  const updateStatus = useUpdateStatus();
  const { data: doc } = useDocument(id);
  const { data: parent } = useDocument(doc?.parent_id);

  return (
    <DocumentDetail
      id={id}
      listLabel="Delivery Notes"
      listTo="/delivery"
      pdfOptions={() => ({ parentRef: parent?.doc_number ?? null })}
      extraCards={(d) =>
        d.parent_id ? <ParentDocCard parentId={d.parent_id} label="Source Document" detailPath="/invoices/$id" /> : null
      }
      actions={(d) => (
        <>
          {d.status === "ready" && (
            <button
              onClick={() => updateStatus.mutate({ id: d.id, status: "in_transit", docNumber: d.doc_number })}
              className="press inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--royal)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:bg-[color:var(--royal-deep)] active:scale-[0.97]"
            >
              <Truck className="h-4 w-4" /> Mark In Transit
            </button>
          )}
          {d.status !== "delivered" && d.status !== "returned" && (
            <button
              onClick={() => updateStatus.mutate({ id: d.id, status: "delivered", docNumber: d.doc_number })}
              className="press inline-flex items-center gap-2 rounded-[4px] bg-[color:var(--eco)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:brightness-95 active:scale-[0.97]"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Delivered
            </button>
          )}
          <DeleteDocButton doc={d} listTo="/delivery" label="Delete Note" />
        </>
      )}
    />
  );
}
