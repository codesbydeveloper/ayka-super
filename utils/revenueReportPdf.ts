import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function fmtInr(n: unknown): string {
  const x = typeof n === "number" ? n : Number(n);
  const v = Number.isFinite(x) ? x : 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
}

function lastTableBottom(doc: jsPDF): number | undefined {
  const d = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return d.lastAutoTable?.finalY;
}


const tablePlain = {
  theme: "plain" as const,
  styles: {
    font: "helvetica",
    fontSize: 9,
    cellPadding: 3,
    textColor: [45, 45, 45] as [number, number, number],
    lineColor: [200, 200, 200] as [number, number, number],
    lineWidth: 0.15,
  },
  headStyles: {
    fillColor: [236, 236, 236] as [number, number, number],
    textColor: [30, 30, 30] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 9,
  },
  bodyStyles: {
    fillColor: [255, 255, 255] as [number, number, number],
  },
  alternateRowStyles: {
    fillColor: [255, 255, 255] as [number, number, number],
  },
};


export function buildAndDownloadRevenueReportPdf(
  raw: Record<string, unknown>,
): void {
  const doc = new jsPDF();
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  const lineTo = pageW - margin;
  let y = margin;

  const period = raw.period as Record<string, unknown> | undefined;
  const from = period?.from != null ? String(period.from) : "—";
  const to = period?.to != null ? String(period.to) : "—";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(35, 35, 35);
  doc.text("Revenue report", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 75, 75);
  doc.text("Ayka Central — billing", margin, y);
  y += 8;

  doc.setTextColor(45, 45, 45);
  doc.setFontSize(10);
  doc.text(`Period covered: ${from} to ${to}.`, margin, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Printed ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, lineTo, y);
  y += 10;

  const summary = raw.summary as Record<string, unknown> | undefined;
  if (summary && typeof summary === "object") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Totals", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines: [string, unknown][] = [
      ["Subscription revenue", summary.total_subscription_revenue],
      ["Transaction revenue", summary.total_transaction_revenue],
      ["Total revenue", summary.total_revenue],
      ["Refunds", summary.total_refunded],
      ["Net revenue", summary.net_revenue],
    ];
    for (const [label, val] of lines) {
      doc.text(`${label}: Rs. ${fmtInr(val)}`, margin, y);
      y += 5.2;
    }
    y += 8;
  }

  const addTable = (sectionTitle: string, head: string[][], body: string[][]) => {
    if (!body.length) return;
    if (y > 258) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(sectionTitle, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    autoTable(doc, {
      startY: y,
      head,
      body,
      ...tablePlain,
      margin: { left: margin, right: margin, top: margin, bottom: margin },
    });
    y = (lastTableBottom(doc) ?? y) + 14;
  };

  const byPlan = Array.isArray(raw.by_plan_category)
    ? raw.by_plan_category
    : [];
  addTable(
    "Breakdown by plan",
    [["Category", "Amount (Rs.)", "Count"]],
    byPlan.map((r) => {
      const o = r as Record<string, unknown>;
      return [
        String(o.category ?? "—"),
        fmtInr(o.revenue),
        String(o.count ?? "—"),
      ];
    }),
  );

  const byCycle = Array.isArray(raw.by_billing_cycle)
    ? raw.by_billing_cycle
    : [];
  addTable(
    "Breakdown by billing cycle",
    [["Cycle", "Amount (Rs.)", "Count"]],
    byCycle.map((r) => {
      const o = r as Record<string, unknown>;
      return [
        String(o.cycle ?? "—"),
        fmtInr(o.revenue),
        String(o.count ?? "—"),
      ];
    }),
  );

  const trend = Array.isArray(raw.monthly_trend) ? raw.monthly_trend : [];
  addTable(
    "Month-wise revenue",
    [["Month", "Amount (Rs.)"]],
    trend.map((r) => {
      const o = r as Record<string, unknown>;
      return [String(o.month ?? "—"), fmtInr(o.revenue)];
    }),
  );

  const clinics = Array.isArray(raw.top_clinics) ? raw.top_clinics : [];
  addTable(
    "Top clinics by revenue",
    [["Clinic", "Amount (Rs.)"]],
    clinics.map((r) => {
      const o = r as Record<string, unknown>;
      const label =
        o.name != null && String(o.name).trim() !== ""
          ? String(o.name)
          : o.clinic_id != null
            ? `Clinic #${o.clinic_id}`
            : "—";
      return [label, fmtInr(o.revenue)];
    }),
  );

  const tx = Array.isArray(raw.transactions) ? raw.transactions : [];
  const txRows = tx.slice(0, 100).map((t) => {
    const o = t as Record<string, unknown>;
    const id =
      o.order_id != null && String(o.order_id).trim() !== ""
        ? String(o.order_id)
        : o.subscription_id != null
          ? `SUB-${String(o.subscription_id)}`
          : "—";
    return [
      id,
      fmtInr(o.amount),
      String(o.date ?? o.created_at ?? "—"),
      String(o.status ?? "—"),
      String(o.clinic_name ?? o.medical_center ?? "—"),
    ];
  });
  addTable(
    "Transaction lines (first 100)",
    [["Ref.", "Amount (Rs.)", "Date", "Status", "Clinic"]],
    txRows,
  );

  const safeFrom = from.replace(/[^\d-]/g, "") || "report";
  const safeTo = to.replace(/[^\d-]/g, "") || "report";
  doc.save(`revenue-${safeFrom}-${safeTo}.pdf`);
}
