import { cn } from "@/lib/utils";
import type { ItemStatus } from "@/lib/api/types";
import { Circle, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

const STATUS = {
  pending: {
    icon: Circle,
    cls: "bg-muted text-muted-foreground border-border",
  },
  processing: {
    icon: Loader2,
    cls: "bg-[color-mix(in_oklab,var(--status-processing)_12%,transparent)] text-[var(--status-processing)] border-[color-mix(in_oklab,var(--status-processing)_30%,transparent)]",
    spin: true,
  },
  ready: {
    icon: CheckCircle2,
    cls: "bg-[color-mix(in_oklab,var(--status-ready)_10%,transparent)] text-[var(--status-ready)] border-[color-mix(in_oklab,var(--status-ready)_30%,transparent)]",
  },
  partial: {
    icon: AlertTriangle,
    cls: "bg-[color-mix(in_oklab,var(--status-partial)_12%,transparent)] text-[var(--status-partial)] border-[color-mix(in_oklab,var(--status-partial)_30%,transparent)]",
  },
  failed: {
    icon: XCircle,
    cls: "bg-[color-mix(in_oklab,var(--status-failed)_10%,transparent)] text-[var(--status-failed)] border-[color-mix(in_oklab,var(--status-failed)_30%,transparent)]",
  },
} as const;

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", "spin" in s && s.spin && "animate-spin")} />
      {t(`status.${status}` as const)}
    </span>
  );
}
