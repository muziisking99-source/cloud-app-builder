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
  status?: string | null;
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

type Task = {
  task_description: string;
  status: string;
  assigned_to?: string | null;
  due_date?: string | null;
};

const ROYAL: [number, number, number] = [27, 63, 190];
const INK: [number, number, number] = [13, 26, 46];
const MUTED: [number, number, number] = [107, 126, 149];
const MID: [number, number, number] = [42, 61, 85];
const ECO: [number, number, number] = [30, 158, 94];
const AMBER: [number, number, number] = [217, 119, 6];
const DANGER: [number, number, number] = [200, 40, 60];
const OFFWHITE: [number, number, number] = [244, 247, 242];

function drawHeader(pdf: jsPDF, doc: Doc, W: number) {
  pdf.setFillColor(...ROYAL);
  pdf.rect(0, 0, W, 6, "F");

  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.setTextColor(...INK);
  pdf.text("Alpine-Eco", 40, 62);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text("Manufacturing & Fabrication", 40, 78);

  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(...ROYAL);
  pdf.text((DOC_LABEL[doc.doc_type] || "Document").toUpperCase(), W - 40, 62, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MID);
  pdf.text(doc.doc_number, W - 40, 80, { align: "right" });
  pdf.text(fmtDate(doc.doc_date), W - 40, 96, { align: "right" });

  pdf.setDrawColor(...ROYAL);
  pdf.setLineWidth(1);
  pdf.line(40, 112, W - 40, 112);
}

function drawCustomer(pdf: jsPDF, doc: Doc, W: number, heading = "BILL TO"): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(heading, 40, 134);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  let y = 150;
  pdf.text(doc.customer_name || "—", 40, y); y += 14;
  if (doc.customer_email) { pdf.text(doc.customer_email, 40, y); y += 14; }
  if (doc.customer_phone) { pdf.text(doc.customer_phone, 40, y); y += 14; }
  if (doc.customer_address) {
    const wrapped = pdf.splitTextToSize(doc.customer_address, W / 2 - 60);
    pdf.text(wrapped, 40, y); y += wrapped.length * 14;
  }
  return y;
}

function drawMeta(pdf: jsPDF, doc: Doc, W: number) {
  const x = W / 2 + 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  let y = 134;
  if (doc.project_description) {
    pdf.text("PROJECT", x, y); y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    const wrapped = pdf.splitTextToSize(doc.project_description, W / 2 - 50);
    pdf.text(wrapped, x, y);
    y += wrapped.length * 14 + 6;
  }
  if (doc.doc_type === "invoice" && doc.due_date) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text("DUE DATE", x, y); y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text(fmtDate(doc.due_date), x, y);
  }
}

function drawStatusStamp(pdf: jsPDF, W: number, label: string, color: [number, number, number]) {
  pdf.saveGraphicsState();
  const x = W - 140;
  const y = 200;
  pdf.setDrawColor(...color);
  pdf.setTextColor(...color);
  pdf.setLineWidth(2);
  pdf.roundedRect(x, y, 100, 34, 4, 4, "S");
  pdf.setFont("times", "bold");
  pdf.setFontSize(20);
  pdf.text(label, x + 50, y + 23, { align: "center" });
  pdf.restoreGraphicsState();
}

function drawItemsTable(pdf: jsPDF, items: Item[], startY: number, withPricing: boolean) {
  if (withPricing) {
    autoTable(pdf, {
      startY,
      head: [["Description", "Qty", "Unit Price", "Total"]],
      body: items.map((it) => [
        it.description,
        String(it.quantity),
        money(it.unit_price),
        money(it.total_price),
      ]),
      theme: "plain",
      headStyles: {
        fillColor: OFFWHITE, textColor: MID, fontSize: 9,
        fontStyle: "bold", cellPadding: 8,
      },
      bodyStyles: {
        fontSize: 10, textColor: INK, cellPadding: 8,
        lineColor: [230, 232, 240], lineWidth: 0.5,
      },
      columnStyles: {
        1: { halign: "center", cellWidth: 60 },
        2: { halign: "right", cellWidth: 95 },
        3: { halign: "right", cellWidth: 95 },
      },
      margin: { left: 40, right: 40 },
    });
  } else {
    autoTable(pdf, {
      startY,
      head: [["Description", "Qty Delivered"]],
      body: items.map((it) => [it.description, String(it.quantity)]),
      theme: "plain",
      headStyles: {
        fillColor: OFFWHITE, textColor: MID, fontSize: 9,
        fontStyle: "bold", cellPadding: 8,
      },
      bodyStyles: {
        fontSize: 10, textColor: INK, cellPadding: 8,
        lineColor: [230, 232, 240], lineWidth: 0.5,
      },
      columnStyles: {
        1: { halign: "center", cellWidth: 120 },
      },
      margin: { left: 40, right: 40 },
    });
  }
  return (pdf as any).lastAutoTable.finalY as number;
}

function drawTotals(pdf: jsPDF, doc: Doc, W: number, startY: number) {
  const rightX = W - 40;
  const labelX = W - 220;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MID);
  pdf.text("Subtotal", labelX, startY);
  pdf.text(money(doc.subtotal), rightX, startY, { align: "right" });
  pdf.text(`Tax (${doc.tax_rate}%)`, labelX, startY + 16);
  pdf.text(money(doc.tax_amount), rightX, startY + 16, { align: "right" });

  pdf.setDrawColor(...ROYAL);
  pdf.setLineWidth(0.8);
  pdf.line(labelX, startY + 26, rightX, startY + 26);
  pdf.setFont("times", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...ROYAL);
  pdf.text("Total", labelX, startY + 46);
  pdf.text(money(doc.total), rightX, startY + 46, { align: "right" });
}

