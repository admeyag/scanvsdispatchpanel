import Papa from "papaparse";

export const RAW_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3Di3822hWX-lKMxOMx7e1MJkXk5hwtOa-WPf5l_ISmy8mQEfi5xjrVUJFXQP291G8y7l132Ng7-P7/pub?gid=635291887&single=true&output=csv";
export const MTD_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3Di3822hWX-lKMxOMx7e1MJkXk5hwtOa-WPf5l_ISmy8mQEfi5xjrVUJFXQP291G8y7l132Ng7-P7/pub?gid=423615848&single=true&output=csv";

// warehouse_id -> plant_code (from user spec)
export const PLANT_MAP: Record<string, string> = {
  "2": "W501",
  "4": "W502",
  "12": "W503",
  "10": "W504",
  "16": "W505",
  "21": "W506",
  "25": "W507",
  "28": "W508",
  "29": "W509",
  "40": "W510",
  "42": "W513",
  "45": "W512",
  "47": "W516",
};

export const PRIMARY_PLANTS = Object.values(PLANT_MAP);

export type RawRow = {
  shipment_id: string;
  dispatch_date: string;
  shipment_status: string;
  scanned_box: string;
  sap_material: string;
  dispatched_box: string;
  suggested_box: string;
  warehouse_id: string;
  warehouse: string;
  wh_name: string;
  plant_code: string;
  no_of_units: string;
  compliance_status: string;
  Status: string;
};

export type MtdRow = {
  dispatch_date: string;
  warehouse: string;
  total_shipments: number;
  compliance_count: number;
  non_compliance_count: number;
  null_count: number;
  compliance_pct: number;
  non_compliance_pct: number;
  null_pct: number;
};

async function fetchCsv<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const parsed = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  return parsed.data;
}

// Reverse map: plant_code -> warehouse_id
export const PLANT_TO_WH_ID: Record<string, string> = Object.entries(PLANT_MAP).reduce(
  (acc, [id, pc]) => ({ ...acc, [pc]: id }),
  {},
);

// plant_code -> warehouse name (from MTD warehouse codes)
export const PLANT_WH_NAME: Record<string, string> = {
  W501: "MUM",
  W502: "GGN",
  W503: "CCU",
  W504: "BLR",
  W505: "GAU",
  W506: "LKO",
  W507: "MAA",
  W508: "HYD",
  W509: "COK",
  W510: "VGA",
  W512: "PAT",
  W513: "CJB",
  W516: "BBI",
};

export async function fetchRaw(): Promise<RawRow[]> {
  const rows = await fetchCsv<RawRow>(RAW_URL);
  return rows
    .filter((r) => PLANT_MAP[String(r.warehouse_id)] !== undefined)
    .map((r) => {
      const plant = PLANT_MAP[String(r.warehouse_id)];
      return {
        ...r,
        plant_code: plant,
        wh_name: PLANT_WH_NAME[plant] || r.warehouse || "",
        Status: r.Status || normalizeStatus(r.compliance_status),
      };
    });
}

function normalizeStatus(s: string): string {
  const t = (s || "").trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("comp")) return "Matched";
  if (t.startsWith("non")) return "Not Matched";
  return s;
}

export async function fetchMtd(): Promise<MtdRow[]> {
  const rows = await fetchCsv<Record<string, string>>(MTD_URL);
  return rows.map((r) => ({
    dispatch_date: r.dispatch_date || "",
    warehouse: r.warehouse || "",
    total_shipments: Number(r.total_shipments) || 0,
    compliance_count: Number(r.compliance_count) || 0,
    non_compliance_count: Number(r.non_compliance_count) || 0,
    null_count: Number(r.null_count) || 0,
    compliance_pct: Number(r.compliance_pct) || 0,
    non_compliance_pct: Number(r.non_compliance_pct) || 0,
    null_pct: Number(r.null_pct) || 0,
  }));
}

// Parse M/D/YYYY into YYYY-MM-DD
export function normalizeDate(s: string): string {
  if (!s) return "";
  const parts = s.split("/");
  if (parts.length !== 3) return s;
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function getLatestDate(rows: RawRow[]): string {
  const dates = new Set<string>();
  rows.forEach((r) => r.dispatch_date && dates.add(normalizeDate(r.dispatch_date)));
  return Array.from(dates).sort().pop() || "";
}

export type Compliance = {
  total: number;
  match: number;
  notMatch: number;
  nullCount: number;
  compliancePct: number;
  nonCompliancePct: number;
  nullPct: number;
};

export function computeCompliance(rows: RawRow[]): Compliance {
  let total = rows.length;
  let match = 0;
  let notMatch = 0;
  let nullCount = 0;
  for (const r of rows) {
    const cs = (r.compliance_status || "").trim().toLowerCase();
    if (cs) {
      if (cs.startsWith("comp")) match++;
      else if (cs.startsWith("non")) notMatch++;
      else nullCount++;
      continue;
    }
    const scanned = (r.scanned_box || "").trim();
    const dispatched = (r.dispatched_box || "").trim();
    if (!scanned || !dispatched) nullCount++;
    else if (scanned === dispatched) match++;
    else notMatch++;
  }
  return {
    total,
    match,
    notMatch,
    nullCount,
    compliancePct: total ? (match / total) * 100 : 0,
    nonCompliancePct: total ? (notMatch / total) * 100 : 0,
    nullPct: total ? (nullCount / total) * 100 : 0,
  };
}

export function getAvailableDates(rows: RawRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => r.dispatch_date && set.add(normalizeDate(r.dispatch_date)));
  return Array.from(set).sort().reverse();
}

export type PlantRow = Compliance & { plant: string; wh_id: string; wh_name: string };

export function byPlant(rows: RawRow[]): PlantRow[] {
  const map = new Map<string, RawRow[]>();
  for (const r of rows) {
    const key = r.plant_code || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .map(([plant, rs]) => ({
      plant,
      wh_id: PLANT_TO_WH_ID[plant] || "",
      wh_name: PLANT_WH_NAME[plant] || rs[0]?.wh_name || "",
      ...computeCompliance(rs),
    }))
    .sort((a, b) => Number(a.plant.replace(/\D/g, "")) - Number(b.plant.replace(/\D/g, "")));
}

