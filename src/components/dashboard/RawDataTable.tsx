import { useEffect, useMemo, useState } from "react";
import type { RawRow } from "@/lib/dashboard-data";
import { PLANT_WH_NAME, PRIMARY_PLANTS, getAvailableDates, normalizeDate } from "@/lib/dashboard-data";
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
import { CalendarDays, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

function toCsv(rows: RawRow[]): string {
  const headers = [
    "dispatch_date",
    "warehouse_id",
    "warehouse",
    "plant_code",
    "shipment_id",
    "shipment_status",
    "scanned_box",
    "sap_material",
    "dispatched_box",
    "suggested_box",
    "no_of_units",
    "compliance_status",
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

function fmtDateLabel(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function RawDataTable({ rows }: { rows: RawRow[] }) {
  const dates = useMemo(() => getAvailableDates(rows), [rows]);
  const [date, setDate] = useState<string>("");
  const [q, setQ] = useState("");
  const [wh, setWh] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    if (!date && dates.length) setDate(dates[0]); // D-1 (latest)
  }, [dates, date]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (date && normalizeDate(r.dispatch_date) !== date) return false;
      if (wh !== "all" && r.plant_code !== wh) return false;
      if (status !== "all") {
        const cs = (r.compliance_status || "").toLowerCase();
        if (status === "comp" && !cs.startsWith("comp")) return false;
        if (status === "non" && !cs.startsWith("non")) return false;
      }
      if (!s) return true;
      return [r.shipment_id, r.plant_code, r.wh_name, r.scanned_box, r.dispatched_box, r.sap_material, r.compliance_status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [rows, q, wh, status, date]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(curPage * pageSize, curPage * pageSize + pageSize);

  const handleExport = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw-${date || "all"}-${wh}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold">Raw Shipments</h3>
            <p className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString()} records · last 7 days
            </p>
          </div>
          {date && (
            <Badge variant="outline" className="gap-1 border-primary/30 bg-[var(--primary-soft)] text-primary">
              <CalendarDays className="h-3 w-3" /> {fmtDateLabel(date)}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={date} onValueChange={(v) => { setDate(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[160px] text-sm">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {dates.map((d, i) => (
                <SelectItem key={d} value={d}>
                  {fmtDateLabel(d)} {i === 0 ? "· D-1" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={wh} onValueChange={(v) => { setWh(v); setPage(0); }}>
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
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="comp">Compliance</SelectItem>
              <SelectItem value="non">Non Compliance</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search…"
              className="h-9 w-52 pl-8 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-[640px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground shadow-[0_1px_0_var(--color-border)]">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Shipment</th>
              <th className="px-3 py-2.5 font-semibold">Plant</th>
              <th className="px-3 py-2.5 font-semibold">WH</th>
              <th className="px-3 py-2.5 font-semibold">Ship Status</th>
              <th className="px-3 py-2.5 font-semibold">Scanned</th>
              <th className="px-3 py-2.5 font-semibold">Dispatched</th>
              <th className="px-3 py-2.5 font-semibold">SAP Material</th>
              <th className="px-3 py-2.5 font-semibold">Suggested</th>
              <th className="px-3 py-2.5 font-semibold text-right">Units</th>
              <th className="px-3 py-2.5 font-semibold">Compliance</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const cs = (r.compliance_status || "").toLowerCase();
              const isComp = cs.startsWith("comp");
              const isNon = cs.startsWith("non");
              return (
                <tr key={i} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateLabel(normalizeDate(r.dispatch_date))}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.shipment_id}</td>
                  <td className="px-3 py-2 font-medium text-primary">{r.plant_code}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.wh_name}</td>
                  <td className="px-3 py-2 text-xs">{r.shipment_status}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.scanned_box}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.dispatched_box}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.sap_material}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.suggested_box}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.no_of_units}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={
                        isComp
                          ? "border-success/40 bg-success/10 text-success"
                          : isNon
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted/40 text-muted-foreground"
                      }
                    >
                      {r.compliance_status || "—"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
        <span>Page {curPage + 1} of {pageCount}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={curPage === 0} className="h-7 px-2">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={curPage >= pageCount - 1} className="h-7 px-2">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
