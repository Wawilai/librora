import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function TagChip({
  tag,
  className,
  asLink = true,
  onRemove,
}: {
  tag: string;
  className?: string;
  asLink?: boolean;
  onRemove?: () => void;
}) {
  const inner = (
    <>
      <span className="text-muted-foreground">#</span>
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-muted-foreground hover:text-foreground"
          aria-label={`Remove ${tag}`}
        >
          ×
        </button>
      )}
    </>
  );
  const cls = cn(
    "inline-flex items-center gap-0.5 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:border-primary/40 hover:text-foreground transition-colors",
    className,
  );
  if (!asLink) return <span className={cls}>{inner}</span>;
  return (
    <Link
      to="/topics/$slug"
      params={{ slug: tag }}
      className={cls}
      onClick={(e) => e.stopPropagation()}
    >
      {inner}
    </Link>
  );
}
