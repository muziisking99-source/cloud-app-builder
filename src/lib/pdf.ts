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

const COMPANY = {
  name: "Alpine-Eco",
  tagline: "Notebooks and diaries",
  address: "22 Stevens Rd Stafford, Johannesburg",
  phone: "011 493 0113",
  email: "info@alpine-eco.co.za",
};

const ROYAL: [number, number, number] = [27, 63, 190];
const ROYAL_LIGHT: [number, number, number] = [235, 240, 252];
const INK: [number, number, number] = [13, 26, 46];
const MUTED: [number, number, number] = [107, 126, 149];
const MID: [number, number, number] = [42, 61, 85];
const ECO: [number, number, number] = [30, 158, 94];
const DANGER: [number, number, number] = [200, 40, 60];
const OFFWHITE: [number, number, number] = [244, 247, 242];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [230, 232, 240];

const TABLE_HEAD = {
  fillColor: ROYAL_LIGHT,
  textColor: ROYAL,
  fontSize: 9,
  fontStyle: "bold" as const,
  cellPadding: 8,
};
const TABLE_BODY = {
  fontSize: 10,
  textColor: INK,
  cellPadding: 8,
  lineColor: BORDER,
  lineWidth: 0.5,
};
const TABLE_ALT = { fillColor: OFFWHITE };

/** Draw branded header; returns Y below the divider for the body section. */
function drawHeader(pdf: jsPDF, doc: Doc, W: number): number {
  pdf.setFillColor(...ROYAL);
  pdf.rect(0, 0, W, 6, "F");

  // Accent mark beside company name
  pdf.setFillColor(...ECO);
  pdf.roundedRect(40, 44, 8, 8, 2, 2, "F");

  pdf.setFont("times", "normal");
  pdf.setFontSize(24);
  pdf.setTextColor(...INK);
  pdf.text(COMPANY.name, 56, 54);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MID);
  pdf.text(COMPANY.tagline, 56, 70);

  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  let contactY = 86;
  pdf.text(COMPANY.address, 40, contactY);
  contactY += 12;
  pdf.text(`${COMPANY.phone}  ·  ${COMPANY.email}`, 40, contactY);

  // Right column — document type & meta
  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...ROYAL);
  pdf.text((DOC_LABEL[doc.doc_type] || "Document").toUpperCase(), W - 40, 54, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MID);
  pdf.text(doc.doc_number, W - 40, 74, { align: "right" });
  pdf.text(fmtDate(doc.doc_date), W - 40, 90, { align: "right" });

  const dividerY = 118;
  pdf.setDrawColor(...ROYAL);
  pdf.setLineWidth(1);
  pdf.line(40, dividerY, W - 40, dividerY);

  return dividerY + 22;
}

function drawCustomer(pdf: jsPDF, doc: Doc, W: number, topY: number, heading = "BILL TO"): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(heading, 40, topY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  let y = topY + 16;
  pdf.text(doc.customer_name || "—", 40, y);
  y += 14;
  if (doc.customer_email) {
    pdf.text(doc.customer_email, 40, y);
    y += 14;
  }
  if (doc.customer_phone) {
    pdf.text(doc.customer_phone, 40, y);
    y += 14;
  }
  if (doc.customer_address) {
    const wrapped = pdf.splitTextToSize(doc.customer_address, W / 2 - 60);
    pdf.text(wrapped, 40, y);
    y += wrapped.length * 14;
  }
  return y;
}

function drawMeta(pdf: jsPDF, doc: Doc, W: number, topY: number): number {
  const x = W / 2 + 10;
  let y = topY;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  if (doc.project_description) {
    pdf.text("PROJECT", x, y);
    y += 16;
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
    pdf.text("DUE DATE", x, y);
    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    pdf.text(fmtDate(doc.due_date), x, y);
    y += 14;
  }
  return y;
}

function drawStatusStamp(pdf: jsPDF, W: number, y: number, label: string, color: [number, number, number]) {
  pdf.saveGraphicsState();
  const x = W - 140;
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
      headStyles: TABLE_HEAD,
      bodyStyles: TABLE_BODY,
      alternateRowStyles: TABLE_ALT,
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
      headStyles: TABLE_HEAD,
      bodyStyles: TABLE_BODY,
      alternateRowStyles: TABLE_ALT,
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

  // Royal band for total
  const bandY = startY + 30;
  const bandH = 32;
  pdf.setFillColor(...ROYAL);
  pdf.roundedRect(labelX - 8, bandY, rightX - labelX + 8, bandH, 3, 3, "F");
  pdf.setFont("times", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...WHITE);
  pdf.text("Total", labelX, bandY + 21);
  pdf.text(money(doc.total), rightX, bandY + 21, { align: "right" });
}

