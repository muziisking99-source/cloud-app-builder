import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoSrc from "@/assets/alpine-eco-logo.png";
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
  deposit_required?: number;
  deposit_paid?: boolean;
  amount_paid?: number;
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
  name: "Alpine-Eco Notebooks and Diaries",
  address: "22 Stevens Road, Stafford, Johannesburg, South Africa, 2197",
  phone: "011 493 0113",
  email: "accounts@alpine-eco.co.za",
  regNo: "2013/128582/07",
  vatNo: "4230280879",
};

const LOGO_NATURAL_W = 645;
const LOGO_NATURAL_H = 311;
const LOGO_DISPLAY_W = 135;

const BANKING = {
  heading: "Banking Details",
  accountHolder: "Alpine",
  bank: "Capitec Bank",
  accountNumber: "252 504 706",
  branchCode: "470010",
};

const QUOTE_TERMS = {
  title: "Standard Terms & Conditions",
  intro:
    "This Quotation is valid for 30 days from date of submission & is subject to change as follows:",
  changeItems: [
    "Material delivered by customer not in accordance with the specification of the quotation",
    "Stock availability or price subsequent to this quotation",
    "Production overtime necessitated in excess of normal working hours",
  ],
  paymentIntro: "Payment Terms are strictly:",
  paymentItems: [
    "70% deposit payable upon placement of order",
    "Full outstanding balance before collection",
    "All goods remain in the property of Alpine-Eco until settlement of account",
    "Should a customer cancel an order which is in production, the deposit will be forfeited in part or in full post set-off",
    "Production will commence once Proof has been signed off by the customer",
    "Customer required to provide artwork in PDF format or as otherwise agreed on in writing with Alpine-Eco",
    "Corrections and layouts are charged at standard rates and are not included in the above price",
  ],
  liabilityNote:
    "Please ensure that this quotation meets your specification as Alpine-Eco will not be held liable for any errors.",
};

let cachedLogoDataUrl: string | undefined;
const logoLoadPromise = fetch(logoSrc)
  .then((r) => r.blob())
  .then(
    (blob) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogoDataUrl = reader.result as string;
          resolve(cachedLogoDataUrl);
        };
        reader.readAsDataURL(blob);
      }),
  );

async function getLogoDataUrl(): Promise<string> {
  return cachedLogoDataUrl ?? logoLoadPromise;
}

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
const AMBER: [number, number, number] = [245, 158, 11];
const AMBER_LIGHT: [number, number, number] = [254, 243, 199];
const ECO_LIGHT: [number, number, number] = [209, 250, 229];
const ECO_DARK: [number, number, number] = [22, 101, 52];
const DANGER_LIGHT: [number, number, number] = [254, 226, 226];
const DANGER_DARK: [number, number, number] = [185, 28, 28];

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

/** Company contact block — reused in the PDF header beside the logo. */
function drawCompanyBlock(pdf: jsPDF, x: number, startY: number): number {
  let y = startY;
  pdf.setFont("times", "normal");
  pdf.setFontSize(13);
  pdf.setTextColor(...INK);
  pdf.text(COMPANY.name, x, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...MUTED);
  const lines = [
    "22 Stevens Road",
    "Stafford",
    "Johannesburg, South Africa, 2197",
    `Company Reg No: ${COMPANY.regNo}`,
    `VAT Reg No: ${COMPANY.vatNo}`,
    `Phone No: ${COMPANY.phone}`,
    `Email: ${COMPANY.email}`,
  ];
  for (const line of lines) {
    pdf.text(line, x, y);
    y += 12;
  }
  return y;
}

/** Banking details — quotes and invoices only. */
function drawBankingDetails(pdf: jsPDF, startY: number): number {
  let y = startY;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(BANKING.heading.toUpperCase(), 40, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MID);
  const lines = [
    BANKING.accountHolder,
    BANKING.bank,
    `Account number: ${BANKING.accountNumber}`,
    `Branch Code: ${BANKING.branchCode}`,
  ];
  for (const line of lines) {
    pdf.text(line, 40, y);
    y += 14;
  }
  return y + 8;
}

