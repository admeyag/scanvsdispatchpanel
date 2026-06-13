import type { PlantRow } from "@/lib/dashboard-data";
import { Boxes, CheckCircle2, Download, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportWarehouseReport } from "@/lib/export-warehouse";

function Pct({ value, kind }: { value: number; kind: "good" | "bad" | "neutral" | "nonComp" }) {
  let resolved: "good" | "bad" | "neutral" = kind === "nonComp" ? (value >= 0.5 ? "bad" : "good") : (kind as "good" | "bad" | "neutral");
  const isZero = value === 0;
  const styles =
    resolved === "good"
      ? "bg-[var(--success-soft)] text-[oklch(0.4_0.15_155)]"
      : resolved === "bad"
        ? "bg-[var(--danger-soft)] text-[oklch(0.5_0.2_27)]"
        : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={`inline-block min-w-[58px] rounded-md px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${isZero && resolved === "bad" ? "bg-transparent text-muted-foreground" : styles}`}
    >
      {value.toFixed(2)}%
    </span>
  );
}

type Tone = "violet" | "emerald" | "coral" | "teal" | "amber" | "pink";

const TONE_STYLES: Record<Tone, { bg: string; ring: string; text: string }> = {
  violet: { bg: "bg-[var(--primary-soft)]", ring: "ring-[oklch(0.56_0.22_275_/_0.18)]", text: "text-[oklch(0.5_0.22_275)]" },
  emerald: { bg: "bg-[var(--success-soft)]", ring: "ring-[oklch(0.6_0.16_158_/_0.18)]", text: "text-[oklch(0.45_0.15_158)]" },
  coral: { bg: "bg-[var(--danger-soft)]", ring: "ring-[oklch(0.6_0.22_22_/_0.18)]", text: "text-[oklch(0.55_0.22_22)]" },
  teal: { bg: "bg-[var(--teal-soft)]", ring: "ring-[oklch(0.6_0.13_195_/_0.18)]", text: "text-[oklch(0.45_0.13_195)]" },
  amber: { bg: "bg-[var(--warning-soft)]", ring: "ring-[oklch(0.7_0.16_70_/_0.2)]", text: "text-[oklch(0.5_0.14_70)]" },
  pink: { bg: "bg-[var(--pink-soft)]", ring: "ring-[oklch(0.6_0.2_350_/_0.18)]", text: "text-[oklch(0.5_0.2_350)]" },
};

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-4 ${t.bg} ${t.ring}`}>
        <Icon className={`h-5 w-5 ${t.text}`} strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className={`text-xl font-bold leading-tight tracking-tight tabular-nums ${t.text}`}>{value}</p>
      </div>
    </div>
  );
}

export function WarehouseTable({
  rows,
  totals,
  title,
  subtitle,
  exportFilename,
}: {
  rows: PlantRow[];
  totals: { total: number; match: number; notMatch: number; nullCount: number };
  title: string;
  subtitle?: string;
  exportFilename?: string;
}) {
  const compPct = totals.total ? (totals.match / totals.total) * 100 : 0;
  const nonPct = totals.total ? (totals.notMatch / totals.total) * 100 : 0;
  const nullPct = totals.total ? (totals.nullCount / totals.total) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div
        className="px-5 py-4 text-[var(--header-blue-foreground)]"
        style={{ background: "var(--header-gradient)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          </div>
          {exportFilename && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                exportWarehouseReport({ rows, totals, title, subtitle, filename: exportFilename })
              }
              className="h-8 gap-1.5 bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
        </div>
        {subtitle && <p className="mt-1 pl-9 text-[11px] opacity-90">{subtitle}</p>}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-gradient-to-b from-secondary/40 to-card sm:grid-cols-5">
        <SummaryStat label="Total Boxes" value={totals.total.toLocaleString()} icon={Boxes} tone="violet" />
        <SummaryStat label="Matched" value={totals.match.toLocaleString()} icon={CheckCircle2} tone="emerald" />
        <SummaryStat label="Not Matched" value={totals.notMatch.toLocaleString()} icon={XCircle} tone="coral" />
        <SummaryStat label="Compliance %" value={`${compPct.toFixed(2)}%`} icon={ShieldCheck} tone="teal" />
        <SummaryStat label="Non-Compliance %" value={`${nonPct.toFixed(2)}%`} icon={ShieldAlert} tone={nonPct >= 0.5 ? "coral" : "emerald"} />
      </div>


      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-secondary text-[10px] uppercase tracking-[0.08em] text-muted-foreground shadow-[0_1px_0_var(--color-border)]">
              <Th>Plant Code</Th>
              <Th>WH Code</Th>
              <Th right>Match</Th>
              <Th right>Not Match</Th>
              <Th right>Null</Th>
              <Th right>Grand Total</Th>
              <Th right>Compliance %</Th>
              <Th right>Non-Compliance %</Th>
              <Th right>FC Non-Ctrl %</Th>
              <Th right>Total %</Th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.plant}
                className={`border-b border-border/40 transition-colors hover:bg-accent/40 ${i % 2 === 1 ? "bg-secondary/15" : ""}`}
              >
                <td className="px-3 py-2 font-mono text-xs text-foreground/80">{r.plant}</td>
                <td className="px-3 py-2 font-semibold text-primary">{r.wh_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.match.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.notMatch.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {r.nullCount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {r.total.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <Pct value={r.compliancePct} kind="neutral" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Pct value={r.nonCompliancePct} kind="nonComp" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Pct value={r.nullPct} kind="neutral" />
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  100.00%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-muted-foreground">
                  No data
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/70 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Grand Total
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {totals.match.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {totals.notMatch.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {totals.nullCount.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {totals.total.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right">
                <Pct value={compPct} kind="neutral" />
              </td>
              <td className="px-3 py-2.5 text-right">
                <Pct value={nonPct} kind="nonComp" />
              </td>
              <td className="px-3 py-2.5 text-right">
                <Pct value={nullPct} kind="neutral" />
              </td>
              <td className="px-3 py-2.5 text-right text-xs tabular-nums">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 font-semibold ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