function drawFooter(pdf: jsPDF, W: number, terms: string) {
  const H = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.5);
  pdf.line(40, H - 68, W - 40, H - 68);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const wrapped = pdf.splitTextToSize(terms, W - 80);
  pdf.text(wrapped, 40, H - 54);

  const contactLine = `${COMPANY.name}  ·  ${COMPANY.address}  ·  ${COMPANY.phone}  ·  ${COMPANY.email}`;
  pdf.setFontSize(7);
  pdf.text(contactLine, 40, H - 28);

  pdf.setTextColor(...ECO);
  pdf.text("●", W - 80, H - 28);
  pdf.setTextColor(...MUTED);
  pdf.text("Page 1", W - 40, H - 28, { align: "right" });
}

/** Two-column signature block for delivery notes. */
function drawDeliverySignatures(pdf: jsPDF, W: number, startY: number) {
  const colW = (W - 100) / 2;
  const leftX = 40;
  const rightX = leftX + colW + 20;
  const lineY = startY + 36;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MID);
  pdf.text("DELIVERED BY", leftX, startY);
  pdf.text("RECEIVED BY", rightX, startY);

  pdf.setDrawColor(...MID);
  pdf.setLineWidth(0.5);
  pdf.line(leftX, lineY, leftX + colW, lineY);
  pdf.line(rightX, lineY, rightX + colW, lineY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Signature", leftX, lineY + 12);
  pdf.text("Signature", rightX, lineY + 12);

  const nameY = lineY + 30;
  pdf.line(leftX, nameY, leftX + colW, nameY);
  pdf.line(rightX, nameY, rightX + colW, nameY);
  pdf.text("Printed name", leftX, nameY + 12);
  pdf.text("Printed name", rightX, nameY + 12);

  const dateY = nameY + 30;
  pdf.line(leftX, dateY, leftX + colW * 0.55, dateY);
  pdf.line(rightX, dateY, rightX + colW * 0.55, dateY);
  pdf.text("Date", leftX, dateY + 12);
  pdf.text("Date", rightX, dateY + 12);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.text("Goods received in good condition", rightX, dateY + 26);
}

export function generatePDF(doc: Doc, items: Item[], extras?: { tasks?: Task[]; parentRef?: string | null }) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  const bodyTop = drawHeader(pdf, doc, W);
  const custHeading =
    doc.doc_type === "delivery_note" ? "DELIVER TO" :
    doc.doc_type === "job_card" ? "CUSTOMER" : "BILL TO";
  const custY = drawCustomer(pdf, doc, W, bodyTop, custHeading);
  const metaY = drawMeta(pdf, doc, W, bodyTop);

  // Status stamp for paid/overdue invoices — sits below the customer/meta block
  // and reserves its own height so the items table starts beneath it.
  let contentBottom = Math.max(custY, metaY);
  if (doc.doc_type === "invoice" && (doc.status === "paid" || doc.status === "overdue")) {
    const stampY = contentBottom + 12;
    const stampH = 34;
    if (doc.status === "paid") drawStatusStamp(pdf, W, stampY, "PAID", ECO);
    else drawStatusStamp(pdf, W, stampY, "OVERDUE", DANGER);
    contentBottom = stampY + stampH;
  }

  const tableStart = contentBottom + 24;

  if (doc.doc_type === "job_card") {
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
      headStyles: TABLE_HEAD,
      bodyStyles: TABLE_BODY,
      alternateRowStyles: TABLE_ALT,
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
    const sigY = Math.max(y + 40, H - 220);
    drawDeliverySignatures(pdf, W, sigY);
    drawFooter(pdf, W, "Please inspect goods on delivery. Report discrepancies within 48 hours.");
  } else {
    // quote & invoice
    const endY = drawItemsTable(pdf, items, tableStart, true);
    drawTotals(pdf, doc, W, endY + 24);
    let y = endY + 110;

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
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("Thank you for your business.", 40, y + 10);
      drawFooter(pdf, W, "Please retain this invoice for your records.");
    } else {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("This quotation is valid for 30 days from the date above.", 40, y + 10);
      drawFooter(pdf, W, "Prices exclude VAT unless stated. Acceptance authorises us to schedule production.");
    }
  }

  pdf.save(`${doc.doc_number}.pdf`);
}