/** Full-width balance summary band for customer statements. */
function drawStatementBalanceBand(pdf: jsPDF, W: number, startY: number, totalBalance: number): number {
  const x = 40;
  const w = W - 80;
  const bandH = 52;
  const bandY = startY + 16;

  pdf.setFillColor(...ROYAL);
  pdf.roundedRect(x, bandY, w, bandH, 5, 5, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...ROYAL_LIGHT);
  pdf.text("TOTAL BALANCE DUE", x + 18, bandY + 20);

  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...WHITE);
  pdf.text(money(totalBalance), x + w - 18, bandY + 40, { align: "right" });

  return bandY + bandH + 28;
}

/** Draw branded header; returns Y below the divider for the body section. */
function drawHeader(pdf: jsPDF, doc: Doc, W: number, logoDataUrl: string): number {
  const logoH = LOGO_DISPLAY_W * (LOGO_NATURAL_H / LOGO_NATURAL_W);
  const logoY = 14;
  pdf.addImage(logoDataUrl, "PNG", 40, logoY, LOGO_DISPLAY_W, logoH);

  const textX = 40 + LOGO_DISPLAY_W + 18;
  const companyBottom = drawCompanyBlock(pdf, textX, 24);
  const leftBottom = Math.max(logoY + logoH, companyBottom);

  // Right column — document type & meta
  pdf.setFont("times", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(...ROYAL);
  pdf.text((DOC_LABEL[doc.doc_type] || "Document").toUpperCase(), W - 40, 52, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(...MID);
  pdf.text(doc.doc_number, W - 40, 74, { align: "right" });
  pdf.text(fmtDate(doc.doc_date), W - 40, 92, { align: "right" });

  const dividerY = Math.max(leftBottom, 100) + 14;
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

type StampVariant = "paid" | "unpaid" | "part_paid" | "overdue";

const STAMP_STYLES: Record<
  StampVariant,
  { fill: [number, number, number]; border: [number, number, number]; text: [number, number, number]; sub: string }
> = {
  paid: { fill: ECO_LIGHT, border: ECO, text: ECO_DARK, sub: "Payment received" },
  unpaid: { fill: AMBER_LIGHT, border: AMBER, text: [180, 83, 9], sub: "Awaiting payment" },
  part_paid: { fill: ROYAL_LIGHT, border: ROYAL, text: ROYAL, sub: "Partially settled" },
  overdue: { fill: DANGER_LIGHT, border: DANGER, text: DANGER_DARK, sub: "Past due date" },
};

const STAMP_LABELS: Record<StampVariant, string> = {
  paid: "PAID",
  unpaid: "UNPAID",
  part_paid: "PART PAID",
  overdue: "OVERDUE",
};

function getInvoiceStampVariant(doc: Doc): StampVariant | null {
  if (doc.doc_type !== "invoice") return null;
  if (doc.status === "paid") return "paid";
  if (doc.status === "part_paid") return "part_paid";
  if (doc.status === "overdue") return "overdue";
  if (doc.status === "unpaid" || doc.status === "sent") return "unpaid";
  return null;
}

/** Branded payment-status stamp for invoices. Returns stamp height. */
function drawPaymentStamp(pdf: jsPDF, W: number, y: number, variant: StampVariant): number {
  const style = STAMP_STYLES[variant];
  const label = STAMP_LABELS[variant];
  const w = 122;
  const h = 50;
  const x = W - 40 - w;

  pdf.saveGraphicsState();

  // Soft shadow offset
  pdf.setFillColor(220, 224, 232);
  pdf.roundedRect(x + 2, y + 2, w, h, 7, 7, "F");

  // Card fill + border
  pdf.setFillColor(...style.fill);
  pdf.setDrawColor(...style.border);
  pdf.setLineWidth(1.25);
  pdf.roundedRect(x, y, w, h, 7, 7, "FD");

  // Top accent band
  pdf.setFillColor(...style.border);
  pdf.roundedRect(x, y, w, 5, 7, 7, "F");
  pdf.rect(x, y + 3, w, 3, "F");

  // Decorative corner dots (stamp motif)
  pdf.setFillColor(...style.border);
  pdf.circle(x + 10, y + h - 10, 1.8, "F");
  pdf.circle(x + w - 10, y + h - 10, 1.8, "F");

  // Main label
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(variant === "part_paid" ? 13 : 15);
  pdf.setTextColor(...style.text);
  pdf.text(label, x + w / 2, y + 28, { align: "center" });

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...MUTED);
  pdf.text(style.sub.toUpperCase(), x + w / 2, y + 40, { align: "center" });

  pdf.restoreGraphicsState();
  return h;
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

function drawTotals(pdf: jsPDF, doc: Doc, W: number, startY: number): number {
  const rightX = W - 40;
  const labelX = W - 220;
  const amountPaid = Number(doc.amount_paid || 0);
  const balanceDue = Math.max(0, Number(doc.total) - amountPaid);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MID);
  pdf.text("Subtotal", labelX, startY);
  pdf.text(money(doc.subtotal), rightX, startY, { align: "right" });
  pdf.text(`Tax (${doc.tax_rate}%)`, labelX, startY + 16);
  pdf.text(money(doc.tax_amount), rightX, startY + 16, { align: "right" });

  let bandY = startY + 30;
  const bandH = 32;

  if (doc.doc_type === "invoice" && amountPaid > 0) {
    pdf.text("Total", labelX, bandY);
    pdf.text(money(doc.total), rightX, bandY, { align: "right" });
    bandY += 18;
    pdf.setTextColor(...ECO);
    pdf.text("Less paid", labelX, bandY);
    pdf.text(`-${money(amountPaid)}`, rightX, bandY, { align: "right" });
    bandY += 24;
    pdf.setFillColor(...ROYAL);
    pdf.roundedRect(labelX - 8, bandY, rightX - labelX + 8, bandH, 3, 3, "F");
    pdf.setFont("times", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...WHITE);
    pdf.text("Balance Due", labelX, bandY + 21);
    pdf.text(money(balanceDue), rightX, bandY + 21, { align: "right" });
    return bandY + bandH + 8;
  }

  pdf.setFillColor(...ROYAL);
  pdf.roundedRect(labelX - 8, bandY, rightX - labelX + 8, bandH, 3, 3, "F");
  pdf.setFont("times", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...WHITE);
  pdf.text("Total", labelX, bandY + 21);
  pdf.text(money(doc.total), rightX, bandY + 21, { align: "right" });
  return bandY + bandH + 8;
}

/** Deposit callout card on quote PDFs. */
function drawQuoteDeposit(pdf: jsPDF, doc: Doc, W: number, startY: number): number {
  const deposit = Number(doc.deposit_required || 0);
  if (doc.doc_type !== "quote" || deposit <= 0) return startY;

  const paid = Boolean(doc.deposit_paid);
  const boxW = W - 80;
  const boxH = 58;
  const x = 40;

  // Card background
  pdf.setFillColor(...(paid ? ECO_LIGHT : OFFWHITE));
  pdf.setDrawColor(...(paid ? ECO : BORDER));
  pdf.setLineWidth(0.75);
  pdf.roundedRect(x, startY, boxW, boxH, 6, 6, "FD");

  // Left accent strip
  pdf.setFillColor(...(paid ? ECO : ROYAL));
  pdf.roundedRect(x, startY, 6, boxH, 6, 6, "F");
  pdf.rect(x + 4, startY, 2, boxH, "F");

  // Header row
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("DEPOSIT REQUIRED", x + 20, startY + 18);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Due upon acceptance of this quotation", x + 20, startY + 30);

  // Amount — prominent
  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...(paid ? ECO_DARK : INK));
  pdf.text(money(deposit), x + 20, startY + 50);

  // Status badge (right side)
  const badgeW = paid ? 76 : 96;
  const badgeH = 24;
  const badgeX = x + boxW - badgeW - 16;
  const badgeY = startY + (boxH - badgeH) / 2;

  pdf.setFillColor(...(paid ? ECO : AMBER));
  pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 12, 12, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...WHITE);
  pdf.text(paid ? "DEPOSIT PAID" : "AWAITING PAYMENT", badgeX + badgeW / 2, badgeY + 15, { align: "center" });

  // Small checkmark dot when paid
  if (paid) {
    pdf.setFillColor(...WHITE);
    pdf.circle(badgeX + 14, badgeY + badgeH / 2, 4, "F");
    pdf.setDrawColor(...ECO_DARK);
    pdf.setLineWidth(1);
    pdf.line(badgeX + 12, badgeY + badgeH / 2, badgeX + 13.5, badgeY + badgeH / 2 + 3);
    pdf.line(badgeX + 13.5, badgeY + badgeH / 2 + 3, badgeX + 17, badgeY + badgeH / 2 - 3);
  }

  return startY + boxH + 14;
}

