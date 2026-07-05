import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  onClear?: () => void;
  size?: "sm" | "md";
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, size = "md", value, ...props }, ref) => {
    const hasValue = typeof value === "string" && value.length > 0;
    return (
      <div className={cn("relative w-full", className)}>
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            "w-full rounded-md border border-input bg-background pr-9 text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-8 pl-8 text-xs" : "h-9 pl-9 text-sm",
          )}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
