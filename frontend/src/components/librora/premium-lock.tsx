import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PremiumLockState({
  feature,
  description,
  className,
  variant = "card",
  secondaryAction,
}: {
  feature: string;
  description: string;
  className?: string;
  variant?: "card" | "inline" | "panel";
  secondaryAction?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--premium)_30%,var(--border))] bg-[color-mix(in_oklab,var(--premium)_6%,var(--card))] p-5",
        variant === "panel" && "p-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--premium)_15%,transparent)] text-[var(--premium)]">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-base font-medium text-foreground">{feature}</h4>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--premium)_20%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--premium-foreground)]">
              <Sparkles className="h-3 w-3" /> Premium
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="default">
              <Link to="/plan">Explore Premium</Link>
            </Button>
            {secondaryAction}
          </div>
        </div>
      </div>
    </div>
  );
}
