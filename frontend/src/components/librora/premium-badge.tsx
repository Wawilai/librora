import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumBadge({
  className,
  label = "Premium",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--premium)_60%,var(--foreground))]",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  );
}
