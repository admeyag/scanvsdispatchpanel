import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchReusableMtd,
  fetchReusableRaw,
  fmtDateShort,
  type RBData,
  type RBDaily,
} from "@/lib/reusable-box-data";
import { ReusableRawTable } from "./ReusableRawTable";
import { Preloader } from "./Preloader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Boxes,
  CalendarDays,
  CalendarClock,
  IndianRupee,
  Recycle,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PALETTE = [
  "#7c3aed", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899",
  "#3b82f6", "#14b8a6", "#84cc16", "#f97316", "#a855f7", "#0ea5e9", "#dc2626",
];

function pctTone(pct: number): { bg: string; text: string; border: string } {
  if (pct >= 90) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  if (pct >= 75) return { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" };
  if (pct >= 50) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "violet",
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  sub?: string;
  tone?: "violet" | "emerald" | "amber" | "teal" | "rose";
}) {
  const tones: Record<string, string> = {
    violet: "from-violet-500/10 to-fuchsia-500/10 text-violet-700 ring-violet-200/60",
    emerald: "from-emerald-500/10 to-teal-500/10 text-emerald-700 ring-emerald-200/60",
    amber: "from-amber-500/10 to-orange-500/10 text-amber-700 ring-amber-200/60",
    teal: "from-cyan-500/10 to-sky-500/10 text-cyan-700 ring-cyan-200/60",
    rose: "from-rose-500/10 to-pink-500/10 text-rose-700 ring-rose-200/60",
  };
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${tones[tone]} bg-card p-4 shadow-[var(--shadow-card)] ring-1`}>
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        {sub && <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{sub}</span>}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-bold leading-tight tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function SummaryTable({ data }: { data: RBData }) {
  const totalOpp = data.network.opportunity;
  const totalReused = data.network.reused;
  const totalCost = data.network.costSavings;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 text-white" style={{ background: "var(--header-gradient)" }}>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <Recycle className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold">Network · Daily Re-Used Box Consumption · D-1 vs MTD</h3>
        </div>
        <p className="mt-1 pl-9 text-[11px] opacity-90">
          D-1 dispatch date: {data.d1Date || "—"} · MTD utilization & cost savings month-to-date
        </p>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-secondary text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-semibold">Plant</th>
              <th className="px-3 py-2.5 text-left font-semibold">WH Name</th>
              <th className="px-3 py-2.5 text-right font-semibold">Opportunity</th>
              <th className="px-3 py-2.5 text-right font-semibold">Re-Used</th>
              <th className="px-3 py-2.5 text-right font-semibold">Cost Saving (₹)</th>
              <th className="px-3 py-2.5 text-right font-semibold">D-1 Utilization %</th>
              <th className="px-3 py-2.5 text-right font-semibold">MTD Utilization %</th>
              <th className="px-3 py-2.5 text-right font-semibold">MTD Cost Saving (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.summary.map((r, i) => {
              const d1 = pctTone(r.d1UtilPct);
              const mtd = pctTone(r.mtdUtilPct);
              return (
                <tr key={r.plant} className={`border-b border-border/40 hover:bg-accent/40 ${i % 2 ? "bg-secondary/15" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs">{r.plant}</td>
                  <td className="px-3 py-2 font-semibold text-primary">{r.wh_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.opportunity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.reused.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{r.costSavings.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-block min-w-[64px] rounded-md border px-2 py-0.5 text-center text-xs font-semibold ${d1.bg} ${d1.text} ${d1.border}`}>
                      {r.d1UtilPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`inline-block min-w-[64px] rounded-md border px-2 py-0.5 text-center text-xs font-semibold ${mtd.bg} ${mtd.text} ${mtd.border}`}>
                      {r.mtdUtilPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">₹{r.mtdCostSaving.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/70 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>Network</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{totalOpp.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{totalReused.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">₹{totalCost.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-block min-w-[64px] rounded-md bg-primary/10 px-2 py-0.5 text-center text-xs font-bold text-primary">
                  {data.network.d1UtilPct.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-block min-w-[64px] rounded-md bg-primary/10 px-2 py-0.5 text-center text-xs font-bold text-primary">
                  {data.network.mtdUtilPct.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">₹{data.network.mtdCostSaving.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DailyHeatmap({
  title,
  subtitle,
  rows,
  dates,
  unit,
  totalLabel,
}: {
  title: string;
  subtitle: string;
  rows: RBDaily[];
  dates: string[];
  unit: "pct" | "rupee";
  totalLabel: string;
}) {
  // Max for cost saving scaling
  const maxVal = useMemo(() => {
    let m = 0;
    rows.forEach((r) => Object.values(r.values).forEach((v) => { if (v != null && v > m) m = v; }));
    return m || 1;
  }, [rows]);

  const cell = (v: number | null) => {
    if (v == null) return <span className="text-[10px] text-muted-foreground/50">—</span>;
    if (unit === "pct") {
      const tone = pctTone(v);
      return (
        <span className={`inline-block min-w-[44px] rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${tone.bg} ${tone.text}`}>
          {v.toFixed(0)}
        </span>
      );
    }
    // rupee shade
    const intensity = Math.min(1, v / maxVal);
    return (
      <span
        className="inline-block min-w-[48px] rounded px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums"
        style={{
          background: `oklch(0.97 ${0.02 + intensity * 0.08} 320 / ${0.4 + intensity * 0.6})`,
          color: intensity > 0.5 ? "oklch(0.3 0.2 320)" : "oklch(0.45 0.15 320)",
        }}
      >
        {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
      </span>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border bg-secondary/40 px-5 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-card text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-20 bg-card px-3 py-2 text-left font-semibold">Plant</th>
              <th className="sticky left-[68px] z-20 bg-card px-3 py-2 text-left font-semibold">City</th>
              {dates.map((d) => (
                <th key={d} className="px-1.5 py-2 text-center font-semibold whitespace-nowrap">{fmtDateShort(d)}</th>
              ))}
              <th className="bg-primary/5 px-3 py-2 text-right font-semibold text-primary">{totalLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.plant} className={`border-b border-border/40 ${i % 2 ? "bg-secondary/15" : ""}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 font-mono text-xs">{r.plant}</td>
                <td className="sticky left-[68px] z-10 bg-inherit px-3 py-1.5 text-xs text-muted-foreground">{r.city}</td>
                {dates.map((d) => (
                  <td key={d} className="px-1 py-1 text-center">{cell(r.values[d] ?? null)}</td>
                ))}
                <td className="bg-primary/5 px-3 py-1.5 text-right text-xs font-bold tabular-nums text-primary">
                  {unit === "pct" ? `${r.total.toFixed(2)}%` : `₹${r.total.toLocaleString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UtilTrendChart({ rows, dates }: { rows: RBDaily[]; dates: string[] }) {
  const chartData = useMemo(
    () =>
      dates.map((d) => {
        const o: Record<string, number | string | null> = { date: fmtDateShort(d) };
        rows.forEach((r) => { o[r.plant] = r.values[d] ?? null; });
        return o;
      }),
    [rows, dates],
  );
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 320)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.02 320)", fontSize: 12 }}
            formatter={(v: number, name: string) => [`${v?.toFixed?.(1) ?? v}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rows.map((r, i) => (
            <Line
              key={r.plant}
              type="monotone"
              dataKey={r.plant}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReusableDashboard() {
  const mtdQ = useQuery({ queryKey: ["rb-mtd"], queryFn: fetchReusableMtd, staleTime: 60_000 });
  const rawQ = useQuery({ queryKey: ["rb-raw"], queryFn: fetchReusableRaw, staleTime: 60_000 });

  const data = mtdQ.data;
  const loading = mtdQ.isLoading || rawQ.isLoading;

  const refetch = () => { mtdQ.refetch(); rawQ.refetch(); };

  return (
    <div className="space-y-6">
      {loading && !data && <Preloader maxMs={1200} message="Loading reusable box data…" />}

      {/* Module header */}
      <header className="rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-5 py-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Recycle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">Reusable Box Compliance · Operations Dashboard</h1>
              <p className="text-xs text-muted-foreground md:text-sm">Daily re-used box consumption, utilization % and cost-saving trend</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="h-9 gap-1.5">
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
          {data && (
            <>
              {/* Network KPI strip */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard icon={Target} label="Opportunity (D-1)" value={data.network.opportunity.toLocaleString()} sub="D-1" tone="violet" />
                <StatCard icon={Recycle} label="Re-Used (D-1)" value={data.network.reused.toLocaleString()} sub="D-1" tone="emerald" />
                <StatCard icon={TrendingUp} label="D-1 Utilization" value={`${data.network.d1UtilPct.toFixed(2)}%`} sub={data.d1Date} tone="teal" />
                <StatCard icon={TrendingUp} label="MTD Utilization" value={`${data.network.mtdUtilPct.toFixed(2)}%`} sub="MTD" tone="amber" />
                <StatCard icon={IndianRupee} label="MTD Cost Saving" value={`₹${data.network.mtdCostSaving.toLocaleString()}`} sub="MTD" tone="rose" />
              </div>

              {/* D-1 + MTD summary table */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--primary-soft)] text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Warehouse Summary</h2>
                  <Badge variant="outline" className="ml-auto gap-1 border-primary/30 bg-[var(--primary-soft)] text-primary">
                    <CalendarDays className="h-3 w-3" /> {data.d1Date || "—"}
                  </Badge>
                </div>
                <SummaryTable data={data} />
              </section>

              {/* Daily Utilization trend */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="mb-4 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--success-soft)] text-success">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Daily Utilization % · Per Warehouse</h3>
                    <p className="text-xs text-muted-foreground">Re-usable box compliance trend across all warehouses</p>
                  </div>
                </div>
                <UtilTrendChart rows={data.dailyCompliance} dates={data.dateColumns} />
              </section>

              {/* Daily compliance heatmap */}
              <DailyHeatmap
                title="Daily Re-Usable Box Compliance · Utilization %"
                subtitle="Per-warehouse daily utilization. Grand Total = MTD utilization %."
                rows={data.dailyCompliance}
                dates={data.dateColumns}
                unit="pct"
                totalLabel="MTD %"
              />

              {/* Daily cost saving heatmap */}
              <DailyHeatmap
                title="Daily Re-Usable Cost Saving (₹)"
                subtitle="Per-warehouse daily cost saving. Grand Total = MTD cost saving."
                rows={data.dailyCostSaving}
                dates={data.dateColumns}
                unit="rupee"
                totalLabel="MTD ₹"
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="raw" className="space-y-3">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Raw Data · Reusable Box Shipments
            </h2>
          </div>
          <ReusableRawTable rows={rawQ.data || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
