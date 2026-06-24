import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { normalizeDate, PLANT_WH_NAME, PRIMARY_PLANTS, type MtdRow } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#7c3aed", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#22c55e",
  "#06b6d4", "#e11d48", "#64748b",
];

type Props = {
  mtdRows: MtdRow[];
  whNameToPlant: Record<string, string>;
};

export function WhNonCompChart({ mtdRows, whNameToPlant }: Props) {
  const { data, warehouses, avgByWh, colorByWh } = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    const totalsByWh = new Map<string, { nc: number; total: number }>();
    const whSet = new Set<string>();
    for (const r of mtdRows) {
      if (!r.dispatch_date || r.warehouse === "Grand Total") continue;
      if (!whNameToPlant[r.warehouse]) continue;
      const d = normalizeDate(r.dispatch_date);
      const pct = r.total_shipments ? (r.non_compliance_count / r.total_shipments) * 100 : 0;
      const entry = byDate.get(d) || {};
      entry[r.warehouse] = Number(pct.toFixed(2));
      byDate.set(d, entry);
      whSet.add(r.warehouse);
      const t = totalsByWh.get(r.warehouse) || { nc: 0, total: 0 };
      t.nc += r.non_compliance_count;
      t.total += r.total_shipments;
      totalsByWh.set(r.warehouse, t);
    }
    const dates = Array.from(byDate.keys()).sort();
    const rows = dates.map((d) => ({ date: d, ...byDate.get(d) }));
    const whs = PRIMARY_PLANTS.map((p) => PLANT_WH_NAME[p]).filter((n) => whSet.has(n));
    const avg: Record<string, number> = {};
    whs.forEach((w) => {
      const t = totalsByWh.get(w)!;
      avg[w] = t.total ? (t.nc / t.total) * 100 : 0;
    });
    const color: Record<string, string> = {};
    whs.forEach((w, i) => (color[w] = PALETTE[i % PALETTE.length]));
    return { data: rows, warehouses: whs, avgByWh: avg, colorByWh: color };
  }, [mtdRows, whNameToPlant]);

  // Default selection: top 3 worst warehouses
  const defaultSelected = useMemo(
    () =>
      [...warehouses]
        .sort((a, b) => (avgByWh[b] || 0) - (avgByWh[a] || 0))
        .slice(0, 3),
    [warehouses, avgByWh],
  );
  const [selected, setSelected] = useState<string[] | null>(null);
  const active = selected ?? defaultSelected;

  const toggle = (wh: string) => {
    const cur = active.includes(wh) ? active.filter((x) => x !== wh) : [...active, wh];
    setSelected(cur);
  };

  const fmtDate = (s: string) => {
    if (!s || !s.includes("-")) return s;
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };

  return (
    <div className="space-y-3">
      {/* Warehouse pill selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Compare:</span>
        {warehouses.map((wh) => {
          const isOn = active.includes(wh);
          const color = colorByWh[wh];
          return (
            <button
              key={wh}
              onClick={() => toggle(wh)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                isOn
                  ? "border-transparent text-white shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
              style={isOn ? { background: color } : undefined}
              title={`${wh} · avg ${avgByWh[wh].toFixed(2)}%`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: isOn ? "white" : color }}
              />
              {wh}
              <span className={cn("text-[10px] opacity-80")}>
                {avgByWh[wh].toFixed(2)}%
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setSelected(warehouses)}
          className="ml-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          All
        </button>
        <button
          onClick={() => setSelected(defaultSelected)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          Top 3
        </button>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "var(--shadow-card)",
              padding: "8px 10px",
            }}
            itemStyle={{ padding: "2px 0" }}
            formatter={(v: number, name: string) => [`${Number(v).toFixed(2)}%`, name]}
            labelFormatter={(l: string) => `Date: ${fmtDate(l)} (${l})`}
            itemSorter={(item) => -(item.value as number)}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
          {active.map((wh) => (
            <Line
              key={wh}
              type="monotone"
              dataKey={wh}
              name={wh}
              stroke={colorByWh[wh]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colorByWh[wh] }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
