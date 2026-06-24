import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "danger" | "primary" | "warning";
};

const toneStyles: Record<NonNullable<Props["tone"]>, string> = {
  default: "from-card to-card",
  success: "from-[oklch(0.3_0.08_155)] to-card",
  danger: "from-[oklch(0.3_0.1_25)] to-card",
  primary: "from-[oklch(0.3_0.08_220)] to-card",
  warning: "from-[oklch(0.3_0.08_75)] to-card",
};

const iconTones: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/20 text-success",
  danger: "bg-destructive/20 text-destructive",
  primary: "bg-primary/20 text-primary",
  warning: "bg-warning/20 text-warning",
};

export function KpiCard({ label, value, sub, icon: Icon, tone = "default" }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-gradient-to-br p-4 shadow-[var(--shadow-card)]",
        toneStyles[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", iconTones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
