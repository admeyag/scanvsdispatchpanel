import { useMemo, useState } from "react";
import type { RawRow } from "@/lib/dashboard-data";
import { PLANT_WH_NAME, PRIMARY_PLANTS } from "@/lib/dashboard-data";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

function toCsv(rows: RawRow[]): string {
  const headers = [
    "shipment_id",
    "dispatch_date",
    "plant_code",
    "wh_name",
    "warehouse_id",
    "scanned_box",
    "dispatched_box",
    "suggested_box",
    "no_of_units",
    "Status",
    "order_status",
    "shipment_status",
    "carrier_id",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as Record<string, unknown>)[h])).join(","));
  }
  return lines.join("\n");
}

export function RawDataTable({ rows }: { rows: RawRow[] }) {
  const [q, setQ] = useState("");
  const [wh, setWh] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (wh !== "all" && r.plant_code !== wh) return false;
      if (!s) return true;
      return [r.shipment_id, r.plant_code, r.wh_name, r.scanned_box, r.dispatched_box, r.Status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [rows, q, wh]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(curPage * pageSize, curPage * pageSize + pageSize);

  const handleExport = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `d1-raw-${wh}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">D-1 Raw Shipments</h3>
          <p className="text-xs text-muted-foreground">{filtered.length.toLocaleString()} records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={wh}
            onValueChange={(v) => {
              setWh(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {PRIMARY_PLANTS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p} · {PLANT_WH_NAME[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search shipments..."
              className="h-9 w-60 pl-8 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-[640px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground shadow-[0_1px_0_var(--color-border)]">
              <th className="px-4 py-2.5 font-semibold">Shipment</th>
              <th className="px-4 py-2.5 font-semibold">Plant</th>
              <th className="px-4 py-2.5 font-semibold">WH</th>
              <th className="px-4 py-2.5 font-semibold">Scanned</th>
              <th className="px-4 py-2.5 font-semibold">Dispatched</th>
              <th className="px-4 py-2.5 font-semibold">Suggested</th>
              <th className="px-4 py-2.5 font-semibold">Units</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const matched = r.Status === "Matched";
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="px-4 py-2 font-mono text-xs">{r.shipment_id}</td>
                  <td className="px-4 py-2 font-medium text-primary">{r.plant_code}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.wh_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.scanned_box}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.dispatched_box}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {r.suggested_box}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{r.no_of_units}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="outline"
                      className={
                        matched
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-destructive/40 bg-destructive/10 text-destructive"
                      }
                    >
                      {r.Status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>
          Page {curPage + 1} of {pageCount}
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={curPage === 0}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={curPage >= pageCount - 1}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
