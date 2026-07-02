import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DOC_LABEL, money, fmtDate } from "./format";

type Doc = {
  doc_number: string;
  doc_type: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  project_description?: string | null;
  doc_date: string;
  due_date?: string | null;
  notes?: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
};

type Item = {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export function generatePDF(doc: Doc, items: Item[]) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(27, 63, 190);
  pdf.rect(0, 0, W, 6, "F");

  pdf.setFont("times", "normal");
  pdf.setFontSize(22);
  pdf.setTextColor(13, 26, 46);
  pdf.text("Alpine-Eco", 40, 60);
  pdf.setFontSize(9);
  pdf.setTextColor(107, 126, 149);
  pdf.text("Manufacturing & Fabrication", 40, 76);

  pdf.setFont("times", "normal");
  pdf.setFontSize(22);
  pdf.setTextColor(27, 63, 190);
  pdf.text(DOC_LABEL[doc.doc_type] || "Document", W - 40, 60, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(42, 61, 85);
  pdf.text(doc.doc_number, W - 40, 78, { align: "right" });
  pdf.text(fmtDate(doc.doc_date), W - 40, 94, { align: "right" });

  pdf.setDrawColor(27, 63, 190);
  pdf.setLineWidth(0.5);
  pdf.line(40, 110, W - 40, 110);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 126, 149);
  pdf.text("BILL TO", 40, 132);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(13, 26, 46);
  let y = 148;
  pdf.text(doc.customer_name || "—", 40, y);
  y += 14;
  if (doc.customer_email) { pdf.text(doc.customer_email, 40, y); y += 14; }
  if (doc.customer_phone) { pdf.text(doc.customer_phone, 40, y); y += 14; }
  if (doc.customer_address) { pdf.text(doc.customer_address, 40, y); y += 14; }

  if (doc.project_description) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(107, 126, 149);
    pdf.text("PROJECT", W / 2, 132);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(13, 26, 46);
    pdf.text(doc.project_description, W / 2, 148, { maxWidth: W / 2 - 40 });
  }

  autoTable(pdf, {
    startY: Math.max(y + 20, 220),
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: items.map((it) => [
      it.description,
      String(it.quantity),
      money(it.unit_price),
      money(it.total_price),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: [244, 247, 242],
      textColor: [42, 61, 85],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 8,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [13, 26, 46],
      cellPadding: 8,
      lineColor: [230, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      1: { halign: "center", cellWidth: 60 },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
    },
  });

  const finalY = (pdf as any).lastAutoTable.finalY + 20;
  const rightX = W - 40;
  const labelX = W - 200;
  pdf.setFontSize(10);
  pdf.setTextColor(42, 61, 85);
  pdf.text("Subtotal", labelX, finalY);
  pdf.text(money(doc.subtotal), rightX, finalY, { align: "right" });
  pdf.text(`Tax (${doc.tax_rate}%)`, labelX, finalY + 16);
  pdf.text(money(doc.tax_amount), rightX, finalY + 16, { align: "right" });

  pdf.setDrawColor(27, 63, 190);
  pdf.line(labelX, finalY + 24, rightX, finalY + 24);
  pdf.setFont("times", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(27, 63, 190);
  pdf.text("Total", labelX, finalY + 44);
  pdf.text(money(doc.total), rightX, finalY + 44, { align: "right" });

  if (doc.notes) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(107, 126, 149);
    pdf.text("NOTES", 40, finalY + 72);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(42, 61, 85);
    pdf.text(doc.notes, 40, finalY + 88, { maxWidth: W - 80 });
  }

  const H = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(8);
  pdf.setTextColor(30, 158, 94);
  pdf.text("●", 40, H - 30);
  pdf.setTextColor(107, 126, 149);
  pdf.text("Alpine-Eco Workflow · Thank you for your business", 52, H - 30);

  pdf.save(`${doc.doc_number}.pdf`);
}
