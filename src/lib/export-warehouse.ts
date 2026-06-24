import type { PlantRow } from "@/lib/dashboard-data";

type Totals = { total: number; match: number; notMatch: number; nullCount: number };

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const pctCell = (v: number, kind: "neutral" | "nonComp") => {
  const bad = kind === "nonComp" && v >= 0.5;
  const good = kind === "nonComp" && v < 0.5;
  const bg = bad ? "#fde7e9" : good ? "#e6f7ee" : "#f3f4f8";
  const color = bad ? "#b42318" : good ? "#067647" : "#475467";
  return `<td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;"><span style="display:inline-block;min-width:60px;padding:3px 8px;border-radius:6px;background:${bg};color:${color};font-weight:700;font-size:12px;">${v.toFixed(2)}%</span></td>`;
};

export function exportWarehouseReport(opts: {
  rows: PlantRow[];
  totals: Totals;
  title: string;
  subtitle?: string;
  filename: string;
}) {
  const { rows, totals, title, subtitle, filename } = opts;
  const compPct = totals.total ? (totals.match / totals.total) * 100 : 0;
  const nonPct = totals.total ? (totals.notMatch / totals.total) * 100 : 0;
  const nullPct = totals.total ? (totals.nullCount / totals.total) * 100 : 0;

  const stat = (label: string, value: string, color: string, bg: string) => `
    <td style="padding:14px 18px;border-right:1px solid #eef0f4;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;">${esc(label)}</div>
      <div style="font-size:20px;font-weight:800;color:${color};margin-top:4px;">${esc(value)}</div>
    </td>`;

  const rowsHtml = rows
    .map(
      (r, i) => `
    <tr style="background:${i % 2 ? "#fafbff" : "#ffffff"};">
      <td style="padding:8px 12px;border-bottom:1px solid #eef0f4;color:#374151;font-family:Consolas,monospace;font-size:12px;">${esc(r.plant)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eef0f4;color:#4f46e5;font-weight:700;">${esc(r.wh_name)}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;">${r.match.toLocaleString()}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;">${r.notMatch.toLocaleString()}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;color:#6b7280;">${r.nullCount.toLocaleString()}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;font-weight:600;">${r.total.toLocaleString()}</td>
      ${pctCell(r.compliancePct, "neutral")}
      ${pctCell(r.nonCompliancePct, "nonComp")}
      ${pctCell(r.nullPct, "neutral")}
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #eef0f4;color:#6b7280;font-size:12px;">100.00%</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;font-family:'Segoe UI',Arial,sans-serif;background:#f6f7fb;padding:24px;color:#1f2937;">
<div style="max-width:1180px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 32px -16px rgba(60,40,140,.18);">
  <div style="background:linear-gradient(120deg,#5b48e0 0%,#5d7bf5 55%,#4ea8d9 100%);color:#fff;padding:18px 22px;">
    <div style="font-size:15px;font-weight:700;letter-spacing:.2px;">${esc(title)}</div>
    ${subtitle ? `<div style="font-size:12px;opacity:.92;margin-top:4px;">${esc(subtitle)}</div>` : ""}
  </div>
  <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #eef0f4;background:linear-gradient(180deg,#f7f8fc,#fff);">
    <tr>
      ${stat("Total Boxes", totals.total.toLocaleString(), "#4f46e5", "#eef0ff")}
      ${stat("Matched", totals.match.toLocaleString(), "#067647", "#e6f7ee")}
      ${stat("Not Matched", totals.notMatch.toLocaleString(), "#b42318", "#fde7e9")}
      ${stat("Compliance %", compPct.toFixed(2) + "%", "#0e7490", "#e0f2f4")}
      ${stat("Non-Compliance %", nonPct.toFixed(2) + "%", nonPct >= 0.5 ? "#b42318" : "#067647", "#fde7e9")}
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#f3f4f8;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.08em;">
        <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Plant Code</th>
        <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;">WH Code</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Match</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Not Match</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Null</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Grand Total</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Compliance %</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Non-Compliance %</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">FC Non-Ctrl %</th>
        <th style="text-align:right;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Total %</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr style="background:#eef0f6;font-weight:700;">
        <td colspan="2" style="padding:10px 12px;">Grand Total</td>
        <td style="text-align:right;padding:10px 12px;">${totals.match.toLocaleString()}</td>
        <td style="text-align:right;padding:10px 12px;">${totals.notMatch.toLocaleString()}</td>
        <td style="text-align:right;padding:10px 12px;">${totals.nullCount.toLocaleString()}</td>
        <td style="text-align:right;padding:10px 12px;">${totals.total.toLocaleString()}</td>
        ${pctCell(compPct, "neutral")}
        ${pctCell(nonPct, "nonComp")}
        ${pctCell(nullPct, "neutral")}
        <td style="text-align:right;padding:10px 12px;">100.00%</td>
      </tr>
    </tfoot>
  </table>
  <div style="padding:12px 18px;font-size:11px;color:#6b7280;background:#fafbff;border-top:1px solid #eef0f4;">
    Generated ${new Date().toLocaleString()} · FC Packaging Compliance
  </div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
