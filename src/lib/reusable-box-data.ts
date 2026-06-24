import Papa from "papaparse";

export const RB_MTD_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvKzQb4JbYldRSSu_DcFCr0rDLdC4mc7Wd-JmPNBhfpexF2Uk5cZKojcSJmJPOd72pYaJj8unu1Kt1/pub?gid=1712805573&single=true&output=csv";
export const RB_RAW_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvKzQb4JbYldRSSu_DcFCr0rDLdC4mc7Wd-JmPNBhfpexF2Uk5cZKojcSJmJPOd72pYaJj8unu1Kt1/pub?gid=1137744546&single=true&output=csv";

export type RBSummaryRow = {
  plant: string;
  wh_name: string;
  opportunity: number;
  reused: number;
  costSavings: number;
  d1UtilPct: number;
  mtdUtilPct: number;
  mtdCostSaving: number;
};

export type RBDaily = {
  plant: string;
  city: string;
  values: Record<string, number | null>; // iso date -> pct or cost
  total: number;
};

export type RBData = {
  d1Date: string;
  summary: RBSummaryRow[];
  network: {
    opportunity: number;
    reused: number;
    costSavings: number;
    d1UtilPct: number;
    mtdUtilPct: number;
    mtdCostSaving: number;
  };
  dailyCompliance: RBDaily[]; // per-warehouse daily utilization %
  dailyCostSaving: RBDaily[];
  dateColumns: string[]; // ISO yyyy-mm-dd, sorted
};

export type RBRawRow = {
  warehouse_id: string;
  shipment_id: string;
  dispatch_date: string; // m/d/yyyy from sheet
  carrier_id: string;
  order_status: string;
  tenant: string;
  sub_tenant: string;
  shipment_status: string;
  no_of_units: string;
  sellers_count: string;
  scanned_box: string;
  dispatched_box: string;
  is_retailer: string;
  suggested_box: string;
  box_code: string;
  sap_material: string;
  cost: string;
  wh_name: string;
  delivery_type: string;
  plant_code: string;
  storage_location: string;
  cost_centre: string;
  reuse_status: "Re-Used" | "Not Re-Used" | "No Suggestion";
};

const NUM = (s: string) => {
  if (!s) return 0;
  const n = Number(String(s).replace(/[",\s]/g, "").replace("%", ""));
  return isNaN(n) ? 0 : n;
};

// Parse "1-Jun-2026" -> "2026-06-01"
const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};
function dateLabelToIso(s: string): string {
  if (!s) return "";
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${MONTHS[m[2]] || "01"}-${m[1].padStart(2, "0")}`;
}
// Parse "23/06/2026" or similar
export function parseTitleDate(s: string): string {
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

export async function fetchReusableMtd(): Promise<RBData> {
  const res = await fetch(RB_MTD_URL, { cache: "no-store" });
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false });
  const rows = parsed.data;

  // Title at row 0 cell 1: "...as on 23/06/2026"
  const titleCell = rows[0]?.[1] || "";
  const d1Date = parseTitleDate(titleCell);

  // D-1 summary: rows 2..14 (after headers at row 1)
  // Cols: 1=Site code, 2=WH Name, 3=Opportunity, 4=Re-Used, 5=Cost Savings, 6=Util%
  // MTD util block: 8=Site, 10=Util%
  // MTD cost block: 13=Site, 15=Cost saving
  const summary: RBSummaryRow[] = [];
  const utilByWh = new Map<string, number>();
  const costByWh = new Map<string, number>();
  for (let i = 2; i <= 14; i++) {
    const r = rows[i] || [];
    const site = (r[8] || "").trim();
    if (site) utilByWh.set(site, NUM(r[10]));
    const site2 = (r[13] || "").trim();
    if (site2) costByWh.set(site2, NUM(r[15]));
  }
  for (let i = 2; i <= 14; i++) {
    const r = rows[i] || [];
    const plant = (r[1] || "").trim();
    const wh = (r[2] || "").trim();
    if (!plant) continue;
    summary.push({
      plant,
      wh_name: wh,
      opportunity: NUM(r[3]),
      reused: NUM(r[4]),
      costSavings: NUM(r[5]),
      d1UtilPct: NUM(r[6]),
      mtdUtilPct: utilByWh.get(wh) ?? 0,
      mtdCostSaving: costByWh.get(wh) ?? 0,
    });
  }
  // Network row (~15)
  const net = rows[15] || [];
  const network = {
    opportunity: NUM(net[3]),
    reused: NUM(net[4]),
    costSavings: NUM(net[5]),
    d1UtilPct: NUM(net[6]),
    mtdUtilPct: NUM((rows.find((rr) => (rr[8] || "").trim().toLowerCase() === "network") || [])[10]),
    mtdCostSaving: NUM((rows.find((rr) => (rr[13] || "").trim().toLowerCase().startsWith("network")) || [])[15]),
  };

  // Find daily compliance header row: contains "Plant Code" and many date cells
  let compHeaderIdx = -1;
  let costHeaderIdx = -1;
  for (let i = 16; i < rows.length; i++) {
    const r = rows[i] || [];
    if ((r[1] || "").trim() === "Plant Code") {
      if (compHeaderIdx === -1) compHeaderIdx = i;
      else if (costHeaderIdx === -1) {
        costHeaderIdx = i;
        break;
      }
    }
  }

  const parseBlock = (headerIdx: number): { rows: RBDaily[]; dates: string[] } => {
    if (headerIdx < 0) return { rows: [], dates: [] };
    const header = rows[headerIdx] || [];
    const dateCols: { idx: number; iso: string }[] = [];
    for (let c = 3; c < header.length - 1; c++) {
      const iso = dateLabelToIso((header[c] || "").trim());
      if (iso) dateCols.push({ idx: c, iso });
    }
    const totalCol = header.length - 1; // "Grand Total"
    const out: RBDaily[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const plant = (r[1] || "").trim();
      if (!plant || plant === "Plant Code") break;
      if (!/^W\d+/.test(plant)) {
        // stop at non-warehouse row (blank or another title)
        if (plant === "") break;
        continue;
      }
      const values: Record<string, number | null> = {};
      for (const dc of dateCols) {
        const cell = (r[dc.idx] || "").trim();
        values[dc.iso] = cell === "" ? null : NUM(cell);
      }
      out.push({
        plant,
        city: (r[2] || "").trim(),
        values,
        total: NUM(r[totalCol]),
      });
    }
    return { rows: out, dates: dateCols.map((d) => d.iso) };
  };

  const comp = parseBlock(compHeaderIdx);
  const cost = parseBlock(costHeaderIdx);

  return {
    d1Date,
    summary,
    network,
    dailyCompliance: comp.rows,
    dailyCostSaving: cost.rows,
    dateColumns: comp.dates,
  };
}

export async function fetchReusableRaw(): Promise<RBRawRow[]> {
  const res = await fetch(RB_RAW_URL, { cache: "no-store" });
  const text = await res.text();
  const parsed = Papa.parse<RBRawRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return (parsed.data || []).map((r) => {
    const scanned = (r.scanned_box || "").trim();
    const suggested = (r.suggested_box || "").trim();
    let reuse_status: RBRawRow["reuse_status"];
    if (!suggested) reuse_status = "No Suggestion";
    else if (scanned && scanned === suggested) reuse_status = "Re-Used";
    else reuse_status = "Not Re-Used";
    return { ...r, reuse_status };
  });
}

export function rawDateToIso(s: string): string {
  if (!s) return "";
  const parts = s.split("/");
  if (parts.length !== 3) return s;
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m) - 1] || m;
  return `${Number(d)} ${monthShort}`;
}
