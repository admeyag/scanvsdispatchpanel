import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchRaw,
  fetchMtd,
  normalizeDate,
  PRIMARY_PLANTS,
  PLANT_WH_NAME,
  PLANT_TO_WH_ID,
  type MtdRow,
  type PlantRow,
} from "@/lib/dashboard-data";
import { WarehouseTable } from "@/components/dashboard/WarehouseTable";
import { RawDataTable } from "@/components/dashboard/RawDataTable";
import { MtdTrendChart } from "@/components/dashboard/MtdTrendChart";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import purplleLogo from "@/assets/purplle-logo.png";
import {
  Boxes,
  CalendarClock,
  CalendarDays,
  LineChart,
  PackageSearch,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FC Packaging Scan vs Dispatch Box code compliance report" },
      {
        name: "description",
        content:
          "FC Packaging — Scan vs Dispatch box code compliance: D-1 detail, MTD analysis and raw shipment data.",
      },
    ],
  }),
  component: Dashboard,
});

// Helper: aggregate MTD sheet rows by plant, scoped to the 13 primary plants
function aggregateMtd(
  rows: MtdRow[],
  whNameToPlant: Record<string, string>,
): PlantRow[] {
  const agg = new Map<
    string,
    { match: number; notMatch: number; nullCount: number; total: number }
  >();
  for (const r of rows) {
    if (!r.warehouse || r.warehouse === "Grand Total") continue;
    const plant = whNameToPlant[r.warehouse];
    if (!plant) continue;
    const cur = agg.get(plant) || { match: 0, notMatch: 0, nullCount: 0, total: 0 };
    cur.match += r.compliance_count;
    cur.notMatch += r.non_compliance_count;
    cur.nullCount += r.null_count;
    cur.total += r.total_shipments;
    agg.set(plant, cur);
  }
  return PRIMARY_PLANTS.map((p) => {
    const v = agg.get(p) || { match: 0, notMatch: 0, nullCount: 0, total: 0 };
    return {
      plant: p,
      wh_id: PLANT_TO_WH_ID[p],
      wh_name: PLANT_WH_NAME[p],
      ...v,
      compliancePct: v.total ? (v.match / v.total) * 100 : 0,
      nonCompliancePct: v.total ? (v.notMatch / v.total) * 100 : 0,
      nullPct: v.total ? (v.nullCount / v.total) * 100 : 0,
    };
  }).sort((a, b) => Number(a.plant.replace(/\D/g, "")) - Number(b.plant.replace(/\D/g, "")));
}

function sumTotals(rows: PlantRow[]) {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      match: acc.match + r.match,
      notMatch: acc.notMatch + r.notMatch,
      nullCount: acc.nullCount + r.nullCount,
    }),
    { total: 0, match: 0, notMatch: 0, nullCount: 0 },
  );
}