function drawFooter(pdf: jsPDF, W: number, terms: string) {
  const H = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(230, 232, 240);
  pdf.setLineWidth(0.5);
  pdf.line(40, H - 60, W - 40, H - 60);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const wrapped = pdf.splitTextToSize(terms, W - 200);
  pdf.text(wrapped, 40, H - 46);

  pdf.setTextColor(...ECO);
  pdf.text("●", W - 180, H - 30);
  pdf.setTextColor(...MUTED);
  pdf.text("Alpine-Eco Workflow", W - 170, H - 30);
  pdf.text(`Page 1`, W - 40, H - 30, { align: "right" });
}

export function generatePDF(doc: Doc, items: Item[], extras?: { tasks?: Task[]; parentRef?: string | null }) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();

  drawHeader(pdf, doc, W);
  const custHeading =
    doc.doc_type === "delivery_note" ? "DELIVER TO" :
    doc.doc_type === "job_card" ? "CUSTOMER" : "BILL TO";
  const custY = drawCustomer(pdf, doc, W, custHeading);
  drawMeta(pdf, doc, W);

  // Status stamp for paid/overdue invoices
  if (doc.doc_type === "invoice") {
    if (doc.status === "paid") drawStatusStamp(pdf, W, "PAID", ECO);
    else if (doc.status === "overdue") drawStatusStamp(pdf, W, "OVERDUE", DANGER);
  }

  const tableStart = Math.max(custY + 20, 230);

  if (doc.doc_type === "job_card") {
    // Job card: task checklist, no financials
    const tasks = extras?.tasks ?? [];
    autoTable(pdf, {
      startY: tableStart,
      head: [["", "Task", "Assigned", "Due", "Status"]],
      body: tasks.length ? tasks.map((t) => [
        t.status === "completed" ? "☑" : "☐",
        t.task_description,
        t.assigned_to || "—",
        fmtDate(t.due_date),
        t.status.replace(/_/g, " "),
      ]) : [["", "No tasks yet", "", "", ""]],
      theme: "plain",
      headStyles: { fillColor: OFFWHITE, textColor: MID, fontSize: 9, fontStyle: "bold", cellPadding: 8 },
      bodyStyles: { fontSize: 10, textColor: INK, cellPadding: 8, lineColor: [230, 232, 240], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        3: { cellWidth: 80 },
        4: { cellWidth: 80, textColor: MUTED },
      },
      margin: { left: 40, right: 40 },
    });
    const endY = (pdf as any).lastAutoTable.finalY + 30;
    if (doc.notes) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("WORKSHOP NOTES", 40, endY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MID);
      const wrapped = pdf.splitTextToSize(doc.notes, W - 80);
      pdf.text(wrapped, 40, endY + 16);
    }
    drawFooter(pdf, W, "Workshop floor document · Return to office once all tasks are marked complete.");
  } else if (doc.doc_type === "delivery_note") {
    const endY = drawItemsTable(pdf, items, tableStart, false);
    let y = endY + 30;
    if (extras?.parentRef) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("INVOICE REFERENCE", 40, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(...INK);
      pdf.text(extras.parentRef, 40, y + 16);
      y += 40;
    }
    if (doc.notes) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("NOTES", 40, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MID);
      const wrapped = pdf.splitTextToSize(doc.notes, W - 80);
      pdf.text(wrapped, 40, y + 16);
      y += 20 + wrapped.length * 12;
    }
    // Signature block
    y = Math.max(y + 40, pdf.internal.pageSize.getHeight() - 160);
    pdf.setDrawColor(...MID);
    pdf.setLineWidth(0.5);
    pdf.line(40, y, 280, y);
    pdf.line(W - 280, y, W - 40, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text("Received by (print name & signature)", 40, y + 14);
    pdf.text("Date", W - 280, y + 14);
    drawFooter(pdf, W, "Please inspect goods on delivery. Report discrepancies within 48 hours.");
  } else {
    // quote & invoice
    const endY = drawItemsTable(pdf, items, tableStart, true);
    drawTotals(pdf, doc, W, endY + 24);
    let y = endY + 100;

    if (doc.notes) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("NOTES", 40, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...MID);
      const wrapped = pdf.splitTextToSize(doc.notes, W - 260);
      pdf.text(wrapped, 40, y + 14);
      y += 20 + wrapped.length * 12;
    }

    if (doc.doc_type === "invoice") {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("PAYMENT DETAILS", 40, y + 10);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...MID);
      pdf.text([
        "Bank: Standard Bank · Branch: 051001",
        "Account name: Alpine-Eco (Pty) Ltd · Account no: 000 000 000",
        `Reference: ${doc.doc_number}`,
        doc.due_date ? `Payment due by ${fmtDate(doc.due_date)}.` : "Payment due on receipt.",
      ], 40, y + 26);
      drawFooter(pdf, W, "Thank you for your business. Payment terms: Net 30 unless otherwise agreed.");
    } else {
      // quote
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("This quotation is valid for 30 days from the date above.", 40, y + 10);
      drawFooter(pdf, W, "Prices exclude VAT unless stated. Acceptance authorises us to schedule production.");
    }
  }

  pdf.save(`${doc.doc_number}.pdf`);
}
