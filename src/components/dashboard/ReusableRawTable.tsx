import { useEffect, useMemo, useState } from "react";
import { rawDateToIso, type RBRawRow } from "@/lib/reusable-box-data";
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

function fmtDateLabel(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toCsv(rows: RBRawRow[]): string {
  const headers = [
    "dispatch_date","plant_code","wh_name","shipment_id","shipment_status",
    "scanned_box","dispatched_box","suggested_box","box_code","sap_material",
    "no_of_units","cost","reuse_status","tenant","sub_tenant","carrier_id",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) =>
    headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")
  )].join("\n");
}

export function ReusableRawTable({ rows }: { rows: RBRawRow[] }) {
  const dates = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.dispatch_date && set.add(rawDateToIso(r.dispatch_date)));
    return Array.from(set).sort().reverse();
  }, [rows]);
  const warehouses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.plant_code && set.add(r.plant_code));
    return Array.from(set).sort();
  }, [rows]);

  const [date, setDate] = useState<string>("");
  const [wh, setWh] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    if (!date && dates.length) setDate(dates[0]);
  }, [dates, date]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (date && rawDateToIso(r.dispatch_date) !== date) return false;
      if (wh !== "all" && r.plant_code !== wh) return false;
      if (status !== "all" && r.reuse_status !== status) return false;
      if (!s) return true;
      return [r.shipment_id, r.plant_code, r.wh_name, r.scanned_box, r.dispatched_box, r.suggested_box, r.sap_material, r.tenant, r.sub_tenant]
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
    a.download = `reusable-raw-${date || "all"}-${wh}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold">Reusable Box · Raw Shipments</h3>
            <p className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString()} records
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
              <SelectValue placeholder="Date" />
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="h-9 w-[150px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reuse status</SelectItem>
              <SelectItem value="Re-Used">Re-Used</SelectItem>
              <SelectItem value="Not Re-Used">Not Re-Used</SelectItem>
              <SelectItem value="No Suggestion">No Suggestion</SelectItem>
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
            <tr className="border-b border-border bg-secondary text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Shipment</th>
              <th className="px-3 py-2.5 font-semibold">Plant</th>
              <th className="px-3 py-2.5 font-semibold">WH</th>
              <th className="px-3 py-2.5 font-semibold">Tenant</th>
              <th className="px-3 py-2.5 font-semibold">Scanned</th>
              <th className="px-3 py-2.5 font-semibold">Dispatched</th>
              <th className="px-3 py-2.5 font-semibold">Suggested</th>
              <th className="px-3 py-2.5 font-semibold">Box Code</th>
              <th className="px-3 py-2.5 font-semibold text-right">Units</th>
              <th className="px-3 py-2.5 font-semibold text-right">Cost</th>
              <th className="px-3 py-2.5 font-semibold">Reuse Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const tone =
                r.reuse_status === "Re-Used"
                  ? "border-success/40 bg-success/10 text-success"
                  : r.reuse_status === "Not Re-Used"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-muted-foreground";
              return (
                <tr key={i} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateLabel(rawDateToIso(r.dispatch_date))}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.shipment_id}</td>
                  <td className="px-3 py-2 font-medium text-primary">{r.plant_code}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.wh_name}</td>
                  <td className="px-3 py-2 text-xs">{r.sub_tenant || r.tenant}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.scanned_box}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.dispatched_box}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.suggested_box || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.box_code}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.no_of_units}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.cost || "0"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={tone}>{r.reuse_status}</Badge>
                  </td>
                </tr>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">No records</td>
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