/** Terms & conditions block — left column beside quote totals. */
function drawQuoteTermsBlock(pdf: jsPDF, W: number, startY: number): number {
  const x = 40;
  const maxW = W - 300;
  let y = startY;
  const lineH = 9;
  const bulletH = 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(QUOTE_TERMS.title, x, y);
  y += 12;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...MID);

  const intro = pdf.splitTextToSize(QUOTE_TERMS.intro, maxW);
  pdf.text(intro, x, y);
  y += intro.length * lineH + 4;

  for (const item of QUOTE_TERMS.changeItems) {
    const wrapped = pdf.splitTextToSize(`- ${item}`, maxW - 6);
    pdf.text(wrapped, x + 4, y);
    y += wrapped.length * bulletH;
  }
  y += 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...MID);
  pdf.text(QUOTE_TERMS.paymentIntro, x, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  for (const item of QUOTE_TERMS.paymentItems) {
    const wrapped = pdf.splitTextToSize(`- ${item}`, maxW - 6);
    pdf.text(wrapped, x + 4, y);
    y += wrapped.length * bulletH;
  }
  y += 8;

  pdf.text("Signature _____________________________________", x, y);
  return y + 12;
}

/** Liability note bar at the bottom of quotation PDFs. */
function drawQuoteLiabilityBar(pdf: jsPDF, W: number) {
  const H = pdf.internal.pageSize.getHeight();
  const x = 40;
  const w = W - 80;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  const lines = pdf.splitTextToSize(QUOTE_TERMS.liabilityNote, w - 24);
  const boxH = Math.max(30, lines.length * 9 + 14);
  const boxY = H - 96 - boxH;

  pdf.setFillColor(...OFFWHITE);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.75);
  pdf.roundedRect(x, boxY, w, boxH, 4, 4, "FD");
  pdf.setTextColor(...MID);
  pdf.text(lines, x + 12, boxY + 11);
}

