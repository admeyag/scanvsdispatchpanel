import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MtdRow } from "@/lib/dashboard-data";

export function MtdTrendChart({ rows }: { rows: MtdRow[] }) {
  const byDate = new Map<string, { total: number; compliance: number; nonCompliance: number }>();
  for (const r of rows) {
    if (!r.dispatch_date || r.warehouse === "Grand Total") continue;
    const cur = byDate.get(r.dispatch_date) || { total: 0, compliance: 0, nonCompliance: 0 };
    cur.total += r.total_shipments;
    cur.compliance += r.compliance_count;
    cur.nonCompliance += r.non_compliance_count;
    byDate.set(r.dispatch_date, cur);
  }
  const data = Array.from(byDate.entries())
    .map(([date, v]) => {
      const [m, d] = date.split("/").map(Number);
      return {
        date,
        sortKey: m * 100 + d,
        label: `${m}/${d}`,
        pct: v.total ? (v.compliance / v.total) * 100 : 0,
        nonPct: v.total ? (v.nonCompliance / v.total) * 100 : 0,
        total: v.total,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="complianceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          domain={[95, 100]}
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
          }}
          labelStyle={{ color: "var(--muted-foreground)", fontWeight: 500 }}
          formatter={(v: number, name) =>
            name === "Total"
              ? [v.toLocaleString(), name]
              : [`${Number(v).toFixed(2)}%`, name]
          }
        />
        <Area
          type="monotone"
          dataKey="pct"
          name="Compliance"
          stroke="var(--success)"
          strokeWidth={2.5}
          fill="url(#complianceFill)"
          dot={{ fill: "var(--success)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
