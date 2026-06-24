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
import { WhNonCompChart } from "@/components/dashboard/WhNonCompChart";
import { Preloader } from "@/components/dashboard/Preloader";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ReusableDashboard } from "@/components/dashboard/ReusableDashboard";
import purplleLogo from "@/assets/purplle-logo.png";
import {
  Boxes,
  CalendarClock,
  CalendarDays,
  PackageSearch,
  Recycle,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Purplle FC Packaging Compliance" },
      { name: "description", content: "Purplle FC Packaging — Scan vs Dispatch and Reusable Box compliance dashboards." },
    ],
  }),
  component: DashboardShell,
});

type Module = "scan" | "reusable";

function DashboardShell() {
  const [module, setModule] = useState<Module>("scan");

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1600px] gap-4 px-3 py-4 md:px-6 md:py-6">
        {/* Sidebar */}
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card/85 p-3 shadow-[var(--shadow-card)] backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-[var(--shadow-glow)] ring-1 ring-[var(--primary-soft)]">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white">
              <img src={purplleLogo} alt="Purplle" className="h-6 w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-tight">Purplle FC</p>
              <p className="truncate text-[10px] text-muted-foreground">Packaging Ops</p>
            </div>
          </div>

          <div className="mt-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Modules
          </div>

          <NavBtn
            active={module === "scan"}
            onClick={() => setModule("scan")}
            icon={<PackageSearch className="h-4 w-4" />}
            label="Scan vs Dispatch"
            sub="Box code compliance"
          />
          <NavBtn
            active={module === "reusable"}
            onClick={() => setModule("reusable")}
            icon={<Recycle className="h-4 w-4" />}
            label="Reusable Box"
            sub="Re-use & cost saving"
          />

          <div className="mt-auto rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data source</p>
            <p className="mt-1 text-[11px] text-foreground/80">Live · Google Sheets</p>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* Mobile module switch */}
          <div className="flex gap-2 md:hidden">
            <button
              onClick={() => setModule("scan")}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${module === "scan" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              Scan vs Dispatch
            </button>
            <button
              onClick={() => setModule("reusable")}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${module === "reusable" ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card"}`}
            >
              Reusable Box
            </button>
          </div>

          {module === "scan" ? <ScanDispatchModule /> : <ReusableDashboard />}
        </main>
      </div>
    </div>
  );
}

function NavBtn({
  active, onClick, icon, label, sub,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
        active
          ? "border-primary/40 bg-gradient-to-r from-[var(--primary-soft)] to-transparent shadow-sm"
          : "border-transparent hover:border-border hover:bg-accent/50"
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:text-foreground"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
        <span className="block text-[10px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

// ===== Scan vs Dispatch (existing module, extracted) =====
function aggregateMtd(rows: MtdRow[], whNameToPlant: Record<string, string>): PlantRow[] {
  const agg = new Map<string, { match: number; notMatch: number; nullCount: number; total: number }>();
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

function ScanDispatchModule() {
  const rawQ = useQuery({ queryKey: ["raw"], queryFn: fetchRaw, staleTime: 60_000 });
  const mtdQ = useQuery({ queryKey: ["mtd"], queryFn: fetchMtd, staleTime: 60_000 });

  const WH_NAME_TO_PLANT = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(PLANT_WH_NAME).forEach(([plant, name]) => (m[name] = plant));
    return m;
  }, []);

  const mtdDates = useMemo(() => {
    const set = new Set<string>();
    (mtdQ.data || []).forEach((r) => {
      if (r.dispatch_date && r.warehouse !== "Grand Total") set.add(normalizeDate(r.dispatch_date));
    });
    return Array.from(set).sort();
  }, [mtdQ.data]);

  const minDate = mtdDates[0] || "";
  const maxDate = mtdDates[mtdDates.length - 1] || "";
  const [mtdFrom, setMtdFrom] = useState<string>("");
  const [mtdTo, setMtdTo] = useState<string>("");
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

  const mtdPlant = useMemo(() => aggregateMtd(mtdRowsInRange, WH_NAME_TO_PLANT), [mtdRowsInRange, WH_NAME_TO_PLANT]);
  const mtdTotals = useMemo(() => sumTotals(mtdPlant), [mtdPlant]);

  const latestDate = maxDate;
  const d1MtdRows = useMemo(
    () => (mtdQ.data || []).filter((r) => r.warehouse !== "Grand Total" && normalizeDate(r.dispatch_date) === latestDate),
    [mtdQ.data, latestDate],
  );
  const d1Plant = useMemo(() => aggregateMtd(d1MtdRows, WH_NAME_TO_PLANT), [d1MtdRows, WH_NAME_TO_PLANT]);
  const d1Totals = useMemo(() => sumTotals(d1Plant), [d1Plant]);

  const allRawRows = rawQ.data || [];

  const loading = rawQ.isLoading || mtdQ.isLoading;
  const refetch = () => { rawQ.refetch(); mtdQ.refetch(); };

  return (
    <div className="space-y-5">
      {loading && !rawQ.data && !mtdQ.data && <Preloader maxMs={1200} />}

      {/* Module header */}
      <header className="rounded-2xl border border-[var(--primary-soft)] bg-gradient-to-r from-[var(--primary-soft)] via-fuchsia-50 to-pink-50 px-5 py-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white shadow-lg">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight md:text-xl">FC Packaging · Scan vs Dispatch Box Code Compliance</h1>
              <p className="text-xs text-muted-foreground md:text-sm">Warehouse-level box code compliance · live from Sheets</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="h-9 shrink-0 gap-1.5">
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
          <section className="space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--primary-soft)] text-primary">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-muted-foreground">D-1 Report</h2>
              </div>
              <Badge variant="outline" className="shrink-0 gap-1 border-primary/30 bg-[var(--primary-soft)] text-primary">
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

          <section className="space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--success-soft)] text-success">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-muted-foreground">MTD Report</h2>
              </div>
              <DateRangePicker
                fromIso={fromIso} toIso={toIso} minIso={minDate} maxIso={maxDate}
                onChange={(f, t) => { setMtdFrom(f); setMtdTo(t); }}
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

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--danger-soft)] text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Warehouse Non-Compliance % · Daily Trend</h3>
                  <p className="text-xs text-muted-foreground">
                    Daily non-compliance % per warehouse ({fromIso || "—"} → {toIso || "—"}) · compare across warehouses
                  </p>
                </div>
              </div>
              <DateRangePicker
                fromIso={fromIso} toIso={toIso} minIso={minDate} maxIso={maxDate}
                onChange={(f, t) => { setMtdFrom(f); setMtdTo(t); }}
              />
            </div>
            <WhNonCompChart mtdRows={mtdRowsInRange} whNameToPlant={WH_NAME_TO_PLANT} />
          </section>
        </TabsContent>

        <TabsContent value="raw" className="space-y-3">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Raw Data · Last 7 Days
            </h2>
          </div>
          <RawDataTable rows={allRawRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