function drawFooter(pdf: jsPDF, W: number, terms: string) {
  const H = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.5);
  pdf.line(40, H - 68, W - 40, H - 68);

  if (terms.trim()) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    const wrapped = pdf.splitTextToSize(terms, W - 80);
    pdf.text(wrapped, 40, H - 54);
  }

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

export async function generatePDF(doc: Doc, items: Item[], extras?: { tasks?: Task[]; parentRef?: string | null }) {
  const logoDataUrl = await getLogoDataUrl();
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  const bodyTop = drawHeader(pdf, doc, W, logoDataUrl);
  const custHeading =
    doc.doc_type === "delivery_note" ? "DELIVER TO" :
    doc.doc_type === "job_card" ? "CUSTOMER" : "BILL TO";
  const custY = drawCustomer(pdf, doc, W, bodyTop, custHeading);
  const metaY = drawMeta(pdf, doc, W, bodyTop);

  // Status stamp for paid/overdue invoices — sits below the customer/meta block
  // and reserves its own height so the items table starts beneath it.
  let contentBottom = Math.max(custY, metaY);
  const stampVariant = getInvoiceStampVariant(doc);
  if (stampVariant) {
    const stampY = contentBottom + 12;
    const stampH = drawPaymentStamp(pdf, W, stampY, stampVariant);
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
    let y: number;

    if (doc.doc_type === "quote") {
      const sectionStart = endY + 24;
      const termsBottom = drawQuoteTermsBlock(pdf, W, sectionStart);
      const totalsBottom = drawTotals(pdf, doc, W, sectionStart);
      y = Math.max(termsBottom, totalsBottom) + 12;
      y = drawQuoteDeposit(pdf, doc, W, y);
      y = drawBankingDetails(pdf, y + 8);

      if (doc.notes) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...MUTED);
        pdf.text("NOTES", 40, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...MID);
        const wrapped = pdf.splitTextToSize(doc.notes, W - 80);
        pdf.text(wrapped, 40, y + 14);
      }

      drawQuoteLiabilityBar(pdf, W);
      drawFooter(pdf, W, "");
    } else {
      const totalsEnd = drawTotals(pdf, doc, W, endY + 24);
      y = totalsEnd + 12;
      y = drawBankingDetails(pdf, y + 8);

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

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text("Thank you for your business.", 40, y + 10);
      drawFooter(pdf, W, "Please retain this invoice for your records.");
    }
  }

  pdf.save(`${doc.doc_number}.pdf`);
}

