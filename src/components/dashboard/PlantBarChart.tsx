import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { plant: string; compliancePct: number; nonCompliancePct: number; total: number };

export function PlantBarChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="plant" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[90, 100]} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => `${v.toFixed(2)}%`}
        />
        <Bar dataKey="compliancePct" name="Compliance %" fill="var(--success)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