function Dashboard() {
  const rawQ = useQuery({ queryKey: ["raw"], queryFn: fetchRaw, staleTime: 60_000 });
  const mtdQ = useQuery({ queryKey: ["mtd"], queryFn: fetchMtd, staleTime: 60_000 });

  const WH_NAME_TO_PLANT = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(PLANT_WH_NAME).forEach(([plant, name]) => (m[name] = plant));
    return m;
  }, []);

  // Latest date available in the MTD sheet — this is D-1
  const mtdDates = useMemo(() => {

    const set = new Set<string>();
    (mtdQ.data || []).forEach((r) => {
      if (r.dispatch_date && r.warehouse !== "Grand Total")
        set.add(normalizeDate(r.dispatch_date));
    });
    return Array.from(set).sort();
  }, [mtdQ.data]);

  const minDate = mtdDates[0] || "";
  const maxDate = mtdDates[mtdDates.length - 1] || "";

  const [mtdFrom, setMtdFrom] = useState<string>("");
  const [mtdTo, setMtdTo] = useState<string>("");

  // Default to full range once data loads
  const fromIso = mtdFrom || minDate;
  const toIso = mtdTo || maxDate;

  const mtdRowsInRange = useMemo(() => {
    return (mtdQ.data || []).filter((r) => {
      if (!r.dispatch_date || r.warehouse === "Grand Total") return false;
      const d = normalizeDate(r.dispatch_date);
      if (fromIso && d < fromIso) return false;
      if (toIso && d > toIso) return false;
      return true;
    });
  }, [mtdQ.data, fromIso, toIso]);

  const mtdPlant: PlantRow[] = useMemo(
    () => aggregateMtd(mtdRowsInRange, WH_NAME_TO_PLANT),
    [mtdRowsInRange, WH_NAME_TO_PLANT],
  );
  const mtdTotals = useMemo(() => sumTotals(mtdPlant), [mtdPlant]);

  // D-1 = latest available date in MTD sheet (same source = same numbers)
  const latestDate = maxDate;
  const d1MtdRows = useMemo(
    () =>
      (mtdQ.data || []).filter(
        (r) => r.warehouse !== "Grand Total" && normalizeDate(r.dispatch_date) === latestDate,
      ),
    [mtdQ.data, latestDate],
  );
  const d1Plant: PlantRow[] = useMemo(
    () => aggregateMtd(d1MtdRows, WH_NAME_TO_PLANT),
    [d1MtdRows, WH_NAME_TO_PLANT],
  );
  const d1Totals = useMemo(() => sumTotals(d1Plant), [d1Plant]);

  // Raw shipments for the D-1 date (for the raw table at bottom)
  const d1RawRows = useMemo(
    () => (rawQ.data || []).filter((r) => normalizeDate(r.dispatch_date) === latestDate),
    [rawQ.data, latestDate],
  );

  const mtdTrendRows: MtdRow[] = mtdRowsInRange;



  const loading = rawQ.isLoading || mtdQ.isLoading;
  const refetch = () => {
    rawQ.refetch();
    mtdQ.refetch();
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <header className="sticky top-2 z-30 rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white px-2 shadow-[var(--shadow-glow)] ring-1 ring-[var(--primary-soft)]">
                <img src={purplleLogo} alt="Purplle" className="h-7 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
                  FC Packaging · Scan vs Dispatch Box Code Compliance Report
                </h1>
                <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                  Warehouse-level compliance analytics · live from Sheets
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="h-9 shrink-0 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </header>

        <Tabs defaultValue="reports" className="space-y-5">
          <TabsList className="h-11 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]">
            <TabsTrigger value="reports" className="gap-2 rounded-lg px-4 text-sm">
              <TrendingUp className="h-4 w-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-2 rounded-lg px-4 text-sm">
              <Boxes className="h-4 w-4" /> Raw Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* D-1 on top */}
            <section className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    D-1 Report
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1 border-primary/30 bg-[var(--primary-soft)] text-primary"
                >
                  <CalendarDays className="h-3 w-3" />
                  {latestDate || "—"}
                </Badge>
              </div>
              <WarehouseTable
                rows={d1Plant}
                totals={d1Totals}
                title="D-1 · Scanned vs Dispatched Box (B2C Shipments)"
                subtitle={`Dispatch date: ${latestDate || "—"} · source: MTD sheet`}
                exportFilename={`d1-compliance-${latestDate || "report"}.xls`}
              />
            </section>

            {/* MTD below */}
            <section className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--success-soft)] text-success">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    MTD Report
                  </h2>
                </div>
                <DateRangePicker
                  fromIso={fromIso}
                  toIso={toIso}
                  minIso={minDate}
                  maxIso={maxDate}
                  onChange={(f, t) => {
                    setMtdFrom(f);
                    setMtdTo(t);
                  }}
                />
              </div>
              <WarehouseTable
                rows={mtdPlant}
                totals={mtdTotals}
                title="MTD · Scanned vs Dispatched Box (B2C Shipments)"
                subtitle={`Range: ${fromIso || "—"} → ${toIso || "—"}`}
                exportFilename={`mtd-compliance-${fromIso}_to_${toIso}.xls`}
              />
            </section>

            {/* MTD trend */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--success-soft)] text-success">
                  <LineChart className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">Daily Compliance Trend</h3>
                  <p className="text-xs text-muted-foreground">
                    Aggregated across all warehouses · filtered by selected date range
                  </p>
                </div>
              </div>
              <MtdTrendChart rows={mtdTrendRows} />
            </section>
          </TabsContent>

          <TabsContent value="raw" className="space-y-3">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                D-1 Raw Data
              </h2>
              <Badge variant="outline" className="text-xs">
                {latestDate}
              </Badge>
            </div>
            <RawDataTable rows={d1RawRows} />
          </TabsContent>
        </Tabs>

        {loading && (
          <p className="text-center text-sm text-muted-foreground">Loading data…</p>
        )}
      </div>
    </div>
  );
}