export type StatementInvoice = {
  doc_number: string;
  doc_date: string;
  due_date?: string | null;
  total: number;
  amount_paid?: number;
};

/** Customer statement PDF listing open invoices and total balance due. */
export async function generateStatementPDF(
  customerName: string,
  customerAddress: string | null | undefined,
  invoices: StatementInvoice[],
) {
  const logoDataUrl = await getLogoDataUrl();
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const W = pdf.internal.pageSize.getWidth();
  const today = new Date().toISOString().slice(0, 10);

  const headerDoc: Doc = {
    doc_number: `STMT-${today.replace(/-/g, "")}`,
    doc_type: "statement",
    customer_name: customerName,
    customer_address: customerAddress,
    doc_date: today,
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    total: 0,
  };

  const bodyTop = drawHeader(pdf, headerDoc, W, logoDataUrl);
  drawCustomer(pdf, headerDoc, W, bodyTop, "STATEMENT FOR");

  const totalBalance = invoices.reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0)),
    0,
  );

  const tableStart = bodyTop + 8;
  autoTable(pdf, {
    startY: tableStart,
    head: [["Invoice", "Date", "Due", "Total", "Paid", "Balance"]],
    body: invoices.map((inv) => {
      const paid = Number(inv.amount_paid || 0);
      const balance = Math.max(0, Number(inv.total) - paid);
      return [
        inv.doc_number,
        fmtDate(inv.doc_date),
        inv.due_date ? fmtDate(inv.due_date) : "—",
        money(inv.total),
        money(paid),
        money(balance),
      ];
    }),
    theme: "plain",
    headStyles: TABLE_HEAD,
    bodyStyles: TABLE_BODY,
    alternateRowStyles: TABLE_ALT,
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  const endY = (pdf as any).lastAutoTable.finalY as number;
  const afterBand = drawStatementBalanceBand(pdf, W, endY, totalBalance);

  drawBankingDetails(pdf, afterBand);
  drawFooter(
    pdf,
    W,
    "Please settle outstanding balances using the banking details above. Contact us if any item requires clarification.",
  );

  const safeName = customerName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  pdf.save(`Statement-${safeName}.pdf`);
}
