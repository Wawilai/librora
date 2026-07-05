import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function UsageCard({
  label,
  used,
  limit,
  unit,
  hint,
  className,
}: {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  hint?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const tone =
    pct >= 100
      ? "text-[var(--status-failed)]"
      : pct >= 85
        ? "text-[var(--status-partial)]"
        : "text-foreground";
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-label">{label}</span>
        <span className={cn("type-metadata", tone)}>
          {used.toLocaleString()} / {limit.toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Progress value={pct} className="mt-3 h-1.5" />
      {hint && <p className="mt-2 type-caption">{hint}</p>}
    </div>
  );
}
